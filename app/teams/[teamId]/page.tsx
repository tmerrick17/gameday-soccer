"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PrototypeHome from "./_prototype/PrototypeHome"; // PROTOTYPE — remove with _prototype/
import { useAuth } from "../../providers";
import { getFirebase } from "../../../lib/firebase/config";
import {
  type TeamDoc,
  type MemberDoc,
} from "../../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { signOut } from "../../../lib/firebase/auth";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default function TeamDetailPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // PROTOTYPE — remove with _prototype/
  const [team, setTeam] = useState<TeamDoc | null>(null);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    setFetching(true);

    Promise.all([
      getDoc(doc(db, "teams", teamId)),
      getDocs(collection(db, "teams", teamId, "members")),
    ])
      .then(([teamSnap, membersSnap]) => {
        if (!teamSnap.exists()) {
          setError("Team not found.");
          return;
        }
        const d = teamSnap.data();
        setTeam({
          id: teamSnap.id,
          name: d.name,
          headCoachId: d.headCoachId,
          inviteCode: d.inviteCode,
          createdAt: d.createdAt?.toDate?.() ?? new Date(),
        });
        setMembers(
          membersSnap.docs.map((m) => {
            const md = m.data();
            return {
              teamId,
              userId: md.userId,
              role: md.role,
              displayName: md.displayName,
              email: md.email,
              inviteCode: md.inviteCode,
              joinedAt: md.joinedAt?.toDate?.() ?? new Date(),
            };
          })
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  async function handleCopy() {
    if (!team) return;
    await navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    const { auth } = getFirebase();
    await signOut(auth);
    router.replace("/auth");
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
        <p className="text-red-300">{error ?? "Team not found."}</p>
      </main>
    );
  }

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${team.inviteCode}`;

  // PROTOTYPE — Team-home A/B/C exploration (handoff tension #1).
  // Mount the throwaway variants when ?variant= is present; otherwise render the
  // real (current) layout below. Delete this block + _prototype/ once a variant wins.
  if (searchParams.get("variant")) {
    return (
      <PrototypeHome
        teamId={teamId}
        team={team}
        members={members}
        inviteUrl={inviteUrl}
        copied={copied}
        onCopy={handleCopy}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>

      {/* Invite section */}
      <section className="rounded-2xl border border-gray-800 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Invite coaches
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex-1 rounded-xl bg-gray-800 px-4 py-3 font-mono text-lg font-bold tracking-widest text-gray-100">
            {team.inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium hover:bg-gray-800 active:bg-gray-800"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Share this code (or link) with co-coaches: {inviteUrl}
        </p>
      </section>

      {/* Team management links */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Manage
        </h2>
        <div className="flex flex-col gap-2">
          <Link
            href={`/teams/${teamId}/games/new`}
            className="flex items-center justify-between rounded-xl bg-green-600 px-4 py-3 text-white hover:bg-green-500"
          >
            <span className="font-semibold">New game</span>
            <span>→</span>
          </Link>
          <Link
            href={`/teams/${teamId}/roster`}
            className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3 hover:bg-gray-800"
          >
            <span className="font-medium">Roster</span>
            <span className="text-gray-500">→</span>
          </Link>
          <Link
            href={`/teams/${teamId}/formations`}
            className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3 hover:bg-gray-800"
          >
            <span className="font-medium">Formations</span>
            <span className="text-gray-500">→</span>
          </Link>
          <Link
            href={`/teams/${teamId}/preferences`}
            className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3 hover:bg-gray-800"
          >
            <span className="font-medium">Preferences</span>
            <span className="text-gray-500">→</span>
          </Link>
          <Link
            href={`/teams/${teamId}/season`}
            className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3 hover:bg-gray-800"
          >
            <span className="font-medium">Season totals</span>
            <span className="text-gray-500">→</span>
          </Link>
        </div>
      </section>

      {/* Members section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Coaches ({members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3"
            >
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.role === "head-coach"
                    ? "bg-green-500/15 text-green-300"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                {m.role === "head-coach" ? "Head Coach" : "Coach"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
