"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PrototypeRoster from "./_prototype/PrototypeRoster"; // PROTOTYPE — remove with _prototype/
import { useAuth } from "../../../providers";
import { getFirebase } from "../../../../lib/firebase/config";
import {
  addPlayer,
  updatePlayer,
  deletePlayer,
  getRoster,
} from "../../../../lib/firebase";
import type { Player, Role } from "../../../../lib/engine/types";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const ROLES: Role[] = ["Forward", "Mid", "Defender", "Keeper"];

const EMPTY_FORM: Omit<Player, "id"> = {
  name: "",
};

export default function RosterPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // PROTOTYPE — remove with _prototype/
  const [roster, setRoster] = useState<Player[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Omit<Player, "id">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    getRoster(db, teamId)
      .then(setRoster)
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

  async function handleDelete(playerId: string) {
    if (!confirm("Remove this player from the roster?")) return;
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
      if (current.length >= 2) return f; // max 2 preferred roles
      return { ...f, preferredRoles: [...current, role] };
    });
  }

  // PROTOTYPE — #2 roster "delete vs archive/deactivate" exploration. When
  // ?variant= is present, render the throwaway variants on mock data. Delete this
  // block + _prototype/ once a direction is chosen.
  if (searchParams.get("variant")) {
    return <PrototypeRoster teamId={teamId} />;
  }

  if (loading || fetching) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  const sortedRoster = [...roster].sort((a, b) => {
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
    if (a.number !== undefined) return -1;
    if (b.number !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
        <span className="ml-auto text-sm text-gray-400">{roster.length} players</span>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
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

      <ul className="flex flex-col gap-2">
        {sortedRoster.map((player) =>
          editingId === player.id ? null : (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-xl border border-gray-800 px-4 py-3"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15 text-sm font-bold text-green-300">
                {player.number ?? "–"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{player.name}</p>
                <p className="truncate text-xs text-gray-400">
                  {(player.preferredRoles ?? []).join(", ") || "No preferred roles"}
                  {player.keeperEligible ? " · GK eligible" : ""}
                </p>
              </div>
              <button
                onClick={() => startEdit(player)}
                className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(player.id)}
                className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
              >
                ✕
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
    </main>
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
      <h2 className="text-sm font-semibold text-green-300">
        {isNew ? "Add player" : "Edit player"}
      </h2>

      <div className="flex gap-2">
        <label className="flex-1 text-sm font-medium text-gray-200">
          Name *
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
          />
        </label>
        <label className="w-20 text-sm font-medium text-gray-200">
          #
          <input
            type="number"
            min={1}
            max={99}
            value={form.number ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                number: e.target.value ? parseInt(e.target.value, 10) : undefined,
              }))
            }
            className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-gray-400">
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
                    : "border border-gray-700 text-gray-300 hover:bg-gray-800"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="text-sm font-medium text-gray-200">
        Stretch role
        <select
          value={form.stretchRole ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              stretchRole: (e.target.value as Role) || undefined,
            }))
          }
          className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
        >
          <option value="">None</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-gray-200">
        Ability (1–10, for Competitive strategy)
        <input
          type="number"
          min={1}
          max={10}
          value={form.ability ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              ability: e.target.value ? parseInt(e.target.value, 10) : undefined,
            }))
          }
          className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
        <input
          type="checkbox"
          checked={form.keeperEligible ?? false}
          onChange={(e) =>
            setForm((f) => ({ ...f, keeperEligible: e.target.checked || undefined }))
          }
          className="h-4 w-4 rounded border-gray-700 accent-green-600"
        />
        Keeper eligible
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
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
