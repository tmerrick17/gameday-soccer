import { describe, it, expect } from "vitest";
import { getTemplatesForSize, FORMATION_TEMPLATES } from "./formationTemplates";
import { validateFormation } from "../firebase/formations";

describe("getTemplatesForSize", () => {
  it("returns 4 templates for 5v5", () => {
    expect(getTemplatesForSize(5)).toHaveLength(4);
  });

  it("returns 5 templates for 6v6", () => {
    expect(getTemplatesForSize(6)).toHaveLength(5);
  });

  it("returns 3 templates for 7v7", () => {
    expect(getTemplatesForSize(7)).toHaveLength(3);
  });

  it("returns empty array for sizes with no templates", () => {
    expect(getTemplatesForSize(8)).toEqual([]);
  });
});

describe("5v5 templates", () => {
  const templates = FORMATION_TEMPLATES[5];

  it("each template has exactly 5 positions", () => {
    for (const t of templates) {
      expect(t.positions).toHaveLength(5);
    }
  });

  it("GK variants have exactly 1 Keeper, no-GK variants have 0", () => {
    const keeperCounts = templates.map(
      (t) => t.positions.filter((p) => p.role === "Keeper").length
    );
    expect(keeperCounts).toContain(1);
    expect(keeperCounts).toContain(0);
  });

  it("each template passes validateFormation for size 5", () => {
    for (const t of templates) {
      const formation = {
        name: t.canonicalName,
        positions: t.positions.map((p, i) => ({ ...p, id: `pos-${i}` })),
      };
      expect(validateFormation(formation, 5)).toBeNull();
    }
  });

  it("includes GK variants 1-2-1 and 2-1-1", () => {
    const gkTemplates = templates.filter((t) =>
      t.positions.some((p) => p.role === "Keeper")
    );
    const names = gkTemplates.map((t) => t.canonicalName);
    expect(names).toContain("1-2-1");
    expect(names).toContain("2-1-1");
  });

  it("includes no-GK variants 2-1-2 and 2-2-1", () => {
    const noGkTemplates = templates.filter(
      (t) => !t.positions.some((p) => p.role === "Keeper")
    );
    const names = noGkTemplates.map((t) => t.canonicalName);
    expect(names).toContain("2-1-2");
    expect(names).toContain("2-2-1");
  });
});

describe("6v6 templates", () => {
  const templates = FORMATION_TEMPLATES[6];

  it("each template has exactly 6 positions", () => {
    for (const t of templates) {
      expect(t.positions).toHaveLength(6);
    }
  });

  it("GK variants have exactly 1 Keeper, no-GK variants have 0", () => {
    const keeperCounts = templates.map(
      (t) => t.positions.filter((p) => p.role === "Keeper").length
    );
    expect(keeperCounts).toContain(1);
    expect(keeperCounts).toContain(0);
  });

  it("each template passes validateFormation for size 6", () => {
    for (const t of templates) {
      const formation = {
        name: t.canonicalName,
        positions: t.positions.map((p, i) => ({ ...p, id: `pos-${i}` })),
      };
      expect(validateFormation(formation, 6)).toBeNull();
    }
  });

  it("includes GK variants 2-1-2, 2-2-1, and 1-3-1", () => {
    const gkTemplates = templates.filter((t) =>
      t.positions.some((p) => p.role === "Keeper")
    );
    const names = gkTemplates.map((t) => t.canonicalName);
    expect(names).toContain("2-1-2");
    expect(names).toContain("2-2-1");
    expect(names).toContain("1-3-1");
  });

  it("includes no-GK variants 2-2-2 and 3-2-1", () => {
    const noGkTemplates = templates.filter(
      (t) => !t.positions.some((p) => p.role === "Keeper")
    );
    const names = noGkTemplates.map((t) => t.canonicalName);
    expect(names).toContain("2-2-2");
    expect(names).toContain("3-2-1");
  });
});

describe("7v7 templates", () => {
  const templates = FORMATION_TEMPLATES[7];

  it("each template has exactly 7 positions", () => {
    for (const t of templates) {
      expect(t.positions).toHaveLength(7);
    }
  });

  it("each template has exactly 1 Keeper", () => {
    for (const t of templates) {
      const keepers = t.positions.filter((p) => p.role === "Keeper");
      expect(keepers).toHaveLength(1);
    }
  });

  it("each template passes validateFormation for size 7", () => {
    for (const t of templates) {
      const formation = {
        name: t.canonicalName,
        positions: t.positions.map((p, i) => ({ ...p, id: `pos-${i}` })),
      };
      expect(validateFormation(formation, 7)).toBeNull();
    }
  });

  it("canonical names are 2-3-1, 3-2-1, 2-1-2-1", () => {
    const names = templates.map((t) => t.canonicalName);
    expect(names).toContain("2-3-1");
    expect(names).toContain("3-2-1");
    expect(names).toContain("2-1-2-1");
  });

  it("positions follow GK → def → mid → fwd order", () => {
    for (const t of templates) {
      const roleOrder = t.positions.map((p) => p.role);
      const firstNonKeeper = roleOrder.findIndex((r) => r !== "Keeper");
      const firstMid = roleOrder.findIndex((r) => r === "Mid");
      const firstFwd = roleOrder.findIndex((r) => r === "Forward");
      // GK must come before defenders
      expect(firstNonKeeper).toBeGreaterThan(0);
      // Defenders must appear before mids
      if (firstMid !== -1) expect(firstMid).toBeGreaterThan(firstNonKeeper);
      // Mids must appear before forwards
      if (firstFwd !== -1 && firstMid !== -1)
        expect(firstFwd).toBeGreaterThan(firstMid);
    }
  });
});
