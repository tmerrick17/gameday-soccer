import { describe, expect, it, vi, beforeEach } from "vitest";
import { validateFormation, saveFormation, getFormations, deleteFormation, updateFormation } from "./formations";
import type { Position } from "../engine/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pos(id: string, name: string, role: Position["role"]): Position {
  return { id, name, role };
}

const VALID_8V8: Omit<import("../engine/types").Formation, "id"> = {
  name: "2-3-2+GK",
  positions: [
    pos("p1", "GK", "Keeper"),
    pos("p2", "RD", "Defender"),
    pos("p3", "LD", "Defender"),
    pos("p4", "RM", "Mid"),
    pos("p5", "CM", "Mid"),
    pos("p6", "LM", "Mid"),
    pos("p7", "RF", "Forward"),
    pos("p8", "LF", "Forward"),
  ],
};

// ── validateFormation ─────────────────────────────────────────────────────────

describe("validateFormation", () => {
  it("returns an error when positions is empty", () => {
    const result = validateFormation({ name: "Empty", positions: [] }, 8);
    expect(result).toBeTruthy();
  });

  it("returns an error when position count does not match sideSize", () => {
    const result = validateFormation(VALID_8V8, 11);
    expect(result).toBeTruthy();
    expect(result).toMatch(/8.*11|11.*8/i);
  });

  it("returns an error when there are two Keeper positions", () => {
    const twoKeepers = {
      ...VALID_8V8,
      positions: [
        ...VALID_8V8.positions.slice(0, 7),
        pos("p8x", "GK2", "Keeper"),
      ],
    };
    const result = validateFormation(twoKeepers, 8);
    expect(result).toBeTruthy();
    expect(result).toMatch(/keeper/i);
  });

  it("returns null for a valid formation with one keeper", () => {
    expect(validateFormation(VALID_8V8, 8)).toBeNull();
  });

  it("returns null for a valid formation with zero keepers", () => {
    const noKeeper = {
      name: "3-4",
      positions: [
        pos("a", "RD", "Defender"),
        pos("b", "CD", "Defender"),
        pos("c", "LD", "Defender"),
        pos("d", "RM", "Mid"),
        pos("e", "CM", "Mid"),
        pos("f", "LM", "Mid"),
        pos("g", "RF", "Forward"),
      ],
    };
    expect(validateFormation(noKeeper, 7)).toBeNull();
  });
});

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
    getDocs: vi.fn(async () => ({ docs: [] })),
    deleteDoc: vi.fn(async () => undefined),
  };
});

const fakeDb = {} as import("firebase/firestore").Firestore;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
});

// ── saveFormation ─────────────────────────────────────────────────────────────

describe("saveFormation", () => {
  it("returns a Formation with a generated id", async () => {
    const result = await saveFormation(fakeDb, "team-1", VALID_8V8);
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("2-3-2+GK");
    expect(result.positions).toHaveLength(8);
  });

  it("writes the formation document to Firestore", async () => {
    const { setDoc } = await import("firebase/firestore");
    await saveFormation(fakeDb, "team-1", VALID_8V8);
    expect(vi.mocked(setDoc)).toHaveBeenCalledOnce();
    const [ref, data] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as DocRef).path).toMatch(/^teams\/team-1\/formations\//);
    expect((data as Record<string, unknown>).name).toBe("2-3-2+GK");
  });
});

// ── getFormations ─────────────────────────────────────────────────────────────

describe("getFormations", () => {
  it("returns an empty array when the team has no formations", async () => {
    const result = await getFormations(fakeDb, "team-x");
    expect(result).toEqual([]);
  });

  it("returns all formations stored for the team", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: "form-1",
          data: () => ({ ...VALID_8V8, id: "form-1" }),
        },
      ],
    } as never);
    const result = await getFormations(fakeDb, "team-1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("2-3-2+GK");
    expect(result[0].id).toBe("form-1");
  });
});

// ── deleteFormation ───────────────────────────────────────────────────────────

describe("deleteFormation", () => {
  it("calls deleteDoc with the correct path", async () => {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteFormation(fakeDb, "team-1", "form-99");
    expect(vi.mocked(deleteDoc)).toHaveBeenCalledOnce();
    const [ref] = vi.mocked(deleteDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-1/formations/form-99");
  });
});

// ── updateFormation ───────────────────────────────────────────────────────────

describe("updateFormation", () => {
  const EXISTING: import("../engine/types").Formation = { ...VALID_8V8, id: "form-42" };

  it("calls setDoc with the correct path for the existing formation", async () => {
    const { setDoc } = await import("firebase/firestore");
    await updateFormation(fakeDb, "team-1", EXISTING);
    expect(vi.mocked(setDoc)).toHaveBeenCalledOnce();
    const [ref] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-1/formations/form-42");
  });

  it("returns the same formation object", async () => {
    const result = await updateFormation(fakeDb, "team-1", EXISTING);
    expect(result).toEqual(EXISTING);
  });
});
