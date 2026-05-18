"use client";

import { useEffect, useState } from "react";

export type ThemeSetting = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "motion-saas:theme";

const systemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const readStored = (): ThemeSetting => {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
};

const resolve = (setting: ThemeSetting): ResolvedTheme =>
  setting === "system" ? systemTheme() : setting;

const apply = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
};

// Hook for components that need to read or change the theme.
// Reading the resolved theme is reactive — when the user's OS-level
// preference flips while we're in "system" mode, the resolved value
// updates and re-renders all subscribers.
export const useTheme = () => {
  const [setting, setSetting] = useState<ThemeSetting>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = readStored();
    setSetting(stored);
    const resolved = resolve(stored);
    setTheme(resolved);
    apply(resolved);

    // React to system-level theme changes (only relevant when on "system")
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStored() === "system") {
        const next = systemTheme();
        setTheme(next);
        apply(next);
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const change = (next: ThemeSetting) => {
    localStorage.setItem(STORAGE_KEY, next);
    setSetting(next);
    const resolved = resolve(next);
    setTheme(resolved);
    apply(resolved);
  };

  return { setting, theme, setTheme: change };
};
