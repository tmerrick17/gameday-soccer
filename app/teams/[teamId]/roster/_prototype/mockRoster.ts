// PROTOTYPE — throwaway. Mock roster for the #2 "delete vs archive/deactivate"
// exploration (handoff tension #2). Player ids are stable & never reused
// (CONTEXT.md), and a Player who has played is referenced by past Games — so the
// mock carries history + a season-level status the real Player type doesn't have
// yet. Whether to ADD that status is part of what this prototype is asking.
// Delete with the rest of _prototype/.

export type PStatus = "active" | "injured" | "departed" | "archived";

export interface PPlayer {
  id: string;
  name: string;
  number?: number;
  preferredRoles: string[];
  keeperEligible?: boolean;
  /** How many past Games reference this Player (0 = never played → safe to hard-delete). */
  gamesPlayed: number;
  seasonMinutes: number;
  status: PStatus;
}

export const MOCK_ROSTER: PPlayer[] = [
  { id: "p1", name: "Ava Chen", number: 1, preferredRoles: ["Keeper"], keeperEligible: true, gamesPlayed: 6, seasonMinutes: 180, status: "active" },
  { id: "p2", name: "Mia Torres", number: 2, preferredRoles: ["Defender"], gamesPlayed: 6, seasonMinutes: 168, status: "active" },
  { id: "p3", name: "Liam Ford", number: 3, preferredRoles: ["Defender", "Mid"], gamesPlayed: 6, seasonMinutes: 172, status: "active" },
  { id: "p4", name: "Noah Park", number: 4, preferredRoles: ["Mid"], gamesPlayed: 5, seasonMinutes: 140, status: "active" },
  { id: "p5", name: "Ivy Rao", number: 5, preferredRoles: ["Mid", "Forward"], keeperEligible: true, gamesPlayed: 6, seasonMinutes: 160, status: "active" },
  { id: "p6", name: "Eli Brooks", number: 7, preferredRoles: ["Forward"], gamesPlayed: 4, seasonMinutes: 96, status: "injured" },
  { id: "p7", name: "Zoe Diaz", number: 9, preferredRoles: ["Forward"], gamesPlayed: 6, seasonMinutes: 150, status: "active" },
  // Mid-season departure — has history, so id can't be reused / hard-deleted cleanly.
  { id: "p8", name: "Kai Nguyen", number: 8, preferredRoles: ["Mid"], gamesPlayed: 3, seasonMinutes: 72, status: "departed" },
  // Brand-new signups, never played — the only players truly safe to hard-delete.
  { id: "p9", name: "Ruby Shaw", number: 11, preferredRoles: ["Defender"], gamesPlayed: 0, seasonMinutes: 0, status: "active" },
  { id: "p10", name: "Leo Walsh", preferredRoles: [], gamesPlayed: 0, seasonMinutes: 0, status: "active" },
  // Already archived last season — kept for history, hidden from active list.
  { id: "p11", name: "Sam Okafor", number: 6, preferredRoles: ["Defender"], gamesPlayed: 18, seasonMinutes: 540, status: "archived" },
];

export const STATUS_LABEL: Record<PStatus, string> = {
  active: "Active",
  injured: "Injured",
  departed: "Departed",
  archived: "Archived",
};

export function roleLine(p: PPlayer): string {
  const roles = p.preferredRoles.length ? p.preferredRoles.join(", ") : "No preferred roles";
  return p.keeperEligible ? `${roles} · GK eligible` : roles;
}
