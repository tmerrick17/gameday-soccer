"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../providers";
import { getFirebase } from "../../../../../lib/firebase/config";
import {
  getRoster,
  getFormations,
  getPreferences,
  listGames,
  saveGame,
  DEFAULT_PREFERENCES,
} from "../../../../../lib/firebase";
import { generatePlan } from "../../../../../lib/engine/generatePlan";
import { suggestNextKeepers, halfSwapKeepersAreValid } from "../../../../../lib/engine/season";
import type { Player, Formation, Preferences, Half } from "../../../../../lib/engine/types";
import type { KeeperAssignment } from "../../../../../lib/engine/generatePlan";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const SAFE =
  "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] " +
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";

export default function NewGamePage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [roster, setRoster] = useState<Player[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [fetching, setFetching] = useState(true);

  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);
  const [squadIds, setSquadIds] = useState<Set<string>>(new Set());
  const [keeper1Id, setKeeper1Id] = useState<string | null>(null);
  const [keeper2Id, setKeeper2Id] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedKeepers, setSuggestedKeepers] = useState<KeeperAssignment[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    Promise.all([
      getRoster(db, teamId),
      getFormations(db, teamId),
      getPreferences(db, teamId),
      listGames(db, teamId),
    ])
      .then(([r, f, p, g]) => {
        setRoster(r);
        setFormations(f);
        setPrefs(p);
        if (f.length === 1) setSelectedFormationId(f[0].id);
        setSquadIds(new Set(r.map((pl) => pl.id)));
        // Pre-suggest keepers from last game (swap halves for fairness)
        const lastGame = [...g].reverse().find((game) => game.keeperAssignments?.length === 2);
        if (lastGame) {
          const suggested = suggestNextKeepers(lastGame.keeperAssignments);
          setSuggestedKeepers(suggested);
          setKeeper1Id(suggested.find((ka) => ka.halfIndex === 0)?.keeperId ?? null);
          setKeeper2Id(suggested.find((ka) => ka.halfIndex === 1)?.keeperId ?? null);
        }
      })
      .finally(() => setFetching(false));
  }, [user, teamId]);

  const formation = formations.find((f) => f.id === selectedFormationId) ?? null;
  const sideSize = formation?.positions.length ?? 0;
  const squad = roster.filter((p) => squadIds.has(p.id));
  const shortHanded = formation ? squad.length < sideSize : false;
  const keeperPool = squad;
  const keeperMode = prefs.keeperMode ?? "half-swap";

  // Mirror keeper1 → keeper2 in fixed mode; clear keeper2 if it duplicates keeper1 in half-swap mode
  useEffect(() => {
    if (keeperMode === "fixed" && keeper1Id) {
      setKeeper2Id(keeper1Id);
    } else if (keeperMode === "half-swap" && keeper2Id === keeper1Id && keeper1Id !== null) {
      setKeeper2Id(null);
    }
  }, [keeperMode, keeper1Id, keeper2Id]);

  function togglePlayer(playerId: string) {
    setSquadIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        // Clear keeper selections if that player is deselected
        if (playerId === keeper1Id) setKeeper1Id(null);
        if (playerId === keeper2Id) setKeeper2Id(null);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }

  async function handleGenerate() {
    if (!formation || !keeper1Id || !keeper2Id || !user) return;
    setGenerating(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const keeperAssignments: KeeperAssignment[] = [
        { halfIndex: 0, keeperId: keeper1Id },
        { halfIndex: 1, keeperId: keeper2Id },
      ];
      const game = {
        id: `game-${Date.now()}`,
        formation,
        squad,
        preferences: prefs,
        halves: [
          { keeperId: keeper1Id, segments: [] },
          { keeperId: keeper2Id, segments: [] },
        ] as [Half, Half],
      };
      const plan = generatePlan(game, keeperAssignments);
      const saved = await saveGame(db, teamId, {
        formationId: formation.id,
        squadIds: squad.map((p) => p.id),
        keeperAssignments,
        plan,
      });
      router.push(`/teams/${teamId}/games/${saved.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  const canGenerate =
    !!formation &&
    !shortHanded &&
    (keeperMode === "fixed"
      ? !!keeper1Id
      : halfSwapKeepersAreValid(keeper1Id, keeper2Id));

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Game</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Responsive two-column grid: formation left, attendance+keepers right on md+ */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start">
        {/* Step 1: Formation */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            1 · Formation
          </h2>
          {formations.length === 0 ? (
            <p className="text-sm text-gray-400">
              No formations yet.{" "}
              <Link href={`/teams/${teamId}/formations`} className="text-green-400 underline">
                Add one first
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {formations.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormationId(f.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                    selectedFormationId === f.id
                      ? "border-green-500/40 bg-green-500/15"
                      : "border-gray-700 hover:bg-gray-800"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      selectedFormationId === f.id
                        ? "border-green-500 bg-green-500"
                        : "border-gray-700"
                    }`}
                  />
                  <span className="font-medium">{f.name}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {f.positions.length} positions
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right column: Attendance + Keepers */}
        <div className="flex flex-col gap-6">
          {/* Step 2: Attendance */}
          {formation && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                2 · Attendance
              </h2>

              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`font-medium ${
                    shortHanded
                      ? "text-red-300"
                      : "text-green-300"
                  }`}
                >
                  {squad.length} present / {sideSize} needed
                </span>
              </div>

              {shortHanded && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  Not enough players — need at least {sideSize} for this formation.
                </p>
              )}

              {roster.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Roster is empty.{" "}
                  <Link href={`/teams/${teamId}/roster`} className="text-green-400 underline">
                    Add players first
                  </Link>
                  .
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {roster.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => togglePlayer(player.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left ${
                          squadIds.has(player.id)
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-gray-800 bg-gray-900 opacity-50"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded border-2 ${
                            squadIds.has(player.id)
                              ? "border-green-500 bg-green-500"
                              : "border-gray-700"
                          }`}
                        >
                          {squadIds.has(player.id) && (
                            <svg viewBox="0 0 10 10" className="text-white">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium">{player.name}</span>
                        {player.number !== undefined && (
                          <span className="text-xs text-gray-500">#{player.number}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Step 3: Goalies */}
          {formation && !shortHanded && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                3 · Goalies
              </h2>

              {keeperMode === "fixed" ? (
                <>
                  <KeeperPicker
                    label="Plays both halves"
                    pool={keeperPool}
                    value={keeper1Id}
                    suggestedId={suggestedKeepers.find((ka) => ka.halfIndex === 0)?.keeperId ?? null}
                    onChange={(id) => {
                      setKeeper1Id(id);
                      setKeeper2Id(id);
                    }}
                  />
                  {keeper1Id && (
                    <p className="text-xs text-gray-500">
                      Fixed keeper mode — {squad.find((p) => p.id === keeper1Id)?.name} plays both halves.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <KeeperPicker
                    label="1st half"
                    pool={keeperPool}
                    value={keeper1Id}
                    suggestedId={suggestedKeepers.find((ka) => ka.halfIndex === 0)?.keeperId ?? null}
                    onChange={(id) => {
                      setKeeper1Id(id);
                      if (keeper2Id === id) setKeeper2Id(null);
                    }}
                  />
                  <KeeperPicker
                    label="2nd half"
                    pool={keeperPool.filter((p) => p.id !== keeper1Id)}
                    value={keeper2Id}
                    suggestedId={suggestedKeepers.find((ka) => ka.halfIndex === 1)?.keeperId ?? null}
                    onChange={setKeeper2Id}
                  />
                </>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Generate */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-950 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md md:max-w-3xl lg:max-w-5xl">
          {formation && !shortHanded && !canGenerate && !generating && (
            <p className="mb-2 text-center text-xs text-gray-400">Pick goalies to continue</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate rotation plan"}
          </button>
        </div>
      </div>
    </main>
  );
}

function KeeperPicker({
  label,
  pool,
  value,
  suggestedId,
  onChange,
}: {
  label: string;
  pool: Player[];
  value: string | null;
  suggestedId?: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {pool.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`relative rounded-xl border px-3 py-2 text-sm font-medium ${
              value === p.id
                ? "border-green-500/40 bg-green-500/15 text-green-300"
                : "border-gray-700 text-gray-200 hover:bg-gray-800"
            }`}
          >
            {p.name}
            {suggestedId === p.id && value !== p.id && (
              <span className="ml-1.5 rounded-full bg-blue-500/15 px-1 py-0.5 text-xs font-normal text-blue-300">
                suggested
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
