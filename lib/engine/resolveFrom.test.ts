import { describe, expect, it } from "vitest";
import { generatePlan } from "./generatePlan";
import type { KeeperAssignment } from "./generatePlan";
import { resolveFrom } from "./resolveFrom";
import type { LiveState } from "./resolveFrom";
import type { Formation, Game, Player, Preferences, RotationPlan, Segment } from "./types";

// --- Shared fixtures (mirrors generatePlan.test.ts) ---

const formation823: Formation = {
  id: "f1",
  name: "2-3-2+GK",
  positions: [
    { id: "gk", name: "GK", role: "Keeper" },
    { id: "def1", name: "RB", role: "Defender" },
    { id: "def2", name: "LB", role: "Defender" },
    { id: "mid1", name: "CM", role: "Mid" },
    { id: "mid2", name: "LM", role: "Mid" },
    { id: "mid3", name: "RM", role: "Mid" },
    { id: "fwd1", name: "ST", role: "Forward" },
    { id: "fwd2", name: "SS", role: "Forward" },
  ],
};

const basePrefs: Preferences = {
  strategy: "blend",
  maxWaveSize: 2,
  segmentMinutes: 5,
  halfMinutes: 20,
  cadenceByRole: { Keeper: 20, Defender: 10, Mid: 5, Forward: 5 },
};

function makeOracleSquad(): Player[] {
  return [
    { id: "k1", name: "k1", keeperEligible: true },
    { id: "k2", name: "k2", keeperEligible: true },
    { id: "d1", name: "d1", preferredRoles: ["Defender"] },
    { id: "d2", name: "d2", preferredRoles: ["Defender"] },
    { id: "d3", name: "d3", preferredRoles: ["Defender"] },
    { id: "f1", name: "f1", preferredRoles: ["Mid"] },
    { id: "f2", name: "f2", preferredRoles: ["Mid"] },
    { id: "f3", name: "f3", preferredRoles: ["Mid"] },
    { id: "f4", name: "f4", preferredRoles: ["Forward"] },
    { id: "f5", name: "f5", preferredRoles: ["Forward"] },
    { id: "f6", name: "f6", preferredRoles: ["Mid"] },
    { id: "f7", name: "f7", preferredRoles: ["Mid"] },
    { id: "f8", name: "f8", preferredRoles: ["Forward"] },
  ];
}

function makeGame(squad: Player[]): Game {
  return {
    id: "game1",
    formation: formation823,
    squad,
    preferences: basePrefs,
    halves: [
      { keeperId: "k1", segments: [] },
      { keeperId: "k2", segments: [] },
    ],
  };
}

const oracleKeepers: KeeperAssignment[] = [
  { halfIndex: 0, keeperId: "k1" },
  { halfIndex: 1, keeperId: "k2" },
];

/** Build a minutesPlayed map from all segments in a plan up to (but NOT including) atSegmentIndex. */
function buildMinutesPlayed(plan: RotationPlan, upToSegment: number): Record<string, number> {
  const map: Record<string, number> = {};
  const allSegs = [...plan.halves[0].segments, ...plan.halves[1].segments];
  for (const seg of allSegs) {
    if (seg.index >= upToSegment) break;
    for (const { playerId } of seg.lineup) {
      map[playerId] = (map[playerId] ?? 0) + seg.minutes;
    }
  }
  return map;
}

function flatSegments(plan: RotationPlan): Segment[] {
  return [...plan.halves[0].segments, ...plan.halves[1].segments].sort((a, b) => a.index - b.index);
}

// --- Tests ---

describe("resolveFrom: past segments unchanged", () => {
  it("segments before atSegmentIndex are identical to originalPlan", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4; // re-solve from start of half 2
    const liveState: LiveState = { minutesPlayed: buildMinutesPlayed(original, AT) };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const origSegs = flatSegments(original);
    const resolvedSegs = flatSegments(resolved);

    for (let i = 0; i < AT; i++) {
      expect(JSON.stringify(resolvedSegs[i])).toBe(JSON.stringify(origSegs[i]));
    }
  });

  it("past waves before atSegmentIndex are preserved", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4;
    const liveState: LiveState = { minutesPlayed: buildMinutesPlayed(original, AT) };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const pastWaves = original.waves.filter((w) => w.atSegmentIndex < AT);
    const resolvedPastWaves = resolved.waves.filter((w) => w.atSegmentIndex < AT);
    expect(JSON.stringify(resolvedPastWaves)).toBe(JSON.stringify(pastWaves));
  });
});

