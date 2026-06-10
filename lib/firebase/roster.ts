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

export type PlayerStatus = "active" | "archived";

// Shape stored in Firestore — a superset of the engine Player type.
// The engine Player type never gains a status field (ADR-0006).
type RosterRecord = Player & { status?: PlayerStatus };

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

export async function archivePlayer(
  db: Firestore,
  teamId: string,
  playerId: string
): Promise<void> {
  await updateDoc(doc(db, "teams", teamId, "roster", playerId), {
    status: "archived",
  });
}

export async function deletePlayer(
  db: Firestore,
  teamId: string,
  playerId: string
): Promise<void> {
  await deleteDoc(doc(db, "teams", teamId, "roster", playerId));
}

// Returns only active players as clean Player objects (no status field).
// This is what the engine and all attendance/squad selection should use.
export async function getRoster(
  db: Firestore,
  teamId: string
): Promise<Player[]> {
  const snap = await getDocs(collection(db, "teams", teamId, "roster"));
  return snap.docs
    .map((d) => ({ ...(d.data() as RosterRecord), id: d.id }))
    .filter((r) => r.status !== "archived")
    .map(({ status: _ignored, ...player }) => player as Player);
}

// Returns all players including archived, preserving status for the restore UI.
export async function getFullRoster(
  db: Firestore,
  teamId: string
): Promise<Array<Player & { status?: PlayerStatus }>> {
  const snap = await getDocs(collection(db, "teams", teamId, "roster"));
  return snap.docs.map((d) => {
    const r = d.data() as RosterRecord;
    return { ...r, id: d.id };
  });
}
