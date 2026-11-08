"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Temporarily disables all CSS transitions during theme switch.
 * This prevents layout bouncing, jittering, or animated jumps ("lafai") across
 * cards, borders, shadows, and text during the theme toggle.
 */
function disableTransitionsTemporarily() {
  if (typeof document === "undefined") return () => {};

  const css = document.createElement("style");
  css.id = "disable-theme-transitions";
  css.appendChild(
    document.createTextNode(
      "*, *::before, *::after { -webkit-transition: none !important; -moz-transition: none !important; -o-transition: none !important; -ms-transition: none !important; transition: none !important; }"
    )
  );
  document.head.appendChild(css);

  return () => {
    // Force browser reflow to apply the theme instantly without transitions
    (() => window.getComputedStyle(document.body).opacity)();

    // Re-enable transitions on next frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById("disable-theme-transitions");
        if (el) {
          el.remove();
        }
      });
    });
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server renders dark; match SSR initially to prevent hydration crash
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const isDarkDom = document.documentElement.classList.contains("dark");
      const saved = localStorage.getItem("notelagbe_theme") as Theme | null;
      const initialTheme: Theme = saved === "light" || saved === "dark" ? saved : (isDarkDom ? "dark" : "light");
      setThemeState(initialTheme);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    const reEnableTransitions = disableTransitionsTemporarily();
    setThemeState(newTheme);
    try {
      localStorage.setItem("notelagbe_theme", newTheme);
    } catch {}
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    reEnableTransitions();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
