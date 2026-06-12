"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../providers";
import { getFirebase } from "../../../../../lib/firebase/config";
import {
  getRoster,
  getFormations,
  getPreferences,
  listGames,
  saveGame,
  updateGameSetup,
  updateLiveGameSetup,
  getGame,
  DEFAULT_PREFERENCES,
} from "../../../../../lib/firebase";
import { generatePlan } from "../../../../../lib/engine/generatePlan";
import { suggestNextKeepers, halfSwapKeepersAreValid, pastGoalieIds } from "../../../../../lib/engine/season";
import { currentSegmentIndex, computeMinutesPlayed, adjustKeepersForLiveEdit } from "../../../../../lib/engine/live";
import { resolveFrom } from "../../../../../lib/engine/resolveFrom";
import type { Player, Formation, Preferences, Half, RotationPlan } from "../../../../../lib/engine/types";
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
  const searchParams = useSearchParams();
  const editGameId = searchParams.get("edit");

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
  const [prevGoalieIds, setPrevGoalieIds] = useState<string[]>([]);
  const [isLiveEdit, setIsLiveEdit] = useState(false);
  const [liveEditGame, setLiveEditGame] = useState<{
    plan: RotationPlan;
    livePlan: RotationPlan | null;
    keeperAssignments: KeeperAssignment[];
    clockOffsetSeconds: number;
    clockStartedAt: number | null;
    isClockRunning: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    const base = Promise.all([
      getRoster(db, teamId),
      getFormations(db, teamId),
      getPreferences(db, teamId),
      listGames(db, teamId),
    ]);
    const editFetch = editGameId ? getGame(db, teamId, editGameId) : Promise.resolve(null);
    Promise.all([base, editFetch])
      .then(([[r, f, p, g], editGame]) => {
        setRoster(r);
        setFormations(f);
        setPrefs(p);
        setPrevGoalieIds(pastGoalieIds(g));

        if (editGame) {
          // Edit mode: pre-fill from the existing game
          setSelectedFormationId(editGame.formationId);
          setSquadIds(new Set(editGame.squadIds));
          const ka1 = editGame.keeperAssignments.find((ka) => ka.halfIndex === 0);
          const ka2 = editGame.keeperAssignments.find((ka) => ka.halfIndex === 1);
          setKeeper1Id(ka1?.keeperId ?? null);
          setKeeper2Id(ka2?.keeperId ?? null);
          if (editGame.status === "live") {
            setIsLiveEdit(true);
            setLiveEditGame({
              plan: editGame.plan,
              livePlan: editGame.livePlan ?? null,
              keeperAssignments: editGame.keeperAssignments,
              clockOffsetSeconds: editGame.clockOffsetSeconds ?? 0,
              clockStartedAt: editGame.clockStartedAt ?? null,
              isClockRunning: editGame.isClockRunning ?? false,
            });
          }
        } else {
          // New game mode: default all players present, suggest keepers from last game
          if (f.length === 1) setSelectedFormationId(f[0].id);
          setSquadIds(new Set(r.map((pl) => pl.id)));
          const lastGame = [...g].reverse().find((game) => game.keeperAssignments?.length === 2);
          if (lastGame) {
            const suggested = suggestNextKeepers(lastGame.keeperAssignments);
            setSuggestedKeepers(suggested);
            setKeeper1Id(suggested.find((ka) => ka.halfIndex === 0)?.keeperId ?? null);
            setKeeper2Id(suggested.find((ka) => ka.halfIndex === 1)?.keeperId ?? null);
          }
        }
      })
      .finally(() => setFetching(false));
  }, [user, teamId, editGameId]);

  const formation = formations.find((f) => f.id === selectedFormationId) ?? null;
  const sideSize = formation?.positions.length ?? 0;
  const squad = roster.filter((p) => squadIds.has(p.id));
  const shortHanded = formation ? squad.length < sideSize : false;
  const keeperPool = squad;
  const keeperMode = prefs.keeperMode ?? "half-swap";

  // For live edits: determine which half is currently in progress (its keeper is locked)
  const liveHalfIdx: 0 | 1 | null = (() => {
    if (!isLiveEdit || !liveEditGame) return null;
    const { clockOffsetSeconds, clockStartedAt, isClockRunning } = liveEditGame;
    const elapsed = isClockRunning && clockStartedAt
      ? clockOffsetSeconds + Math.floor((Date.now() - clockStartedAt) / 1000)
      : clockOffsetSeconds;
    const segMins = prefs.segmentMinutes ?? 6;
    const halfMins = prefs.halfMinutes ?? 20;
    const segsPerHalf = Math.round(halfMins / segMins);
    const segIdx = currentSegmentIndex(elapsed, segMins);
    return segIdx < segsPerHalf ? 0 : 1;
  })();

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
      const formKeepers: KeeperAssignment[] = [
        { halfIndex: 0, keeperId: keeper1Id },
        { halfIndex: 1, keeperId: keeper2Id },
      ];

      if (isLiveEdit && editGameId && liveEditGame) {
        const { clockOffsetSeconds, clockStartedAt, isClockRunning } = liveEditGame;
        const elapsedSeconds = isClockRunning && clockStartedAt
          ? clockOffsetSeconds + Math.floor((Date.now() - clockStartedAt) / 1000)
          : clockOffsetSeconds;
        const segMins = prefs.segmentMinutes ?? 6;
        const halfMins = prefs.halfMinutes ?? 20;
        const segsPerHalf = Math.round(halfMins / segMins);
        const segIdx = currentSegmentIndex(elapsedSeconds, segMins);

        const adjustedKeepers = adjustKeepersForLiveEdit(
          segIdx,
          segsPerHalf,
          liveEditGame.keeperAssignments,
          formKeepers
        );

        const activePlan = liveEditGame.livePlan ?? liveEditGame.plan;
        const minutesPlayed = computeMinutesPlayed(activePlan, segIdx, segMins);

        const game = {
          id: editGameId,
          formation,
          squad,
          preferences: prefs,
          halves: [
            { keeperId: adjustedKeepers[0].keeperId, segments: [] },
            { keeperId: adjustedKeepers[1].keeperId, segments: [] },
          ] as [Half, Half],
        };
        const livePlan = resolveFrom(activePlan, game, adjustedKeepers, { minutesPlayed }, segIdx);

        await updateLiveGameSetup(db, teamId, editGameId, {
          formationId: formation.id,
          squadIds: squad.map((p) => p.id),
          keeperAssignments: adjustedKeepers,
          livePlan,
        });
        router.push(`/teams/${teamId}/games/${editGameId}`);
        return;
      }

      const gameId = editGameId ?? `game-${Date.now()}`;
      const game = {
        id: gameId,
        formation,
        squad,
        preferences: prefs,
        halves: [
          { keeperId: keeper1Id, segments: [] },
          { keeperId: keeper2Id, segments: [] },
        ] as [Half, Half],
      };
      const plan = generatePlan(game, formKeepers);
      const setup = {
        formationId: formation.id,
        squadIds: squad.map((p) => p.id),
        keeperAssignments: formKeepers,
        plan,
      };
      if (editGameId) {
        await updateGameSetup(db, teamId, editGameId, setup);
        router.push(`/teams/${teamId}/games/${editGameId}`);
      } else {
        const saved = await saveGame(db, teamId, setup);
        router.push(`/teams/${teamId}/games/${saved.id}`);
      }
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
        <Link
          href={editGameId ? `/teams/${teamId}/games/${editGameId}` : `/teams/${teamId}`}
          className="text-gray-500 hover:text-white"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {editGameId ? "Edit Game" : "New Game"}
        </h1>
      </div>

      {isLiveEdit && (
        <p className="rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Live game — clock continues running. Keeper changes take effect at the next half boundary.
        </p>
      )}

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
                    pastGoalieIds={prevGoalieIds}
                    locked={isLiveEdit}
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
                    pastGoalieIds={prevGoalieIds}
                    locked={isLiveEdit}
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
                    pastGoalieIds={prevGoalieIds}
                    locked={liveHalfIdx === 1}
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
            {generating
              ? editGameId ? "Regenerating…" : "Generating…"
              : editGameId ? "Regenerate rotation plan" : "Generate rotation plan"}
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
  pastGoalieIds,
  locked = false,
  onChange,
}: {
  label: string;
  pool: Player[];
  value: string | null;
  suggestedId?: string | null;
  pastGoalieIds: string[];
  locked?: boolean;
  onChange: (id: string) => void;
}) {
  const pastGoalieSet = new Set(pastGoalieIds);
  const previousGoaliesInPool = pastGoalieIds
    .filter((id) => pool.some((p) => p.id === id))
    .map((id) => pool.find((p) => p.id === id)!);
  const otherPlayers = pool.filter((p) => !pastGoalieSet.has(p.id));

  function optionLabel(p: Player) {
    return suggestedId === p.id ? `${p.name} (suggested)` : p.name;
  }

  if (locked) {
    const lockedPlayer = pool.find((p) => p.id === value) ?? null;
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <div className="flex items-center rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-400">
          <span className="flex-1">{lockedPlayer?.name ?? value ?? "—"}</span>
          <span className="text-xs text-yellow-500">locked</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
      >
        <option value="" disabled>Choose…</option>
        {previousGoaliesInPool.length > 0 && (
          <optgroup label="Previous goalies">
            {previousGoaliesInPool.map((p) => (
              <option key={p.id} value={p.id}>
                {optionLabel(p)}
              </option>
            ))}
          </optgroup>
        )}
        {otherPlayers.length > 0 && (
          <optgroup label="Other players">
            {otherPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {optionLabel(p)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
