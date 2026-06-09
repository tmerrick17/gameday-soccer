// PROTOTYPE — throwaway. #5 Variant A: "Tabbed single page".
// One route. A persistent slim clock bar always on top. Two tabs — Plan / Live —
// swap the body. The plan is never more than one tap away while the game runs,
// and the clock never disappears. One page, two explicit states.
"use client";

import { useState } from "react";
import { liveSnapshot, segmentByIndex, type Phase } from "./mockGame";
import { PlanGrid, WaveList, MinutesTable, SubNowCard, CurrentLineup } from "./pieces";

export const variantName = "Tabbed";

export default function VariantA({ phase }: { phase: Phase }) {
  const live = liveSnapshot(phase);
  const [tab, setTab] = useState<"plan" | "live">("live");
  const [planHalf, setPlanHalf] = useState<0 | 1>(0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
      {/* Persistent clock bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-950 px-4 py-2.5 text-white">
        <span className="text-xs uppercase tracking-widest text-gray-400">{live.halfLabel}</span>
        <span className="font-mono text-2xl font-bold tabular-nums">{live.clock}</span>
        <span className={`text-xs ${live.isRunning ? "text-green-400" : "text-gray-500"}`}>
          {live.isRunning ? "● running" : "paused"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-3">
        {(["live", "plan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-green-600 text-white" : "border border-gray-200 text-gray-600"
            }`}
          >
            {t}
            {t === "live" && live.subNow && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-xs text-white">!</span>
            )}
          </button>
        ))}
      </div>

      {tab === "live" ? (
        <div className="flex flex-col gap-4 bg-gray-950 px-4 py-4 text-white">
          {live.subNow && <SubNowCard wave={live.subNow} />}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              On field — {live.localSegLabel}
            </h2>
            <CurrentLineup seg={segmentByIndex(live.currentSegIdx)} />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-yellow-500 py-3 text-sm font-semibold text-black">
              ⏸ Pause
            </button>
            <button className="rounded-xl border border-gray-700 px-4 py-3 text-sm text-gray-400">
              End game
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 py-4">
          <div className="flex gap-2">
            {(["Half 1", "Half 2"] as const).map((l, i) => (
              <button
                key={i}
                onClick={() => setPlanHalf(i as 0 | 1)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  planHalf === i ? "bg-green-600 text-white" : "border border-gray-200 text-gray-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <PlanGrid halfIdx={planHalf} />
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Substitutions</h2>
            <WaveList halfIdx={planHalf} />
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Minute totals</h2>
            <MinutesTable />
          </section>
        </div>
      )}
    </main>
  );
}
