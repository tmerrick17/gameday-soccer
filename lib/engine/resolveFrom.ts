import { evaluate } from "./fairness";
import type { KeeperAssignment } from "./generatePlan";
import { sortByStrategy } from "./strategy";
import type { PlayerState } from "./strategy";
import type { Game, Half, Lineup, Role, RotationPlan, Segment, Wave } from "./types";

export interface Override {
  type: "keep-on" | "force-off";
  playerId: string;
}

export interface LiveState {
  /** Actual minutes played by each player up to (not including) the re-solve point. */
  minutesPlayed: Record<string, number>;
  /** Per-player overrides applied at the re-solve point. */
  overrides?: Override[];
  /** Players removed from the squad (injury, absence) — never appear after atSegmentIndex. */
  absentPlayerIds?: string[];
}

interface FieldEntry {
  playerId: string;
  positionId: string;
  shiftStartMinute: number;
}

interface PlayerAccum {
  minutesPlayed: number;
  shifts: number;
  rolesPlayed: Role[];
}

/**
 * Re-solves the rotation plan from atSegmentIndex onwards, preserving past segments
 * and re-balancing remaining minutes toward the Strategy objective.
 *
 * Use cases:
 *  - Manual override: keep a player on (bathroom break done) or force off (injury)
 *  - Squad shrink: a player leaves the game entirely
 *  - Any mid-game deviation from the original plan
 */
