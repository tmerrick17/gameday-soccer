// PROTOTYPE — throwaway. Variant A: "Game-forward home".
// The active/next Game is the hero. Live → big resume card; planned → rotation
// card preview; none → big "New game". Setup links demote to a quiet menu.
//
// Responsive (phone → tablet/iPad → desktop):
//   - Phone (< md): single column, hero on top, setup pills at the bottom.
//   - Tablet / desktop (>= md): two columns — hero takes the main width, setup
//     becomes a quiet right-hand menu. Uses the extra room instead of stranding
//     a phone-width column.
//   - Safe-area insets respected via env(safe-area-inset-*).
"use client";

import Link from "next/link";
import type { TeamHomeProps } from "./shared";
import { pickFocusGame, planSummary } from "./shared";
import { MOCK_OPPONENT, MOCK_KICKOFF } from "./mockData";

export const variantName = "Game-forward";

const SETUP = [
  { href: "roster", label: "Roster" },
  { href: "formations", label: "Formations" },
  { href: "preferences", label: "Preferences" },
  { href: "season", label: "Season" },
];

// iOS safe-area insets (full class strings so Tailwind JIT picks them up).
const SAFE =
  "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";

export default function VariantA({ teamId, team, members, games }: TeamHomeProps) {
  const { live, planned } = pickFocusGame(games);

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight md:text-2xl">{team.name}</h1>
        <span className="text-xs text-gray-400 md:text-sm">{members.length} coaches</span>
      </header>

      <div className="flex flex-1 flex-col gap-5 md:flex-row md:items-start md:gap-8">
        {/* HERO column — the one thing the coach is here to do */}
        <div className="flex flex-col gap-4 md:flex-1">
          {live ? (
            <Link
              href={`/teams/${teamId}/games/${live.id}/live`}
              className="rounded-3xl bg-red-600 p-6 text-white shadow-lg active:scale-[0.99] md:p-8"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                Live now
              </div>
              <p className="mt-3 text-3xl font-black tabular-nums md:text-5xl">2nd half · 12:03</p>
              <p className="mt-1 text-sm text-red-100">vs {MOCK_OPPONENT}</p>
              <p className="mt-5 text-base font-bold">Tap to resume game →</p>
            </Link>
          ) : planned ? (
            (() => {
              const s = planSummary(planned);
              return (
                <Link
                  href={`/teams/${teamId}/games/${planned.id}`}
                  className="rounded-3xl border-2 border-green-600 bg-green-50 p-6 active:scale-[0.99] md:p-8"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-green-700">
                    Next game — plan ready
                  </div>
                  <p className="mt-2 text-2xl font-black text-gray-900 md:text-4xl">vs {MOCK_OPPONENT}</p>
                  <p className="text-sm text-gray-500">{MOCK_KICKOFF}</p>
                  <div className="mt-4 flex gap-4 text-sm text-gray-600">
                    <span><b>{s.squadSize}</b> squad</span>
                    <span><b>{s.waves}</b> waves</span>
                    <span><b>{s.segments}</b> segments</span>
                  </div>
                  <p className="mt-5 text-base font-bold text-green-700">Open rotation card →</p>
                </Link>
              );
            })()
          ) : (
            <Link
              href={`/teams/${teamId}/games/new`}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-green-600 p-10 text-white shadow-lg active:scale-[0.99] md:p-16"
            >
              <span className="text-4xl md:text-5xl">＋</span>
              <span className="text-xl font-black md:text-2xl">New game</span>
              <span className="text-sm text-green-100">Set up today&apos;s lineup</span>
            </Link>
          )}

          {(live || planned) && (
            <Link
              href={`/teams/${teamId}/games/new`}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + New game
            </Link>
          )}
        </div>

        {/* Demoted setup — bottom row on phone, quiet side menu on tablet+ */}
        <nav className="mt-auto md:mt-0 md:w-60 md:shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Setup</p>
          <div className="flex flex-wrap gap-2 md:flex-col">
            {SETUP.map((l) => (
              <Link
                key={l.href}
                href={`/teams/${teamId}/${l.href}`}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 md:flex md:items-center md:justify-between md:rounded-xl"
              >
                <span>{l.label}</span>
                <span className="hidden text-gray-300 md:inline">→</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
