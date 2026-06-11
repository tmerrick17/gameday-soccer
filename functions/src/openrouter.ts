export interface ExtractedPlayer {
  name: string;
  number?: number;
}

export class TransientHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "TransientHttpError";
  }
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemma-4-31b-it:free";

const SYSTEM_PROMPT =
  "You are a soccer roster extractor. Given an image of a player roster, " +
  "return ONLY a JSON array of objects with 'name' (string) and 'number' (integer, optional) fields. " +
  "Omit header rows (e.g. rows containing 'Player', '#', 'Name'), footer rows (e.g. '12 players'), " +
  "and any non-player entries. Return nothing else — no prose, no markdown fences, just the JSON array.";

export async function callOpenRouter(
  imageBase64: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const body = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          { type: "text", text: SYSTEM_PROMPT },
        ],
      },
    ],
  };

  const res = await fetcher(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[extractRoster] OpenRouter HTTP ${res.status}: ${text.slice(0, 500)}`
    );
    const isTransient = res.status === 429 || res.status >= 500;
    const msg = `OpenRouter error ${res.status}: ${text.slice(0, 200)}`;
    if (isTransient) throw new TransientHttpError(res.status, msg);
    throw new Error(msg);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}

const BASE_DELAYS_MS = [1000, 2000];
const MAX_HTTP_ATTEMPTS = 3;
const MAX_PARSE_ATTEMPTS = 2;

function jitter(ms: number): number {
  return Math.round(ms * (0.7 + Math.random() * 0.6));
}

export async function extractWithRetry(
  imageBase64: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  delayFn: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms))
): Promise<ExtractedPlayer[]> {
  let lastError: unknown;

  for (let httpAttempt = 1; httpAttempt <= MAX_HTTP_ATTEMPTS; httpAttempt++) {
    try {
      const raw = await callOpenRouter(imageBase64, apiKey, fetcher);

      // Retry once on malformed output within a successful HTTP round
      const players = parsePlayers(raw);
      if (players !== null) return players;

      const raw2 = await callOpenRouter(imageBase64, apiKey, fetcher);
      const players2 = parsePlayers(raw2);
      if (players2 !== null) return players2;

      console.error(
        `[extractRoster] gave up after ${MAX_PARSE_ATTEMPTS} attempts — model output was not parseable`
      );
      throw new Error("Could not read the roster from the image. Please try again.");
    } catch (err) {
      if (!(err instanceof TransientHttpError)) throw err;
      lastError = err;
      if (httpAttempt < MAX_HTTP_ATTEMPTS) {
        await delayFn(jitter(BASE_DELAYS_MS[httpAttempt - 1] ?? 2000));
      }
    }
  }

  console.error(
    `[extractRoster] gave up after ${MAX_HTTP_ATTEMPTS} HTTP attempts — last error: ${String(lastError)}`
  );
  throw lastError;
}

function parsePlayers(raw: string): ExtractedPlayer[] | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (!Array.isArray(parsed)) return null;
    const players: ExtractedPlayer[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;
      const name =
        typeof obj.name === "string" ? obj.name.trim() : null;
      if (!name) continue;
      const rawNum = obj.number;
      const number =
        typeof rawNum === "number"
          ? rawNum
          : typeof rawNum === "string" && rawNum !== ""
            ? Number(rawNum) || undefined
            : undefined;
      players.push({ name, ...(number !== undefined ? { number } : {}) });
    }
    return players;
  } catch {
    return null;
  }
}
