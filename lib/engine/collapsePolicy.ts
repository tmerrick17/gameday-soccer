import type { CollapseMode, Preferences } from "./types";

export interface CollapsePolicyResult {
  mode: CollapseMode;
  /** True only when the Squad is smaller than the on-field side size. */
  shortHanded: boolean;
}

/**
 * Selects rotation mode based on Subs available (Squad size − side size).
 * Keys off the Subs count, not raw headcount, so the rule is identical for
 * 8v8 and 11v11 teams.
 */
export function resolve(
  squadSize: number,
  sideSize: number,
  preferences: Pick<Preferences, "fullWavesThreshold">
): CollapsePolicyResult {
  const subs = squadSize - sideSize;
  const threshold = preferences.fullWavesThreshold ?? 3;

  if (subs < 0) {
    return { mode: "short-handed", shortHanded: true };
  }
  if (subs === 0) {
    return { mode: "none", shortHanded: false };
  }
  if (subs < threshold) {
    return { mode: "breather", shortHanded: false };
  }
  return { mode: "wave", shortHanded: false };
}
