import { httpsCallable } from "firebase/functions";
import { getFirebase } from "./config";

export interface ExtractedPlayer {
  name: string;
  number?: number;
}

export async function extractRosterFromImage(image: {
  imageBase64: string;
  mimeType: string;
}): Promise<ExtractedPlayer[]> {
  const { functions } = getFirebase();
  const fn = httpsCallable<
    { imageBase64: string; mimeType: string },
    { players: ExtractedPlayer[] }
  >(functions, "extractRoster");
  const result = await fn({ imageBase64: image.imageBase64, mimeType: image.mimeType });
  return result.data.players;
}
