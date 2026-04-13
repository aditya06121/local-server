/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider as MuiThemeProvider, useMediaQuery } from "@mui/material";
import { createAppTheme } from "../theme";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: "light" | "dark";
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  const [preference, setPreference] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    } catch {
      // localStorage unavailable
    }
    return "system";
  });

  const resolvedMode: "light" | "dark" =
    preference === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : preference;

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  function toggleMode() {
    const next: ThemeMode = resolvedMode === "light" ? "dark" : "light";
    setPreference(next);
    try {
      localStorage.setItem("theme-mode", next);
    } catch {
      // ignore
    }
  }

  return (
    <ThemeContext.Provider value={{ mode: resolvedMode, toggleMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside AppThemeProvider");
  return ctx;
}
