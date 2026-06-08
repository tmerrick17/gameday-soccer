import type { Player, Role, Strategy } from "./types";

/** Runtime snapshot of one Player's standing used by the priority sort. */
export interface PlayerState {
  player: Player;
  minutesPlayed: number;
  /** How many times this player has been on the field. */
  shifts: number;
  /** All Roles this player has played (may contain repeats). */
  rolesPlayed: Role[];
}

/** Count distinct Roles in a rolesPlayed array. */
function distinctRoles(rolesPlayed: Role[]): number {
  return new Set(rolesPlayed).size;
}

/**
 * Deterministic tiebreak: fewest minutes → fewest shifts → lowest player id.
 * Returns negative/zero/positive like Array.prototype.sort comparators.
 */
function tiebreak(a: PlayerState, b: PlayerState): number {
  if (a.minutesPlayed !== b.minutesPlayed) return a.minutesPlayed - b.minutesPlayed;
  if (a.shifts !== b.shifts) return a.shifts - b.shifts;
  return a.player.id < b.player.id ? -1 : a.player.id > b.player.id ? 1 : 0;
}

/**
 * Returns a new array of PlayerStates sorted by the given Strategy, with the
 * highest-priority Player (next to enter the field) at index 0.
 */
export function sortByStrategy(players: PlayerState[], strategy: Strategy): PlayerState[] {
  const copy = [...players];

  switch (strategy) {
    case "equal-time":
      return copy.sort(tiebreak);

    case "competitive":
      return copy.sort((a, b) => {
        const aAbility = a.player.ability ?? 0;
        const bAbility = b.player.ability ?? 0;
        if (aAbility !== bAbility) return bAbility - aAbility; // highest first
        return tiebreak(a, b);
      });

    case "development":
      return copy.sort((a, b) => {
        const aVariety = distinctRoles(a.rolesPlayed);
        const bVariety = distinctRoles(b.rolesPlayed);
        if (aVariety !== bVariety) return aVariety - bVariety; // fewest distinct first
        return tiebreak(a, b);
      });

    case "blend":
      return copy.sort((a, b) => {
        if (a.minutesPlayed !== b.minutesPlayed) return a.minutesPlayed - b.minutesPlayed;
        const aVariety = distinctRoles(a.rolesPlayed);
        const bVariety = distinctRoles(b.rolesPlayed);
        if (aVariety !== bVariety) return aVariety - bVariety;
        if (a.shifts !== b.shifts) return a.shifts - b.shifts;
        return a.player.id < b.player.id ? -1 : a.player.id > b.player.id ? 1 : 0;
      });
  }
}
