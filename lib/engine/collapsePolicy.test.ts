import { describe, expect, it } from "vitest";
import { resolve } from "./collapsePolicy";
import type { Preferences } from "./types";

const basePrefs: Preferences = {
  strategy: "equal-time",
  maxWaveSize: 2,
  segmentMinutes: 6,
  halfMinutes: 20,
  cadenceByRole: { Forward: 5, Mid: 5, Defender: 10, Keeper: 20 },
};

// --- 8v8 (sideSize = 8) ---

describe("8v8 with 13-player Squad (5 Subs)", () => {
  it('returns "wave" mode', () => {
    const result = resolve(13, 8, basePrefs);
    expect(result.mode).toBe("wave");
    expect(result.shortHanded).toBe(false);
  });
});

describe("8v8 with 11-player Squad (3 Subs — at threshold)", () => {
  it('returns "wave" mode', () => {
    const result = resolve(11, 8, basePrefs);
    expect(result.mode).toBe("wave");
    expect(result.shortHanded).toBe(false);
  });
});

describe("8v8 with 10-player Squad (2 Subs)", () => {
  it('returns "breather" mode', () => {
    const result = resolve(10, 8, basePrefs);
    expect(result.mode).toBe("breather");
    expect(result.shortHanded).toBe(false);
  });
});

describe("8v8 with 9-player Squad (1 Sub)", () => {
  it('returns "breather" mode', () => {
    const result = resolve(9, 8, basePrefs);
    expect(result.mode).toBe("breather");
    expect(result.shortHanded).toBe(false);
  });
});

describe("8v8 with 8-player Squad (0 Subs)", () => {
  it('returns "none" mode', () => {
    const result = resolve(8, 8, basePrefs);
    expect(result.mode).toBe("none");
    expect(result.shortHanded).toBe(false);
  });
});

describe("8v8 with 6-player Squad (below side size)", () => {
  it('returns "short-handed" mode with shortHanded flag', () => {
    const result = resolve(6, 8, basePrefs);
    expect(result.mode).toBe("short-handed");
    expect(result.shortHanded).toBe(true);
  });
});

// --- 11v11 (sideSize = 11) ---

describe("11v11 with 16-player Squad (5 Subs)", () => {
  it('returns "wave" mode', () => {
    const result = resolve(16, 11, basePrefs);
    expect(result.mode).toBe("wave");
    expect(result.shortHanded).toBe(false);
  });
});

describe("11v11 with 12-player Squad (1 Sub)", () => {
  it('returns "breather" mode', () => {
    const result = resolve(12, 11, basePrefs);
    expect(result.mode).toBe("breather");
    expect(result.shortHanded).toBe(false);
  });
});

describe("11v11 with 11-player Squad (0 Subs)", () => {
  it('returns "none" mode', () => {
    const result = resolve(11, 11, basePrefs);
    expect(result.mode).toBe("none");
    expect(result.shortHanded).toBe(false);
  });
});

// --- Custom fullWavesThreshold ---

describe("custom fullWavesThreshold=2", () => {
  const prefs = { ...basePrefs, fullWavesThreshold: 2 };

  it('squad=10 sideSize=8 (2 Subs, at custom threshold) returns "wave"', () => {
    const result = resolve(10, 8, prefs);
    expect(result.mode).toBe("wave");
  });

  it('squad=9 sideSize=8 (1 Sub, below custom threshold) returns "breather"', () => {
    const result = resolve(9, 8, prefs);
    expect(result.mode).toBe("breather");
  });
});
