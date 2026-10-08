"use client";

import { Fragment, useEffect, type ReactNode } from "react";

import { setActiveLocale, useLocale } from "@/lib/i18n";

/**
 * Áp dụng ngôn ngữ cho cả cây: đặt locale hiện tại trước khi con render và remount cây khi đổi,
 * để mọi chuỗi (kể cả label tính ngoài component) được dịch lại.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  setActiveLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <Fragment key={locale}>{children}</Fragment>;
}
