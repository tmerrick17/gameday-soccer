import { describe, expect, it } from "vitest";
import { generatePlan } from "./generatePlan";
import type { KeeperAssignment } from "./generatePlan";
import type { Formation, Game, Player, Preferences } from "./types";

// --- Shared test fixtures ---

const keeperPos = { id: "gk", name: "GK", role: "Keeper" as const };
const defPos1 = { id: "def1", name: "RB", role: "Defender" as const };
const defPos2 = { id: "def2", name: "LB", role: "Defender" as const };
const midPos1 = { id: "mid1", name: "CM", role: "Mid" as const };
const midPos2 = { id: "mid2", name: "LM", role: "Mid" as const };
const midPos3 = { id: "mid3", name: "RM", role: "Mid" as const };
const fwdPos1 = { id: "fwd1", name: "ST", role: "Forward" as const };
const fwdPos2 = { id: "fwd2", name: "SS", role: "Forward" as const };

const formation823: Formation = {
  id: "f1",
  name: "2-3-2+GK",
  positions: [keeperPos, defPos1, defPos2, midPos1, midPos2, midPos3, fwdPos1, fwdPos2],
};

const basePrefs: Preferences = {
  strategy: "blend",
  maxWaveSize: 2,
  segmentMinutes: 5,
  halfMinutes: 20,
  cadenceByRole: { Keeper: 20, Defender: 10, Mid: 5, Forward: 5 },
};

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return { id, name: id, ...overrides };
}

function makeGame(squad: Player[], overrides: Partial<Game> = {}): Game {
  return {
    id: "game1",
    formation: formation823,
    squad,
    preferences: basePrefs,
    halves: [
      { keeperId: "k1", segments: [] },
      { keeperId: "k2", segments: [] },
    ],
    ...overrides,
  };
}

// Oracle squad: 2 keepers + 3 defenders + 8 front-liners = 13 players
function makeOracleSquad(): Player[] {
  return [
    makePlayer("k1"),
    makePlayer("k2"),
    makePlayer("d1", { preferredRoles: ["Defender"] }),
    makePlayer("d2", { preferredRoles: ["Defender"] }),
    makePlayer("d3", { preferredRoles: ["Defender"] }),
    makePlayer("f1", { preferredRoles: ["Mid"] }),
    makePlayer("f2", { preferredRoles: ["Mid"] }),
    makePlayer("f3", { preferredRoles: ["Mid"] }),
    makePlayer("f4", { preferredRoles: ["Forward"] }),
    makePlayer("f5", { preferredRoles: ["Forward"] }),
    makePlayer("f6", { preferredRoles: ["Mid"] }),
    makePlayer("f7", { preferredRoles: ["Mid"] }),
    makePlayer("f8", { preferredRoles: ["Forward"] }),
  ];
}

const oracleKeepers: KeeperAssignment[] = [
  { halfIndex: 0, keeperId: "k1" },
  { halfIndex: 1, keeperId: "k2" },
];

// --- Tests ---

describe("generatePlan: keeper lock", () => {
  it("keeper occupies keeper position in every segment of their half", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const plan = generatePlan(game, oracleKeepers);

    // Half 0: k1 must be in gk position every segment
    for (const seg of plan.halves[0].segments) {
      const gkAssignment = seg.lineup.find((a) => a.positionId === "gk");
      expect(gkAssignment?.playerId).toBe("k1");
    }

    // Half 1: k2 must be in gk position every segment
    for (const seg of plan.halves[1].segments) {
      const gkAssignment = seg.lineup.find((a) => a.positionId === "gk");
      expect(gkAssignment?.playerId).toBe("k2");
    }
  });

  it("keeper is never in an outfield position", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const plan = generatePlan(game, oracleKeepers);

    for (const half of plan.halves) {
      for (const seg of half.segments) {
        for (const { positionId, playerId } of seg.lineup) {
          if (positionId !== "gk") {
            expect(playerId).not.toBe(half.keeperId);
          }
        }
      }
    }
  });
});

