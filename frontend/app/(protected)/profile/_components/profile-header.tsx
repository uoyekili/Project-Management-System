"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { RoleTags } from "@/components/role-tags";
import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";
import { userApi } from "@/services/api";
import { roleDisplayLabels } from "@/lib/utils/format";
import type { UserProfile } from "@/types";

import { AvatarCropper } from "./avatar-cropper";
import styles from "../styles/profile.module.css";

/** Ảnh gốc được chọn tối đa 10 MB; ảnh gửi lên server luôn được cắt và nén nhỏ hơn nhiều. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProfileHeaderProps {
  user: UserProfile;
  isSelf: boolean;
  onUpdate: (updatedUser: UserProfile) => void;
}

export function ProfileHeader({ user, isSelf, onUpdate }: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const hasCustomAvatar = Boolean(user.avatarUrl) && !/\/default\.png(\?|$)/.test(user.avatarUrl ?? "");
  const roleLabels = roleDisplayLabels(user.roles?.length ? user.roles : user.role);
  const subtitle = user.jobTitle || user.email;
  const subtitleDuplicatesRole = roleLabels.some(
    (label) => label.trim().toLowerCase() === subtitle.trim().toLowerCase(),
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setNotice({ text: t("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP."), isError: true });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setNotice({ text: t("Ảnh quá lớn (tối đa 10 MB)."), isError: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNotice(null);
        setCropImageSrc(reader.result);
      } else {
        setNotice({ text: t("Không thể đọc ảnh đã chọn."), isError: true });
      }
    };
    reader.onerror = () => setNotice({ text: t("Đã xảy ra lỗi khi tải ảnh lên."), isError: true });
    reader.readAsDataURL(file);
  }

  async function run(action: () => Promise<{ data: UserProfile }>, success: string) {
    setIsBusy(true);
    setNotice(null);
    try {
      const { data } = await action();
      onUpdate(data);
      setNotice({ text: success, isError: false });
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : t("Không thể cập nhật ảnh đại diện."),
        isError: true,
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleCropSave(blob: Blob) {
    setCropImageSrc(null);
    void run(() => userApi.uploadAvatar(blob), t("Đã cập nhật ảnh đại diện."));
  }

  function handleReset() {
    void run(() => userApi.resetAvatar(), t("Đã chuyển về ảnh đại diện mặc định."));
  }

  return (
    <aside className={styles.identity}>
      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={128} />
      <h2 className={styles.name}>{user.name}</h2>
      {subtitleDuplicatesRole ? null : <p className={styles.subtitle}>{subtitle}</p>}
      <div className={styles.badges}>
        <RoleTags roles={user.roles?.length ? user.roles : user.role} />
      </div>

      {notice ? (
        <p className={notice.isError ? `form-error ${styles.notice}` : styles.notice} role="status">
          {notice.text}
        </p>
      ) : null}

      {isSelf ? (
        <div className={styles.identityActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            className={styles.hiddenFileInput}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {isBusy ? t("Đang tải lên...") : t("Đổi ảnh đại diện")}
          </button>
          {hasCustomAvatar ? (
            <button type="button" className="secondary-button" onClick={handleReset} disabled={isBusy}>
              {t("Dùng ảnh mặc định")}
            </button>
          ) : null}
        </div>
      ) : null}

      {cropImageSrc ? (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onSave={handleCropSave}
          onCancel={() => setCropImageSrc(null)}
        />
      ) : null}
    </aside>
  );
}
