import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const GEMMA_API_KEY = defineSecret("GEMMA_API_KEY");

// 4 MB of base64 ≈ ~3 MB raw image — well under callable's 10 MB limit
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemma-4-31b-it:free";

const SYSTEM_PROMPT =
  "You are a soccer roster extractor. Given an image of a player roster, " +
  "return ONLY a JSON array of objects with 'name' (string) and 'number' (integer, optional) fields. " +
  "Omit header rows (e.g. rows containing 'Player', '#', 'Name'), footer rows (e.g. '12 players'), " +
  "and any non-player entries. Return nothing else — no prose, no markdown fences, just the JSON array.";

interface ExtractedPlayer {
  name: string;
  number?: number;
}

export const extractRoster = onCall(
  { secrets: [GEMMA_API_KEY] },
  async (request): Promise<{ players: ExtractedPlayer[] }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to import a roster.");
    }

    const { imageBase64 } = request.data as { imageBase64?: unknown };

    if (typeof imageBase64 !== "string" || !imageBase64) {
      throw new HttpsError("invalid-argument", "imageBase64 is required.");
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        "Image is too large. Please use a smaller screenshot."
      );
    }

    const players = await extractWithRetry(imageBase64, GEMMA_API_KEY.value());
    return { players };
  }
);

async function extractWithRetry(
  imageBase64: string,
  apiKey: string
): Promise<ExtractedPlayer[]> {
  const raw = await callOpenRouter(imageBase64, apiKey);
  const players = parsePlayers(raw);
  if (players !== null) return players;

  // One retry on malformed output
  const raw2 = await callOpenRouter(imageBase64, apiKey);
  const players2 = parsePlayers(raw2);
  if (players2 !== null) return players2;

  throw new HttpsError(
    "internal",
    "Could not read the roster from the image. Please try again."
  );
}

async function callOpenRouter(
  imageBase64: string,
  apiKey: string
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

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new HttpsError(
      "internal",
      `OpenRouter error ${res.status}: ${text.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
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
