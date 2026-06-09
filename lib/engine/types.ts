/**
 * GameDay Soccer — domain types.
 *
 * Encodes the ubiquitous language from CONTEXT.md. This module is the pure
 * engine vocabulary: it must have ZERO Firebase or UI imports so the rotation
 * engine stays deterministic, portable, and oracle-testable (see ADR 0001).
 */

/** The fixed four categories every Position maps to. Coaches never create Roles. */
export type Role = "Forward" | "Mid" | "Defender" | "Keeper";

/**
 * The rule the engine optimizes toward — sets the priority order of the
 * next-up queue. The mechanism is identical across Strategies; only the
 * priority key changes.
 */
export type Strategy = "equal-time" | "competitive" | "development" | "blend";

/**
 * How the field rotates based on Subs available (Squad size − side size).
 * `wave` = full Waves as designed (3+ Subs); `breather` = rotate Players
 * through a rest Position (1–2 Subs); `none` = no subs, everyone plays the
 * whole game (0 Subs); `short-handed` = Squad is below on-field side size.
 */
export type CollapseMode = "wave" | "breather" | "none" | "short-handed";

/**
 * A single named spot in a Formation (one row of the planning grid). The
 * display name is coach-configurable, but every Position maps to exactly one Role.
 */
export interface Position {
  id: string;
  /** Display label: "LF", "Striker", "Sweeper". */
  name: string;
  role: Role;
}

/**
 * The shape of the team on the field, stored as data: an ordered list of
 * Positions. Invariants: total Positions = the on-field side size, and at most
 * one Keeper. Fully dynamic per team — nothing is hardcoded to 8v8.
 */
export interface Formation {
  id: string;
  /** e.g. "2-3-2+GK". */
  name: string;
  positions: Position[];
}

/** A season-long roster member, identified by a stable id that is never reused. */
export interface Player {
  id: string;
  name: string;
  /** Jersey number — a mutable display label, not identity. May be absent. */
  number?: number;
  /** Up to two Roles the Player likes to play. Optional bias input. */
  preferredRoles?: Role[];
  /** One Role the Player is being developed in. Captured in v1, acted on in v2. */
  stretchRole?: Role;
  /** Per-Player rating used only by the Competitive Strategy. */
  ability?: number;
  /** Membership in the Keeper pool (the "can-keep-goal" tag). */
  keeperEligible?: boolean;
}

/** The full season-long list of Players on a Team. */
export type Roster = Player[];

/**
 * The subset of Players present and currently available for one Game — the
 * engine's actual input. Produced by marking attendance.
 */
export type Squad = Player[];

/** One Player occupying one Position for a Segment. */
export interface PositionAssignment {
  positionId: string;
  playerId: string;
}

/** The Players on the field during a given Segment — one column of the grid. */
export type Lineup = PositionAssignment[];

/**
 * Controls keeper assignment across halves.
 * `half-swap` = different keeper each half (default); `fixed` = same keeper both halves.
 */
export type KeeperMode = "half-swap" | "fixed";

/** Per-Team engine configuration. */
export interface Preferences {
  strategy: Strategy;
  /** How keepers are assigned across the two halves. Defaults to "half-swap". */
  keeperMode?: KeeperMode;
  /** Players swapped at a single stoppage: 1 up to a configurable max. */
  maxWaveSize: number;
  /** Length of a Segment in minutes (~6 by default). */
  segmentMinutes: number;
  /** Length of a Half in minutes (20 by default). */
  halfMinutes: number;
  /** Per-Role minimum shift length before the engine will rotate a Player. */
  cadenceByRole: Record<Role, number>;
  /**
   * Minimum Subs required to run full Waves. Defaults to 3 when absent.
   * At or above this threshold the engine uses "wave" mode; below it uses
   * "breather" (1–2 Subs) or "none" (0 Subs).
   */
  fullWavesThreshold?: number;
}

/**
 * The set of Players who enter and exit together at a single stoppage — a
 * substitution event, not a duration.
 */
export interface Wave {
  /** Segment boundary at which the Wave happens. */
  atSegmentIndex: number;
  /** Player ids entering the field. */
  in: string[];
  /** Player ids leaving the field. */
  out: string[];
  /** One-sentence explanation of why this Wave was generated. */
  reason: string;
}

/** A fixed slice of game clock shared by the whole field — a grid column. */
export interface Segment {
  index: number;
  minutes: number;
  lineup: Lineup;
}

/** One of a Game's two periods. Exactly one Keeper per Half (see Keeper lock). */
export interface Half {
  keeperId: string;
  segments: Segment[];
}

/** A single match. For v1 a Game is always two Halves. */
export interface Game {
  id: string;
  formation: Formation;
  squad: Squad;
  preferences: Preferences;
  halves: [Half, Half];
}

/** One Player's minute total in a plan, with signed drift from the squad mean. */
export interface PlayerMinutes {
  playerId: string;
  minutes: number;
  /** Signed minutes from the squad mean: positive = heavy, negative = light. */
  drift: number;
}

/**
 * A post-generation report on the minute spread a plan produced. Describes the
 * plan and flags drift; it never changes the plan.
 */
export interface FairnessReport {
  perPlayer: PlayerMinutes[];
  /** Player ids drifting light or heavy beyond the report threshold. */
  flagged: string[];
}

/** The engine's output: a fully filled set of Halves plus a fairness report. */
export interface RotationPlan {
  gameId: string;
  halves: [Half, Half];
  waves: Wave[];
  fairness: FairnessReport;
}
