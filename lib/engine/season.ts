import type { RotationPlan } from "./types";
import type { KeeperAssignment } from "./generatePlan";

export interface SeasonTotals {
  perPlayer: Record<string, number>;
}

export function computeSeasonTotals(plans: RotationPlan[]): SeasonTotals {
  const perPlayer: Record<string, number> = {};
  for (const plan of plans) {
    for (const half of plan.halves) {
      for (const seg of half.segments) {
        for (const assignment of seg.lineup) {
          perPlayer[assignment.playerId] =
            (perPlayer[assignment.playerId] ?? 0) + seg.minutes;
        }
      }
    }
  }
  return { perPlayer };
}

export function suggestNextKeepers(
  lastAssignments: KeeperAssignment[]
): KeeperAssignment[] {
  if (lastAssignments.length === 0) return [];
  const half0 = lastAssignments.find((ka) => ka.halfIndex === 0);
  const half1 = lastAssignments.find((ka) => ka.halfIndex === 1);
  if (!half0 || !half1) return lastAssignments;
  return [
    { halfIndex: 0, keeperId: half1.keeperId },
    { halfIndex: 1, keeperId: half0.keeperId },
  ];
}
