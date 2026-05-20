"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="text-xs opacity-50" aria-hidden>theme</span>;
  }

  const current = resolvedTheme ?? theme;
  return (
    <button
      type="button"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      className="text-xs underline-offset-2 hover:underline"
      aria-label={`Switch to ${current === "dark" ? "light" : "dark"} theme`}
    >
      {current === "dark" ? "light mode" : "dark mode"}
    </button>
  );
}
