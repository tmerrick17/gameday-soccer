import {
  type Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
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
}

export async function saveGame(
  db: Firestore,
  teamId: string,
  input: Omit<GameSessionDoc, "id" | "createdAt">
): Promise<GameSessionDoc> {
  const ref = doc(collection(db, "teams", teamId, "games"));
  const id = ref.id;
  const createdAt = serverTimestamp();
  await setDoc(ref, { ...input, id, createdAt });
  return { ...input, id, createdAt: new Date() };
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
