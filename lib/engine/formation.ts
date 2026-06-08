import type { Formation, Role } from "./types";

/**
 * Total number of Positions on the field for a Formation. By the Formation
 * invariant this equals the on-field side size (e.g. 8 for an 8v8 team).
 */
export function formationSize(formation: Formation): number {
  return formation.positions.length;
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
