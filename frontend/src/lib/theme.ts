export type Theme = "light" | "dark";

const STORAGE_KEY = "fintrack.theme";

/** The analyst's saved choice, if any. */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** Saved choice, otherwise the operating-system setting. */
export function currentTheme(): Theme {
  return storedTheme() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

/** Applies a theme by setting <html data-theme>, which switches every design token at once. */
export function applyTheme(theme: Theme, remember: boolean) {
  document.documentElement.dataset.theme = theme;
  if (!remember) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

/** Follows OS theme changes while the analyst hasn't chosen one. Returns an unsubscribe function. */
export function followSystemTheme(onChange: (theme: Theme) => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = (e: MediaQueryListEvent) => {
    if (storedTheme()) return;
    const theme: Theme = e.matches ? "dark" : "light";
    applyTheme(theme, false);
    onChange(theme);
  };
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
