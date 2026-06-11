export interface ExtractedPlayer {
  name: string;
  number?: number;
}

export function mergeExtracted(batches: ExtractedPlayer[][]): ExtractedPlayer[] {
  const seen = new Map<string, ExtractedPlayer>();
  for (const batch of batches) {
    for (const player of batch) {
      const key = player.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, player);
      }
    }
  }
  return Array.from(seen.values());
}
