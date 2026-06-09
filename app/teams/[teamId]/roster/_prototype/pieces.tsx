// PROTOTYPE — throwaway. Shared bits for the #2 roster variants. Layout/actions
// are each variant's call; these are just the small repeated chrome.
"use client";

import type { PPlayer, PStatus } from "./mockRoster";
import { STATUS_LABEL } from "./mockRoster";

export const SAFE =
  "pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] " +
  "pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]";

export function NumberBadge({ player, dim = false }: { player: PPlayer; dim?: boolean }) {
  return (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        dim ? "bg-gray-100 text-gray-400" : "bg-green-100 text-green-700"
      }`}
    >
      {player.number ?? "–"}
    </div>
  );
}

const STATUS_STYLE: Record<PStatus, string> = {
  active: "bg-green-100 text-green-700",
  injured: "bg-amber-100 text-amber-700",
  departed: "bg-gray-200 text-gray-600",
  archived: "bg-gray-200 text-gray-600",
};

export function StatusPill({ status }: { status: PStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Explanatory banner so the prototype's *rule* is legible while comparing. */
export function RuleBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs leading-relaxed text-blue-800">
      {children}
    </p>
  );
}
