// PROTOTYPE — throwaway. #2 Variant A: "Archive only (no delete)" — DARK theme.
// The roster never hard-deletes. Each player can be Archived → moves to a
// collapsed Archived section, keeping their stable id + season history, and can
// be Restored. Most glossary-aligned: ids are never reused, nothing is destroyed.
//
// Dark mode matches the live console (bg-gray-950). Full-bleed dark fills the
// whole viewport (no white gutters on tablet); safe-area insets respected.
"use client";

import { useState } from "react";
import { MOCK_ROSTER, roleLine, type PPlayer } from "./mockRoster";
import { SAFE } from "./pieces";

export const variantName = "Archive only";

function NumberBadge({ player, dim = false }: { player: PPlayer; dim?: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        dim ? "bg-gray-800 text-gray-500" : "bg-green-500/15 text-green-300"
      }`}
    >
      {player.number ?? "–"}
    </div>
  );
}

export default function VariantA({ teamId }: { teamId: string }) {
  const [roster, setRoster] = useState<PPlayer[]>(MOCK_ROSTER);
  const [showArchived, setShowArchived] = useState(false);

  const active = roster.filter((p) => p.status !== "archived");
  const archived = roster.filter((p) => p.status === "archived");

  const setStatus = (id: string, status: PPlayer["status"]) =>
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

  return (
    <>
      {/* Full-viewport dark backdrop — iPad gutters + iOS overscroll. */}
      <div className="fixed inset-0 -z-10 bg-gray-950" aria-hidden />

      <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 text-white md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
        <div className="flex items-center gap-3">
          <a href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">←</a>
          <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
          <span className="ml-auto text-sm text-gray-500">{active.length} active</span>
        </div>

        <p className="rounded-xl bg-blue-500/10 px-4 py-2.5 text-xs leading-relaxed text-blue-200 ring-1 ring-inset ring-blue-500/20">
          Players are never deleted. <b>Archive</b> keeps their stable id and season
          history but hides them from the active roster — restore any time.
        </p>

        <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
          {active.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
              <NumberBadge player={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="truncate text-xs text-gray-500">{roleLine(p)}</p>
              </div>
              <button className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-800">Edit</button>
              <button
                onClick={() => setStatus(p.id, "archived")}
                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-800"
              >
                Archive
              </button>
            </li>
          ))}
        </ul>

        <button className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500">
          + Add player
        </button>

        {/* Archived section */}
        {archived.length > 0 && (
          <section className="mt-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800"
            >
              <span>Archived ({archived.length})</span>
              <span>{showArchived ? "▲" : "▼"}</span>
            </button>
            {showArchived && (
              <ul className="mt-2 flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
                {archived.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-dashed border-gray-700 bg-gray-900/60 px-4 py-3">
                    <NumberBadge player={p} dim />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-400">{p.name}</p>
                      <p className="truncate text-xs text-gray-500">{p.seasonMinutes} min · {p.gamesPlayed} games</p>
                    </div>
                    <button
                      onClick={() => setStatus(p.id, "active")}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}
