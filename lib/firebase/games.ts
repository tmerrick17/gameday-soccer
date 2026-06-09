import {
  type Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { RotationPlan } from "../engine/types";
import type { KeeperAssignment } from "../engine/generatePlan";

export interface GameSessionDoc {
  id: string;
  createdAt: Date;
  formationId: string;
  squadIds: string[];
  keeperAssignments: KeeperAssignment[];
  plan: RotationPlan;
  // Live game state (mutable)
  status?: "draft" | "live" | "completed";
  controllerDeviceId?: string | null;
  clockOffsetSeconds?: number;
  clockStartedAt?: number | null;
  isClockRunning?: boolean;
  livePlan?: RotationPlan | null;
  minutesPlayed?: Record<string, number>;
  removedPlayerIds?: string[];
}

type LiveStateUpdates = Partial<
  Omit<GameSessionDoc, "id" | "createdAt" | "formationId" | "squadIds" | "keeperAssignments" | "plan">
>;

export async function saveGame(
  db: Firestore,
  teamId: string,
  input: Omit<GameSessionDoc, "id" | "createdAt">
): Promise<GameSessionDoc> {
  const ref = doc(collection(db, "teams", teamId, "games"));
  const id = ref.id;
  const createdAt = serverTimestamp();
  await setDoc(ref, { ...input, id, createdAt, status: "draft" });
  return { ...input, id, createdAt: new Date(), status: "draft" };
}

export async function getGame(
  db: Firestore,
  teamId: string,
  gameId: string
): Promise<GameSessionDoc | null> {
  const snap = await getDoc(doc(db, "teams", teamId, "games", gameId));
  if (!snap.exists()) return null;
  const d = snap.data() as GameSessionDoc;
  return { ...d, id: snap.id };
}

export async function listGames(
  db: Firestore,
  teamId: string
): Promise<GameSessionDoc[]> {
  const snap = await getDocs(collection(db, "teams", teamId, "games"));
  return snap.docs.map((d) => {
    const data = d.data() as GameSessionDoc;
    return { ...data, id: d.id };
  });
}

export async function updateGameLiveState(
  db: Firestore,
  teamId: string,
  gameId: string,
  updates: LiveStateUpdates
): Promise<void> {
  await updateDoc(doc(db, "teams", teamId, "games", gameId), updates);
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("gameday_device_id");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem("gameday_device_id", id);
  }
  return id;
}
