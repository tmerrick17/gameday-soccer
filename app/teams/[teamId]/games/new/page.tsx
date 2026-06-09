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
  saveGame,
  DEFAULT_PREFERENCES,
} from "../../../../../lib/firebase";
import { generatePlan } from "../../../../../lib/engine/generatePlan";
import { resolve } from "../../../../../lib/engine/collapsePolicy";
import type { Player, Formation, Preferences, Half } from "../../../../../lib/engine/types";
import type { KeeperAssignment } from "../../../../../lib/engine/generatePlan";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

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
    ])
      .then(([r, f, p]) => {
        setRoster(r);
        setFormations(f);
        setPrefs(p);
        if (f.length === 1) setSelectedFormationId(f[0].id);
        // Default all players to attending
        setSquadIds(new Set(r.map((p) => p.id)));
      })
      .finally(() => setFetching(false));
  }, [user, teamId]);

  const formation = formations.find((f) => f.id === selectedFormationId) ?? null;
  const sideSize = formation?.positions.length ?? 0;
  const squad = roster.filter((p) => squadIds.has(p.id));
  const collapseResult = formation
    ? resolve(squad.length, sideSize, prefs)
    : null;
  const keeperPool = squad.filter((p) => p.keeperEligible);

  // If fixed keeper mode, mirror keeper 1 → keeper 2
  useEffect(() => {
    if ((prefs.keeperMode ?? "half-swap") === "fixed" && keeper1Id) {
      setKeeper2Id(keeper1Id);
    }
  }, [prefs.keeperMode, keeper1Id]);

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
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const canGenerate =
    !!formation &&
    !!keeper1Id &&
    !!keeper2Id &&
    !collapseResult?.shortHanded;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Game</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Step 1: Formation */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          1 · Formation
        </h2>
        {formations.length === 0 ? (
          <p className="text-sm text-gray-500">
            No formations yet.{" "}
            <Link href={`/teams/${teamId}/formations`} className="text-green-600 underline">
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
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    selectedFormationId === f.id
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300"
                  }`}
                />
                <span className="font-medium">{f.name}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {f.positions.length} positions
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 2: Attendance */}
      {formation && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            2 · Attendance
          </h2>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`font-medium ${
                collapseResult?.shortHanded
                  ? "text-red-600"
                  : "text-green-700"
              }`}
            >
              {squad.length} present / {sideSize} needed
            </span>
            {collapseResult && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {collapseResult.mode}
              </span>
            )}
          </div>

          {collapseResult?.shortHanded && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Not enough players — need at least {sideSize} for this formation.
            </p>
          )}

          {roster.length === 0 ? (
            <p className="text-sm text-gray-500">
              Roster is empty.{" "}
              <Link href={`/teams/${teamId}/roster`} className="text-green-600 underline">
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
                        ? "border-green-200 bg-green-50"
                        : "border-gray-100 bg-gray-50 opacity-50"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border-2 ${
                        squadIds.has(player.id)
                          ? "border-green-500 bg-green-500"
                          : "border-gray-300"
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
                      <span className="text-xs text-gray-400">#{player.number}</span>
                    )}
                    {player.keeperEligible && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        GK
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Step 3: Keepers */}
      {formation && !collapseResult?.shortHanded && keeperPool.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            3 · Keepers
          </h2>

          {keeperPool.length === 0 && (
            <p className="text-sm text-gray-500">
              No keeper-eligible players in the squad. Mark players as GK-eligible in the{" "}
              <Link href={`/teams/${teamId}/roster`} className="text-green-600 underline">
                roster
              </Link>
              .
            </p>
          )}

          <KeeperPicker
            label="Half 1 keeper"
            pool={keeperPool}
            value={keeper1Id}
            onChange={(id) => {
              setKeeper1Id(id);
              if ((prefs.keeperMode ?? "half-swap") === "fixed") setKeeper2Id(id);
            }}
          />

          {(prefs.keeperMode ?? "half-swap") === "half-swap" && (
            <KeeperPicker
              label="Half 2 keeper"
              pool={keeperPool}
              value={keeper2Id}
              onChange={setKeeper2Id}
            />
          )}

          {(prefs.keeperMode ?? "half-swap") === "fixed" && keeper1Id && (
            <p className="text-xs text-gray-400">
              Fixed keeper mode — {keeperPool.find((p) => p.id === keeper1Id)?.name} plays both halves.
            </p>
          )}
        </section>
      )}

      {/* Generate */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
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
  onChange,
}: {
  label: string;
  pool: Player[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {pool.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              value === p.id
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
