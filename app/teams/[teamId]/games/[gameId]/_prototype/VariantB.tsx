// PROTOTYPE — throwaway. #5 Variant B: "Live-first, plan as pull-up sheet".
// The live console is always the primary surface; the full rotation plan is a
// glance away.
//
// Responsive (phone → tablet/iPad → desktop):
//   - Phone (< md): single dark console column; full plan is a pull-up bottom
//     sheet. Live-first, thumb-first.
//   - Tablet / desktop (>= md): two panes — dark console on the left, the full
//     plan as a *persistent* light side panel on the right. Uses the width
//     instead of hiding the plan behind a sheet.
//   - Dark fills the ENTIRE viewport (fixed backdrop) on every size — no white
//     iPad gutters, no white iOS overscroll flash.
//   - Safe-area insets respected via env(safe-area-inset-*) (root layout sets
//     viewport-fit=cover).
"use client";

import { useState } from "react";
import { liveSnapshot, segmentByIndex, type Phase } from "./mockGame";
import { PlanGrid, WaveList, MinutesTable, SubNowCard, CurrentLineup } from "./pieces";

export const variantName = "Live-first + sheet";

// iOS safe-area insets (full class strings so Tailwind JIT picks them up).
const SAFE_TOP = "pt-[max(1rem,env(safe-area-inset-top))]";
const SAFE_LEFT = "pl-[max(1rem,env(safe-area-inset-left))]";
const SAFE_RIGHT = "pr-[max(1rem,env(safe-area-inset-right))]";
const SAFE_BOTTOM = "pb-[max(2rem,env(safe-area-inset-bottom))]";

/** Half tabs + grid + subs + minutes. Shared by the mobile sheet and the
 *  tablet/desktop side panel so they never drift apart. */
function PlanBody({
  planHalf,
  setPlanHalf,
}: {
  planHalf: 0 | 1;
  setPlanHalf: (h: 0 | 1) => void;
}) {
  return (
    <>
      <div className="mb-4 flex gap-2">
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
      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Substitutions</h3>
      <WaveList halfIdx={planHalf} />
      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Minute totals</h3>
      <MinutesTable />
    </>
  );
}

export default function VariantB({ phase }: { phase: Phase }) {
  const live = liveSnapshot(phase);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [planHalf, setPlanHalf] = useState<0 | 1>(0);

  return (
    <>
      {/* Full-viewport dark backdrop — iPad gutters + iOS overscroll. */}
      <div className="fixed inset-0 -z-10 bg-gray-950" aria-hidden />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col text-white md:h-dvh md:flex-row">
        {/* LIVE CONSOLE pane */}
        <section
          className={`flex w-full flex-col gap-4 pb-36 md:w-[340px] md:shrink-0 md:overflow-y-auto md:pb-8 lg:w-[400px] md:h-dvh ${SAFE_TOP} ${SAFE_LEFT} ${SAFE_RIGHT} md:pr-4`}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">{live.halfLabel}</p>
            <p className="font-mono text-6xl font-bold tabular-nums">{live.clock}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-yellow-500 py-3 text-sm font-semibold text-black">⏸ Pause</button>
            <button className="rounded-xl border border-gray-700 px-4 py-3 text-sm text-gray-400">End game</button>
          </div>

          {live.subNow && <SubNowCard wave={live.subNow} />}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
              On field — {live.localSegLabel}
            </h2>
            <CurrentLineup seg={segmentByIndex(live.currentSegIdx)} />
          </div>
        </section>

        {/* PLAN side panel — tablet/desktop only (>= md) */}
        <aside
          className={`hidden bg-white text-gray-900 md:block md:h-dvh md:flex-1 md:overflow-y-auto md:border-l md:border-gray-800 ${SAFE_TOP} ${SAFE_RIGHT} ${SAFE_BOTTOM} md:pl-5`}
        >
          <h2 className="mb-4 text-lg font-bold">Full rotation plan</h2>
          <PlanBody planHalf={planHalf} setPlanHalf={setPlanHalf} />
        </aside>
      </div>

      {/* Phone-only pull-up handle (< md) */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 rounded-t-2xl border-t border-gray-700 bg-gray-900 pt-3 text-center text-sm font-semibold text-gray-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        ▲ View full plan
      </button>

      {/* Phone-only sheet (< md) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col md:hidden">
          <button className="flex-1 bg-black/50" onClick={() => setSheetOpen(false)} aria-label="Close plan" />
          <div className={`max-h-[82dvh] overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 text-gray-900 ${SAFE_BOTTOM}`}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Full rotation plan</h2>
              <button onClick={() => setSheetOpen(false)} className="text-sm text-gray-400">Close</button>
            </div>
            <PlanBody planHalf={planHalf} setPlanHalf={setPlanHalf} />
          </div>
        </div>
      )}
    </>
  );
}
