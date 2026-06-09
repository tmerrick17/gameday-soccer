import { describe, expect, it } from "vitest";
import { computeSeasonTotals, suggestNextKeepers } from "./season";
import type { RotationPlan } from "./types";
import type { KeeperAssignment } from "./generatePlan";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlan(
  gameId: string,
  assignments: Array<{ playerId: string; minutes: number }>[]
): RotationPlan {
  return {
    gameId,
    halves: [
      {
        keeperId: "k1",
        segments: assignments.map((lineup, idx) => ({
          index: idx,
          minutes: lineup[0]?.minutes ?? 6,
          lineup: lineup.map((a) => ({
            positionId: `pos-${a.playerId}`,
            playerId: a.playerId,
          })),
        })),
      },
      { keeperId: "k2", segments: [] },
    ],
    waves: [],
    fairness: { perPlayer: [], flagged: [] },
  };
}

// ── computeSeasonTotals ───────────────────────────────────────────────────────

describe("computeSeasonTotals", () => {
  it("returns empty totals for no games", () => {
    const result = computeSeasonTotals([]);
    expect(result.perPlayer).toEqual({});
  });

  it("accumulates minutes for a single game with one segment", () => {
    const plan = makePlan("g1", [
      [{ playerId: "p1", minutes: 6 }, { playerId: "p2", minutes: 6 }],
    ]);
    const result = computeSeasonTotals([plan]);
    expect(result.perPlayer).toEqual({ p1: 6, p2: 6 });
  });

  it("accumulates minutes across multiple segments", () => {
    const plan = makePlan("g1", [
      [{ playerId: "p1", minutes: 6 }],
      [{ playerId: "p1", minutes: 6 }],
      [{ playerId: "p2", minutes: 6 }],
    ]);
    const result = computeSeasonTotals([plan]);
    expect(result.perPlayer).toEqual({ p1: 12, p2: 6 });
  });

  it("sums minutes correctly across multiple games", () => {
    const plan1 = makePlan("g1", [
      [{ playerId: "p1", minutes: 6 }, { playerId: "p2", minutes: 6 }],
    ]);
    const plan2 = makePlan("g2", [
      [{ playerId: "p1", minutes: 6 }, { playerId: "p3", minutes: 6 }],
    ]);
    const result = computeSeasonTotals([plan1, plan2]);
    expect(result.perPlayer).toEqual({ p1: 12, p2: 6, p3: 6 });
  });

  it("uses the segment's own minutes value (not a fixed constant)", () => {
    const plan: RotationPlan = {
      gameId: "g1",
      halves: [
        {
          keeperId: "k1",
          segments: [
            { index: 0, minutes: 5, lineup: [{ positionId: "gk", playerId: "p1" }] },
            { index: 1, minutes: 8, lineup: [{ positionId: "gk", playerId: "p1" }] },
          ],
        },
        { keeperId: "k1", segments: [] },
      ],
      waves: [],
      fairness: { perPlayer: [], flagged: [] },
    };
    const result = computeSeasonTotals([plan]);
    expect(result.perPlayer["p1"]).toBe(13);
  });
});

// ── suggestNextKeepers ────────────────────────────────────────────────────────

describe("suggestNextKeepers", () => {
  it("swaps half-1 and half-2 keepers for the next game", () => {
    const last: KeeperAssignment[] = [
      { halfIndex: 0, keeperId: "alice" },
      { halfIndex: 1, keeperId: "bob" },
    ];
    const next = suggestNextKeepers(last);
    expect(next).toEqual([
      { halfIndex: 0, keeperId: "bob" },
      { halfIndex: 1, keeperId: "alice" },
    ]);
  });

  it("keeps both halves unchanged when the same keeper played both halves (fixed mode)", () => {
    const last: KeeperAssignment[] = [
      { halfIndex: 0, keeperId: "alice" },
      { halfIndex: 1, keeperId: "alice" },
    ];
    const next = suggestNextKeepers(last);
    expect(next).toEqual([
      { halfIndex: 0, keeperId: "alice" },
      { halfIndex: 1, keeperId: "alice" },
    ]);
  });

  it("returns an empty array when no prior assignments exist", () => {
    expect(suggestNextKeepers([])).toEqual([]);
  });
});
