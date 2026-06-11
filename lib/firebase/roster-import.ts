import { httpsCallable } from "firebase/functions";
import { getFirebase } from "./config";

export interface ExtractedPlayer {
  name: string;
  number?: number;
}

export async function extractRosterFromImage(
  imageBase64: string
): Promise<ExtractedPlayer[]> {
  const { functions } = getFirebase();
  const fn = httpsCallable<{ imageBase64: string }, { players: ExtractedPlayer[] }>(
    functions,
    "extractRoster"
  );
  const result = await fn({ imageBase64 });
  return result.data.players;
}
