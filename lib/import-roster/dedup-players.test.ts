import { describe, it, expect } from "vitest";
import { filterNewPlayers } from "./dedup-players";

describe("filterNewPlayers", () => {
  it("returns all incoming players when existing roster is empty", () => {
    const incoming = [{ name: "Alex Muller", number: 7 }, { name: "Sam Chen" }];
    expect(filterNewPlayers(incoming, [])).toEqual({
      toAdd: incoming,
      skippedCount: 0,
    });
  });

  it("skips players whose name already exists in the roster", () => {
    const incoming = [{ name: "Alex" }, { name: "Jordan" }];
    const existing = [{ name: "Jordan" }];
    const { toAdd, skippedCount } = filterNewPlayers(incoming, existing);
    expect(toAdd).toEqual([{ name: "Alex" }]);
    expect(skippedCount).toBe(1);
  });

  it("matches names case-insensitively", () => {
    const incoming = [
      { name: "ALEX" },
      { name: "alex" },
      { name: "Alex" },
    ];
    const existing = [{ name: "Alex" }];
    const { toAdd, skippedCount } = filterNewPlayers(incoming, existing);
    expect(toAdd).toEqual([]);
    expect(skippedCount).toBe(3);
  });

  it("trims whitespace before comparing names", () => {
    const incoming = [{ name: "  Morgan  " }];
    const existing = [{ name: "Morgan" }];
    const { toAdd, skippedCount } = filterNewPlayers(incoming, existing);
    expect(toAdd).toEqual([]);
    expect(skippedCount).toBe(1);
  });

  it("returns empty toAdd and zero skipped when incoming is empty", () => {
    expect(filterNewPlayers([], [{ name: "Existing" }])).toEqual({
      toAdd: [],
      skippedCount: 0,
    });
  });

  it("preserves number field on players that pass through", () => {
    const incoming = [{ name: "New Player", number: 11 }];
    const { toAdd } = filterNewPlayers(incoming, []);
    expect(toAdd[0].number).toBe(11);
  });
});
