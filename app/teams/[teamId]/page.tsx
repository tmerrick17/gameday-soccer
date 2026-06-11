"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../providers";
import { getFirebase } from "../../../lib/firebase/config";
import { type TeamDoc, type MemberDoc } from "../../../lib/firebase";
import {
  listGames,
  type GameSessionDoc,
} from "../../../lib/firebase/games";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { SignOutButton } from "../../components/SignOutButton";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

// iOS safe-area insets (full class strings so Tailwind JIT picks them up).
const SAFE =
  "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";

const SETUP = [
  { href: "roster", label: "Roster" },
  { href: "formations", label: "Formations" },
  { href: "preferences", label: "Preferences" },
  { href: "season", label: "Season" },
];

function pickFocusGame(games: GameSessionDoc[]): {
  live: GameSessionDoc | null;
  planned: GameSessionDoc | null;
} {
  const byNewest = [...games].sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
  const live = byNewest.find((g) => g.status === "live") ?? null;
  const planned = byNewest.find((g) => g.status === "draft") ?? null;
  return { live, planned };
}

function planSummary(game: GameSessionDoc): {
  squadSize: number;
  waves: number;
  segments: number;
} {
  const halves = game.plan?.halves ?? [];
  const segments = halves.reduce((n, h) => n + (h?.segments?.length ?? 0), 0);
  return {
    squadSize: game.squadIds?.length ?? 0,
    waves: game.plan?.waves?.length ?? 0,
    segments,
  };
}

export default function TeamDetailPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<TeamDoc | null>(null);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [games, setGames] = useState<GameSessionDoc[]>([]);
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
      listGames(db, teamId),
    ])
      .then(([teamSnap, membersSnap, gamesList]) => {
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
        setGames(gamesList);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  async function handleCopy() {
    if (!team) return;
    const inviteUrl = `${window.location.origin}/join?code=${team.inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
        <p className="text-red-600 dark:text-red-300">{error ?? "Team not found."}</p>
      </main>
    );
  }

  const { live, planned } = pickFocusGame(games);

  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 md:max-w-3xl lg:max-w-5xl ${SAFE}`}
    >
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight md:text-2xl">
          {team.name}
        </h1>
        <SignOutButton />
      </header>

      <div className="flex flex-1 flex-col gap-5 md:flex-row md:items-start md:gap-8">
        {/* HERO — the one thing the coach is here to do */}
        <div className="flex flex-col gap-4 md:flex-1">
          {live ? (
            <Link
              href={`/teams/${teamId}/games/${live.id}`}
              className="rounded-3xl bg-red-600 p-6 text-white shadow-lg active:scale-[0.99] md:p-8"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                Live now
              </div>
              <p className="mt-3 text-3xl font-black md:text-5xl">
                Game in progress
              </p>
              <p className="mt-5 text-base font-bold">Tap to resume →</p>
            </Link>
          ) : planned ? (
            (() => {
              const s = planSummary(planned);
              return (
                <Link
                  href={`/teams/${teamId}/games/${planned.id}`}
                  className="rounded-3xl border-2 border-green-600 bg-green-50 p-6 active:scale-[0.99] dark:bg-green-950/30 md:p-8"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
                    Next game — plan ready
                  </div>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-gray-100 md:text-4xl">
                    Rotation ready
                  </p>
                  <div className="mt-4 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      <b>{s.squadSize}</b> squad
                    </span>
                    <span>
                      <b>{s.waves}</b> waves
                    </span>
                    <span>
                      <b>{s.segments}</b> segments
                    </span>
                  </div>
                  <p className="mt-5 text-base font-bold text-green-700 dark:text-green-400">
                    Open rotation card →
                  </p>
                </Link>
              );
            })()
          ) : (
            <Link
              href={`/teams/${teamId}/games/new`}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-green-600 p-10 text-white shadow-lg active:scale-[0.99] md:p-16"
            >
              <span className="text-4xl md:text-5xl">＋</span>
              <span className="text-xl font-black md:text-2xl">New game</span>
              <span className="text-sm text-green-100">
                Set up today&apos;s lineup
              </span>
            </Link>
          )}

          {(live || planned) && (
            <Link
              href={`/teams/${teamId}/games/new`}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              + New game
            </Link>
          )}
        </div>

        {/* Demoted setup — bottom row on phone, quiet side menu on tablet+ */}
        <nav className="mt-auto md:mt-0 md:w-60 md:shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Setup
          </p>
          <div className="flex flex-wrap gap-2 md:flex-col">
            {SETUP.map((l) => (
              <Link
                key={l.href}
                href={`/teams/${teamId}/${l.href}`}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 md:flex md:items-center md:justify-between md:rounded-xl"
              >
                <span>{l.label}</span>
                <span className="hidden text-gray-300 md:inline">→</span>
              </Link>
            ))}
            <button
              onClick={handleCopy}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 md:flex md:w-full md:items-center md:justify-between md:rounded-xl"
            >
              <span>{copied ? "Link copied!" : "Invite coaches"}</span>
              <span className="hidden text-gray-300 md:inline">→</span>
            </button>
          </div>
        </nav>
      </div>
    </main>
  );
}
