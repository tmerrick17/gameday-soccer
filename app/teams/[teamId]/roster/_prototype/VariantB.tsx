// PROTOTYPE — throwaway. #2 Variant B: "Smart delete-or-archive".
// Keeps a true Delete, but only where it's safe: a player who has never played
// (gamesPlayed === 0) isn't referenced by any Game, so the row offers Delete.
// Anyone with history can't be cleanly deleted (their id is referenced) — that
// row offers Archive instead, with a reason. Honest about the id-reuse rule
// without forbidding deletion of accidental/duplicate entries.
"use client";

import { useState } from "react";
import { MOCK_ROSTER, roleLine, type PPlayer } from "./mockRoster";
import { NumberBadge, RuleBanner, SAFE } from "./pieces";

export const variantName = "Smart delete/archive";

export default function VariantB({ teamId }: { teamId: string }) {
  const [roster, setRoster] = useState<PPlayer[]>(MOCK_ROSTER);

  const active = roster.filter((p) => p.status !== "archived");
  const archived = roster.filter((p) => p.status === "archived");

  const remove = (id: string) => setRoster((prev) => prev.filter((p) => p.id !== id));
  const archive = (id: string) =>
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, status: "archived" } : p)));
  const restore = (id: string) =>
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, status: "active" } : p)));

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
      <Header teamId={teamId} count={active.length} />
      <RuleBanner>
        <b>Delete</b> is only offered for players who have never played (no Game
        references their id). Anyone with game history can only be <b>Archived</b> —
        their id is referenced and is never reused.
      </RuleBanner>

      <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
        {active.map((p) => {
          const deletable = p.gamesPlayed === 0;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
              <NumberBadge player={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="truncate text-xs text-gray-400">
                  {deletable ? "Never played" : `${p.gamesPlayed} games · ${p.seasonMinutes} min`}
                </p>
              </div>
              <button className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">Edit</button>
              {deletable ? (
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                  title="No game history — safe to delete"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={() => archive(p.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                  title="Has game history — archive keeps it"
                >
                  Archive
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700">
        + Add player
      </button>

      {archived.length > 0 && (
        <section className="mt-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Archived ({archived.length})
          </p>
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
            {archived.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
                <NumberBadge player={p} dim />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-500">{p.name}</p>
                  <p className="truncate text-xs text-gray-400">{p.seasonMinutes} min · {p.gamesPlayed} games</p>
                </div>
                <button
                  onClick={() => restore(p.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Header({ teamId, count }: { teamId: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <a href={`/teams/${teamId}`} className="text-gray-400 hover:text-gray-600">←</a>
      <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
      <span className="ml-auto text-sm text-gray-400">{count} active</span>
    </div>
  );
}
