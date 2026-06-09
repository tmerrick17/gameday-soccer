import {
  type Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type { Formation } from "../engine/types";

export function validateFormation(
  formation: Omit<Formation, "id">,
  sideSize: number
): string | null {
  if (formation.positions.length === 0) {
    return "A formation must have at least one position.";
  }
  if (formation.positions.length !== sideSize) {
    return `Formation has ${formation.positions.length} positions but side size is ${sideSize}.`;
  }
  const keeperCount = formation.positions.filter(
    (p) => p.role === "Keeper"
  ).length;
  if (keeperCount > 1) {
    return `A formation can have at most one Keeper position (found ${keeperCount}).`;
  }
  return null;
}

export async function saveFormation(
  db: Firestore,
  teamId: string,
  formation: Omit<Formation, "id">
): Promise<Formation> {
  const ref = doc(collection(db, "teams", teamId, "formations"));
  const id = ref.id;
  await setDoc(ref, { ...formation, id });
  return { ...formation, id };
}

export async function getFormations(
  db: Firestore,
  teamId: string
): Promise<Formation[]> {
  const snap = await getDocs(collection(db, "teams", teamId, "formations"));
  return snap.docs.map((d) => {
    const data = d.data() as Formation;
    return { ...data, id: d.id };
  });
}

export async function deleteFormation(
  db: Firestore,
  teamId: string,
  formationId: string
): Promise<void> {
  await deleteDoc(doc(db, "teams", teamId, "formations", formationId));
}
