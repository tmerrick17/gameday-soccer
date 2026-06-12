import type { RotationPlan, Wave } from "./types";
import type { KeeperAssignment } from "./generatePlan";

export function currentSegmentIndex(
  clockSeconds: number,
  segmentMinutes: number
): number {
  return Math.floor(clockSeconds / (segmentMinutes * 60));
}

export function nextWave(
  plan: RotationPlan,
  currentIdx: number
): Wave | null {
  const upcoming = plan.waves
    .filter((w) => w.atSegmentIndex >= currentIdx)
    .sort((a, b) => a.atSegmentIndex - b.atSegmentIndex);
  return upcoming[0] ?? null;
}

/**
 * Adjusts keeper assignments for a live-game setup edit, enforcing keeper lock:
 * the keeper for the current half-in-progress cannot change mid-half.
 * If in the first half: half-0 is locked (original), half-1 may use the new selection.
 * If in the second half: both halves are locked (originals preserved).
 */
export function adjustKeepersForLiveEdit(
  currentSegIdx: number,
  segsPerHalf: number,
  originalKeepers: KeeperAssignment[],
  newKeepers: KeeperAssignment[]
): KeeperAssignment[] {
  const orig0 = originalKeepers.find((ka) => ka.halfIndex === 0)!.keeperId;
  const orig1 = originalKeepers.find((ka) => ka.halfIndex === 1)!.keeperId;
  const new1 = newKeepers.find((ka) => ka.halfIndex === 1)!.keeperId;

  if (currentSegIdx < segsPerHalf) {
    return [
      { halfIndex: 0, keeperId: orig0 },
      { halfIndex: 1, keeperId: new1 },
    ];
  }
  return [
    { halfIndex: 0, keeperId: orig0 },
    { halfIndex: 1, keeperId: orig1 },
  ];
}

export function computeMinutesPlayed(
  plan: RotationPlan,
  currentIdx: number,
  segmentMinutes: number
): Record<string, number> {
  const minutes: Record<string, number> = {};
  for (const half of plan.halves) {
    for (const seg of half.segments) {
      if (seg.index >= currentIdx) break;
      for (const assignment of seg.lineup) {
        minutes[assignment.playerId] =
          (minutes[assignment.playerId] ?? 0) + segmentMinutes;
      }
    }
  }
  return minutes;
}
