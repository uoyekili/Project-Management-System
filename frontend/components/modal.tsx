"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

/** Phải khớp với thời lượng animation đóng trong `.modal-backdrop[data-state="closing"]` (globals.css). */
export const MODAL_EXIT_MS = 180;

interface ModalProps {
  title: ReactNode;
  titleId: string;
  subtitle?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
  testId?: string;
  className?: string;
  /** Cho phép dropdown/popover tràn ra ngoài khung modal. */
  allowOverflow?: boolean;
  /** Chặn đóng bằng Esc / click nền / nút X (vd. đang gọi API). */
  dismissible?: boolean;
  /** Cha có thể chủ động phát animation đóng (vd. sau khi duyệt xong) rồi tự gỡ modal. */
  closing?: boolean;
  children: ReactNode;
}

/**
 * Khung modal chuẩn: backdrop, header, nút đóng, đóng bằng Esc.
 * Mở/đóng có animation nhẹ; `onClose` được gọi sau khi animation đóng kết thúc.
 * Nội dung dùng `.app-modal-body` / `.app-modal-footer` (có thể bọc trong `<form className="app-modal-form">`).
 */
export function Modal({
  title,
  titleId,
  subtitle,
  size = "md",
  onClose,
  testId,
  className,
  allowOverflow = false,
  dismissible = true,
  closing = false,
  children,
}: ModalProps) {
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (!dismissible || exitTimerRef.current !== null) return;
    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      setExiting(false);
      onCloseRef.current();
    }, MODAL_EXIT_MS);
  }, [dismissible]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Hộp thoại xác nhận (nằm trên cùng) tự xử lý Esc.
      if (document.querySelector('[aria-labelledby="confirm-dialog-title"]')) return;
      event.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-state={exiting || closing ? "closing" : "open"}
      onMouseDown={requestClose}
    >
      <section
        className={["app-modal", `modal-shell-${size}`, allowOverflow && "app-modal-overflow", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="app-modal-header">
          <div className="app-modal-heading">
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={requestClose} aria-label={t("Đóng")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
