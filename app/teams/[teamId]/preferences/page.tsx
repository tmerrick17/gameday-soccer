"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../providers";
import { getFirebase } from "../../../../lib/firebase/config";
import {
  getPreferences,
  savePreferences,
  DEFAULT_PREFERENCES,
} from "../../../../lib/firebase";
import type { Preferences, Strategy, KeeperMode, Role } from "../../../../lib/engine/types";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const STRATEGIES: { value: Strategy; label: string; description: string }[] = [
  { value: "equal-time", label: "Equal Time", description: "Fewest minutes first" },
  { value: "competitive", label: "Competitive", description: "Highest ability first" },
  { value: "development", label: "Development", description: "Least role variety first" },
  { value: "blend", label: "Blend", description: "Minutes first, variety tiebreaker" },
];

const FIELD_ROLES: Role[] = ["Forward", "Mid", "Defender"];

function useDebouncedSave(
  teamId: string,
  prefs: Preferences | null,
  setSaveStatus: (s: "idle" | "saving" | "saved") => void
) {
  useEffect(() => {
    if (!prefs) return;
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const { db } = getFirebase();
        await savePreferences(db, teamId, prefs);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch {
        setSaveStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [prefs, teamId, setSaveStatus]);
}

export default function PreferencesPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    getPreferences(db, teamId)
      .then(setPrefs)
      .finally(() => setFetching(false));
  }, [user, teamId]);

  const stableSetter = useCallback(setSaveStatus, []);
  useDebouncedSave(teamId, prefs, stableSetter);

  function update(patch: Partial<Preferences>) {
    setPrefs((p) => (p ? { ...p, ...patch } : null));
  }

  function updateCadence(role: Role, value: number) {
    setPrefs((p) =>
      p
        ? {
            ...p,
            cadenceByRole: { ...p.cadenceByRole, [role]: value },
          }
        : null
    );
  }

  function stepper(field: "maxWaveSize", min: number, max: number) {
    const value = (prefs?.[field] as number | undefined) ?? DEFAULT_PREFERENCES[field] ?? min;
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => update({ [field]: Math.max(min, value - 1) })}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-lg font-medium disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center font-medium">{value}</span>
        <button
          type="button"
          onClick={() => update({ [field]: Math.min(max, value + 1) })}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-lg font-medium disabled:opacity-30"
        >
          +
        </button>
      </div>
    );
  }

  if (loading || fetching || !prefs) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6 pb-16">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Preferences</h1>
        {saveStatus === "saving" && (
          <span className="ml-auto text-xs text-gray-500">Saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="ml-auto text-xs text-green-400">Saved</span>
        )}
      </div>

      {/* Strategy */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Strategy
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => update({ strategy: s.value })}
              className={`flex flex-col rounded-xl border p-3 text-left ${
                prefs.strategy === s.value
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-800 hover:bg-gray-800"
              }`}
            >
              <span className="text-sm font-semibold">{s.label}</span>
              <span className="text-xs text-gray-400">{s.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Keeper mode */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Keeper model
        </h2>
        <div className="flex gap-2">
          {(["half-swap", "fixed"] as KeeperMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update({ keeperMode: mode })}
              className={`flex-1 rounded-xl border py-3 text-sm font-medium ${
                (prefs.keeperMode ?? "half-swap") === mode
                  ? "border-green-500 bg-green-500/10 text-green-300"
                  : "border-gray-800 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {mode === "half-swap" ? "Half-swap" : "Fixed"}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {(prefs.keeperMode ?? "half-swap") === "half-swap"
            ? "A different keeper plays each half."
            : "The same keeper plays the full game."}
        </p>
      </section>

      {/* Cadence */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Minimum shift length (minutes)
        </h2>
        {FIELD_ROLES.map((role) => (
          <label key={role} className="flex items-center justify-between text-sm font-medium text-gray-200">
            {role}
            <input
              type="number"
              min={1}
              max={30}
              value={prefs.cadenceByRole[role]}
              onChange={(e) => updateCadence(role, parseInt(e.target.value, 10) || 1)}
              className="w-20 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-center text-sm text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
            />
          </label>
        ))}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Keeper</span>
          <span className="w-20 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-center">
            Full half
          </span>
        </div>
      </section>

      {/* Wave size */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Max wave size</h2>
          <p className="text-xs text-gray-500">Players swapped at one stoppage</p>
        </div>
        {stepper("maxWaveSize", 1, 5)}
      </section>

      {/* Segment minutes */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Segment length</h2>
          <p className="text-xs text-gray-500">Minutes per rotation window</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => update({ segmentMinutes: Math.max(4, prefs.segmentMinutes - 1) })}
            disabled={prefs.segmentMinutes <= 4}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-lg font-medium disabled:opacity-30"
          >
            −
          </button>
          <span className="w-10 text-center font-medium">{prefs.segmentMinutes} min</span>
          <button
            type="button"
            onClick={() => update({ segmentMinutes: Math.min(10, prefs.segmentMinutes + 1) })}
            disabled={prefs.segmentMinutes >= 10}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 text-lg font-medium disabled:opacity-30"
          >
            +
          </button>
        </div>
      </section>

      {/* Half minutes */}
      <section className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Half length</h2>
          <p className="text-xs text-gray-500">Minutes per half</p>
        </div>
        <input
          type="number"
          min={15}
          max={30}
          value={prefs.halfMinutes}
          onChange={(e) => update({ halfMinutes: parseInt(e.target.value, 10) || 20 })}
          className="w-20 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-center text-sm text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
        />
      </section>

    </main>
  );
}
