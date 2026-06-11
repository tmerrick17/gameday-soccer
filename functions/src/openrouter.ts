export interface ExtractedPlayer {
  name: string;
  number?: number;
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
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}

export async function extractWithRetry(
  imageBase64: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<ExtractedPlayer[]> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await callOpenRouter(imageBase64, apiKey, fetcher);
    const players = parsePlayers(raw);
    if (players !== null) return players;
  }

  console.error(
    `[extractRoster] gave up after ${maxAttempts} attempts — model output was not parseable`
  );
  throw new Error("Could not read the roster from the image. Please try again.");
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
