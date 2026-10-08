"use client";

import { useState } from "react";

import { ChangePasswordForm } from "@/components/change-password-form";
import { CustomSelect } from "@/components/custom-select";
import { Surface } from "@/components/ui";
import { useAuthSession } from "@/hooks/use-session";
import { LOCALES, useLocale, type Locale } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/preferences/theme";
import { markIntentionalLogout, signOutAll } from "@/services/auth/session";

import styles from "./settings-view.module.css";

/** Nội dung trang Cài đặt, dùng chung cho khu vận hành (/settings) và khu quản trị (/admin/settings). */
export function SettingsView() {
  const session = useAuthSession();
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const themes: Array<{ value: ThemePreference; label: string }> = [
    { value: "light", label: t("Sáng") },
    { value: "dark", label: t("Tối") },
    { value: "system", label: t("Theo hệ thống") },
  ];

  async function handleSignOutAll() {
    setIsSigningOutAll(true);
    setSignOutError(null);
    try {
      markIntentionalLogout();
      await signOutAll();
      window.location.assign("/login");
    } catch {
      setIsSigningOutAll(false);
      setSignOutError(t("Không thể đăng xuất tất cả thiết bị. Vui lòng thử lại."));
    }
  }

  return (
    <div className={styles.page}>
      <Surface className={styles.section}>
        <header className={styles.head}>
          <h2>{t("Giao diện")}</h2>
        </header>
        <div className={styles.select}>
          <CustomSelect
            value={theme}
            onChange={(next) => setTheme(next as ThemePreference)}
            options={themes}
          />
        </div>
      </Surface>

      <Surface className={styles.section}>
        <header className={styles.head}>
          <h2>{t("Ngôn ngữ")}</h2>
        </header>
        <div className={styles.select}>
          <CustomSelect
            value={locale}
            onChange={(next) => setLocale(next as Locale)}
            options={LOCALES}
          />
        </div>
      </Surface>

      <Surface className={styles.section}>
        <header className={styles.head}>
          <h2>{t("Đổi mật khẩu")}</h2>
        </header>
        <div className={styles.form}>
          <ChangePasswordForm session={session} />
        </div>
      </Surface>

      <Surface className={styles.section}>
        <header className={styles.head}>
          <h2>{t("Đăng xuất tất cả thiết bị")}</h2>
        </header>
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={handleSignOutAll}
            disabled={isSigningOutAll}
          >
            {isSigningOutAll ? t("Đang đăng xuất...") : t("Đăng xuất tất cả")}
          </button>
          {signOutError ? (
            <div className="error-state form-error" role="alert">
              {signOutError}
            </div>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
