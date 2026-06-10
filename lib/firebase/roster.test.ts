import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addPlayer,
  updatePlayer,
  deletePlayer,
  getRoster,
  archivePlayer,
  getFullRoster,
} from "./roster";
import type { Player } from "../engine/types";

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
    updateDoc: vi.fn(async (ref: DocRef, updates: Record<string, unknown>) => {
      store[ref.path] = { ...(store[ref.path] ?? {}), ...updates };
    }),
    getDocs: vi.fn(async () => ({ docs: [] })),
    deleteDoc: vi.fn(async () => undefined),
  };
});

const fakeDb = {} as import("firebase/firestore").Firestore;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
});

// ── addPlayer ─────────────────────────────────────────────────────────────────

describe("addPlayer", () => {
  it("returns a Player with a generated id and the supplied name", async () => {
    const result = await addPlayer(fakeDb, "team-1", { name: "Alex" });
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("Alex");
  });

  it("round-trips optional fields (number, preferredRoles, ability, keeperEligible)", async () => {
    const { setDoc } = await import("firebase/firestore");
    const partial: Omit<Player, "id"> = {
      name: "Gabi",
      number: 7,
      preferredRoles: ["Forward", "Mid"],
      stretchRole: "Defender",
      ability: 8,
      keeperEligible: true,
    };
    const result = await addPlayer(fakeDb, "team-1", partial);

    expect(result.number).toBe(7);
    expect(result.preferredRoles).toEqual(["Forward", "Mid"]);
    expect(result.stretchRole).toBe("Defender");
    expect(result.ability).toBe(8);
    expect(result.keeperEligible).toBe(true);

    // Confirm the written document mirrors the Player
    const [, written] = vi.mocked(setDoc).mock.calls[0];
    expect(written).toMatchObject({ name: "Gabi", number: 7, ability: 8 });
  });
});

// ── getRoster ─────────────────────────────────────────────────────────────────

describe("getRoster", () => {
  it("returns an empty array when the team has no players", async () => {
    const result = await getRoster(fakeDb, "team-empty");
    expect(result).toEqual([]);
  });

  it("returns active players for the team", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: "p1", data: () => ({ id: "p1", name: "Alex" }) },
        { id: "p2", data: () => ({ id: "p2", name: "Bea", number: 5 }) },
      ],
    } as never);

    const result = await getRoster(fakeDb, "team-1");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name).sort()).toEqual(["Alex", "Bea"]);
    expect(result.find((p) => p.name === "Bea")?.number).toBe(5);
  });

  it("filters out archived players", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: "p1", data: () => ({ id: "p1", name: "Alex" }) },
        { id: "p2", data: () => ({ id: "p2", name: "Bea", status: "archived" }) },
        { id: "p3", data: () => ({ id: "p3", name: "Cal", status: "active" }) },
      ],
    } as never);

    const result = await getRoster(fakeDb, "team-1");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name).sort()).toEqual(["Alex", "Cal"]);
  });

  it("does not expose status on returned Player objects", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: "p1", data: () => ({ id: "p1", name: "Alex", status: "active" }) },
      ],
    } as never);

    const result = await getRoster(fakeDb, "team-1");
    expect((result[0] as unknown as Record<string, unknown>).status).toBeUndefined();
  });
});

// ── archivePlayer ─────────────────────────────────────────────────────────────

describe("archivePlayer", () => {
  it("calls updateDoc with status: archived", async () => {
    const { updateDoc } = await import("firebase/firestore");
    await archivePlayer(fakeDb, "team-1", "p-5");
    expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
    const [ref, updates] = vi.mocked(updateDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-1/roster/p-5");
    expect(updates).toEqual({ status: "archived" });
  });
});

// ── getFullRoster ─────────────────────────────────────────────────────────────

describe("getFullRoster", () => {
  it("returns all players including archived, with status preserved", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: "p1", data: () => ({ id: "p1", name: "Alex" }) },
        { id: "p2", data: () => ({ id: "p2", name: "Bea", status: "archived" }) },
      ],
    } as never);

    const result = await getFullRoster(fakeDb, "team-1");
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.name === "Bea")?.status).toBe("archived");
  });
});

// ── updatePlayer ──────────────────────────────────────────────────────────────

describe("updatePlayer", () => {
  it("calls updateDoc with only the changed fields", async () => {
    const { updateDoc } = await import("firebase/firestore");
    await updatePlayer(fakeDb, "team-1", "p-5", { name: "New Name", number: 9 });
    expect(vi.mocked(updateDoc)).toHaveBeenCalledOnce();
    const [ref, updates] = vi.mocked(updateDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-1/roster/p-5");
    expect(updates).toEqual({ name: "New Name", number: 9 });
  });
});

// ── deletePlayer ──────────────────────────────────────────────────────────────

describe("deletePlayer", () => {
  it("calls deleteDoc with the correct path", async () => {
    const { deleteDoc } = await import("firebase/firestore");
    await deletePlayer(fakeDb, "team-1", "p-99");
    expect(vi.mocked(deleteDoc)).toHaveBeenCalledOnce();
    const [ref] = vi.mocked(deleteDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-1/roster/p-99");
  });
});
