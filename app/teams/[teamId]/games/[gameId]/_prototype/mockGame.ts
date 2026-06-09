// PROTOTYPE — throwaway. Self-contained mock game-day data for the #5 flow
// exploration (plan card ↔ live console: one page vs separate routes).
// Deliberately uses local plain types — NOT the real engine types — so the
// variants stay simple and decoupled. Delete with this _prototype/ folder.

export interface MockPlayer {
  id: string;
  name: string;
  number: number;
}

export interface MockCell {
  positionId: string;
  playerId: string;
}

export interface MockSegment {
  index: number; // global segment index
  lineup: MockCell[];
}

export interface MockWave {
  atSegmentIndex: number;
  in: string[];
  out: string[];
  reason: string;
}

export const POSITIONS = ["GK", "LD", "RD", "LM", "CM", "RM", "ST"] as const;
export const SEGS_PER_HALF = 4;
export const SEG_MINUTES = 6;

export const SQUAD: MockPlayer[] = [
  { id: "p1", name: "Ava Chen", number: 1 },
  { id: "p2", name: "Mia Torres", number: 2 },
  { id: "p3", name: "Liam Ford", number: 3 },
  { id: "p4", name: "Noah Park", number: 4 },
  { id: "p5", name: "Ivy Rao", number: 5 },
  { id: "p6", name: "Eli Brooks", number: 6 },
  { id: "p7", name: "Zoe Diaz", number: 7 },
  { id: "p8", name: "Kai Nguyen", number: 8 },
  { id: "p9", name: "Ruby Shaw", number: 9 },
  { id: "p10", name: "Leo Walsh", number: 10 },
];

const NAME = new Map(SQUAD.map((p) => [p.id, p]));
export function label(id: string): string {
  const p = NAME.get(id);
  return p ? `#${p.number}` : id;
}
export function fullName(id: string): string {
  return NAME.get(id)?.name ?? id;
}

// 8 segments (2 halves × 4). Rotate field players through the bench across segs;
// keeper is fixed per half (p1 first half, p5 second) to respect Keeper lock.
function seg(index: number, ids: string[]): MockSegment {
  return { index, lineup: POSITIONS.map((pos, i) => ({ positionId: pos, playerId: ids[i] })) };
}

export const SEGMENTS: MockSegment[] = [
  seg(0, ["p1", "p2", "p3", "p4", "p6", "p7", "p9"]),
  seg(1, ["p1", "p2", "p3", "p4", "p8", "p10", "p9"]),
  seg(2, ["p1", "p8", "p10", "p4", "p6", "p7", "p9"]),
  seg(3, ["p1", "p8", "p10", "p2", "p6", "p7", "p3"]),
  seg(4, ["p5", "p2", "p3", "p4", "p6", "p7", "p9"]),
  seg(5, ["p5", "p2", "p3", "p4", "p8", "p10", "p1"]),
  seg(6, ["p5", "p8", "p10", "p4", "p6", "p7", "p1"]),
  seg(7, ["p5", "p8", "p10", "p2", "p6", "p7", "p3"]),
];

export const KEEPER_BY_HALF = ["p1", "p5"];

export const WAVES: MockWave[] = [
  { atSegmentIndex: 1, in: ["p8", "p10"], out: ["p6", "p7"], reason: "Fresh legs in midfield" },
  { atSegmentIndex: 2, in: ["p6", "p7"], out: ["p2", "p3"], reason: "Even out back-line minutes" },
  { atSegmentIndex: 3, in: ["p2", "p3"], out: ["p4", "p9"], reason: "Rotate the strikers" },
  { atSegmentIndex: 5, in: ["p8", "p10", "p1"], out: ["p6", "p7", "p9"], reason: "Second-half reshuffle" },
  { atSegmentIndex: 6, in: ["p6", "p7"], out: ["p2", "p3"], reason: "Balance defender minutes" },
];

// Minutes-played (planned totals) for the minutes table.
export const MINUTES: { id: string; minutes: number; drift: number }[] = [
  { id: "p1", minutes: 30, drift: +6 },
  { id: "p2", minutes: 30, drift: +6 },
  { id: "p3", minutes: 30, drift: +6 },
  { id: "p4", minutes: 24, drift: 0 },
  { id: "p5", minutes: 24, drift: 0 },
  { id: "p6", minutes: 24, drift: 0 },
  { id: "p7", minutes: 24, drift: 0 },
  { id: "p8", minutes: 18, drift: -6 },
  { id: "p9", minutes: 18, drift: -6 },
  { id: "p10", minutes: 18, drift: -6 },
];
export const FLAGGED = new Set(["p1", "p2", "p3", "p8", "p9", "p10"]);

// ---- Live snapshot driven by ?phase= ----
export type Phase = "playing" | "sub-due";

export interface LiveSnapshot {
  clock: string; // mm:ss display
  halfLabel: string;
  halfIdx: 0 | 1;
  currentSegIdx: number; // global
  localSegLabel: string;
  isRunning: boolean;
  subNow: MockWave | null;
}

export function liveSnapshot(phase: Phase): LiveSnapshot {
  if (phase === "sub-due") {
    // End of segment 2 (1st half), wave at seg 3 is imminent.
    return {
      clock: "17:48",
      halfLabel: "1st Half",
      halfIdx: 0,
      currentSegIdx: 2,
      localSegLabel: "Seg 3",
      isRunning: true,
      subNow: WAVES.find((w) => w.atSegmentIndex === 3) ?? null,
    };
  }
  // mid-segment, nothing due
  return {
    clock: "08:12",
    halfLabel: "1st Half",
    halfIdx: 0,
    currentSegIdx: 1,
    localSegLabel: "Seg 2",
    isRunning: true,
    subNow: null,
  };
}

export function segmentByIndex(i: number): MockSegment {
  return SEGMENTS[Math.max(0, Math.min(SEGMENTS.length - 1, i))];
}

/** Planned minutes-played so far at a given global segment (rough, display-only). */
export function minutesSoFar(segIdx: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let s = 0; s <= segIdx; s++) {
    for (const cell of SEGMENTS[s].lineup) {
      out[cell.playerId] = (out[cell.playerId] ?? 0) + SEG_MINUTES;
    }
  }
  return out;
}
