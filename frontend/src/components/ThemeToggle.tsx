import { useEffect, useState } from "react";
import { applyTheme, currentTheme, followSystemTheme, type Theme } from "../lib/theme";

/** Light/dark switch in the header. It starts from the OS setting; a click saves the analyst's choice. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => followSystemTheme(setTheme), []);

  const isDark = theme === "dark";
  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next, true);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="btn btn--ghost-on-dark btn--small theme-toggle"
      aria-pressed={isDark}
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      <span className="theme-toggle__label">Dark mode</span>
    </button>
  );
}
