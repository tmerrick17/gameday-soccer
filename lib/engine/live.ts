import type { RotationPlan, Wave } from "./types";

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
