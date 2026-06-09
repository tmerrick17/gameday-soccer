"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../providers";
import { getFirebase } from "../../lib/firebase/config";
import { createTeam, getTeamsByUser, type TeamDoc } from "../../lib/firebase";

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

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Your Teams</h1>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {teams.length === 0 && !showForm && (
        <p className="text-gray-400">No teams yet — create one below.</p>
      )}

      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              href={`/teams/${team.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3 hover:bg-gray-800 active:bg-gray-800"
            >
              <span className="font-medium">{team.name}</span>
              <ChevronRight />
            </Link>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-200">
            Team name
            <input
              autoFocus
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. FC Galaxy"
              className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-base text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium text-gray-200 hover:bg-gray-800"
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
            className="flex-1 rounded-xl border border-gray-700 px-4 py-3 text-center text-sm font-medium text-gray-200 hover:bg-gray-800"
          >
            Join with code
          </Link>
        </div>
      )}
    </main>
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
