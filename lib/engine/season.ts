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

/**
 * Returns true when a half-swap game has two distinct keepers assigned.
 * The UI uses this to gate the Generate button.
 */
export function halfSwapKeepersAreValid(
  keeper1Id: string | null,
  keeper2Id: string | null
): boolean {
  return keeper1Id !== null && keeper2Id !== null && keeper1Id !== keeper2Id;
}

export function pastGoalieIds(
  games: Array<{ keeperAssignments?: KeeperAssignment[] }>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const game of [...games].reverse()) {
    for (const ka of game.keeperAssignments ?? []) {
      if (!seen.has(ka.keeperId)) {
        seen.add(ka.keeperId);
        result.push(ka.keeperId);
      }
    }
  }
  return result;
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
