import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveGame, getGame, listGames, type GameSessionDoc } from "./games";
import type { RotationPlan } from "../engine/types";

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const STUB_PLAN: RotationPlan = {
  gameId: "game-1",
  halves: [
    { keeperId: "k1", segments: [] },
    { keeperId: "k2", segments: [] },
  ],
  waves: [],
  fairness: { perPlayer: [], flagged: [] },
};

const STUB_INPUT: Omit<GameSessionDoc, "id" | "createdAt"> = {
  formationId: "form-1",
  squadIds: ["p1", "p2", "p3"],
  keeperAssignments: [
    { halfIndex: 0, keeperId: "k1" },
    { halfIndex: 1, keeperId: "k2" },
  ],
  plan: STUB_PLAN,
};

// ── Firestore mock ────────────────────────────────────────────────────────────

type DocRef = { id: string; path: string };

const store: Record<string, Record<string, unknown>> = {};

function makeFakeRef(path: string): DocRef {
  const parts = path.split("/");
  return { id: parts[parts.length - 1], path };
}

vi.mock("firebase/firestore", () => {
  let autoId = 0;

  function isCollectionRef(arg: unknown): arg is { path: string; _isCollection: true } {
    return typeof arg === "object" && arg !== null && "_isCollection" in arg;
  }

  return {
    doc: vi.fn((dbOrRef: unknown, ...segments: string[]) => {
      if (isCollectionRef(dbOrRef)) {
        const id = `auto-${++autoId}`;
        return makeFakeRef(`${(dbOrRef as { path: string }).path}/${id}`);
      }
      return makeFakeRef(segments.join("/"));
    }),
    collection: vi.fn((_db: unknown, ...segments: string[]) => ({
      _isCollection: true as const,
      path: segments.join("/"),
    })),
    setDoc: vi.fn(async (ref: DocRef, data: Record<string, unknown>) => {
      store[ref.path] = { ...data };
    }),
    getDoc: vi.fn(async (ref: DocRef) => {
      const data = store[ref.path];
      return { exists: () => !!data, data: () => data, id: ref.id, ref };
    }),
    getDocs: vi.fn(async () => ({ docs: [] })),
    serverTimestamp: vi.fn(() => new Date("2025-06-01T00:00:00Z")),
  };
});

const fakeDb = {} as import("firebase/firestore").Firestore;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
});

// ── saveGame ──────────────────────────────────────────────────────────────────

describe("saveGame", () => {
  it("returns a GameSessionDoc with a generated id", async () => {
    const result = await saveGame(fakeDb, "team-1", STUB_INPUT);
    expect(result.id).toBeTruthy();
    expect(result.formationId).toBe("form-1");
    expect(result.squadIds).toEqual(["p1", "p2", "p3"]);
    expect(result.plan).toMatchObject({ gameId: "game-1" });
  });

  it("writes to /teams/{teamId}/games/", async () => {
    const { setDoc } = await import("firebase/firestore");
    await saveGame(fakeDb, "team-99", STUB_INPUT);
    const [ref] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as DocRef).path).toMatch(/^teams\/team-99\/games\//);
  });

  it("includes createdAt in the written document", async () => {
    const { setDoc } = await import("firebase/firestore");
    await saveGame(fakeDb, "team-1", STUB_INPUT);
    const [, written] = vi.mocked(setDoc).mock.calls[0];
    expect((written as Record<string, unknown>).createdAt).toBeDefined();
  });
});

// ── getGame ───────────────────────────────────────────────────────────────────

describe("getGame", () => {
  it("returns null when the game does not exist", async () => {
    const result = await getGame(fakeDb, "team-1", "ghost-game");
    expect(result).toBeNull();
  });

  it("returns the GameSessionDoc when the game exists", async () => {
    // Seed via saveGame so the test exercises the round-trip
    const saved = await saveGame(fakeDb, "team-1", STUB_INPUT);
    const result = await getGame(fakeDb, "team-1", saved.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(saved.id);
    expect(result!.plan.gameId).toBe("game-1");
    expect(result!.keeperAssignments).toHaveLength(2);
  });
});

// ── listGames ─────────────────────────────────────────────────────────────────

describe("listGames", () => {
  it("returns an empty array when the team has no games", async () => {
    const result = await listGames(fakeDb, "team-empty");
    expect(result).toEqual([]);
  });

  it("returns all saved games for the team", async () => {
    const { getDocs } = await import("firebase/firestore");
    const doc1: GameSessionDoc = { ...STUB_INPUT, id: "g1", createdAt: new Date() };
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ id: "g1", data: () => doc1 }],
    } as never);

    const result = await listGames(fakeDb, "team-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});
