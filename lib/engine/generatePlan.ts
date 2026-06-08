import { evaluate } from "./fairness";
import { formationSize } from "./formation";
import { sortByStrategy } from "./strategy";
import type { PlayerState } from "./strategy";
import type { Game, Half, Lineup, Role, RotationPlan, Segment, Wave } from "./types";

export interface KeeperAssignment {
  halfIndex: 0 | 1;
  keeperId: string;
}

interface FieldEntry {
  playerId: string;
  positionId: string;
  /** Game-clock minute when this player last entered the field. */
  shiftStartMinute: number;
}

interface PlayerAccum {
  minutesPlayed: number;
  shifts: number;
  rolesPlayed: Role[];
}

/**
 * Greedy, explainable rotation engine.
 *
 * Algorithm (per ADR 0001):
 *  - Keeper is locked for the entire half (Keeper lock invariant).
 *  - Defenders rotate at every cadenceByRole.Defender boundary (long cadence).
 *  - Front-liners (Mid + Forward) roll one-in-one-out each segment (short cadence).
 *  - Sub-out selection: longest on-field this shift → most total minutes → highest id.
 *  - Sub-in selection: sortByStrategy on the bench pool.
 *  - maxWaveSize caps total outfield subs per stoppage (keeper swap excluded).
 */
