// PROTOTYPE — throwaway. Floating switcher for the Team-home A/B/C exploration.
// Two controls: cycle variant (A/B/C, also ← / → keys) and toggle the mocked
// focus-game state (none / planned / live) so each layout can be judged across
// all three states. Hidden in production builds.
"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FocusState } from "./mockData";

const VARIANTS = ["A", "B", "C"] as const;
const VARIANT_NAMES: Record<string, string> = {
  A: "Game-forward",
  B: "Link-hub",
  C: "Two-mode split",
};
const STATES: FocusState[] = ["none", "planned", "live"];

export default function PrototypeSwitcher({
  variant,
  state,
}: {
  variant: string;
  state: FocusState;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(key, value);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const cycleVariant = useCallback(
    (dir: 1 | -1) => {
      const i = VARIANTS.indexOf(variant as (typeof VARIANTS)[number]);
      const safe = i === -1 ? 0 : i;
      const nextIdx = (safe + dir + VARIANTS.length) % VARIANTS.length;
      setParam("variant", VARIANTS[nextIdx]);
    },
    [variant, setParam]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = el?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || (el as HTMLElement)?.isContentEditable)
        return;
      if (e.key === "ArrowLeft") cycleVariant(-1);
      if (e.key === "ArrowRight") cycleVariant(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleVariant]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {/* state toggle */}
      <div className="flex items-center gap-1 rounded-full bg-black/80 p-1 text-xs text-white shadow-lg backdrop-blur">
        <span className="px-2 text-gray-400">game:</span>
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => setParam("state", s)}
            className={`rounded-full px-3 py-1 font-medium ${
              state === s ? "bg-white text-black" : "text-gray-300 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* variant cycler */}
      <div className="flex items-center gap-3 rounded-full bg-indigo-600 px-3 py-2 text-white shadow-xl">
        <button onClick={() => cycleVariant(-1)} className="px-2 text-lg leading-none" aria-label="Previous variant">
          ←
        </button>
        <span className="min-w-[10rem] text-center text-sm font-bold tabular-nums">
          {variant} — {VARIANT_NAMES[variant] ?? "?"}
        </span>
        <button onClick={() => cycleVariant(1)} className="px-2 text-lg leading-none" aria-label="Next variant">
          →
        </button>
      </div>
    </div>
  );
}
