"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
  type ResolvedTheme,
} from "./theme";

interface ThemeState {
  theme: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState>({
  theme: "dark",
  resolved: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [osTheme, setOsTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "auto") {
      setThemeState(stored);
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setOsTheme(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) =>
      setOsTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved = resolveTheme(theme, osTheme);

  useEffect(() => {
    const html = document.documentElement;
    if (resolved === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [resolved]);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
