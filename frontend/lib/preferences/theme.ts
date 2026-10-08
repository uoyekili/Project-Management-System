import { useCallback, useSyncExternalStore } from "react";

import { DARK_QUERY, THEME_STORAGE_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const CHANGE_EVENT = "taskflow:theme-change";

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  }
  return preference;
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const handleSystemChange = () => {
    if (readThemePreference() === "system") applyTheme("system");
    onChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  media.addEventListener("change", handleSystemChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    media.removeEventListener("change", handleSystemChange);
  };
}

/** Lựa chọn theme (sáng / tối / theo hệ thống), lưu theo trình duyệt và đồng bộ giữa các tab. */
export function useTheme() {
  const theme = useSyncExternalStore<ThemePreference>(subscribe, readThemePreference, () => "system");

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Trình duyệt chặn storage: vẫn áp dụng cho phiên hiện tại.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, setTheme };
}
