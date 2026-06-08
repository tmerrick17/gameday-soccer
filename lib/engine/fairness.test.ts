import { describe, expect, it } from "vitest";
import { evaluate } from "./fairness";
import type { Role } from "./types";

// positionId → Role map for tests
const roles: Record<string, Role> = {
  fwd: "Forward",
  mid: "Mid",
  def: "Defender",
  gk: "Keeper",
};

// Build a minimal plan: one half with one segment per call.
function makePlan(segments: Array<{ minutes: number; lineup: Array<{ positionId: string; playerId: string }> }>) {
  return {
    halves: [
      { segments },
    ],
  };
}

// Helper: two-player plan where p1 plays all segments and p2 plays fewer.
function unequalPlan() {
  return makePlan([
    { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }, { positionId: "mid", playerId: "p2" }] },
    { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }, { positionId: "mid", playerId: "p2" }] },
    { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }] }, // p2 sits out last segment
    { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }] }, // p2 sits out last segment
  ]);
}

describe("evaluate: equal minutes across all players", () => {
  it("produces zero drift and no flagged players", () => {
    const plan = makePlan([
      { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }, { positionId: "mid", playerId: "p2" }, { positionId: "def", playerId: "p3" }] },
      { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }, { positionId: "mid", playerId: "p2" }, { positionId: "def", playerId: "p3" }] },
    ]);
    const report = evaluate(plan, roles);
    expect(report.flagged).toEqual([]);
    for (const pm of report.perPlayer) {
      expect(pm.drift).toBe(0);
    }
  });
});

describe("evaluate: player with significantly fewer minutes", () => {
  it("flags the light player and reports correct minutes + drift", () => {
    // p1 = 40 min, p2 = 20 min; mean = 30; drift p1=+10, p2=-10; threshold 8 → both flagged
    const plan = unequalPlan();
    const report = evaluate(plan, roles);
    const p2 = report.perPlayer.find((p) => p.playerId === "p2")!;
    expect(p2.minutes).toBe(20);
    expect(p2.drift).toBe(-10);
    expect(report.flagged).toContain("p2");
  });
});

describe("evaluate: non-defender running heavy", () => {
  it("flags the heavy non-defender", () => {
    // p1 (Forward) plays all 4 segments, p2 plays 2 → p1 is heavy
    const plan = unequalPlan();
    const report = evaluate(plan, roles);
    const p1 = report.perPlayer.find((p) => p.playerId === "p1")!;
    expect(p1.drift).toBe(10);
    expect(report.flagged).toContain("p1");
  });
});

describe("evaluate: defender running hot (ADR 0003 — not an error)", () => {
  it("does NOT flag a defender with positive drift within the run-hot band", () => {
    // def1 (Defender) plays all 4 × 10 min segments = 40 min
    // fwd1 (Forward) plays 2 × 10 min = 20 min
    // mean = 30; def1 drift = +10; BUT def1 is a pure Defender → exempt
    const plan = makePlan([
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }, { positionId: "fwd", playerId: "fwd1" }] },
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }, { positionId: "fwd", playerId: "fwd1" }] },
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }] },
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }] },
    ]);
    const report = evaluate(plan, roles);
    expect(report.flagged).not.toContain("def1");
  });
});

describe("evaluate: defender running light is still flagged", () => {
  it("flags a Defender with negative drift beyond threshold", () => {
    // def1 plays 2 segments = 20 min; fwd1 plays 4 segments = 40 min; mean = 30
    // def1 drift = -10 — light, even for a Defender, is a real issue
    const plan = makePlan([
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }, { positionId: "fwd", playerId: "fwd1" }] },
      { minutes: 10, lineup: [{ positionId: "def", playerId: "def1" }, { positionId: "fwd", playerId: "fwd1" }] },
      { minutes: 10, lineup: [{ positionId: "fwd", playerId: "fwd1" }] },
      { minutes: 10, lineup: [{ positionId: "fwd", playerId: "fwd1" }] },
    ]);
    const report = evaluate(plan, roles);
    expect(report.flagged).toContain("def1");
  });
});

describe("evaluate: custom flagThresholdMinutes", () => {
  it("does not flag players within a tighter threshold", () => {
    // p1 = 40 min, p2 = 20 min, mean = 30, drift = ±10; threshold 15 → nobody flagged
    const plan = unequalPlan();
    const report = evaluate(plan, roles, 15);
    expect(report.flagged).toEqual([]);
  });
});

describe("evaluate: does not mutate the input plan", () => {
  it("leaves all halves/segments/lineups unchanged", () => {
    const plan = makePlan([
      { minutes: 10, lineup: [{ positionId: "fwd", playerId: "p1" }] },
    ]);
    const before = JSON.stringify(plan);
    evaluate(plan, roles);
    expect(JSON.stringify(plan)).toBe(before);
  });
});
