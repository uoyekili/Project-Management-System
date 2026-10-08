import { useCallback, useSyncExternalStore } from "react";

import { en } from "./en";

export type Locale = "vi" | "en";

export const LOCALE_STORAGE_KEY = "taskflow:locale";
const CHANGE_EVENT = "taskflow:locale-change";

export const LOCALES: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const DICTIONARIES: Record<Locale, Record<string, string>> = { vi: {}, en };

// Server và lần render hydrate đầu tiên luôn là "vi"; LocaleProvider đặt lại sau khi đọc lựa chọn đã lưu.
let activeLocale: Locale = "vi";

export function setActiveLocale(locale: Locale) {
  activeLocale = locale;
}

export function readLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/**
 * Dịch theo ngôn ngữ hiện tại. Key chính là câu tiếng Việt; thiếu bản dịch thì giữ nguyên.
 * Dùng được ngoài component (label map, format helper); LocaleProvider remount cây khi đổi ngôn ngữ.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = DICTIONARIES[activeLocale][text] ?? text;
  return interpolate(translated, vars);
}

/** Locale cho Intl / toLocale*String. */
export function intlLocale(locale: Locale = activeLocale) {
  return locale === "en" ? "en-US" : "vi-VN";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Component gọi hook này để re-render khi đổi ngôn ngữ; trả về `t` và locale hiện tại. */
export function useLocale() {
  const locale = useSyncExternalStore<Locale>(subscribe, readLocale, () => "vi");

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Trình duyệt chặn storage: chỉ áp dụng cho phiên hiện tại.
    }
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { locale, setLocale, t };
}

export const useT = () => useLocale().t;
