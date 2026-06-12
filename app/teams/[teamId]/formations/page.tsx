"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../providers";
import { getFirebase } from "../../../../lib/firebase/config";
import {
  saveFormation,
  updateFormation,
  getFormations,
  deleteFormation,
  validateFormation,
} from "../../../../lib/firebase";
import type { Formation, Position, Role } from "../../../../lib/engine/types";
import {
  getTemplatesForSize,
} from "../../../../lib/engine/formationTemplates";
import { generateFormationName } from "../../../../lib/engine/formation";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

const ROLES: Role[] = ["Forward", "Mid", "Defender", "Keeper"];
const SIDE_SIZES = [5, 6, 7, 8, 9, 10, 11];

const SAFE =
  "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] " +
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]";


let nextPosKey = 1;
function newPosId() {
  return `pos-${nextPosKey++}`;
}

export default function FormationsPage({ params }: PageProps) {
  const { teamId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sideSize, setSideSize] = useState(8);
  const [positions, setPositions] = useState<Position[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebase();
    getFormations(db, teamId)
      .then(setFormations)
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  useEffect(() => {
    const draft = { name: generateFormationName(positions), positions };
    setValidationError(validateFormation(draft, sideSize));
  }, [positions, sideSize]);

  function addPosition() {
    setTemplateName(null);
    setPositions((prev) => [
      ...prev,
      { id: newPosId(), name: "", role: "Forward" },
    ]);
  }

  function removePosition(id: string) {
    setTemplateName(null);
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePosition(id: string, changes: Partial<Position>) {
    setTemplateName(null);
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  }

  function applyTemplate(name: string) {
    const template = getTemplatesForSize(sideSize).find(
      (t) => t.canonicalName === name
    );
    if (!template) return;
    setPositions(template.positions.map((p) => ({ ...p, id: newPosId() })));
    setTemplateName(name);
  }

  function handleClear() {
    if (positions.length === 0) return;
    if (!confirm("Clear all positions?")) return;
    setPositions([]);
    setTemplateName(null);
  }

  function handleEdit(f: Formation) {
    setPositions(f.positions);
    setSideSize(f.positions.length);
    setTemplateName(f.name);
    setEditingId(f.id);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setPositions([]);
    setTemplateName(null);
  }

  async function handleSave() {
    if (validationError) return;
    setSaving(true);
    setError(null);
    try {
      const { db } = getFirebase();
      if (editingId) {
        const updated: Formation = {
          id: editingId,
          name: templateName ?? generateFormationName(positions),
          positions,
        };
        await updateFormation(db, teamId, updated);
        setFormations((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
        setEditingId(null);
        setPositions([]);
        setTemplateName(null);
      } else {
        const formation = await saveFormation(db, teamId, {
          name: templateName ?? generateFormationName(positions),
          positions,
        });
        setFormations((prev) => [...prev, formation]);
        setPositions([]);
        setTemplateName(null);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(formationId: string) {
    if (!confirm("Delete this formation?")) return;
    const { db } = getFirebase();
    try {
      await deleteFormation(db, teamId, formationId);
      setFormations((prev) => prev.filter((f) => f.id !== formationId));
    } catch (e: unknown) {
      setError((e as Error).message);
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
    <main className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 md:max-w-3xl lg:max-w-5xl ${SAFE}`}>
      <div className="flex items-center gap-3">
        <Link href={`/teams/${teamId}`} className="text-gray-500 hover:text-white">
          ←
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Formations</h1>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Responsive grid: side-by-side on desktop, stacked on mobile/tablet */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        {/* Saved formations */}
        {formations.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Saved
            </h2>
            <ul className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-1">
              {formations.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.positions.length} positions</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(f)}
                      className="rounded-lg px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Formation builder */}
        <section className={`flex flex-col gap-4 rounded-2xl border border-gray-800 p-4${formations.length === 0 ? " lg:col-span-2" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            {editingId ? "Edit Formation" : "New Formation"}
          </h2>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        </div>

        <label className="text-sm font-medium text-gray-200">
          Side size (players on field)
          <select
            value={sideSize}
            onChange={(e) => {
              setSideSize(parseInt(e.target.value, 10));
              setTemplateName(null);
            }}
            className="mt-1 block w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
          >
            {SIDE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}v{n}
              </option>
            ))}
          </select>
        </label>

        {/* Template picker */}
        {getTemplatesForSize(sideSize).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-400">
              Start from a template
            </p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const templates = getTemplatesForSize(sideSize);
                const hasMixed = templates.some(
                  (t) => !t.positions.some((p) => p.role === "Keeper")
                );
                return templates.map((t) => {
                  const hasKeeper = t.positions.some((p) => p.role === "Keeper");
                  const label = hasMixed
                    ? `${t.canonicalName} ${hasKeeper ? "+GK" : "(no GK)"}`
                    : t.canonicalName;
                  return (
                    <button
                      key={t.canonicalName}
                      type="button"
                      onClick={() => applyTemplate(t.canonicalName)}
                      className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                        templateName === t.canonicalName
                          ? "border-green-500 bg-green-500/20 text-green-300"
                          : "border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Position list */}
        <div className="flex flex-col gap-2">
          {positions.map((pos, i) => (
            <div key={pos.id} className="flex items-center gap-2">
              <span className="w-5 text-center text-xs text-gray-500">{i + 1}</span>
              <input
                value={pos.name}
                onChange={(e) => updatePosition(pos.id, { name: e.target.value })}
                placeholder="Name (e.g. LF)"
                className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-green-500"
              />
              <select
                value={pos.role}
                onChange={(e) =>
                  updatePosition(pos.id, { role: e.target.value as Role })
                }
                className="rounded-xl border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-white outline-none focus:border-green-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removePosition(pos.id)}
                className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addPosition}
            disabled={positions.length >= sideSize}
            className="rounded-xl border border-dashed border-gray-700 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-40"
          >
            + Add position ({positions.length}/{sideSize})
          </button>
        </div>

        {validationError && positions.length > 0 && (
          <p className="text-sm text-red-400">{validationError}</p>
        )}

        {!validationError && positions.length > 0 && (
          <p className="text-sm text-green-400">
            Formation: <strong>{generateFormationName(positions)}</strong>
          </p>
        )}

        {editingId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="w-full rounded-xl border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !!validationError || positions.length === 0}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : editingId ? "Save changes" : "Save formation"}
        </button>
      </section>
      </div>
    </main>
  );
}
