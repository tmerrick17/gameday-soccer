import type { FieldValue } from "firebase/firestore";

export type CoachRole = "head-coach" | "coach";

/** Team document stored at /teams/{teamId} */
export interface TeamDoc {
  id: string;
  name: string;
  headCoachId: string;
  inviteCode: string;
  createdAt: Date;
}

/** Membership document stored at /teams/{teamId}/members/{userId} */
export interface MemberDoc {
  teamId: string;
  userId: string;
  role: CoachRole;
  displayName: string;
  email: string;
  /** The invite code used to join — present for "coach" role, absent for "head-coach". */
  inviteCode?: string;
  joinedAt: Date | FieldValue;
}

/** Lookup document stored at /inviteCodes/{code} */
export interface InviteCodeDoc {
  code: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  createdAt: Date | FieldValue;
}
