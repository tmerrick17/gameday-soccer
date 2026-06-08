import type { FairnessReport, Role } from "./types";

export interface PlanMinutesInput {
  halves: Array<{
    segments: Array<{
      minutes: number;
      lineup: Array<{ positionId: string; playerId: string }>;
    }>;
  }>;
}

/**
 * Evaluates the minute spread produced by a rotation plan and returns a
 * FairnessReport. Pure — the input plan is never mutated.
 *
 * Defenders who drift heavy are NOT flagged: long-Cadence defenders
 * accumulating extra minutes per game is by design (ADR 0003). Flagging
 * is reserved for genuine outliers — non-defenders running heavy, or any
 * player running light beyond the threshold.
 */
export function evaluate(
  plan: PlanMinutesInput,
  positionRoles: Record<string, Role>,
  flagThresholdMinutes = 8
): FairnessReport {
  const minuteMap = new Map<string, number>();
  const playerPositions = new Map<string, Set<string>>();

  for (const half of plan.halves) {
    for (const seg of half.segments) {
      for (const { positionId, playerId } of seg.lineup) {
        minuteMap.set(playerId, (minuteMap.get(playerId) ?? 0) + seg.minutes);
        if (!playerPositions.has(playerId)) playerPositions.set(playerId, new Set());
        playerPositions.get(playerId)!.add(positionId);
      }
    }
  }

  const playerIds = [...minuteMap.keys()];
  const totalMinutes = playerIds.reduce((sum, id) => sum + minuteMap.get(id)!, 0);
  const mean = playerIds.length > 0 ? totalMinutes / playerIds.length : 0;

  const perPlayer = playerIds.map((playerId) => {
    const minutes = minuteMap.get(playerId)!;
    return { playerId, minutes, drift: minutes - mean };
  });

  const flagged = perPlayer
    .filter(({ playerId, drift }) => {
      const absDrift = Math.abs(drift);
      if (absDrift <= flagThresholdMinutes) return false;

      // Positive drift for a pure Defender is expected — do not flag.
      if (drift > 0) {
        const positions = playerPositions.get(playerId) ?? new Set<string>();
        const allDefender = [...positions].every((posId) => positionRoles[posId] === "Defender");
        if (allDefender) return false;
      }

      return true;
    })
    .map(({ playerId }) => playerId);

  return { perPlayer, flagged };
}