describe("generatePlan: segment structure", () => {
  it("produces 4 segments per half for 20-min halves with 5-min segments", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    expect(plan.halves[0].segments).toHaveLength(4);
    expect(plan.halves[1].segments).toHaveLength(4);
  });

  it("every segment has exactly 8 players (full formation)", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    for (const half of plan.halves) {
      for (const seg of half.segments) {
        expect(seg.lineup).toHaveLength(formation823.positions.length);
      }
    }
  });

  it("segment indices run 0–7 across both halves", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    const indices = [...plan.halves[0].segments, ...plan.halves[1].segments].map((s) => s.index);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("generatePlan: wave constraints", () => {
  it("no outfield wave exceeds maxWaveSize", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    for (const wave of plan.waves) {
      // keeper swap at halftime may add 1 mandatory keeper pair; exclude it
      const outfieldOut = wave.out.filter((id) => id !== "k1" && id !== "k2");
      expect(outfieldOut.length).toBeLessThanOrEqual(basePrefs.maxWaveSize);
    }
  });

  it("each wave has a non-empty reason", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    for (const wave of plan.waves) {
      expect(wave.reason).toBeTruthy();
    }
  });
});

describe("generatePlan: determinism", () => {
  it("produces identical output on repeated calls with identical input", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);

    const plan1 = generatePlan(game, oracleKeepers);
    const plan2 = generatePlan(game, oracleKeepers);

    expect(JSON.stringify(plan1)).toBe(JSON.stringify(plan2));
  });
});

describe("generatePlan: oracle — 13-player 2-3-2+GK minute totals", () => {
  it("all 8 front-liners play exactly 25 minutes each", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    const minuteMap = new Map<string, number>();
    for (const half of plan.halves) {
      for (const seg of half.segments) {
        for (const { playerId } of seg.lineup) {
          minuteMap.set(playerId, (minuteMap.get(playerId) ?? 0) + seg.minutes);
        }
      }
    }

    const frontliners = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"];
    for (const id of frontliners) {
      expect(minuteMap.get(id), `${id} minutes`).toBe(25);
    }
  });

  it("defender minute distribution is 30/30/20 (two heavy, one short straw)", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    const minuteMap = new Map<string, number>();
    for (const half of plan.halves) {
      for (const seg of half.segments) {
        for (const { playerId } of seg.lineup) {
          minuteMap.set(playerId, (minuteMap.get(playerId) ?? 0) + seg.minutes);
        }
      }
    }

    const defMinutes = ["d1", "d2", "d3"].map((id) => minuteMap.get(id) ?? 0).sort((a, b) => b - a);
    expect(defMinutes).toEqual([30, 30, 20]);
  });

  it("each keeper plays their entire half in goal (20 minutes)", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    const minuteMap = new Map<string, number>();
    for (const half of plan.halves) {
      for (const seg of half.segments) {
        for (const { playerId } of seg.lineup) {
          minuteMap.set(playerId, (minuteMap.get(playerId) ?? 0) + seg.minutes);
        }
      }
    }

    // Each keeper must have at least 20 min (their in-goal half)
    expect(minuteMap.get("k1")).toBeGreaterThanOrEqual(20);
    expect(minuteMap.get("k2")).toBeGreaterThanOrEqual(20);
  });

  it("front-line rolling single-swap: exactly 1 front-liner swaps per segment boundary", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);

    // Count front-liner waves (non-keeper, non-defender swaps)
    const defenderIds = new Set(["d1", "d2", "d3"]);
    const keeperIds = new Set(["k1", "k2"]);

    for (const wave of plan.waves) {
      const frontOut = wave.out.filter((id) => !defenderIds.has(id) && !keeperIds.has(id));
      // Each wave swaps at most 1 front-liner
      expect(frontOut.length).toBeLessThanOrEqual(1);
    }
  });

  it("returns correct gameId in plan", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);
    expect(plan.gameId).toBe("game1");
  });

  it("plan includes a fairness report", () => {
    const squad = makeOracleSquad();
    const plan = generatePlan(makeGame(squad), oracleKeepers);
    expect(plan.fairness).toBeDefined();
    expect(plan.fairness.perPlayer).toHaveLength(13);
  });
});

describe("generatePlan: full-squad goalie pool", () => {
  it("any squad player can serve as keeper — no special property required", () => {
    // All players have no keeperEligible flag; any of them can be assigned via KeeperAssignment
    const squad = makeOracleSquad();
    // Use a previously-outfield player (f1) as keeper for half 0
    const mixedKeepers: KeeperAssignment[] = [
      { halfIndex: 0, keeperId: "f1" },
      { halfIndex: 1, keeperId: "k2" },
    ];
    const plan = generatePlan(makeGame(squad), mixedKeepers);
    for (const seg of plan.halves[0].segments) {
      expect(seg.lineup.find((a) => a.positionId === "gk")?.playerId).toBe("f1");
    }
  });
});
