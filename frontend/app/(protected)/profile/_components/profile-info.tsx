"use client";

import { useState } from "react";

import { Surface } from "@/components/ui";
import { t } from "@/lib/i18n";
import { formatEmployeeCode } from "@/lib/utils/employee";
import { userStatusLabel } from "@/lib/utils/format";
import { userApi } from "@/services/api";
import type { UserProfile, UserStatus } from "@/types";

import styles from "../styles/profile.module.css";

const PHONE_PATTERN = /^(0[3|5|7|8|9])[0-9]{8}$/;
const NONE = () => t("Chưa cập nhật");

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? `${styles.field} ${styles.fieldWide}` : styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Thông tin công việc: mã, chức danh, phòng ban, vai trò, trạng thái. */
export function ProfileWork({ user }: { user: UserProfile }) {
  const status = (user.status ?? "ACTIVE") as UserStatus;
  return (
    <Surface className={styles.card}>
      <h3 className={styles.cardTitle}>{t("Thông tin công việc")}</h3>
      <dl className={styles.fields}>
        <Field label={t("Mã nhân viên")}>{formatEmployeeCode(user.id, user.employeeCode)}</Field>
        <Field label={t("Chức danh")}>{user.jobTitle || NONE()}</Field>
        <Field label={t("Phòng ban")}>{user.department || NONE()}</Field>
        <Field label={t("Vai trò hệ thống")}>{user.role || NONE()}</Field>
        <Field label={t("Trạng thái")}>{userStatusLabel(status)}</Field>
      </dl>
    </Surface>
  );
}

interface ProfileContactProps {
  user: UserProfile;
  isSelf: boolean;
  onUpdate: (updatedUser: UserProfile) => void;
}

/** Thông tin liên hệ; chủ tài khoản sửa được số điện thoại. */
export function ProfileContact({ user, isSelf, onUpdate }: ProfileContactProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setPhoneInput(user.phoneNumber ?? "");
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setError(null);
    setIsEditing(false);
  }

  async function savePhone() {
    const trimmed = phoneInput.trim();
    if (trimmed && !PHONE_PATTERN.test(trimmed)) {
      setError(t("Số điện thoại không hợp lệ"));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { data } = await userApi.updatePhone(trimmed);
      onUpdate(data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Không thể cập nhật số điện thoại."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Surface className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardHeaderTitle}>{t("Thông tin liên hệ")}</h3>
        {isEditing ? (
          <div className={styles.headerActions}>
            <button
              type="submit"
              form="profile-phone-form"
              className={styles.phoneSave}
              disabled={isSaving}
            >
              {isSaving ? t("Đang lưu...") : t("Lưu")}
            </button>
            <button
              type="button"
              className={styles.phoneCancel}
              onClick={cancelEdit}
              disabled={isSaving}
            >
              {t("Hủy")}
            </button>
          </div>
        ) : isSelf ? (
          <button type="button" className={styles.textButton} onClick={startEdit}>
            {t("Sửa")}
          </button>
        ) : null}
      </div>
      <dl className={styles.fields}>
        <Field label="Email">{user.email}</Field>
        <Field label={t("Số điện thoại")}>
          {isEditing ? (
            <form
              id="profile-phone-form"
              className={styles.phoneEditor}
              onSubmit={(event) => {
                event.preventDefault();
                void savePhone();
              }}
            >
              <input
                className="app-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelEdit();
                }}
                placeholder="0901234567"
                aria-invalid={error ? true : undefined}
                autoFocus
              />
              {error ? (
                <p className={styles.phoneError} role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <span className={styles.phoneValue}>{user.phoneNumber || NONE()}</span>
          )}
        </Field>
      </dl>
    </Surface>
  );
}
