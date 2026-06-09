// PROTOTYPE — throwaway. Team-home layout A/B/C exploration (handoff tension #1).
// Delete this whole _prototype/ folder once a variant wins; fold it into page.tsx.
// The leading underscore makes Next.js treat this as a private folder (not a route).

import type { TeamDoc, MemberDoc } from "../../../../lib/firebase";
import type { GameSessionDoc } from "../../../../lib/firebase/games";

export interface TeamHomeProps {
  teamId: string;
  team: TeamDoc;
  members: MemberDoc[];
  games: GameSessionDoc[];
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onSignOut: () => void;
}

/**
 * The single Game the home page should foreground.
 * - live: a game currently in progress (resume deep-link to /live)
 * - planned: the most recent draft game with a generated plan (open rotation card)
 * Whichever exists takes priority live > planned. Otherwise null → "New game".
 */
export function pickFocusGame(games: GameSessionDoc[]): {
  live: GameSessionDoc | null;
  planned: GameSessionDoc | null;
} {
  const byNewest = [...games].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const live = byNewest.find((g) => g.status === "live") ?? null;
  const planned = byNewest.find((g) => g.status === "draft") ?? null;
  return { live, planned };
}

/** Cheap blurb numbers for a focus game: squad size, wave count, segment count. */
export function planSummary(game: GameSessionDoc): {
  squadSize: number;
  waves: number;
  segments: number;
} {
  const halves = game.plan?.halves ?? [];
  const segments = halves.reduce((n, h) => n + (h?.segments?.length ?? 0), 0);
  return {
    squadSize: game.squadIds?.length ?? 0,
    waves: game.plan?.waves?.length ?? 0,
    segments,
  };
}
