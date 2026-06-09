"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { onSnapshot, doc } from "firebase/firestore";
import { useAuth } from "../../../../../providers";
import { getFirebase } from "../../../../../../lib/firebase/config";
import {
  getGame,
  getRoster,
  getFormations,
  getPreferences,
  updateGameLiveState,
  getDeviceId,
  DEFAULT_PREFERENCES,
  type GameSessionDoc,
} from "../../../../../../lib/firebase";
import {
  currentSegmentIndex,
  nextWave,
  computeMinutesPlayed,
} from "../../../../../../lib/engine/live";
import { resolveFrom } from "../../../../../../lib/engine/resolveFrom";
import type { LiveState, Override } from "../../../../../../lib/engine/resolveFrom";
import type { Player, Formation, Preferences, RotationPlan, Half } from "../../../../../../lib/engine/types";

interface PageProps {
  params: Promise<{ teamId: string; gameId: string }>;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveGamePage({ params }: PageProps) {
  const { teamId, gameId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [gameDoc, setGameDoc] = useState<GameSessionDoc | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [formation, setFormation] = useState<Formation | null>(null);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [fetching, setFetching] = useState(true);
  const [isController, setIsController] = useState(false);
  const [clockSeconds, setClockSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const deviceId = typeof window !== "undefined" ? getDeviceId() : "ssr";

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  // Initial data load
  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    Promise.all([
      getGame(db, teamId, gameId),
      getRoster(db, teamId),
      getFormations(db, teamId),
      getPreferences(db, teamId),
    ])
      .then(async ([game, r, forms, p]) => {
        if (!game) { setError("Game not found."); return; }
        setRoster(r);
        setPrefs(p);

        const f = forms.find((f) => f.id === game.formationId) ?? null;
        setFormation(f);

        // Claim or verify control
        const hasController = !!game.controllerDeviceId;
        const isMine = game.controllerDeviceId === deviceId;
        if (!hasController || isMine) {
          await updateGameLiveState(db, teamId, gameId, {
            controllerDeviceId: deviceId,
            status: "live",
          });
          setIsController(true);
        }

        setGameDoc(game);
        const offset = game.clockOffsetSeconds ?? 0;
        const startedAt = game.clockStartedAt ?? null;
        const elapsed = startedAt && game.isClockRunning
          ? offset + Math.floor((Date.now() - startedAt) / 1000)
          : offset;
        setClockSeconds(elapsed);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId, gameId, deviceId]);

  // Real-time Firestore listener (for non-controller viewer sync)
  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    const unsub = onSnapshot(
      doc(db, "teams", teamId, "games", gameId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as GameSessionDoc;
        setGameDoc({ ...data, id: snap.id });
        // Sync clock from Firestore if another device is controlling
        if (data.controllerDeviceId !== deviceId) {
          const offset = data.clockOffsetSeconds ?? 0;
          const startedAt = data.clockStartedAt ?? null;
          const elapsed = startedAt && data.isClockRunning
            ? offset + Math.floor((Date.now() - startedAt) / 1000)
            : offset;
          setClockSeconds(elapsed);
        }
      },
      (err) => setError(err.message)
    );
    return unsub;
  }, [user, teamId, gameId, deviceId]);

  // Local clock tick (controller only)
  useEffect(() => {
    if (!isController || !gameDoc?.isClockRunning) return;
    const interval = setInterval(() => {
      setClockSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isController, gameDoc?.isClockRunning]);

  const activePlan: RotationPlan | null = gameDoc
    ? (gameDoc.livePlan ?? gameDoc.plan)
    : null;

  const segMins = prefs.segmentMinutes ?? 6;
  const halfMins = prefs.halfMinutes ?? 20;
  const segsPerHalf = Math.round(halfMins / segMins);
  const segIdx = currentSegmentIndex(clockSeconds, segMins);
  const halfIdx: 0 | 1 = segIdx < segsPerHalf ? 0 : 1;
  const localSegIdx = segIdx % segsPerHalf;

  const currentHalf: Half | null = activePlan?.halves[halfIdx] ?? null;
  const currentSeg = currentHalf?.segments[localSegIdx] ?? null;

  const upcomingWave = activePlan ? nextWave(activePlan, segIdx) : null;
  const isSubNow = upcomingWave?.atSegmentIndex === segIdx + 1;

  const playerMap = new Map(roster.map((p) => [p.id, p]));

  const liveMinutes = activePlan
    ? computeMinutesPlayed(activePlan, segIdx, segMins)
    : {};

  function playerName(id: string): string {
    const p = playerMap.get(id);
    return p ? (p.number !== undefined ? `#${p.number} ${p.name.split(" ")[0]}` : p.name.split(" ")[0]) : id;
  }

  async function handleClockToggle() {
    if (!gameDoc || !isController) return;
    const { db } = getFirebase();
    if (gameDoc.isClockRunning) {
      // Pause: compute new offset
      const offset = gameDoc.clockOffsetSeconds ?? 0;
      const startedAt = gameDoc.clockStartedAt ?? null;
      const newOffset = startedAt
        ? offset + Math.floor((Date.now() - startedAt) / 1000)
        : offset;
      await updateGameLiveState(db, teamId, gameId, {
        isClockRunning: false,
        clockOffsetSeconds: newOffset,
        clockStartedAt: null,
      });
    } else {
      // Start
      await updateGameLiveState(db, teamId, gameId, {
        isClockRunning: true,
        clockStartedAt: Date.now(),
      });
    }
  }

  async function handleEndGame() {
    if (!gameDoc || !isController) return;
    const { db } = getFirebase();
    await updateGameLiveState(db, teamId, gameId, {
      isClockRunning: false,
      status: "completed",
      controllerDeviceId: null,
    });
    router.push(`/teams/${teamId}/games/${gameId}`);
  }

  async function handleTakeControl() {
    if (!gameDoc) return;
    const { db } = getFirebase();
    await updateGameLiveState(db, teamId, gameId, {
      controllerDeviceId: deviceId,
    });
    setIsController(true);
  }

  async function handleOverride(override: Override) {
    if (!gameDoc || !activePlan || !formation || !isController) return;
    const { db } = getFirebase();
    const squad = roster.filter((p) => gameDoc.squadIds.includes(p.id));
    const liveState: LiveState = {
      minutesPlayed: liveMinutes,
      overrides: [override],
      absentPlayerIds: gameDoc.removedPlayerIds ?? [],
    };
    const ka = gameDoc.keeperAssignments;
    const game = {
      id: gameDoc.id,
      formation,
      squad,
      preferences: prefs,
      halves: [
        { keeperId: ka[0].keeperId, segments: [] },
        { keeperId: ka[1].keeperId, segments: [] },
      ] as [Half, Half],
    };
    const newPlan = resolveFrom(activePlan, game, ka, liveState, segIdx);
    await updateGameLiveState(db, teamId, gameId, { livePlan: newPlan });
  }

  async function handleInjured(playerId: string) {
    if (!gameDoc || !activePlan || !formation || !isController) return;
    const { db } = getFirebase();
    const removed = [...(gameDoc.removedPlayerIds ?? []), playerId];
    const squad = roster.filter(
      (p) => gameDoc.squadIds.includes(p.id) && !removed.includes(p.id)
    );
    const liveState: LiveState = {
      minutesPlayed: liveMinutes,
      absentPlayerIds: removed,
    };
    const ka = gameDoc.keeperAssignments;
    const game = {
      id: gameDoc.id,
      formation,
      squad,
      preferences: prefs,
      halves: [
        { keeperId: ka[0].keeperId, segments: [] },
        { keeperId: ka[1].keeperId, segments: [] },
      ] as [Half, Half],
    };
    const newPlan = resolveFrom(activePlan, game, ka, liveState, segIdx);
    await updateGameLiveState(db, teamId, gameId, {
      livePlan: newPlan,
      removedPlayerIds: removed,
    });
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-green-700">
        <p className="text-green-200">Loading…</p>
      </main>
    );
  }

  if (error || !gameDoc) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-red-600">{error ?? "Game not found."}</p>
      </main>
    );
  }

