// PROTOTYPE — throwaway. #2 Variant C: "Status only, never remove".
// The roster IS the season-long list — nobody is removed from it here. Each
// player carries a status (Active / Injured / Departed) you set inline. Actual
// exclusion from a game happens later at the Squad level (attendance). This is
// the most literal reading of the glossary: departure happens at the Squad, not
// the Roster. No delete, no archive — just truth about who's on the team.
"use client";

import { useState } from "react";
import { MOCK_ROSTER, roleLine, STATUS_LABEL, type PPlayer, type PStatus } from "./mockRoster";
import { NumberBadge, StatusPill, RuleBanner, SAFE } from "./pieces";

export const variantName = "Status only";

const CYCLE: PStatus[] = ["active", "injured", "departed"];

export default function VariantC({ teamId }: { teamId: string }) {
  const [roster, setRoster] = useState<PPlayer[]>(
    // archived players from the mock are treated as "departed" here (this variant has no archive)
    MOCK_ROSTER.map((p) => (p.status === "archived" ? { ...p, status: "departed" } : p))
  );

  const setStatus = (id: string, status: PStatus) =>
    setRoster((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

  const activeCount = roster.filter((p) => p.status === "active").length;

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
      <div className="flex items-center gap-3">
        <a href={`/teams/${teamId}`} className="text-gray-400 hover:text-gray-600">←</a>
        <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
        <span className="ml-auto text-sm text-gray-400">
          {activeCount}/{roster.length} active
        </span>
      </div>
      <RuleBanner>
        The roster is your <b>season list</b> — nobody is removed here. Set a
        player&apos;s status; who actually plays a given game is decided later in
        <b> attendance (the Squad)</b>.
      </RuleBanner>

      <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
        {roster.map((p) => {
          const dim = p.status !== "active";
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                dim ? "border-gray-100 bg-gray-50" : "border-gray-200"
              }`}
            >
              <NumberBadge player={p} dim={dim} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`truncate font-medium ${dim ? "text-gray-500" : ""}`}>{p.name}</p>
                  {p.status !== "active" && <StatusPill status={p.status} />}
                </div>
                <p className="truncate text-xs text-gray-400">{roleLine(p)}</p>
              </div>
              {/* inline status control — segmented */}
              <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
                {CYCLE.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(p.id, s)}
                    className={`px-2 py-1 font-medium ${
                      p.status === s ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                    title={STATUS_LABEL[s]}
                  >
                    {STATUS_LABEL[s][0]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <button className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700">
        + Add player
      </button>
    </main>
  );
}
