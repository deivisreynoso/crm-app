"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/dashboard/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--sidebar-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      aria-label={
        mounted && theme === "light"
          ? "Switch to dark mode"
          : "Switch to light mode"
      }
      title={mounted && theme === "light" ? "Dark mode" : "Light mode"}
    >
      {!mounted ? (
        <span className="w-4 h-4" />
      ) : theme === "light" ? (
        <Moon className="w-4 h-4" strokeWidth={1.75} />
      ) : (
        <Sun className="w-4 h-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
