import { describe, expect, it } from "vitest";
import { sortByStrategy } from "./strategy";
import type { PlayerState } from "./strategy";

function makeState(id: string, minutesPlayed: number, shifts = 0, rolesPlayed: string[] = [], ability?: number): PlayerState {
  return {
    player: { id, name: `Player ${id}`, ability },
    minutesPlayed,
    shifts,
    rolesPlayed: rolesPlayed as PlayerState["rolesPlayed"],
  };
}

// --- equal-time ---

describe("equal-time: sorts by fewest minutes first", () => {
  it("returns the player with fewer minutes first", () => {
    const players = [
      makeState("p2", 20),
      makeState("p1", 10),
      makeState("p3", 15),
    ];
    const sorted = sortByStrategy(players, "equal-time");
    expect(sorted.map((s) => s.player.id)).toEqual(["p1", "p3", "p2"]);
  });

  it("breaks ties on minutes by fewest shifts", () => {
    const players = [
      makeState("p1", 10, 3),
      makeState("p2", 10, 1),
      makeState("p3", 10, 2),
    ];
    const sorted = sortByStrategy(players, "equal-time");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("breaks ties on minutes and shifts by lowest player id", () => {
    const players = [
      makeState("p-z", 10, 1),
      makeState("p-a", 10, 1),
      makeState("p-m", 10, 1),
    ];
    const sorted = sortByStrategy(players, "equal-time");
    expect(sorted.map((s) => s.player.id)).toEqual(["p-a", "p-m", "p-z"]);
  });

  it("does not mutate the input array", () => {
    const players = [makeState("p2", 20), makeState("p1", 10)];
    const original = [...players];
    sortByStrategy(players, "equal-time");
    expect(players.map((s) => s.player.id)).toEqual(original.map((s) => s.player.id));
  });
});

// --- competitive ---

describe("competitive: sorts by highest Ability first", () => {
  it("returns highest ability player first", () => {
    const players = [
      makeState("p1", 0, 0, [], 5),
      makeState("p2", 0, 0, [], 9),
      makeState("p3", 0, 0, [], 7),
    ];
    const sorted = sortByStrategy(players, "competitive");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("breaks ability tie by fewest minutes (tiebreak)", () => {
    const players = [
      makeState("p1", 15, 0, [], 8),
      makeState("p2", 5, 0, [], 8),
    ];
    const sorted = sortByStrategy(players, "competitive");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p1"]);
  });

  it("breaks ability+minutes tie by lowest player id", () => {
    const players = [
      makeState("p-z", 10, 1, [], 8),
      makeState("p-a", 10, 1, [], 8),
    ];
    const sorted = sortByStrategy(players, "competitive");
    expect(sorted.map((s) => s.player.id)).toEqual(["p-a", "p-z"]);
  });
});

// --- development ---

describe("development: fewest distinct Roles played first", () => {
  it("returns player with fewest distinct roles first", () => {
    const players = [
      makeState("p1", 0, 0, ["Forward", "Mid", "Defender"]),
      makeState("p2", 0, 0, ["Forward"]),
      makeState("p3", 0, 0, ["Forward", "Mid"]),
    ];
    const sorted = sortByStrategy(players, "development");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("counts only distinct roles (repeats don't count extra)", () => {
    const players = [
      makeState("p1", 0, 0, ["Forward", "Forward", "Forward"]),
      makeState("p2", 0, 0, ["Forward", "Mid"]),
    ];
    const sorted = sortByStrategy(players, "development");
    expect(sorted.map((s) => s.player.id)).toEqual(["p1", "p2"]);
  });

  it("breaks variety tie by fewest minutes", () => {
    const players = [
      makeState("p1", 20, 0, ["Forward"]),
      makeState("p2", 5, 0, ["Forward"]),
    ];
    const sorted = sortByStrategy(players, "development");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p1"]);
  });

  it("breaks variety+minutes tie by lowest player id", () => {
    const players = [
      makeState("p-z", 10, 0, ["Forward"]),
      makeState("p-a", 10, 0, ["Forward"]),
    ];
    const sorted = sortByStrategy(players, "development");
    expect(sorted.map((s) => s.player.id)).toEqual(["p-a", "p-z"]);
  });
});

// --- blend ---

describe("blend: fewest minutes first, tie-broken by fewest distinct Roles", () => {
  it("returns player with fewer minutes first", () => {
    const players = [
      makeState("p1", 20, 0, ["Forward"]),
      makeState("p2", 5, 0, ["Forward"]),
      makeState("p3", 15, 0, ["Forward"]),
    ];
    const sorted = sortByStrategy(players, "blend");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("breaks minutes tie by fewest distinct Roles played", () => {
    const players = [
      makeState("p1", 10, 0, ["Forward", "Mid"]),
      makeState("p2", 10, 0, ["Forward"]),
    ];
    const sorted = sortByStrategy(players, "blend");
    expect(sorted.map((s) => s.player.id)).toEqual(["p2", "p1"]);
  });

  it("breaks minutes+variety tie by fewest shifts, then id", () => {
    const players = [
      makeState("p-z", 10, 2, ["Forward"]),
      makeState("p-a", 10, 3, ["Forward"]),
      makeState("p-m", 10, 2, ["Forward"]),
    ];
    const sorted = sortByStrategy(players, "blend");
    expect(sorted.map((s) => s.player.id)).toEqual(["p-m", "p-z", "p-a"]);
  });
});
