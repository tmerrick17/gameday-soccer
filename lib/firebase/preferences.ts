import {
  type Firestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import type { Preferences } from "../engine/types";

export const DEFAULT_PREFERENCES: Preferences = {
  strategy: "equal-time",
  keeperMode: "half-swap",
  maxWaveSize: 3,
  segmentMinutes: 6,
  halfMinutes: 20,
  cadenceByRole: { Forward: 12, Mid: 12, Defender: 18, Keeper: 20 },
  fullWavesThreshold: 3,
};

const prefPath = (teamId: string) =>
  ["teams", teamId, "config", "preferences"] as const;

export async function getPreferences(
  db: Firestore,
  teamId: string
): Promise<Preferences> {
  const snap = await getDoc(doc(db, ...prefPath(teamId)));
  if (!snap.exists()) return { ...DEFAULT_PREFERENCES };
  return snap.data() as Preferences;
}

export async function savePreferences(
  db: Firestore,
  teamId: string,
  prefs: Preferences
): Promise<void> {
  await setDoc(doc(db, ...prefPath(teamId)), prefs);
}
