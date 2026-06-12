import { describe, expect, it } from "vitest";
import { currentSegmentIndex, nextWave, adjustKeepersForLiveEdit } from "./live";
import type { RotationPlan } from "./types";
import type { KeeperAssignment } from "./generatePlan";

// ── currentSegmentIndex ───────────────────────────────────────────────────────

describe("currentSegmentIndex", () => {
  it("returns 0 at the start of the game (0 seconds)", () => {
    expect(currentSegmentIndex(0, 6)).toBe(0);
  });

  it("returns 0 while still within the first segment (59s < 6 min)", () => {
    expect(currentSegmentIndex(59, 6)).toBe(0);
  });

  it("returns 1 at exactly one segment elapsed (6 min = 360 s)", () => {
    expect(currentSegmentIndex(360, 6)).toBe(1);
  });

  it("returns 1 for any second within the second segment", () => {
    expect(currentSegmentIndex(361, 6)).toBe(1);
    expect(currentSegmentIndex(719, 6)).toBe(1);
  });

  it("returns 2 at exactly two segments elapsed", () => {
    expect(currentSegmentIndex(720, 6)).toBe(2);
  });

  it("works with a different segment length (5 min)", () => {
    expect(currentSegmentIndex(300, 5)).toBe(1);
    expect(currentSegmentIndex(599, 5)).toBe(1);
    expect(currentSegmentIndex(600, 5)).toBe(2);
  });
});

// ── nextWave ──────────────────────────────────────────────────────────────────

const STUB_PLAN: RotationPlan = {
  gameId: "g1",
  halves: [
    { keeperId: "k1", segments: [] },
    { keeperId: "k2", segments: [] },
  ],
  waves: [
    { atSegmentIndex: 2, in: ["p3"], out: ["p1"], reason: "fewest minutes" },
    { atSegmentIndex: 4, in: ["p1"], out: ["p2"], reason: "fewest minutes" },
    { atSegmentIndex: 7, in: ["p2"], out: ["p3"], reason: "fewest minutes" },
  ],
  fairness: { perPlayer: [], flagged: [] },
};

describe("nextWave", () => {
  it("returns null when there are no waves in the plan", () => {
    const emptyPlan = { ...STUB_PLAN, waves: [] };
    expect(nextWave(emptyPlan, 0)).toBeNull();
  });

  it("returns the first wave when current index is before it", () => {
    const wave = nextWave(STUB_PLAN, 0);
    expect(wave).not.toBeNull();
    expect(wave!.atSegmentIndex).toBe(2);
  });

  it("returns the wave at exactly the current index (wave happening now)", () => {
    const wave = nextWave(STUB_PLAN, 2);
    expect(wave!.atSegmentIndex).toBe(2);
  });

  it("returns the next wave after the current index", () => {
    const wave = nextWave(STUB_PLAN, 3);
    expect(wave!.atSegmentIndex).toBe(4);
  });

  it("returns null when all waves are in the past", () => {
    expect(nextWave(STUB_PLAN, 10)).toBeNull();
  });

  it("returns the closest upcoming wave, not a distant one", () => {
    const wave = nextWave(STUB_PLAN, 5);
    expect(wave!.atSegmentIndex).toBe(7);
  });
});

// ── adjustKeepersForLiveEdit ──────────────────────────────────────────────────

const ORIG_KEEPERS: KeeperAssignment[] = [
  { halfIndex: 0, keeperId: "k-orig-0" },
  { halfIndex: 1, keeperId: "k-orig-1" },
];

const NEW_KEEPERS: KeeperAssignment[] = [
  { halfIndex: 0, keeperId: "k-new-0" },
  { halfIndex: 1, keeperId: "k-new-1" },
];

const SEGS_PER_HALF = 4;

describe("adjustKeepersForLiveEdit", () => {
  it("in first half: locks half-0 keeper to original, allows half-1 change", () => {
    const adjusted = adjustKeepersForLiveEdit(2, SEGS_PER_HALF, ORIG_KEEPERS, NEW_KEEPERS);
    const half0 = adjusted.find((ka) => ka.halfIndex === 0)!;
    const half1 = adjusted.find((ka) => ka.halfIndex === 1)!;
    expect(half0.keeperId).toBe("k-orig-0");
    expect(half1.keeperId).toBe("k-new-1");
  });

  it("in second half: locks both keepers to originals regardless of new selections", () => {
    const adjusted = adjustKeepersForLiveEdit(5, SEGS_PER_HALF, ORIG_KEEPERS, NEW_KEEPERS);
    const half0 = adjusted.find((ka) => ka.halfIndex === 0)!;
    const half1 = adjusted.find((ka) => ka.halfIndex === 1)!;
    expect(half0.keeperId).toBe("k-orig-0");
    expect(half1.keeperId).toBe("k-orig-1");
  });

  it("at the exact half boundary (segIdx === segsPerHalf) treats it as second half", () => {
    const adjusted = adjustKeepersForLiveEdit(SEGS_PER_HALF, SEGS_PER_HALF, ORIG_KEEPERS, NEW_KEEPERS);
    expect(adjusted.find((ka) => ka.halfIndex === 1)!.keeperId).toBe("k-orig-1");
  });

  it("returns exactly two keeper assignments with halfIndex 0 and 1", () => {
    const adjusted = adjustKeepersForLiveEdit(1, SEGS_PER_HALF, ORIG_KEEPERS, NEW_KEEPERS);
    expect(adjusted).toHaveLength(2);
    expect(adjusted.some((ka) => ka.halfIndex === 0)).toBe(true);
    expect(adjusted.some((ka) => ka.halfIndex === 1)).toBe(true);
  });
});
