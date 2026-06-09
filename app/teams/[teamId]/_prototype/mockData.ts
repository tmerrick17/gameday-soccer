// PROTOTYPE — throwaway. Mock focus-game data so the Team-home variants can be
// compared across all three game states (none / planned / live) regardless of
// what the real team's Firestore data happens to contain right now.
// Delete with the rest of _prototype/ once a variant wins.

import type { GameSessionDoc } from "../../../../lib/firebase/games";

export type FocusState = "none" | "planned" | "live";

/** Build a throwaway plan stub with just enough shape for planSummary(). */
function planStub(): GameSessionDoc["plan"] {
  const seg = (index: number) => ({ index, minutes: 6, lineup: {} as never });
  const half = (keeperId: string) => ({
    keeperId,
    segments: [seg(0), seg(1), seg(2), seg(3)],
  });
  return {
    gameId: "mock-game",
    halves: [half("p7"), half("p3")],
    waves: [
      { atSegmentIndex: 1, in: ["p4"], out: ["p9"], reason: "rotation" },
      { atSegmentIndex: 2, in: ["p6"], out: ["p2"], reason: "rotation" },
      { atSegmentIndex: 3, in: ["p9"], out: ["p4"], reason: "rotation" },
      { atSegmentIndex: 5, in: ["p2"], out: ["p6"], reason: "rotation" },
      { atSegmentIndex: 6, in: ["p8"], out: ["p1"], reason: "rotation" },
      { atSegmentIndex: 7, in: ["p1"], out: ["p8"], reason: "rotation" },
    ],
    fairness: { perPlayer: [], flagged: [] },
  } as unknown as GameSessionDoc["plan"];
}

const SQUAD = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];

function baseGame(id: string): GameSessionDoc {
  return {
    id,
    createdAt: new Date(2026, 5, 8, 9, 0, 0),
    formationId: "f-2-3-1",
    squadIds: SQUAD,
    keeperAssignments: [] as never,
    plan: planStub(),
  };
}

/** Games array to feed pickFocusGame() for a given mocked state. */
export function mockGames(state: FocusState): GameSessionDoc[] {
  if (state === "none") return [];
  if (state === "planned") {
    return [{ ...baseGame("game-planned"), status: "draft" }];
  }
  // live
  return [
    {
      ...baseGame("game-live"),
      status: "live",
      isClockRunning: true,
      clockOffsetSeconds: 32 * 60 + 3, // 2nd half ~12:03 on a 20-min half
      minutesPlayed: { p1: 24, p2: 18, p3: 30, p4: 22 },
    },
  ];
}

/** Opponent label for display chrome (not in the real doc — prototype-only). */
export const MOCK_OPPONENT = "Riverside United";
export const MOCK_KICKOFF = "Today · 9:00 AM";
