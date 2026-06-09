// PROTOTYPE — throwaway. #5 Variant C: "Single scroll, no modes".
// No tabs, no sheet, no route hop. The live "now" (clock + SUB NOW + on-field)
// is pinned at the top; the full plan (grid, subs, minutes) simply continues
// below in the same scroll. Everything is one continuous page — the coach scrolls
// from "right now" down into "what's coming". Light theme throughout.
"use client";

import { useState } from "react";
import { liveSnapshot, segmentByIndex, type Phase } from "./mockGame";
import { PlanGrid, WaveList, MinutesTable, CurrentLineup } from "./pieces";
import { fullName } from "./mockGame";

export const variantName = "Single scroll";

export default function VariantC({ phase }: { phase: Phase }) {
  const live = liveSnapshot(phase);
  const [planHalf, setPlanHalf] = useState<0 | 1>(live.halfIdx);

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-gray-50">
      {/* Pinned "now" */}
      <div className="sticky top-0 z-10 bg-gray-950 px-4 pb-4 pt-4 text-white shadow-lg">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">{live.halfLabel}</p>
            <p className="font-mono text-4xl font-bold tabular-nums">{live.clock}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black">⏸</button>
            <button className="rounded-xl border border-gray-700 px-3 py-2 text-xs text-gray-400">End</button>
          </div>
        </div>

        {live.subNow ? (
          <div className="mt-3 rounded-xl bg-green-600 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-200">Sub now</p>
            <p className="mt-1 text-sm">
              <span className="text-green-200">In:</span> {live.subNow.in.map(fullName).join(", ")}
              {"  ·  "}
              <span className="text-green-200">Out:</span> {live.subNow.out.map(fullName).join(", ")}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-400">No sub due — next change after this segment.</p>
        )}
      </div>

      {/* On field now */}
      <section className="bg-gray-900 px-4 py-4 text-white">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
          On field — {live.localSegLabel}
        </h2>
        <CurrentLineup seg={segmentByIndex(live.currentSegIdx)} />
      </section>

      {/* …scrolls straight into the full plan */}
      <section className="flex flex-col gap-5 px-4 py-5">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Full rotation plan</h2>
          <div className="mb-3 flex gap-2">
            {(["Half 1", "Half 2"] as const).map((l, i) => (
              <button
                key={i}
                onClick={() => setPlanHalf(i as 0 | 1)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  planHalf === i ? "bg-green-600 text-white" : "border border-gray-200 bg-white text-gray-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-3">
            <PlanGrid halfIdx={planHalf} />
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Substitutions</h3>
          <WaveList halfIdx={planHalf} />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Minute totals</h3>
          <div className="rounded-2xl bg-white p-3">
            <MinutesTable />
          </div>
        </section>
      </section>
    </main>
  );
}
