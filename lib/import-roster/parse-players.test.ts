import { describe, it, expect } from "vitest";
import { parsePlayers } from "./parse-players";

describe("parsePlayers", () => {
  it("returns player array from a valid JSON string", () => {
    const raw = JSON.stringify([
      { name: "Alex Muller", number: 7 },
      { name: "Sam Chen", number: 12 },
    ]);
    expect(parsePlayers(raw)).toEqual([
      { name: "Alex Muller", number: 7 },
      { name: "Sam Chen", number: 12 },
    ]);
  });

  it("strips ```json ... ``` markdown fences before parsing", () => {
    const raw = '```json\n[{"name":"Jo Smith","number":3}]\n```';
    expect(parsePlayers(raw)).toEqual([{ name: "Jo Smith", number: 3 }]);
  });

  it("strips plain ``` fences before parsing", () => {
    const raw = '```\n[{"name":"Taylor"}]\n```';
    expect(parsePlayers(raw)).toEqual([{ name: "Taylor" }]);
  });

  it("omits number field when the model returns no number", () => {
    const raw = JSON.stringify([{ name: "Morgan" }]);
    const result = parsePlayers(raw);
    expect(result).toEqual([{ name: "Morgan" }]);
    expect(result![0]).not.toHaveProperty("number");
  });

  it("coerces string numbers to numeric", () => {
    const raw = JSON.stringify([{ name: "River", number: "11" }]);
    expect(parsePlayers(raw)).toEqual([{ name: "River", number: 11 }]);
  });

  it("returns null for completely invalid JSON", () => {
    expect(parsePlayers("not json at all")).toBeNull();
  });

  it("returns null when JSON is not an array", () => {
    expect(parsePlayers('{"name":"oops"}')).toBeNull();
  });

  it("skips items missing a name, keeps valid items", () => {
    const raw = JSON.stringify([
      { number: 5 },
      { name: "Valid Player", number: 5 },
      { name: "", number: 9 },
    ]);
    expect(parsePlayers(raw)).toEqual([{ name: "Valid Player", number: 5 }]);
  });

  it("returns empty array when all items are invalid", () => {
    const raw = JSON.stringify([{ number: 1 }, { number: 2 }]);
    expect(parsePlayers(raw)).toEqual([]);
  });
});
