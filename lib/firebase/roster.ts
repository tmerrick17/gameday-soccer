import {
  type Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type { Player } from "../engine/types";

export async function addPlayer(
  db: Firestore,
  teamId: string,
  player: Omit<Player, "id">
): Promise<Player> {
  const ref = doc(collection(db, "teams", teamId, "roster"));
  const id = ref.id;
  const full: Player = { ...player, id };
  await setDoc(ref, full);
  return full;
}

export async function updatePlayer(
  db: Firestore,
  teamId: string,
  playerId: string,
  updates: Partial<Omit<Player, "id">>
): Promise<void> {
  await updateDoc(doc(db, "teams", teamId, "roster", playerId), updates);
}

export async function deletePlayer(
  db: Firestore,
  teamId: string,
  playerId: string
): Promise<void> {
  await deleteDoc(doc(db, "teams", teamId, "roster", playerId));
}

export async function getRoster(
  db: Firestore,
  teamId: string
): Promise<Player[]> {
  const snap = await getDocs(collection(db, "teams", teamId, "roster"));
  return snap.docs.map((d) => {
    const data = d.data() as Player;
    return { ...data, id: d.id };
  });
}
