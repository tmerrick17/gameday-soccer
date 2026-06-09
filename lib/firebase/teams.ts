import {
  type Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import type { TeamDoc, MemberDoc, InviteCodeDoc } from "./types";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateInviteCode(): string {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export async function createTeam(
  db: Firestore,
  params: {
    name: string;
    userId: string;
    email: string;
    displayName: string;
  }
): Promise<TeamDoc> {
  const { name, userId, email, displayName } = params;
  const teamRef = doc(collection(db, "teams"));
  const teamId = teamRef.id;
  const inviteCode = generateInviteCode();
  const now = serverTimestamp();

  const teamData = {
    name,
    headCoachId: userId,
    inviteCode,
    createdAt: now,
  };

  await setDoc(teamRef, teamData);

  const memberRef = doc(db, "teams", teamId, "members", userId);
  await setDoc(memberRef, {
    teamId,
    userId,
    role: "head-coach",
    displayName,
    email,
    joinedAt: now,
  } satisfies Omit<MemberDoc, "inviteCode">);

  const inviteRef = doc(db, "inviteCodes", inviteCode);
  await setDoc(inviteRef, {
    code: inviteCode,
    teamId,
    teamName: name,
    createdBy: userId,
    createdAt: now,
  } satisfies Omit<InviteCodeDoc, never>);

  return {
    id: teamId,
    name,
    headCoachId: userId,
    inviteCode,
    createdAt: new Date(),
  };
}

export async function getInviteCodeDoc(
  db: Firestore,
  code: string
): Promise<InviteCodeDoc | null> {
  const snap = await getDoc(doc(db, "inviteCodes", code));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    code: d.code,
    teamId: d.teamId,
    teamName: d.teamName,
    createdBy: d.createdBy,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function joinTeam(
  db: Firestore,
  params: {
    code: string;
    userId: string;
    email: string;
    displayName: string;
  }
): Promise<TeamDoc> {
  const { code, userId, email, displayName } = params;

  const inviteSnap = await getDoc(doc(db, "inviteCodes", code));
  if (!inviteSnap.exists()) {
    throw new Error(`Invite code "${code}" not found.`);
  }
  const invite = inviteSnap.data();
  const teamId: string = invite.teamId;

  const teamSnap = await getDoc(doc(db, "teams", teamId));
  if (!teamSnap.exists()) {
    throw new Error(`Team "${teamId}" not found.`);
  }
  const teamData = teamSnap.data();

  const memberRef = doc(db, "teams", teamId, "members", userId);
  await setDoc(memberRef, {
    teamId,
    userId,
    role: "coach",
    displayName,
    email,
    inviteCode: code,
    joinedAt: serverTimestamp(),
  } satisfies MemberDoc);

  return {
    id: teamId,
    name: teamData.name,
    headCoachId: teamData.headCoachId,
    inviteCode: teamData.inviteCode,
    createdAt: teamData.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function getTeamsByUser(
  db: Firestore,
  userId: string
): Promise<TeamDoc[]> {
  const membersQuery = query(
    collectionGroup(db, "members"),
    where("userId", "==", userId)
  );
  const membersSnap = await getDocs(membersQuery);

  const teamIds = membersSnap.docs.map((d) => d.ref.parent.parent!.id);

  const teams = await Promise.all(
    teamIds.map(async (teamId) => {
      const snap = await getDoc(doc(db, "teams", teamId));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        id: snap.id,
        name: d.name,
        headCoachId: d.headCoachId,
        inviteCode: d.inviteCode,
        createdAt: d.createdAt?.toDate?.() ?? new Date(),
      } satisfies TeamDoc;
    })
  );

  return teams.filter((t): t is TeamDoc => t !== null);
}
