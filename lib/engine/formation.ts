import type { Formation, Position, Role } from "./types";

/**
 * Total number of Positions on the field for a Formation. By the Formation
 * invariant this equals the on-field side size (e.g. 8 for an 8v8 team).
 */
export function formationSize(formation: Formation): number {
  return formation.positions.length;
}

/** Display name derived from a Position list: GK first, then D/M/F counts. */
export function generateFormationName(positions: Position[]): string {
  const counts: Partial<Record<Role, number>> = {};
  for (const p of positions) {
    counts[p.role] = (counts[p.role] ?? 0) + 1;
  }
  const parts = [
    counts["Keeper"] ? "GK" : "",
    counts["Defender"] ? `${counts["Defender"]}D` : "",
    counts["Mid"] ? `${counts["Mid"]}M` : "",
    counts["Forward"] ? `${counts["Forward"]}F` : "",
  ].filter(Boolean);
  return parts.join("-") || "Custom";
}

/** How many Positions a Formation has in each Role. */
export function countByRole(formation: Formation): Record<Role, number> {
  const counts: Record<Role, number> = {
    Forward: 0,
    Mid: 0,
    Defender: 0,
    Keeper: 0,
  };

  for (const position of formation.positions) {
    counts[position.role] += 1;
  }

  return counts;
}
