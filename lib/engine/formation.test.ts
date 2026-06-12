import { describe, expect, it } from "vitest";
import { countByRole, formationSize, generateFormationName } from "./formation";
import type { Formation } from "./types";

// 2-3-2+GK — the canonical 8v8 formation from docs/rotation-plan.md.
const eightVeight: Formation = {
  id: "f-232-gk",
  name: "2-3-2+GK",
  positions: [
    { id: "gk", name: "GK", role: "Keeper" },
    { id: "ld", name: "LD", role: "Defender" },
    { id: "rd", name: "RD", role: "Defender" },
    { id: "lm", name: "LM", role: "Mid" },
    { id: "cm", name: "CM", role: "Mid" },
    { id: "rm", name: "RM", role: "Mid" },
    { id: "lf", name: "LF", role: "Forward" },
    { id: "rf", name: "RF", role: "Forward" },
  ],
};

describe("formationSize", () => {
  it("equals the on-field side size (8 for a 2-3-2+GK)", () => {
    expect(formationSize(eightVeight)).toBe(8);
  });
});

describe("countByRole", () => {
  it("counts Positions in every Role", () => {
    expect(countByRole(eightVeight)).toEqual({
      Forward: 2,
      Mid: 3,
      Defender: 2,
      Keeper: 1,
    });
  });
});

describe("generateFormationName", () => {
  it("leads with GK when a Keeper position is present", () => {
    expect(generateFormationName(eightVeight.positions)).toBe("GK-2D-3M-2F");
  });

  it("omits GK segment when no Keeper is present", () => {
    const noGk = eightVeight.positions.filter((p) => p.role !== "Keeper");
    expect(generateFormationName(noGk)).toBe("2D-3M-2F");
  });

  it("returns Custom for an empty position list", () => {
    expect(generateFormationName([])).toBe("Custom");
  });
});
