// PROTOTYPE — throwaway. Shared *content* blocks for the #5 flow variants.
// Layout (tabs / sheet / single-scroll, light / dark) is what each variant
// decides — these are just the data renderings they arrange.
"use client";

import {
  POSITIONS,
  SEGMENTS,
  SEGS_PER_HALF,
  WAVES,
  MINUTES,
  FLAGGED,
  KEEPER_BY_HALF,
  label,
  fullName,
  type MockWave,
  type MockSegment,
} from "./mockGame";

/** Rotation grid: positions × segments, one half at a time. */
export function PlanGrid({ halfIdx, dark = false }: { halfIdx: 0 | 1; dark?: boolean }) {
  const segs = SEGMENTS.filter((s) =>
    halfIdx === 0 ? s.index < SEGS_PER_HALF : s.index >= SEGS_PER_HALF
  );
  const muted = dark ? "text-gray-500" : "text-gray-400";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`px-2 py-1 text-left font-medium ${muted}`}>Pos</th>
            {segs.map((s) => (
              <th key={s.index} className={`px-2 py-1 text-center font-medium ${muted}`}>
                {(s.index % SEGS_PER_HALF) + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {POSITIONS.map((pos) => {
            const isGK = pos === "GK";
            return (
              <tr key={pos} className={isGK ? (dark ? "bg-blue-950" : "bg-blue-50") : undefined}>
                <td className={`px-2 py-1.5 font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{pos}</td>
                {segs.map((s) => {
                  const cell = s.lineup.find((c) => c.positionId === pos);
                  return (
                    <td key={s.index} className="px-2 py-1.5 text-center tabular-nums">
                      {cell ? label(cell.playerId) : "–"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function WaveList({ halfIdx }: { halfIdx: 0 | 1 }) {
  const waves = WAVES.filter((w) =>
    halfIdx === 0 ? w.atSegmentIndex < SEGS_PER_HALF : w.atSegmentIndex >= SEGS_PER_HALF
  );
  if (!waves.length) return <p className="text-sm text-gray-400">No substitutions this half.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {waves.map((w, i) => (
        <li key={i} className="rounded-xl border border-gray-100 px-4 py-2.5">
          <span className="text-xs font-medium text-gray-500">
            Seg {(w.atSegmentIndex % SEGS_PER_HALF) + 1}:{" "}
          </span>
          <span className="text-sm">
            <span className="text-green-700">{w.in.map(label).join(", ")} in</span>
            {" · "}
            <span className="text-red-600">{w.out.map(label).join(", ")} out</span>
          </span>
          <p className="mt-0.5 text-xs text-gray-400">{w.reason}</p>
        </li>
      ))}
    </ul>
  );
}

export function MinutesTable({ dark = false }: { dark?: boolean }) {
  const sorted = [...MINUTES].sort((a, b) => b.minutes - a.minutes);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className={`text-left text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <th className="pb-1 font-medium">Player</th>
          <th className="pb-1 text-right font-medium">Min</th>
          <th className="pb-1 text-right font-medium">Drift</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((pm) => {
          const flagged = FLAGGED.has(pm.id);
          const heavy = pm.drift > 0;
          return (
            <tr key={pm.id} className={`border-t ${dark ? "border-gray-800" : "border-gray-100"}`}>
              <td className="py-1.5">
                {fullName(pm.id)}
                {flagged && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      heavy ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {heavy ? "↑" : "↓"}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums">{pm.minutes}</td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  pm.drift > 0 ? "text-red-500" : pm.drift < 0 ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {pm.drift > 0 ? "+" : ""}
                {pm.drift}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** SUB NOW alert card (live). */
export function SubNowCard({ wave }: { wave: MockWave }) {
  return (
    <div className="rounded-2xl bg-green-600 p-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
        SUB NOW at next stoppage
      </p>
      <div className="mt-2 flex gap-6">
        <div>
          <p className="text-xs text-green-300">In</p>
          {wave.in.map((id) => (
            <p key={id} className="font-semibold">{fullName(id)}</p>
          ))}
        </div>
        <div>
          <p className="text-xs text-green-300">Out</p>
          {wave.out.map((id) => (
            <p key={id} className="font-semibold">{fullName(id)}</p>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-green-200">{wave.reason}</p>
    </div>
  );
}

/** Current on-field lineup for a live segment (dark). */
export function CurrentLineup({ seg }: { seg: MockSegment }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {seg.lineup.map((cell) => {
        const isGK = cell.positionId === "GK";
        return (
          <div
            key={cell.positionId}
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
              isGK ? "bg-blue-900" : "bg-gray-800"
            }`}
          >
            <span className="text-xs text-gray-400">{cell.positionId}</span>
            <span className="text-sm font-medium text-white">{fullName(cell.playerId)}</span>
          </div>
        );
      })}
    </div>
  );
}

export { KEEPER_BY_HALF };
