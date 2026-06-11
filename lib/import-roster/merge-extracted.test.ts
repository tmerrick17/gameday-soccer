import { describe, it, expect } from "vitest";
import { mergeExtracted } from "./merge-extracted";

describe("mergeExtracted", () => {
  it("returns all rows unchanged from a single batch with no duplicates", () => {
    const batch = [
      { name: "Alex Muller", number: 7 },
      { name: "Sam Chen", number: 12 },
    ];
    expect(mergeExtracted([batch])).toEqual(batch);
  });

  it("collapses duplicate names across two batches, keeping first occurrence", () => {
    const batch1 = [{ name: "Alex", number: 7 }];
    const batch2 = [{ name: "Alex", number: 99 }, { name: "Jordan" }];
    const result = mergeExtracted([batch1, batch2]);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.name === "Alex")?.number).toBe(7);
    expect(result.find((p) => p.name === "Jordan")).toBeDefined();
  });

  it("collapses names case-insensitively across batches", () => {
    const batch1 = [{ name: "ALEX", number: 3 }];
    const batch2 = [{ name: "alex" }, { name: "Alex" }];
    const result = mergeExtracted([batch1, batch2]);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(3);
  });

  it("preserves number from first occurrence when second has no number", () => {
    const batch1 = [{ name: "Riley", number: 10 }];
    const batch2 = [{ name: "Riley" }];
    const result = mergeExtracted([batch1, batch2]);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(10);
  });

  it("ignores empty batches", () => {
    const batch = [{ name: "Morgan" }];
    expect(mergeExtracted([[], batch, []])).toEqual([{ name: "Morgan" }]);
  });

  it("returns empty array when all batches are empty", () => {
    expect(mergeExtracted([[], []])).toEqual([]);
  });
});
