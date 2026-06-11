"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../providers";
import { getFirebase } from "../../../../lib/firebase/config";
import { listGames, getRoster, type GameSessionDoc } from "../../../../lib/firebase";
import { computeSeasonTotals, suggestNextKeepers } from "../../../../lib/engine/season";
import type { Player } from "../../../../lib/engine/types";
import { SignOutButton } from "../../../components/SignOutButton";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default function SeasonPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [roster, setRoster] = useState<Player[]>([]);
  const [games, setGames] = useState<GameSessionDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    Promise.all([getRoster(db, teamId), listGames(db, teamId)])
      .then(([r, g]) => {
        setRoster(r);
        setGames(g);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
        <p className="text-red-300">{error}</p>
      </main>
    );
  }

  const completedGames = games.filter((g) => g.status !== "draft");
  const allPlans = completedGames.length > 0
    ? completedGames.map((g) => g.plan)
    : games.map((g) => g.plan); // fall back to all games if none completed yet

  const { perPlayer } = computeSeasonTotals(allPlans);

  const playerMap = new Map(roster.map((p) => [p.id, p]));

  // Sort by minutes descending, then by name
  const sorted = Object.entries(perPlayer).sort(([aId, aMins], [bId, bMins]) => {
    if (bMins !== aMins) return bMins - aMins;
    const aName = playerMap.get(aId)?.name ?? aId;
    const bName = playerMap.get(bId)?.name ?? bId;
    return aName.localeCompare(bName);
  });

  // Include roster players with 0 minutes
  const playersWithMinutes = new Set(Object.keys(perPlayer));
  for (const p of roster) {
    if (!playersWithMinutes.has(p.id)) {
      sorted.push([p.id, 0]);
    }
  }

  // Keeper suggestion — based on last game with keeperAssignments
  const lastGame = [...games]
    .reverse()
    .find((g) => g.keeperAssignments?.length === 2);
  const nextKeeperSuggestions = lastGame
    ? suggestNextKeepers(lastGame.keeperAssignments)
    : null;

  function playerName(id: string): string {
    const p = playerMap.get(id);
    if (!p) return id;
    return p.number !== undefined ? `${p.name} (#${p.number})` : p.name;
  }

  const totalGames = games.length;
  const meanMinutes =
    sorted.length > 0
      ? Math.round(
          Object.values(perPlayer).reduce((a, b) => a + b, 0) / Object.values(perPlayer).length
        )
      : 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Season Totals</h1>
        <span className="ml-auto text-sm text-gray-500">
          {totalGames} game{totalGames !== 1 ? "s" : ""}
        </span>
        <SignOutButton />
      </div>

      {totalGames === 0 ? (
        <p className="text-gray-400">No games recorded yet.</p>
      ) : (
        <>
          {/* Minute totals table */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Minutes played
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-1 font-medium">Player</th>
                  <th className="pb-1 text-right font-medium">Season min</th>
                  <th className="pb-1 text-right font-medium">vs avg</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(([id, mins]) => {
                  const drift = mins - meanMinutes;
                  return (
                    <tr key={id} className="border-t border-gray-800">
                      <td className="py-1.5">{playerName(id)}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{mins}</td>
                      <td
                        className={`py-1.5 text-right tabular-nums ${
                          drift > 0
                            ? "text-red-400"
                            : drift < 0
                            ? "text-blue-400"
                            : "text-gray-500"
                        }`}
                      >
                        {drift > 0 ? "+" : ""}
                        {drift}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Squad avg: {meanMinutes} min · {completedGames.length > 0 ? completedGames.length : totalGames} completed game{completedGames.length !== 1 ? "s" : ""}
            </p>
          </section>

          {/* Keeper suggestion section */}
          {nextKeeperSuggestions && nextKeeperSuggestions.length === 2 && (
            <section className="rounded-2xl border border-gray-700 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Keeper suggestion — next game
              </h2>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">Half 1</p>
                  <p className="font-semibold">
                    {playerName(nextKeeperSuggestions[0].keeperId)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Half 2</p>
                  <p className="font-semibold">
                    {playerName(nextKeeperSuggestions[1].keeperId)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Keepers swapped from last game to balance half-by-half duty.
              </p>
            </section>
          )}

          {/* Starting suggestion */}
          {sorted.length > 0 && (
            <section className="rounded-2xl border border-gray-700 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Starting suggestion — fewest minutes
              </h2>
              <p className="mb-2 text-xs text-gray-400">
                Players with the fewest season minutes — consider starting them or giving them extra time next game.
              </p>
              <ul className="flex flex-col gap-1">
                {[...sorted]
                  .sort(([, a], [, b]) => a - b)
                  .slice(0, 5)
                  .map(([id, mins]) => (
                    <li key={id} className="flex items-center justify-between text-sm">
                      <span>{playerName(id)}</span>
                      <span className="tabular-nums text-blue-400">{mins} min</span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
