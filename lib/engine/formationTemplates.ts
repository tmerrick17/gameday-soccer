import type { Role } from "./types";

export interface FormationTemplate {
  canonicalName: string;
  positions: Array<{ name: string; role: Role }>;
}

export const FORMATION_TEMPLATES: Record<number, FormationTemplate[]> = {
  7: [
    {
      canonicalName: "2-3-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-2-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-1-2-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Defensive Mid", role: "Mid" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
  ],
};

export function getTemplatesForSize(sideSize: number): FormationTemplate[] {
  return FORMATION_TEMPLATES[sideSize] ?? [];
}
