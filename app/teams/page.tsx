"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../providers";
import { getFirebase } from "../../lib/firebase/config";
import { createTeam, getTeamsByUser, type TeamDoc } from "../../lib/firebase";
import { useTheme } from "../../lib/theme/ThemeProvider";
import type { ThemePreference } from "../../lib/theme/theme";
import { SignOutButton } from "../components/SignOutButton";

export default function TeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    setFetching(true);
    getTeamsByUser(db, user.uid)
      .then(setTeams)
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const team = await createTeam(db, {
        name: newName.trim(),
        userId: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? user.email ?? user.uid,
      });
      setTeams((prev) => [team, ...prev]);
      setNewName("");
      setShowForm(false);
      router.push(`/teams/${team.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    );
  }

  if (!user) return null;

  if (fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Teams</h1>
        <div className="flex items-center gap-2">
          <SignOutButton />
          <ThemeToggle />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {teams.length === 0 && !showForm && (
        <p className="text-gray-500 dark:text-gray-400">
          No teams yet — create one below.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              href={`/teams/${team.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-100 active:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800 dark:active:bg-gray-800"
            >
              <span className="font-medium">{team.name}</span>
              <ChevronRight />
            </Link>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Team name
            <input
              autoFocus
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. FC Galaxy"
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-base text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create team"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500"
          >
            + Create team
          </button>
          <Link
            href="/join"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Join with code
          </Link>
        </div>
      )}
    </main>
  );
}

const THEME_CYCLE: ThemePreference[] = ["dark", "light", "auto"];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  }

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${theme}. Click to change.`}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      {theme === "dark" && <MoonIcon />}
      {theme === "light" && <SunIcon />}
      {theme === "auto" && <AutoIcon />}
    </button>
  );
}

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M2 12h20" strokeLinecap="round" />
      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none" opacity="0.3" />
    </svg>
  );
}
