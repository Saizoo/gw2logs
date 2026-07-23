import { useCallback, useState } from 'react';

// Light / dark theme. The actual token values live in index.css
// (:root and :root[data-theme="dark"]); this module just tracks the choice,
// persists it, and stamps data-theme on <html>. The initial attribute is set
// by an inline no-flash script in index.html before React mounts.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

// The theme currently applied to <html> (what the no-flash script decided).
export function currentTheme(): Theme {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode / storage disabled — the choice just won't persist */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => currentTheme());
  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  }, []);
  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);
  return { theme, setTheme, toggle };
}