describe("resolveFrom: absent player (squad shrink)", () => {
  it("absent player does not appear in any segment from atSegmentIndex onwards", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4;
    // Pick a front-liner who is on the field at segment AT
    const seg4Lineup = flatSegments(original).find((s) => s.index === AT)!.lineup;
    const absentId = seg4Lineup.find(
      (a) => !["k1", "k2", "d1", "d2", "d3"].includes(a.playerId)
    )!.playerId;

    const liveState: LiveState = {
      minutesPlayed: buildMinutesPlayed(original, AT),
      absentPlayerIds: [absentId],
    };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const futureSegs = flatSegments(resolved).filter((s) => s.index >= AT);
    for (const seg of futureSegs) {
      expect(seg.lineup.every((a) => a.playerId !== absentId)).toBe(true);
    }
  });

  it("absent player who was on bench still does not appear in future segments", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4;
    const seg4Lineup = flatSegments(original).find((s) => s.index === AT)!.lineup;
    const onFieldIds = new Set(seg4Lineup.map((a) => a.playerId));
    // Pick a front-liner who is on the BENCH at segment AT
    const absentId = squad
      .filter((p) => !["k1", "k2", "d1", "d2", "d3"].includes(p.id) && !onFieldIds.has(p.id))
      .map((p) => p.id)[0];

    const liveState: LiveState = {
      minutesPlayed: buildMinutesPlayed(original, AT),
      absentPlayerIds: [absentId],
    };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const futureSegs = flatSegments(resolved).filter((s) => s.index >= AT);
    for (const seg of futureSegs) {
      expect(seg.lineup.every((a) => a.playerId !== absentId)).toBe(true);
    }
  });
});

describe("resolveFrom: force-off override", () => {
  it("force-off player does not appear in any segment from atSegmentIndex onwards", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 2; // mid first-half
    const seg2Lineup = flatSegments(original).find((s) => s.index === AT)!.lineup;
    const forcedOffId = seg2Lineup.find(
      (a) => !["k1", "k2", "d1", "d2", "d3"].includes(a.playerId)
    )!.playerId;

    const liveState: LiveState = {
      minutesPlayed: buildMinutesPlayed(original, AT),
      overrides: [{ type: "force-off", playerId: forcedOffId }],
    };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const futureSegs = flatSegments(resolved).filter((s) => s.index >= AT);
    for (const seg of futureSegs) {
      expect(seg.lineup.every((a) => a.playerId !== forcedOffId)).toBe(true);
    }
  });
});

describe("resolveFrom: keep-on override", () => {
  it("keep-on player appears in every segment from atSegmentIndex onwards", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 1; // early in first half
    const seg1Lineup = flatSegments(original).find((s) => s.index === AT)!.lineup;
    // Pick a front-liner on field at AT (not the keeper or defenders)
    const keepOnId = seg1Lineup.find(
      (a) => !["k1", "k2", "d1", "d2", "d3"].includes(a.playerId)
    )!.playerId;

    const liveState: LiveState = {
      minutesPlayed: buildMinutesPlayed(original, AT),
      overrides: [{ type: "keep-on", playerId: keepOnId }],
    };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const futureSegs = flatSegments(resolved).filter((s) => s.index >= AT);
    for (const seg of futureSegs) {
      expect(seg.lineup.some((a) => a.playerId === keepOnId)).toBe(true);
    }
  });
});

describe("resolveFrom: determinism", () => {
  it("same inputs produce identical output", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 3;
    const liveState: LiveState = {
      minutesPlayed: buildMinutesPlayed(original, AT),
      absentPlayerIds: ["f3"],
    };

    const r1 = resolveFrom(original, game, oracleKeepers, liveState, AT);
    const r2 = resolveFrom(original, game, oracleKeepers, liveState, AT);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

describe("resolveFrom: re-solve produces valid plan", () => {
  it("every future segment has exactly 8 players on field (or fewer if squad too small)", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4;
    const liveState: LiveState = { minutesPlayed: buildMinutesPlayed(original, AT) };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    const futureSegs = flatSegments(resolved).filter((s) => s.index >= AT);
    for (const seg of futureSegs) {
      expect(seg.lineup.length).toBe(8);
    }
  });

  it("absent player's minutes do not grow beyond what was played before the re-solve point", () => {
    const squad = makeOracleSquad();
    const game = makeGame(squad);
    const original = generatePlan(game, oracleKeepers);

    const AT = 4;
    const minutesBeforeAT = buildMinutesPlayed(original, AT);
    const liveState: LiveState = {
      minutesPlayed: minutesBeforeAT,
      absentPlayerIds: ["f8"],
    };
    const resolved = resolveFrom(original, game, oracleKeepers, liveState, AT);

    expect(resolved.fairness.perPlayer.length).toBeGreaterThan(0);
    // f8's minutes in the report must equal what they played before the re-solve (no future minutes)
    const f8Entry = resolved.fairness.perPlayer.find((p) => p.playerId === "f8");
    const f8MinutesBefore = minutesBeforeAT["f8"] ?? 0;
    expect(f8Entry?.minutes ?? 0).toBe(f8MinutesBefore);
  });
});
