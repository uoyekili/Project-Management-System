"use client";

import { useState, type FormEvent } from "react";

import { PasswordField } from "@/components/password-field";
import { useT } from "@/lib/i18n";
import { authApi } from "@/services/api";
import { markIntentionalLogout, signOut } from "@/services/auth/session";
import type { AuthSession } from "@/types";

/** Đổi mật khẩu xong thì đăng xuất để đăng nhập lại bằng mật khẩu mới. */
export function ChangePasswordForm({ session }: { session: AuthSession | null }) {
  const t = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (key: keyof typeof visible) => setVisible((state) => ({ ...state, [key]: !state[key] }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!session) {
      setError(t("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("Mật khẩu xác nhận chưa khớp."));
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword(session, { currentPassword, newPassword });
      markIntentionalLogout();
      await signOut();
      window.location.assign("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Không thể đổi mật khẩu lúc này."));
      setIsSaving(false);
    }
  }

  return (
    <form className="app-modal-form" onSubmit={handleSubmit}>
      <label className="app-field">
        <span className="app-label">{t("Mật khẩu hiện tại")}</span>
        <PasswordField
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          isVisible={visible.current}
          onToggleVisibility={() => toggle("current")}
          autoComplete="current-password"
        />
      </label>

      <label className="app-field">
        <span className="app-label">{t("Mật khẩu mới")}</span>
        <PasswordField
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          isVisible={visible.next}
          onToggleVisibility={() => toggle("next")}
          autoComplete="new-password"
        />
      </label>

      <label className="app-field">
        <span className="app-label">{t("Nhập lại mật khẩu mới")}</span>
        <PasswordField
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          isVisible={visible.confirm}
          onToggleVisibility={() => toggle("confirm")}
          autoComplete="new-password"
        />
      </label>

      {error ? (
        <div className="error-state form-error" role="alert">
          {error}
        </div>
      ) : null}

      <div>
        <button type="submit" className="action-button action-button-add" disabled={isSaving}>
          {isSaving ? t("Đang cập nhật...") : t("Cập nhật mật khẩu")}
        </button>
      </div>
    </form>
  );
}
