"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../providers";
import { getFirebase } from "../../../../lib/firebase/config";
import {
  addPlayer,
  updatePlayer,
  deletePlayer,
  archivePlayer,
  restorePlayer,
  getFullRoster,
  listGames,
} from "../../../../lib/firebase";
import type { Player, Role } from "../../../../lib/engine/types";
import type { PlayerStatus } from "../../../../lib/firebase/roster";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const ROLES: Role[] = ["Forward", "Mid", "Defender", "Keeper"];

const EMPTY_FORM: Omit<Player, "id"> = { name: "" };

// iOS safe-area insets.
const SAFE =
  "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";

type RosterEntry = Player & { status?: PlayerStatus };

export default function RosterPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [referencedIds, setReferencedIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Omit<Player, "id">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    setFetching(true);
    Promise.all([getFullRoster(db, teamId), listGames(db, teamId)])
      .then(([full, games]) => {
        setRoster(full);
        const ids = new Set(games.flatMap((g) => g.squadIds ?? []));
        setReferencedIds(ids);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  function startEdit(player: Player) {
    setEditingId(player.id);
    setForm({
      name: player.name,
      number: player.number,
      preferredRoles: player.preferredRoles,
      stretchRole: player.stretchRole,
      ability: player.ability,
      keeperEligible: player.keeperEligible,
    });
  }

  function startAdd() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { db } = getFirebase();
      if (editingId === "new") {
        const player = await addPlayer(db, teamId, form);
        setRoster((prev) => [...prev, player]);
      } else if (editingId) {
        await updatePlayer(db, teamId, editingId, form);
        setRoster((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...form } : p))
        );
      }
      cancelEdit();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(playerId: string) {
    const { db } = getFirebase();
    try {
      await archivePlayer(db, teamId, playerId);
      setRoster((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: "archived" } : p))
      );
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function handleRestore(playerId: string) {
    const { db } = getFirebase();
    try {
      await restorePlayer(db, teamId, playerId);
      setRoster((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, status: "active" } : p))
      );
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(playerId: string) {
    const { db } = getFirebase();
    try {
      await deletePlayer(db, teamId, playerId);
      setRoster((prev) => prev.filter((p) => p.id !== playerId));
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  function toggleRole(role: Role) {
    setForm((f) => {
      const current = f.preferredRoles ?? [];
      const has = current.includes(role);
      if (has) return { ...f, preferredRoles: current.filter((r) => r !== role) };
      if (current.length >= 2) return f;
      return { ...f, preferredRoles: [...current, role] };
    });
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </main>
    );
  }

  const active = [...roster]
    .filter((p) => p.status !== "archived")
    .sort((a, b) => {
      if (a.number !== undefined && b.number !== undefined)
        return a.number - b.number;
      if (a.number !== undefined) return -1;
      if (b.number !== undefined) return 1;
      return a.name.localeCompare(b.name);
    });

  const archived = roster.filter((p) => p.status === "archived");

  return (
    <>
      {/* Full-bleed backdrop — fills iOS overscroll and tablet gutters */}
      <div
        className="fixed inset-0 -z-10 bg-white dark:bg-gray-950"
        aria-hidden
      />

      <main
        className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 md:max-w-3xl lg:max-w-5xl ${SAFE}`}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/teams/${teamId}`}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            ←
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {active.length} active
          </span>
        </div>

        <p className="rounded-xl bg-blue-500/10 px-4 py-2.5 text-xs leading-relaxed text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:text-blue-200">
          Players are never deleted.{" "}
          <b>Archive</b> keeps their stable id and season history but removes
          them from the active roster — restore any time.
        </p>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {editingId !== null && (
          <PlayerForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={cancelEdit}
            saving={saving}
            isNew={editingId === "new"}
            toggleRole={toggleRole}
          />
        )}

        <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
          {active.map((player) =>
            editingId === player.id ? null : (
              <li
                key={player.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 text-sm font-bold text-green-700 dark:text-green-300">
                  {player.number ?? "–"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{player.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {(player.preferredRoles ?? []).join(", ") ||
                      "No preferred roles"}
                    {player.keeperEligible ? " · GK eligible" : ""}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(player)}
                  className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleArchive(player.id)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Archive
                </button>
              </li>
            )
          )}
        </ul>

        {editingId === null && (
          <button
            onClick={startAdd}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500"
          >
            + Add player
          </button>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <section className="mt-2">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <span>Archived ({archived.length})</span>
              <span>{showArchived ? "▲" : "▼"}</span>
            </button>
            {showArchived && (
              <ul className="mt-2 flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3">
                {archived.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                      {player.number ?? "–"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-500 dark:text-gray-400">
                        {player.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(player.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-500/10 dark:text-green-400"
                    >
                      Restore
                    </button>
                    {!referencedIds.has(player.id) && (
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function PlayerForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isNew,
  toggleRole,
}: {
  form: Omit<Player, "id">;
  setForm: React.Dispatch<React.SetStateAction<Omit<Player, "id">>>;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
  toggleRole: (role: Role) => void;
}) {
  return (
    <form
      onSubmit={onSave}
      className="flex flex-col gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4"
    >
      <h2 className="text-sm font-semibold text-green-700 dark:text-green-300">
        {isNew ? "Add player" : "Edit player"}
      </h2>

      <div className="flex gap-2">
        <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
          Name *
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-200">
          #
          <input
            type="number"
            min={1}
            max={99}
            value={form.number ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                number: e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined,
              }))
            }
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Preferred roles (up to 2)
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {ROLES.map((role) => {
            const selected = (form.preferredRoles ?? []).includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  selected
                    ? "bg-green-600 text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Stretch role
        <select
          value={form.stretchRole ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              stretchRole: (e.target.value as Role) || undefined,
            }))
          }
          className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">None</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Ability (1–10, for Competitive strategy)
        <input
          type="number"
          min={1}
          max={10}
          value={form.ability ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              ability: e.target.value
                ? parseInt(e.target.value, 10)
                : undefined,
            }))
          }
          className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={form.keeperEligible ?? false}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              keeperEligible: e.target.checked || undefined,
            }))
          }
          className="h-4 w-4 rounded border-gray-300 accent-green-600 dark:border-gray-700"
        />
        Keeper eligible
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