export function generatePlan(game: Game, keeperAssignments: KeeperAssignment[]): RotationPlan {
  const { formation, squad, preferences, id: gameId } = game;
  const { segmentMinutes, halfMinutes, cadenceByRole, maxWaveSize, strategy } = preferences;

  const segsPerHalf = Math.round(halfMinutes / segmentMinutes);
  const totalSegs = segsPerHalf * 2;

  // position → role lookup
  const positionRoles: Record<string, Role> = {};
  for (const p of formation.positions) positionRoles[p.id] = p.role;

  const keeperPos = formation.positions.find((p) => p.role === "Keeper")!;
  const defPositions = formation.positions.filter((p) => p.role === "Defender");
  const frontPositions = formation.positions.filter((p) => p.role !== "Keeper" && p.role !== "Defender");

  // Player accumulators — persist across halves
  const accum = new Map<string, PlayerAccum>();
  for (const p of squad) accum.set(p.id, { minutesPlayed: 0, shifts: 0, rolesPlayed: [] });

  const getPS = (id: string): PlayerState => {
    const a = accum.get(id)!;
    return { player: squad.find((p) => p.id === id)!, ...a };
  };

  // Pool membership: defenders have "Defender" in preferredRoles
  const defenderIds = new Set(squad.filter((p) => p.preferredRoles?.includes("Defender")).map((p) => p.id));
  // Front-line eligible = everyone who is not a designated defender
  const allFrontIds = squad.filter((p) => !defenderIds.has(p.id)).map((p) => p.id);

  const keeper0 = keeperAssignments.find((ka) => ka.halfIndex === 0)!.keeperId;
  const keeper1 = keeperAssignments.find((ka) => ka.halfIndex === 1)!.keeperId;

  // Sub-out sort: longest on-field → most total minutes → highest id (descending)
  const subOutSort = (a: FieldEntry, b: FieldEntry, currentMinute: number): number => {
    const aShiftMins = currentMinute - a.shiftStartMinute;
    const bShiftMins = currentMinute - b.shiftStartMinute;
    if (aShiftMins !== bShiftMins) return bShiftMins - aShiftMins; // most first
    const aTotal = accum.get(a.playerId)!.minutesPlayed;
    const bTotal = accum.get(b.playerId)!.minutesPlayed;
    if (aTotal !== bTotal) return bTotal - aTotal; // most first
    return a.playerId < b.playerId ? 1 : a.playerId > b.playerId ? -1 : 0; // highest id first
  };

  // --- Initialize field state (segment 0 of half 0) ---
  // Sort and assign initial defenders
  const sortedDefs = sortByStrategy(
    [...defenderIds].map((id) => getPS(id)),
    strategy
  );

  let defOnField: FieldEntry[] = sortedDefs.slice(0, defPositions.length).map((ps, i) => ({
    playerId: ps.player.id,
    positionId: defPositions[i].id,
    shiftStartMinute: 0,
  }));
  let defBench: string[] = sortedDefs.slice(defPositions.length).map((ps) => ps.player.id);

  for (const e of defOnField) {
    const a = accum.get(e.playerId)!;
    a.shifts++;
    a.rolesPlayed.push("Defender");
  }

  // Front-line pool for half 0 excludes keeper0
  const half0FrontIds = allFrontIds.filter((id) => id !== keeper0);
  const sortedFront = sortByStrategy(
    half0FrontIds.map((id) => getPS(id)),
    strategy
  );

  let frontOnField: FieldEntry[] = sortedFront.slice(0, frontPositions.length).map((ps, i) => ({
    playerId: ps.player.id,
    positionId: frontPositions[i].id,
    shiftStartMinute: 0,
  }));
  let frontBench: string[] = sortedFront.slice(frontPositions.length).map((ps) => ps.player.id);

  for (const e of frontOnField) {
    const a = accum.get(e.playerId)!;
    a.shifts++;
    a.rolesPlayed.push(positionRoles[e.positionId]);
  }

  let keeperEntry: FieldEntry = { playerId: keeper0, positionId: keeperPos.id, shiftStartMinute: 0 };
  const ka0 = accum.get(keeper0)!;
  ka0.shifts++;
  ka0.rolesPlayed.push("Keeper");

  // --- Main segment loop ---
  const allSegments: Segment[] = [];
  const allWaves: Wave[] = [];

  for (let segI = 0; segI < totalSegs; segI++) {
    const currentMinute = segI * segmentMinutes;

    if (segI > 0) {
      const waveIn: string[] = [];
      const waveOut: string[] = [];
      const reasons: string[] = [];
      let outfieldWaveSlotsUsed = 0;

      // 1. Halftime keeper swap (excluded from maxWaveSize)
      if (segI === segsPerHalf) {
        // Previous keeper joins front-line bench
        frontBench.push(keeper0);
        // New keeper leaves front-line bench (if they were there)
        frontBench = frontBench.filter((id) => id !== keeper1);

        keeperEntry = { playerId: keeper1, positionId: keeperPos.id, shiftStartMinute: currentMinute };
        const ka1 = accum.get(keeper1)!;
        ka1.shifts++;
        ka1.rolesPlayed.push("Keeper");

        waveOut.push(keeper0);
        waveIn.push(keeper1);
        reasons.push("Keeper change at halftime");
      }

      // 2. Defender cadence boundary: only rotate at multiples of cadenceByRole.Defender
      const isDefCadenceBoundary = currentMinute % cadenceByRole.Defender === 0;
      if (isDefCadenceBoundary && defBench.length > 0) {
        const pastCadence = defOnField
          .filter((e) => currentMinute - e.shiftStartMinute >= cadenceByRole.Defender)
          .sort((a, b) => subOutSort(a, b, currentMinute));

        if (pastCadence.length > 0) {
          const subOut = pastCadence[0];
          const sortedDefBench = sortByStrategy(defBench.map((id) => getPS(id)), strategy);
          const subIn = sortedDefBench[0];

          waveOut.push(subOut.playerId);
          waveIn.push(subIn.player.id);
          reasons.push(
            `Defender rotation (cadence served): ${subIn.player.id} replaces ${subOut.playerId}`
          );

          defOnField = defOnField.map((e) =>
            e.playerId === subOut.playerId
              ? { playerId: subIn.player.id, positionId: e.positionId, shiftStartMinute: currentMinute }
              : e
          );
          defBench = defBench.filter((id) => id !== subIn.player.id);
          defBench.push(subOut.playerId);

          const inAccum = accum.get(subIn.player.id)!;
          inAccum.shifts++;
          inAccum.rolesPlayed.push("Defender");

          outfieldWaveSlotsUsed++;
        }
      }

      // 3. Front-line rolling single-swap (one per segment, if slot available)
      if (outfieldWaveSlotsUsed < maxWaveSize && frontBench.length > 0) {
        const pastCadence = frontOnField
          .filter((e) => {
            const role = positionRoles[e.positionId];
            return currentMinute - e.shiftStartMinute >= cadenceByRole[role];
          })
          .sort((a, b) => subOutSort(a, b, currentMinute));

        if (pastCadence.length > 0) {
          const subOut = pastCadence[0];
          const sortedFrontBench = sortByStrategy(frontBench.map((id) => getPS(id)), strategy);
          const subIn = sortedFrontBench[0];

          waveOut.push(subOut.playerId);
          waveIn.push(subIn.player.id);
          reasons.push(
            `Equal-time rotation: ${subIn.player.id} replaces ${subOut.playerId}`
          );

          const inheritedPositionId = subOut.positionId;
          frontOnField = frontOnField.map((e) =>
            e.playerId === subOut.playerId
              ? { playerId: subIn.player.id, positionId: inheritedPositionId, shiftStartMinute: currentMinute }
              : e
          );
          frontBench = frontBench.filter((id) => id !== subIn.player.id);
          frontBench.push(subOut.playerId);

          const inAccum = accum.get(subIn.player.id)!;
          inAccum.shifts++;
          inAccum.rolesPlayed.push(positionRoles[inheritedPositionId]);
        }
      }

      if (waveIn.length > 0) {
        allWaves.push({
          atSegmentIndex: segI,
          in: waveIn,
          out: waveOut,
          reason: reasons.join("; "),
        });
      }
    }

    // Build lineup
    const lineup: Lineup = [
      { positionId: keeperEntry.positionId, playerId: keeperEntry.playerId },
      ...defOnField.map((e) => ({ positionId: e.positionId, playerId: e.playerId })),
      ...frontOnField.map((e) => ({ positionId: e.positionId, playerId: e.playerId })),
    ];

    allSegments.push({ index: segI, minutes: segmentMinutes, lineup });

    // Accumulate minutes
    for (const { playerId } of lineup) {
      accum.get(playerId)!.minutesPlayed += segmentMinutes;
    }
  }

  const half0Segs = allSegments.slice(0, segsPerHalf);
  const half1Segs = allSegments.slice(segsPerHalf);

  const halves: [Half, Half] = [
    { keeperId: keeper0, segments: half0Segs },
    { keeperId: keeper1, segments: half1Segs },
  ];

  const fairness = evaluate({ halves }, positionRoles);

  return { gameId, halves, waves: allWaves, fairness };
}
