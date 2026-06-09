"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers";
import { getFirebase } from "../../lib/firebase/config";
import {
  joinTeam,
  getInviteCodeDoc,
} from "../../lib/firebase";

function JoinForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(
    () => (searchParams.get("code") ?? "").toUpperCase()
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  // Look up team name as user types (debounced)
  useEffect(() => {
    if (code.length !== 6) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { db } = getFirebase();
        const invite = await getInviteCodeDoc(db, code);
        if (!cancelled) setPreview(invite ? invite.teamName : null);
      } catch {
        if (!cancelled) setPreview(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setJoining(true);
    setError(null);
    try {
      const { db } = getFirebase();
      const team = await joinTeam(db, {
        code,
        userId: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? user.email ?? user.uid,
      });
      router.push(`/teams/${team.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Join a Team</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-gray-700">
          Invite code
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().slice(0, 6))
            }
            placeholder="ABC123"
            maxLength={6}
            required
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-lg font-bold uppercase tracking-widest outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        {preview && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Joining <strong>{preview}</strong>
          </p>
        )}

        {code.length === 6 && preview === null && (
          <p className="text-sm text-gray-400">
            No team found for that code.
          </p>
        )}

        <button
          type="submit"
          disabled={joining || code.length !== 6}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {joining ? "Joining…" : "Join team"}
        </button>
      </form>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
