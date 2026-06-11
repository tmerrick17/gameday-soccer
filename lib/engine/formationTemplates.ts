import type { Role } from "./types";

export interface FormationTemplate {
  canonicalName: string;
  positions: Array<{ name: string; role: Role }>;
}

export const FORMATION_TEMPLATES: Record<number, FormationTemplate[]> = {
  5: [
    {
      canonicalName: "1-2-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Center Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-1-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Center Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-1-2",
      positions: [
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Center Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-2-1",
      positions: [
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
  ],
  6: [
    {
      canonicalName: "2-1-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Center Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-2-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "1-3-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Center Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-2-2",
      positions: [
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-2-1",
      positions: [
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
  ],
  8: [
    {
      canonicalName: "3-3-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-3-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-2-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
  ],
  9: [
    {
      canonicalName: "3-3-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-2-3",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Striker", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "2-3-3",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Striker", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-4-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Left Center Mid", role: "Mid" },
        { name: "Right Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
  ],
  10: [
    {
      canonicalName: "3-3-3",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Striker", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "4-3-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Left Center Back", role: "Defender" },
        { name: "Right Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
  ],
  11: [
    {
      canonicalName: "4-4-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Left Center Back", role: "Defender" },
        { name: "Right Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Left Center Mid", role: "Mid" },
        { name: "Right Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "4-3-3",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Left Center Back", role: "Defender" },
        { name: "Right Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Striker", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
    {
      canonicalName: "4-2-3-1",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Left Center Back", role: "Defender" },
        { name: "Right Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Defensive Mid", role: "Mid" },
        { name: "Defensive Mid", role: "Mid" },
        { name: "Left Attacking Mid", role: "Mid" },
        { name: "Center Attacking Mid", role: "Mid" },
        { name: "Right Attacking Mid", role: "Mid" },
        { name: "Striker", role: "Forward" },
      ],
    },
    {
      canonicalName: "3-5-2",
      positions: [
        { name: "Goalkeeper", role: "Keeper" },
        { name: "Left Back", role: "Defender" },
        { name: "Center Back", role: "Defender" },
        { name: "Right Back", role: "Defender" },
        { name: "Left Mid", role: "Mid" },
        { name: "Left Center Mid", role: "Mid" },
        { name: "Center Mid", role: "Mid" },
        { name: "Right Center Mid", role: "Mid" },
        { name: "Right Mid", role: "Mid" },
        { name: "Left Wing", role: "Forward" },
        { name: "Right Wing", role: "Forward" },
      ],
    },
  ],
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
