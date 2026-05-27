"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "cosmic-violet" | "ocean-blue" | "crimson-red" | "emerald-green" | "sunset-orange" | "midnight-silver";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("cosmic-violet");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = localStorage.getItem("paperino-theme") as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("paperino-theme", newTheme);
    if (newTheme === "cosmic-violet") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  // Avoid hydration mismatch by rendering nothing until mounted
  if (!mounted) {
    return <div className="min-h-screen bg-black"></div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
