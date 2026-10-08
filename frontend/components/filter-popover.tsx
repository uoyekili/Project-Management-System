"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import styles from "./filter-popover.module.css";
import { t } from "@/lib/i18n";

/* ───────── Chỉ một filter mở tại một thời điểm ─────────
 * Mọi filter (FilterSelect, bộ lọc cột Gantt…) dùng chung store này: mở filter B sẽ
 * đóng filter A, và A bị bỏ các thay đổi chưa Áp dụng (draft được khởi tạo lại mỗi lần mở).
 */
let activeFilterId: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setActiveFilter(id: string | null) {
  if (activeFilterId === id) return;
  activeFilterId = id;
  listeners.forEach((listener) => listener());
}

export function useExclusiveFilter() {
  const id = useId();
  const activeId = useSyncExternalStore(subscribe, () => activeFilterId, () => null);
  const setOpen = useCallback(
    (next: boolean) => {
      if (next) setActiveFilter(id);
      else if (activeFilterId === id) setActiveFilter(null);
    },
    [id],
  );
  // Đóng khi unmount để không giữ trạng thái "đang mở" của một filter đã biến mất.
  useEffect(() => () => setOpen(false), [setOpen]);
  return { open: activeId === id, setOpen };
}

/* ───────── Popover dùng chung ───────── */

type PopoverPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 420;
const VIEWPORT_MARGIN = 8;
const MIN_SPACE_BEFORE_FLIPPING = 200;

export const FILTER_POPOVER_MIN_WIDTH = 320;

type FilterPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  /** Click ra ngoài / Esc: đóng và bỏ thay đổi chưa áp dụng. */
  onDismiss: () => void;
  /** Bấm "Áp dụng": caller lưu draft rồi đóng. */
  onApply: () => void;
  onClear?: () => void;
  clearLabel?: string;
  clearDisabled?: boolean;
  applyLabel?: string;
  /** Ẩn footer (select đơn: chọn xong là áp dụng luôn). */
  hideFooter?: boolean;
  title?: string;
  minWidth?: number;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
};

export function FilterPopover({
  open,
  anchorRef,
  onDismiss,
  onApply,
  onClear,
  clearLabel = t("Xóa lọc"),
  clearDisabled = false,
  applyLabel = t("Áp dụng"),
  hideFooter = false,
  title,
  minWidth = FILTER_POPOVER_MIN_WIDTH,
  align = "start",
  className,
  children,
}: FilterPopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const availableAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const openAbove = availableBelow < MIN_SPACE_BEFORE_FLIPPING && availableAbove > availableBelow;
    const availableHeight = Math.max(0, openAbove ? availableAbove : availableBelow);
    const width = Math.min(
      Math.max(rect.width, minWidth),
      Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2),
    );
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, preferredLeft),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    setPosition({
      left,
      width,
      maxHeight: Math.min(MENU_MAX_HEIGHT, availableHeight),
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + MENU_GAP }
        : { top: rect.bottom + MENU_GAP }),
    });
  }, [anchorRef, align, minWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      dismissRef.current();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismissRef.current();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorRef]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={[styles.popover, className].filter(Boolean).join(" ")}
      style={{
        left: position.left,
        width: position.width,
        top: position.top,
        bottom: position.bottom,
        maxHeight: position.maxHeight,
      }}
      role="dialog"
      aria-label={title}
    >
      {title ? (
        <div className={styles.head}>
          <strong>{title}</strong>
        </div>
      ) : null}
      <div className={styles.body}>{children}</div>
      {hideFooter ? null : (
        <div className={styles.footer}>
          {onClear ? (
            <button
              type="button"
              className="text-button btn-sm"
              disabled={clearDisabled}
              onClick={onClear}
            >
              {clearLabel}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="primary-button btn-sm" onClick={onApply}>
            {applyLabel}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