export function resolveFrom(
  originalPlan: RotationPlan,
  game: Game,
  keeperAssignments: KeeperAssignment[],
  liveState: LiveState,
  atSegmentIndex: number
): RotationPlan {
  const { formation, squad, preferences, id: gameId } = game;
  const { segmentMinutes, halfMinutes, cadenceByRole, maxWaveSize, strategy } = preferences;

  const segsPerHalf = Math.round(halfMinutes / segmentMinutes);
  const totalSegs = segsPerHalf * 2;

  const positionRoles: Record<string, Role> = {};
  for (const p of formation.positions) positionRoles[p.id] = p.role;

  const keeperPos = formation.positions.find((p) => p.role === "Keeper")!;
  const defPositions = formation.positions.filter((p) => p.role === "Defender");
  const frontPositions = formation.positions.filter((p) => p.role !== "Keeper" && p.role !== "Defender");

  const keeper0 = keeperAssignments.find((ka) => ka.halfIndex === 0)!.keeperId;
  const keeper1 = keeperAssignments.find((ka) => ka.halfIndex === 1)!.keeperId;

  const absentIds = new Set(liveState.absentPlayerIds ?? []);
  const keepOnIds = new Set((liveState.overrides ?? []).filter((o) => o.type === "keep-on").map((o) => o.playerId));
  const forceOffIds = new Set((liveState.overrides ?? []).filter((o) => o.type === "force-off").map((o) => o.playerId));

  // Flatten and sort original segments
  const allOrigSegs: Segment[] = [...originalPlan.halves[0].segments, ...originalPlan.halves[1].segments].sort(
    (a, b) => a.index - b.index
  );
  const pastSegs = allOrigSegs.filter((s) => s.index < atSegmentIndex);
  const pastWaves = originalPlan.waves.filter((w) => w.atSegmentIndex < atSegmentIndex);

  // Pool membership
  const defenderIds = new Set(
    squad.filter((p) => p.preferredRoles?.includes("Defender") && !absentIds.has(p.id)).map((p) => p.id)
  );

  // Build player accumulators from liveState + past segment structure
  const accum = new Map<string, PlayerAccum>();
  for (const p of squad) {
    if (absentIds.has(p.id)) continue;
    const minutes = liveState.minutesPlayed[p.id] ?? 0;
    let shifts = 0;
    const rolesPlayed: Role[] = [];
    let prevOnField = false;
    for (const seg of pastSegs) {
      const assignment = seg.lineup.find((a) => a.playerId === p.id);
      const onField = !!assignment;
      if (onField && !prevOnField) shifts++;
      if (assignment) rolesPlayed.push(positionRoles[assignment.positionId]);
      prevOnField = onField;
    }
    accum.set(p.id, { minutesPlayed: minutes, shifts, rolesPlayed });
  }

  const getPS = (id: string): PlayerState => {
    const a = accum.get(id)!;
    return { player: squad.find((p) => p.id === id)!, ...a };
  };

  // Sub-out sort: keep-on players sort last (never exit), then FIFO → total minutes → highest id
  const subOutSort = (a: FieldEntry, b: FieldEntry, currentMinute: number): number => {
    const aKeepOn = keepOnIds.has(a.playerId) ? 1 : 0;
    const bKeepOn = keepOnIds.has(b.playerId) ? 1 : 0;
    if (aKeepOn !== bKeepOn) return aKeepOn - bKeepOn; // keep-on sorts last (larger = later)
    const aShiftMins = currentMinute - a.shiftStartMinute;
    const bShiftMins = currentMinute - b.shiftStartMinute;
    if (aShiftMins !== bShiftMins) return bShiftMins - aShiftMins;
    const aTotal = accum.get(a.playerId)!.minutesPlayed;
    const bTotal = accum.get(b.playerId)!.minutesPlayed;
    if (aTotal !== bTotal) return bTotal - aTotal;
    return a.playerId < b.playerId ? 1 : a.playerId > b.playerId ? -1 : 0;
  };

  // Determine the current keeper (which half atSegmentIndex falls in)
  const currentHalfIdx: 0 | 1 = atSegmentIndex < segsPerHalf ? 0 : 1;
  const currentKeeperId = currentHalfIdx === 0 ? keeper0 : keeper1;

  // Get the field state from the last past segment
  const lastPastLineup: Lineup = pastSegs.length > 0 ? pastSegs[pastSegs.length - 1].lineup : [];

  // Compute shiftStartMinute for currently on-field players (scan back through pastSegs)
  const shiftStartMinutes = new Map<string, number>();
  for (const { playerId } of lastPastLineup) {
    let shiftStart = (atSegmentIndex - 1) * segmentMinutes;
    for (let i = pastSegs.length - 2; i >= 0; i--) {
      if (pastSegs[i].lineup.some((a) => a.playerId === playerId)) {
        shiftStart = pastSegs[i].index * segmentMinutes;
      } else {
        break;
      }
    }
    shiftStartMinutes.set(playerId, shiftStart);
  }

  // Build initial field state, removing absent and force-off players
  let keeperEntry: FieldEntry = {
    playerId: currentKeeperId,
    positionId: keeperPos.id,
    shiftStartMinute: currentHalfIdx * halfMinutes,
  };

  const occupiedIds = new Set([currentKeeperId]);
  const emptyPositions: Array<{ positionId: string; role: Role; isDefender: boolean }> = [];
  let defOnField: FieldEntry[] = [];
  let frontOnField: FieldEntry[] = [];

  if (lastPastLineup.length > 0) {
    for (const { positionId, playerId } of lastPastLineup) {
      if (positionId === keeperPos.id) continue;
      if (absentIds.has(playerId) || forceOffIds.has(playerId)) {
        emptyPositions.push({
          positionId,
          role: positionRoles[positionId],
          isDefender: defPositions.some((p) => p.id === positionId),
        });
      } else if (!absentIds.has(playerId)) {
        occupiedIds.add(playerId);
        const entry: FieldEntry = {
          playerId,
          positionId,
          shiftStartMinute: shiftStartMinutes.get(playerId) ?? (atSegmentIndex - 1) * segmentMinutes,
        };
        if (defPositions.some((dp) => dp.id === positionId)) {
          defOnField.push(entry);
        } else {
          frontOnField.push(entry);
        }
      }
    }
  } else {
    // atSegmentIndex === 0: fresh start (same as generatePlan initial assignment)
    const sortedDefs = sortByStrategy([...defenderIds].map((id) => getPS(id)), strategy);
    defOnField = sortedDefs.slice(0, defPositions.length).map((ps, i) => ({
      playerId: ps.player.id,
      positionId: defPositions[i].id,
      shiftStartMinute: 0,
    }));
    for (const e of defOnField) {
      occupiedIds.add(e.playerId);
      const a = accum.get(e.playerId)!;
      a.shifts++;
      a.rolesPlayed.push("Defender");
    }

    const frontIds = squad
      .filter((p) => !defenderIds.has(p.id) && !absentIds.has(p.id) && p.id !== currentKeeperId)
      .map((p) => p.id);
    const sortedFront = sortByStrategy(frontIds.map((id) => getPS(id)), strategy);
    frontOnField = sortedFront.slice(0, frontPositions.length).map((ps, i) => ({
      playerId: ps.player.id,
      positionId: frontPositions[i].id,
      shiftStartMinute: 0,
    }));
    for (const e of frontOnField) {
      occupiedIds.add(e.playerId);
      const a = accum.get(e.playerId)!;
      a.shifts++;
      a.rolesPlayed.push(positionRoles[e.positionId]);
    }
    const ka = accum.get(currentKeeperId);
    if (ka) { ka.shifts++; ka.rolesPlayed.push("Keeper"); }
  }

  // Build bench pools from players not on field
  const availablePlayers = squad.filter(
    (p) => !absentIds.has(p.id) && !forceOffIds.has(p.id) && !occupiedIds.has(p.id)
  );
  let defBench: string[] = availablePlayers.filter((p) => defenderIds.has(p.id)).map((p) => p.id);
  let frontBench: string[] = availablePlayers
    .filter((p) => !defenderIds.has(p.id) && p.id !== currentKeeperId)
    .map((p) => p.id);

  // Fill empty positions immediately (from force-off / absence on field)
  const immediateWaveIn: string[] = [];
  const immediateWaveOut: string[] = [
    ...[...forceOffIds].filter((id) => lastPastLineup.some((a) => a.playerId === id)),
    ...[...absentIds].filter((id) => lastPastLineup.some((a) => a.playerId === id)),
  ];
  const immediateReasons: string[] = [];

  for (const empty of emptyPositions) {
    const bench = empty.isDefender ? defBench : frontBench;
    if (bench.length > 0) {
      const sorted = sortByStrategy(bench.map((id) => getPS(id)), strategy);
      const subIn = sorted[0];
      const entry: FieldEntry = {
        playerId: subIn.player.id,
        positionId: empty.positionId,
        shiftStartMinute: atSegmentIndex * segmentMinutes,
      };
      if (empty.isDefender) {
        defOnField.push(entry);
        defBench = defBench.filter((id) => id !== subIn.player.id);
      } else {
        frontOnField.push(entry);
        frontBench = frontBench.filter((id) => id !== subIn.player.id);
      }
      const inAccum = accum.get(subIn.player.id)!;
      inAccum.shifts++;
      inAccum.rolesPlayed.push(empty.role);
      immediateWaveIn.push(subIn.player.id);
      immediateReasons.push(`Replaces removed player at ${empty.positionId}`);
    }
  }

  // --- Greedy segment loop from atSegmentIndex ---
  const newSegments: Segment[] = [];
  const newWaves: Wave[] = [];

  if (immediateWaveIn.length > 0 || immediateWaveOut.length > 0) {
    newWaves.push({
      atSegmentIndex,
      in: immediateWaveIn,
      out: immediateWaveOut,
      reason: immediateReasons.join("; ") || "Immediate replacement for removed player",
    });
  }

  for (let segI = atSegmentIndex; segI < totalSegs; segI++) {
    const currentMinute = segI * segmentMinutes;

    if (segI > atSegmentIndex) {
      const waveIn: string[] = [];
      const waveOut: string[] = [];
      const reasons: string[] = [];
      let outfieldWaveSlotsUsed = 0;

      // Halftime keeper swap
      if (segI === segsPerHalf) {
        frontBench.push(keeper0);
        frontBench = frontBench.filter((id) => id !== keeper1 && !absentIds.has(id));

        keeperEntry = { playerId: keeper1, positionId: keeperPos.id, shiftStartMinute: currentMinute };
        const ka1 = accum.get(keeper1);
        if (ka1) { ka1.shifts++; ka1.rolesPlayed.push("Keeper"); }

        waveOut.push(keeper0);
        waveIn.push(keeper1);
        reasons.push("Keeper change at halftime");
      }

      // Defender cadence boundary
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
          reasons.push(`Defender rotation (cadence served): ${subIn.player.id} replaces ${subOut.playerId}`);

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

      // Front-line rolling single-swap
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
          reasons.push(`Equal-time rotation: ${subIn.player.id} replaces ${subOut.playerId}`);

          const inheritedPos = subOut.positionId;
          frontOnField = frontOnField.map((e) =>
            e.playerId === subOut.playerId
              ? { playerId: subIn.player.id, positionId: inheritedPos, shiftStartMinute: currentMinute }
              : e
          );
          frontBench = frontBench.filter((id) => id !== subIn.player.id);
          frontBench.push(subOut.playerId);

          const inAccum = accum.get(subIn.player.id)!;
          inAccum.shifts++;
          inAccum.rolesPlayed.push(positionRoles[inheritedPos]);
        }
      }

      if (waveIn.length > 0) {
        newWaves.push({
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

    newSegments.push({ index: segI, minutes: segmentMinutes, lineup });

    for (const { playerId } of lineup) {
      const a = accum.get(playerId);
      if (a) a.minutesPlayed += segmentMinutes;
    }
  }

  // Assemble full plan
  const allSegments = [...pastSegs, ...newSegments].sort((a, b) => a.index - b.index);
  const half0Segs = allSegments.filter((s) => s.index < segsPerHalf);
  const half1Segs = allSegments.filter((s) => s.index >= segsPerHalf);

  const halves: [Half, Half] = [
    { keeperId: keeper0, segments: half0Segs },
    { keeperId: keeper1, segments: half1Segs },
  ];

  // Fairness from all segments (past + new combined — uses only what's in segments, not accum)
  const fairness = evaluate({ halves }, positionRoles);

  return { gameId, halves, waves: [...pastWaves, ...newWaves], fairness };
}
