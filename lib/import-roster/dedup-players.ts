export interface IncomingPlayer {
  name: string;
  number?: number;
}

export function filterNewPlayers(
  incoming: IncomingPlayer[],
  existing: Array<{ name: string }>
): { toAdd: IncomingPlayer[]; skippedCount: number } {
  const existingNames = new Set(
    existing.map((p) => p.name.trim().toLowerCase())
  );
  const toAdd: IncomingPlayer[] = [];
  let skippedCount = 0;
  for (const player of incoming) {
    if (existingNames.has(player.name.trim().toLowerCase())) {
      skippedCount++;
    } else {
      toAdd.push(player);
    }
  }
  return { toAdd, skippedCount };
}
