export interface ExtractedPlayer {
  name: string;
  number?: number;
}

export function parsePlayers(raw: string): ExtractedPlayer[] | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    return toPlayerArray(parsed);
  } catch {
    return null;
  }
}

function toPlayerArray(value: unknown): ExtractedPlayer[] | null {
  if (!Array.isArray(value)) return null;
  const players: ExtractedPlayer[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : null;
    if (!name) continue;
    const raw = obj.number;
    const number =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw !== ""
          ? Number(raw) || undefined
          : undefined;
    players.push({ name, ...(number !== undefined ? { number } : {}) });
  }
  return players.length > 0 ? players : [];
}
