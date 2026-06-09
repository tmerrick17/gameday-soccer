import { describe, expect, it } from "vitest";
import { currentSegmentIndex, nextWave } from "./live";
import type { RotationPlan } from "./types";

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
