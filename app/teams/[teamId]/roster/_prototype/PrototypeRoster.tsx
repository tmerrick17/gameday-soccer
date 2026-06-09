// PROTOTYPE — throwaway. Entry point + floating switcher for the #2 roster
// "delete vs archive/deactivate" exploration. Mounted by page.tsx when ?variant=
// is present. Hidden in production.
"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";

const VARIANTS = ["A", "B", "C"] as const;
const NAMES: Record<string, string> = {
  A: "Archive only",
  B: "Smart delete/archive",
  C: "Status only",
};

export default function PrototypeRoster({ teamId }: { teamId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "A").toUpperCase();

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const i = VARIANTS.indexOf(variant as (typeof VARIANTS)[number]);
      const safe = i === -1 ? 0 : i;
      const next = new URLSearchParams(searchParams.toString());
      next.set("variant", VARIANTS[(safe + dir + VARIANTS.length) % VARIANTS.length]);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [variant, router, searchParams]
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
      <Variant teamId={teamId} />
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-indigo-600 px-3 py-2 text-white shadow-xl">
          <button onClick={() => cycle(-1)} className="px-2 text-lg leading-none" aria-label="Previous variant">←</button>
          <span className="min-w-[12rem] text-center text-sm font-bold">
            {variant} — {NAMES[variant] ?? "?"}
          </span>
          <button onClick={() => cycle(1)} className="px-2 text-lg leading-none" aria-label="Next variant">→</button>
        </div>
      )}
    </>
  );
}
