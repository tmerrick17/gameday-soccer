import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPreferences, savePreferences, DEFAULT_PREFERENCES } from "./preferences";

// ── Firestore mock ────────────────────────────────────────────────────────────

type DocRef = { id: string; path: string };

function makeFakeRef(path: string): DocRef {
  const parts = path.split("/");
  return { id: parts[parts.length - 1], path };
}

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) =>
    makeFakeRef(segments.join("/"))
  ),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => undefined),
}));

const fakeDb = {} as import("firebase/firestore").Firestore;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getPreferences ────────────────────────────────────────────────────────────

describe("getPreferences", () => {
  it("returns DEFAULT_PREFERENCES when no document exists", async () => {
    const result = await getPreferences(fakeDb, "team-1");
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  it("returns the saved preferences when a document exists", async () => {
    const { getDoc } = await import("firebase/firestore");
    const saved = {
      ...DEFAULT_PREFERENCES,
      strategy: "competitive",
      maxWaveSize: 2,
    };
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => saved,
    } as never);

    const result = await getPreferences(fakeDb, "team-1");
    expect(result.strategy).toBe("competitive");
    expect(result.maxWaveSize).toBe(2);
  });
});

// ── savePreferences ───────────────────────────────────────────────────────────

describe("savePreferences", () => {
  it("writes to /teams/{teamId}/config/preferences", async () => {
    const { setDoc } = await import("firebase/firestore");
    await savePreferences(fakeDb, "team-99", DEFAULT_PREFERENCES);

    expect(vi.mocked(setDoc)).toHaveBeenCalledOnce();
    const [ref] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as DocRef).path).toBe("teams/team-99/config/preferences");
  });

  it("persists the supplied preferences object", async () => {
    const { setDoc } = await import("firebase/firestore");
    const custom = { ...DEFAULT_PREFERENCES, strategy: "development" as const };
    await savePreferences(fakeDb, "team-1", custom);

    const [, written] = vi.mocked(setDoc).mock.calls[0];
    expect((written as typeof custom).strategy).toBe("development");
  });
});