  const squadMembers = roster.filter(
    (p) =>
      gameDoc.squadIds.includes(p.id) &&
      !(gameDoc.removedPlayerIds ?? []).includes(p.id)
  );
  const onFieldIds = new Set(currentSeg?.lineup.map((a) => a.playerId) ?? []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => router.push(`/teams/${teamId}/games/${gameId}`)}
          className="text-gray-400 hover:text-white"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400">
            {halfIdx === 0 ? "1st Half" : "2nd Half"}
          </p>
          <p className="font-mono text-5xl font-bold tabular-nums">
            {formatClock(clockSeconds)}
          </p>
        </div>
        {!isController && (
          <button
            onClick={handleTakeControl}
            className="rounded-lg border border-yellow-500 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-900"
          >
            Take control
          </button>
        )}
        {isController && (
          <div className="w-20" /> /* spacer */
        )}
      </div>

      {/* Clock controls */}
      {isController && (
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={handleClockToggle}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold ${
              gameDoc.isClockRunning
                ? "bg-yellow-500 text-black hover:bg-yellow-400"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {gameDoc.isClockRunning ? "⏸ Pause" : "▶ Start"}
          </button>
          <button
            onClick={handleEndGame}
            className="rounded-xl border border-gray-600 px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-800"
          >
            End game
          </button>
        </div>
      )}

      {/* SUB NOW card */}
      {isSubNow && upcomingWave && (
        <div className="mx-4 mt-4 rounded-2xl bg-green-600 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
            SUB NOW at next stoppage
          </p>
          <div className="mt-2 flex gap-4">
            <div>
              <p className="text-xs text-green-300">In</p>
              {upcomingWave.in.map((id) => (
                <p key={id} className="font-semibold">{playerName(id)}</p>
              ))}
            </div>
            <div>
              <p className="text-xs text-green-300">Out</p>
              {upcomingWave.out.map((id) => (
                <p key={id} className="font-semibold">{playerName(id)}</p>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-green-200">{upcomingWave.reason}</p>
        </div>
      )}

      {/* Current Lineup */}
      <section className="mx-4 mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Current lineup — Seg {localSegIdx + 1}
        </h2>
        {currentSeg ? (
          <div className="grid grid-cols-2 gap-1.5">
            {currentSeg.lineup.map((assignment) => {
              const pos = formation?.positions.find(
                (p) => p.id === assignment.positionId
              );
              const isKeeper = pos?.role === "Keeper";
              return (
                <div
                  key={assignment.positionId}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                    isKeeper ? "bg-blue-900" : "bg-gray-800"
                  }`}
                >
                  <span className="text-xs text-gray-400">{pos?.name ?? assignment.positionId}</span>
                  <span className="text-sm font-medium">{playerName(assignment.playerId)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No lineup data for this segment.</p>
        )}
      </section>

      {/* Squad with override actions */}
      <section className="mx-4 mt-6 pb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Squad
        </h2>
        <ul className="flex flex-col gap-2">
          {squadMembers.map((player) => {
            const onField = onFieldIds.has(player.id);
            const mins = liveMinutes[player.id] ?? 0;
            return (
              <li
                key={player.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  onField ? "bg-gray-800" : "bg-gray-900"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    onField ? "bg-green-400" : "bg-gray-600"
                  }`}
                />
                <span className="flex-1 text-sm font-medium">{player.name}</span>
                <span className="text-xs tabular-nums text-gray-400">{mins}m</span>
                {isController && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOverride({ type: "keep-on", playerId: player.id })}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
                      title="Keep on"
                    >
                      ⤴
                    </button>
                    <button
                      onClick={() => handleOverride({ type: "force-off", playerId: player.id })}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
                      title="Force off"
                    >
                      ⤵
                    </button>
                    <button
                      onClick={() => handleInjured(player.id)}
                      className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-900"
                      title="Injured"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
