/**
 * Public surface of the GameDay Soccer rotation engine.
 *
 * Pure TypeScript — no Firebase, no UI. Import domain types and engine helpers
 * from here (e.g. `import { Formation, formationSize } from "@/lib/engine"`).
 */
export * from "./types";
export * from "./formation";
export * from "./strategy";
export * from "./fairness";
export * from "./generatePlan";
export * from "./resolveFrom";
