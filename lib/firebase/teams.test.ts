import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateInviteCode, createTeam, joinTeam, getTeamsByUser } from "./teams";

// ── Firestore mock ────────────────────────────────────────────────────────────

type DocRef = { id: string; path: string; parent: { parent?: DocRef | null } | null };

// In-memory store keyed by path
const store: Record<string, Record<string, unknown>> = {};

function pathFor(...segments: string[]): string {
  return segments.join("/");
}

function makeFakeRef(path: string): DocRef {
  const parts = path.split("/");
  const id = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join("/");
  const parent: DocRef["parent"] =
    parentPath.length > 0
      ? {
          parent:
            parts.length > 2
              ? makeFakeRef(parts.slice(0, -2).join("/"))
              : null,
        }
      : null;
  return { id, path, parent };
}

vi.mock("firebase/firestore", () => {
  let autoId = 0;

  function isCollectionRef(arg: unknown): arg is { path: string; _isCollection: true } {
    return typeof arg === "object" && arg !== null && "_isCollection" in arg;
  }

  return {
    doc: vi.fn((dbOrCollRef: unknown, ...segments: string[]) => {
      // doc(collectionRef) — auto-id doc in that collection
      if (isCollectionRef(dbOrCollRef)) {
        const id = `auto-${++autoId}`;
        const path = `${(dbOrCollRef as { path: string }).path}/${id}`;
        return makeFakeRef(path);
      }
      // doc(db, "col", "id", ...) — path from segments
      const path = segments.join("/");
      return makeFakeRef(path);
    }),
    collection: vi.fn((_db: unknown, ...segments: string[]) => ({
      _isCollection: true as const,
      path: segments.join("/"),
    })),
    collectionGroup: vi.fn((_db: unknown, name: string) => ({
      _collectionId: name,
    })),
    setDoc: vi.fn(async (ref: DocRef, data: Record<string, unknown>) => {
      store[ref.path] = { ...data };
    }),
    getDoc: vi.fn(async (ref: DocRef) => {
      const data = store[ref.path];
      return {
        exists: () => data !== undefined,
        data: () => data,
        id: ref.id,
        ref,
      };
    }),
    getDocs: vi.fn(async () => ({ docs: [] })),
    query: vi.fn((...args: unknown[]) => args[0]),
    where: vi.fn(),
    serverTimestamp: vi.fn(() => new Date("2025-01-01T00:00:00Z")),
  };
});

// Fake Firestore db object (content doesn't matter — all ops are mocked)
const fakeDb = {} as import("firebase/firestore").Firestore;

beforeEach(() => {
  // Reset the in-memory store between tests
  for (const key of Object.keys(store)) delete store[key];
});

// ── generateInviteCode ────────────────────────────────────────────────────────

