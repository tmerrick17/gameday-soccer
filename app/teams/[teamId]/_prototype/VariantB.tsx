// PROTOTYPE — throwaway. Variant B: "Link-hub dashboard".
// Equal-weight launcher to every sub-page. Neutral, no opinion about what the
// coach is here to do. Closest to the current page.tsx. Focus game appears only
// as a small status badge on the New-game tile, not as a hero.
"use client";

import Link from "next/link";
import type { TeamHomeProps } from "./shared";
import { pickFocusGame } from "./shared";

export const variantName = "Link-hub";

const TILES = [
  { href: "games/new", label: "New game", desc: "Set up a lineup" },
  { href: "roster", label: "Roster", desc: "Players & roles" },
  { href: "formations", label: "Formations", desc: "Shapes" },
  { href: "preferences", label: "Preferences", desc: "Rotation strategy" },
  { href: "season", label: "Season", desc: "Minutes & drift" },
];

export default function VariantB({
  teamId,
  team,
  members,
  games,
  inviteUrl,
  copied,
  onCopy,
}: TeamHomeProps) {
  const { live, planned } = pickFocusGame(games);
  const badge = live ? "Live now" : planned ? "Plan ready" : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>

      <section>
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={`/teams/${teamId}/${t.href}`}
              className="relative flex flex-col gap-1 rounded-2xl border border-gray-200 p-4 hover:bg-gray-50"
            >
              {t.href === "games/new" && badge && (
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    live ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {badge}
                </span>
              )}
              <span className="font-semibold">{t.label}</span>
              <span className="text-xs text-gray-400">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Invite coaches
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-mono text-lg font-bold tracking-widest text-gray-800">
            {team.inviteCode}
          </span>
          <button
            onClick={onCopy}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 truncate text-xs text-gray-400">{inviteUrl}</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Coaches ({members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
            >
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.role === "head-coach"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {m.role === "head-coach" ? "Head Coach" : "Coach"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
