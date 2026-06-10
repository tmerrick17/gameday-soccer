export type ThemePreference = "dark" | "light" | "auto";
export type ResolvedTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "gameday-theme";

export function resolveTheme(
  preference: ThemePreference,
  osTheme: ResolvedTheme
): ResolvedTheme {
  if (preference === "auto") return osTheme;
  return preference;
}
