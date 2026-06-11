export type ImportErrorCategory = "rate-limited" | "too-large" | "unreadable";

function hasCode(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

export function categorizeImportError(reason: unknown): ImportErrorCategory {
  if (hasCode(reason)) {
    if (reason.code === "functions/resource-exhausted") return "rate-limited";
    if (reason.code === "functions/invalid-argument") return "too-large";
  }
  return "unreadable";
}
