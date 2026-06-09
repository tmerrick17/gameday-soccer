// PROTOTYPE — throwaway. Entry point + floating switcher for the #5 game-day
// flow exploration. Mounted by page.tsx when ?variant= is present. Picks A/B/C,
// toggles the mocked live ?phase= (playing / sub-due). Hidden in production.
"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";
import type { Phase } from "./mockGame";

const VARIANTS = ["A", "B", "C"] as const;
const NAMES: Record<string, string> = {
  A: "Tabbed",
  B: "Live-first + sheet",
  C: "Single scroll",
};
const PHASES: Phase[] = ["playing", "sub-due"];

export default function PrototypeGameDay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "A").toUpperCase();
  const phase = (searchParams.get("phase") ?? "sub-due") as Phase;

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(key, value);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const i = VARIANTS.indexOf(variant as (typeof VARIANTS)[number]);
      const safe = i === -1 ? 0 : i;
      setParam("variant", VARIANTS[(safe + dir + VARIANTS.length) % VARIANTS.length]);
    },
    [variant, setParam]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const tag = el?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || (el as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycle]);

  const Variant = variant === "B" ? VariantB : variant === "C" ? VariantC : VariantA;

  return (
    <>
      <Variant phase={phase} />
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-black/80 p-1 text-xs text-white shadow-lg backdrop-blur">
            <span className="px-2 text-gray-400">phase:</span>
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => setParam("phase", p)}
                className={`rounded-full px-3 py-1 font-medium ${
                  phase === p ? "bg-white text-black" : "text-gray-300 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full bg-indigo-600 px-3 py-2 text-white shadow-xl">
            <button onClick={() => cycle(-1)} className="px-2 text-lg leading-none" aria-label="Previous variant">←</button>
            <span className="min-w-[11rem] text-center text-sm font-bold">
              {variant} — {NAMES[variant] ?? "?"}
            </span>
            <button onClick={() => cycle(1)} className="px-2 text-lg leading-none" aria-label="Next variant">→</button>
          </div>
        </div>
      )}
    </>
  );
}
