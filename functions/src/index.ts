import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { extractWithRetry } from "./openrouter";

const GEMMA_API_KEY = defineSecret("GEMMA_API_KEY");

// 4 MB of base64 ≈ ~3 MB raw image — well under callable's 10 MB limit
const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

export const extractRoster = onCall(
  { secrets: [GEMMA_API_KEY] },
  async (request): Promise<{ players: { name: string; number?: number }[] }> => {
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

    try {
      const players = await extractWithRetry(imageBase64, GEMMA_API_KEY.value());
      return { players };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", (err as Error).message);
    }
  }
);
