"use client";

import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("askid-theme", theme);
      applyTheme(theme);
    }
  },
}));

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function initializeTheme() {
  const stored = localStorage.getItem("askid-theme") as Theme | null;
  const theme = stored || "system";
  useTheme.setState({ theme });
  applyTheme(theme);
}
