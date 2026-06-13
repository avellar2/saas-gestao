"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors duration-200 ease-out"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      <Sun
        className={`w-4 h-4 absolute transition-all duration-200 ease-out ${
          isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`w-4 h-4 absolute transition-all duration-200 ease-out ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
        }`}
      />
    </button>
  );
}
