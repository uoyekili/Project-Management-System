"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

/** Backend trả đường dẫn tương đối (/api/avatars/...); ghép địa chỉ API để trình duyệt tải ảnh. */
function resolveAvatarSrc(url: string, base: string) {
  return url.startsWith("/") ? `${base}${url}` : url;
}

/** Build-time base is usually localhost; use the browser's hostname when accessed remotely. */
function useAvatarBase() {
  const [base, setBase] = useState(API_BASE);
  useEffect(() => {
    try {
      const url = new URL(API_BASE || window.location.origin);
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
        url.protocol = window.location.protocol;
        url.hostname = window.location.hostname;
        setBase(url.origin);
      }
    } catch {
      /* keep current base */
    }
  }, []);
  return base;
}

type UserAvatarProps = {
  name: string;
  /** URL công khai do API trả về (backend luôn trả URL, mặc định là default.png). */
  avatarUrl?: string | null;
  size: number;
  title?: string;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
};

/**
 * Avatar tròn hiển thị ảnh lấy từ API. Chưa có URL (đang tải / chưa đăng nhập) hoặc ảnh lỗi
 * thì chỉ hiện vòng tròn trung tính, không có chữ cái hay ảnh giả.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size,
  title,
  className = "avatar-token",
  imageClassName = "avatar-image",
  style,
}: UserAvatarProps) {
  // Nhớ URL đã lỗi (thay vì cờ boolean) để đổi ảnh mới thì tự thử tải lại.
  const base = useAvatarBase();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span
      title={title ?? name}
      className={className}
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {showImage ? (
        <Image
          src={resolveAvatarSrc(avatarUrl as string, base)}
          alt={name}
          width={size}
          height={size}
          className={imageClassName}
          onError={() => setFailedUrl(avatarUrl ?? null)}
          unoptimized
        />
      ) : null}
    </span>
  );
}