describe("generateInviteCode", () => {
  it("returns a 6-character string", () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it("contains only uppercase letters and digits", () => {
    expect(generateInviteCode()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("produces different codes on successive calls (probabilistic)", () => {
    const codes = new Set(Array.from({ length: 10 }, generateInviteCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ── createTeam ────────────────────────────────────────────────────────────────

describe("createTeam", () => {
  it("returns a TeamDoc with the correct name and headCoachId", async () => {
    const result = await createTeam(fakeDb, {
      name: "FC Test",
      userId: "user-1",
      email: "coach@test.com",
      displayName: "Coach One",
    });

    expect(result.name).toBe("FC Test");
    expect(result.headCoachId).toBe("user-1");
    expect(result.id).toBeTruthy();
    expect(result.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("writes a head-coach member document", async () => {
    const { setDoc } = await import("firebase/firestore");
    const calls = vi.mocked(setDoc).mock.calls;

    await createTeam(fakeDb, {
      name: "FC Test",
      userId: "user-abc",
      email: "a@b.com",
      displayName: "Abe",
    });

    const memberCall = calls.find(([ref]) =>
      (ref as DocRef).path.includes("members/user-abc")
    );
    expect(memberCall).toBeDefined();
    expect(memberCall![1]).toMatchObject({ role: "head-coach", userId: "user-abc" });
  });

  it("makes exactly three setDoc calls (team, member, inviteCode)", async () => {
    const { setDoc } = await import("firebase/firestore");
    const callsBefore = vi.mocked(setDoc).mock.calls.length;

    await createTeam(fakeDb, {
      name: "Three Writes FC",
      userId: "user-3",
      email: "c@d.com",
      displayName: "Carl",
    });

    expect(vi.mocked(setDoc).mock.calls.length - callsBefore).toBe(3);
  });

  it("writes an inviteCode document in /inviteCodes", async () => {
    const { setDoc } = await import("firebase/firestore");
    const callsBefore = vi.mocked(setDoc).mock.calls.length;

    const result = await createTeam(fakeDb, {
      name: "FC Invite",
      userId: "user-2",
      email: "b@c.com",
      displayName: "Beth",
    });

    const callsAfter = vi.mocked(setDoc).mock.calls.slice(callsBefore);
    const inviteCall = callsAfter.find(([ref]) =>
      (ref as DocRef).path.startsWith("inviteCodes/")
    );
    expect(inviteCall).toBeDefined();
    expect(inviteCall![1]).toMatchObject({
      code: result.inviteCode,
      teamName: "FC Invite",
      createdBy: "user-2",
    });
  });
});

// ── joinTeam ──────────────────────────────────────────────────────────────────

describe("joinTeam", () => {
  it("throws when the invite code does not exist", async () => {
    await expect(
      joinTeam(fakeDb, {
        code: "NOCODE",
        userId: "user-x",
        email: "x@y.com",
        displayName: "X",
      })
    ).rejects.toThrow(/NOCODE/);
  });

  it("returns the TeamDoc and writes a coach member doc on success", async () => {
    // Seed the store with a team + invite code
    const { setDoc } = await import("firebase/firestore");
    store["inviteCodes/ABC123"] = {
      code: "ABC123",
      teamId: "team-99",
      teamName: "FC Seed",
      createdBy: "head-1",
      createdAt: new Date("2025-01-01"),
    };
    store["teams/team-99"] = {
      name: "FC Seed",
      headCoachId: "head-1",
      inviteCode: "ABC123",
      createdAt: new Date("2025-01-01"),
    };

    const callsBefore = vi.mocked(setDoc).mock.calls.length;

    const result = await joinTeam(fakeDb, {
      code: "ABC123",
      userId: "user-new",
      email: "new@coach.com",
      displayName: "New Coach",
    });

    expect(result.id).toBe("team-99");
    expect(result.name).toBe("FC Seed");

    const memberCall = vi
      .mocked(setDoc)
      .mock.calls.slice(callsBefore)
      .find(([ref]) => (ref as DocRef).path.includes("members/user-new"));
    expect(memberCall).toBeDefined();
    expect(memberCall![1]).toMatchObject({
      role: "coach",
      inviteCode: "ABC123",
      userId: "user-new",
    });
  });
});

// ── getTeamsByUser ────────────────────────────────────────────────────────────

describe("getTeamsByUser", () => {
  it("returns an empty array when user has no memberships", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as never);

    const result = await getTeamsByUser(fakeDb, "nobody");
    expect(result).toEqual([]);
  });

  it("returns the teams for each membership found", async () => {
    const { getDocs } = await import("firebase/firestore");

    store["teams/team-A"] = {
      name: "Team Alpha",
      headCoachId: "u1",
      inviteCode: "AAABBB",
      createdAt: new Date("2025-06-01"),
    };
    store["teams/team-B"] = {
      name: "Team Beta",
      headCoachId: "u2",
      inviteCode: "CCCDDD",
      createdAt: new Date("2025-06-02"),
    };

    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { ref: { ...makeFakeRef("teams/team-A/members/u1"), parent: { parent: makeFakeRef("teams/team-A") } } },
        { ref: { ...makeFakeRef("teams/team-B/members/u1"), parent: { parent: makeFakeRef("teams/team-B") } } },
      ],
    } as never);

    const result = await getTeamsByUser(fakeDb, "u1");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name).sort()).toEqual(["Team Alpha", "Team Beta"]);
  });
});
