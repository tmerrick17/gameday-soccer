// PROTOTYPE — throwaway. Variant C: "Two-mode split".
// The page is explicitly divided into a loud GAME DAY zone (top, dark, big touch
// targets for the sideline) and a quiet SETUP zone (bottom, muted, couch work).
// Makes the JTBD split a literal spatial division.
"use client";

import Link from "next/link";
import type { TeamHomeProps } from "./shared";
import { pickFocusGame, planSummary } from "./shared";
import { MOCK_OPPONENT } from "./mockData";

export const variantName = "Two-mode split";

const SETUP = [
  { href: "roster", label: "Roster" },
  { href: "formations", label: "Formations" },
  { href: "preferences", label: "Preferences" },
  { href: "season", label: "Season totals" },
];

export default function VariantC({ teamId, team, games }: TeamHomeProps) {
  const { live, planned } = pickFocusGame(games);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      {/* GAME DAY ZONE — dark, loud, thumb-friendly */}
      <section className="flex flex-col gap-4 rounded-b-3xl bg-gray-900 px-5 pb-7 pt-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            Game day
          </span>
          <span className="text-sm font-semibold">{team.name}</span>
        </div>

        {live ? (
          <Link
            href={`/teams/${teamId}/games/${live.id}/live`}
            className="rounded-2xl bg-red-600 p-5 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Live
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums">2nd · 12:03</p>
            <p className="text-sm text-red-100">vs {MOCK_OPPONENT} — tap to resume →</p>
          </Link>
        ) : planned ? (
          (() => {
            const s = planSummary(planned);
            return (
              <Link
                href={`/teams/${teamId}/games/${planned.id}`}
                className="rounded-2xl bg-green-600 p-5 active:scale-[0.99]"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-green-100">
                  Plan ready
                </div>
                <p className="mt-1 text-xl font-black">vs {MOCK_OPPONENT}</p>
                <p className="text-sm text-green-100">
                  {s.squadSize} squad · {s.waves} waves — open card →
                </p>
              </Link>
            );
          })()
        ) : (
          <Link
            href={`/teams/${teamId}/games/new`}
            className="rounded-2xl bg-green-600 p-5 text-center active:scale-[0.99]"
          >
            <p className="text-xl font-black">＋ New game</p>
            <p className="text-sm text-green-100">No game set up yet</p>
          </Link>
        )}

        {(live || planned) && (
          <Link
            href={`/teams/${teamId}/games/new`}
            className="text-center text-sm font-medium text-gray-300 underline-offset-2 hover:underline"
          >
            Start a different game
          </Link>
        )}
      </section>

      {/* SETUP ZONE — quiet, off-day work */}
      <section className="flex flex-col gap-3 px-5 py-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
          Setup
        </span>
        <div className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
          {SETUP.map((l) => (
            <Link
              key={l.href}
              href={`/teams/${teamId}/${l.href}`}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-700">{l.label}</span>
              <span className="text-gray-300">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
