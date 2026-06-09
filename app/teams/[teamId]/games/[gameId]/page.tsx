"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PrototypeGameDay from "./_prototype/PrototypeGameDay"; // PROTOTYPE — remove with _prototype/
import { useAuth } from "../../../../providers";
import { getFirebase } from "../../../../../lib/firebase/config";
import { getGame, getRoster, type GameSessionDoc } from "../../../../../lib/firebase";
import type { Player, Half, Wave } from "../../../../../lib/engine/types";

interface PageProps {
  params: Promise<{ teamId: string; gameId: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { teamId, gameId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // PROTOTYPE — remove with _prototype/
  const [gameDoc, setGameDoc] = useState<GameSessionDoc | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [activeHalf, setActiveHalf] = useState<0 | 1>(0);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    Promise.all([getGame(db, teamId, gameId), getRoster(db, teamId)])
      .then(([game, r]) => {
        if (!game) {
          setError("Game not found.");
          return;
        }
        setGameDoc(game);
        setRoster(r);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId, gameId]);

  // PROTOTYPE — #5 game-day flow exploration. When ?variant= is present, render
  // the throwaway consolidated-layout variants on mocked data (no Firestore game
  // needed). Delete this block + _prototype/ once a direction is chosen.
  if (searchParams.get("variant")) {
    return <PrototypeGameDay />;
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  if (error || !gameDoc) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
        <p className="text-red-400">{error ?? "Game not found."}</p>
      </main>
    );
  }

  const playerMap = new Map(roster.map((p) => [p.id, p]));
  const { plan } = gameDoc;
  const half = plan.halves[activeHalf];
  const halfWaves = plan.waves.filter(
    (w) =>
      activeHalf === 0
        ? w.atSegmentIndex < (plan.halves[0].segments.length)
        : w.atSegmentIndex >= (plan.halves[0].segments.length)
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Rotation Card</h1>
        <span className="ml-auto text-sm text-gray-500">
          {gameDoc.squadIds.length} players
        </span>
      </div>

      {/* Live game entry point */}
      {gameDoc.status !== "completed" && (
        <Link
          href={`/teams/${teamId}/games/${gameId}/live`}
          className="flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500"
        >
          {gameDoc.status === "live" ? "▶ Resume live game" : "▶ Start live game"}
        </Link>
      )}

      {/* Half tabs */}
      <div className="flex gap-2">
        {(["Half 1", "Half 2"] as const).map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveHalf(i as 0 | 1)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              activeHalf === i
                ? "bg-green-600 text-white"
                : "border border-gray-800 text-gray-300 hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rotation grid */}
      <HalfGrid half={half} playerMap={playerMap} />

      {/* Waves */}
      {halfWaves.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Substitutions
          </h2>
          <WaveList waves={halfWaves} playerMap={playerMap} halfOffset={activeHalf === 1 ? plan.halves[0].segments.length : 0} />
        </section>
      )}

      {/* Minute totals */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Minute Totals
        </h2>
        <MinutesTable report={plan.fairness} playerMap={playerMap} />
      </section>
    </main>
  );
}

function HalfGrid({
  half,
  playerMap,
}: {
  half: Half;
  playerMap: Map<string, Player>;
}) {
  if (half.segments.length === 0) {
    return <p className="text-sm text-gray-400">No segments generated.</p>;
  }

  // Collect all position ids in order (from first segment)
  const positions = half.segments[0].lineup.map((a) => a.positionId);

  function playerLabel(playerId: string): string {
    const p = playerMap.get(playerId);
    if (!p) return playerId.slice(0, 4);
    return p.number !== undefined ? `#${p.number}` : p.name.split(" ")[0];
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-gray-900 px-2 py-1 text-left font-medium text-gray-500">
              Pos
            </th>
            {half.segments.map((seg) => (
              <th
                key={seg.index}
                className="px-2 py-1 text-center font-medium text-gray-500"
              >
                {seg.index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((posId) => {
            // Determine role by looking at first segment lineup
            const isKeeper = posId === "gk" || posId.includes("keep") || posId.toLowerCase().startsWith("gk");
            return (
              <tr
                key={posId}
                className={isKeeper ? "bg-blue-500/10" : undefined}
              >
                <td className="sticky left-0 bg-inherit px-2 py-1.5 font-medium text-gray-300">
                  {posId}
                </td>
                {half.segments.map((seg) => {
                  const assignment = seg.lineup.find((a) => a.positionId === posId);
                  return (
                    <td
                      key={seg.index}
                      className="px-2 py-1.5 text-center"
                    >
                      {assignment ? playerLabel(assignment.playerId) : "–"}
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

function WaveList({
  waves,
  playerMap,
  halfOffset,
}: {
  waves: Wave[];
  playerMap: Map<string, Player>;
  halfOffset: number;
}) {
  function name(id: string) {
    return playerMap.get(id)?.name.split(" ")[0] ?? id.slice(0, 4);
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {waves.map((wave, i) => (
        <li key={i} className="rounded-xl border border-gray-800 px-4 py-2.5">
          <span className="text-xs font-medium text-gray-500">
            Seg {wave.atSegmentIndex - halfOffset + 1}:{" "}
          </span>
          <span className="text-sm">
            <span className="text-green-400">{wave.in.map(name).join(", ")} in</span>
            {" · "}
            <span className="text-red-400">{wave.out.map(name).join(", ")} out</span>
          </span>
          <p className="mt-0.5 text-xs text-gray-500">{wave.reason}</p>
        </li>
      ))}
    </ul>
  );
}

function MinutesTable({
  report,
  playerMap,
}: {
  report: import("../../../../../lib/engine/types").FairnessReport;
  playerMap: Map<string, Player>;
}) {
  const sorted = [...report.perPlayer].sort((a, b) => b.minutes - a.minutes);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-gray-500">
          <th className="pb-1 font-medium">Player</th>
          <th className="pb-1 text-right font-medium">Min</th>
          <th className="pb-1 text-right font-medium">Drift</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((pm) => {
          const player = playerMap.get(pm.playerId);
          const flagged = report.flagged.includes(pm.playerId);
          const heavy = pm.drift > 0;
          return (
            <tr key={pm.playerId} className="border-t border-gray-800">
              <td className="py-1.5">
                {player?.name ?? pm.playerId}
                {flagged && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      heavy
                        ? "bg-red-500/15 text-red-300"
                        : "bg-blue-500/15 text-blue-300"
                    }`}
                  >
                    {heavy ? "↑" : "↓"}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums">
                {pm.minutes}
              </td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  pm.drift > 0
                    ? "text-red-400"
                    : pm.drift < 0
                    ? "text-blue-400"
                    : "text-gray-500"
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
