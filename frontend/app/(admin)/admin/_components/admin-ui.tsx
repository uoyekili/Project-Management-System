"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { UserAvatar } from "@/components/user-avatar";
import { PENDING_USER, useAuthSession } from "@/hooks/use-session";
import { canCode } from "@/lib/permissions";
import type { PermissionScope } from "@/types";

import styles from "./admin.module.css";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

/** Ô không có dữ liệu: để trống, không dùng ký tự thay thế. */
export function EmptyDash() {
  return null;
}

export function errorMessage(error: unknown, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.") {
  return error instanceof Error ? error.message : fallback;
}

/* ------------------------------------------------------------------ icons */
const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  building: "M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M19 21V10h-4M9 7h2M9 11h2M9 15h2",
  briefcase:
    "M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  layers: "m12 2 10 5-10 5L2 7l10-5ZM2 17l10 5 10-5M2 12l10 5 10-5",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  key: "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  search: "m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  lock: "M5 11h14v10H5V11Zm3 0V7a4 4 0 0 1 8 0v4",
  userOff:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-1 5 5m0-5-5 5",
  userMinus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 0h6",
} as const;

/** Bộ icon đặc (fill) dùng cho sidebar, cùng phong cách với icon của trang vận hành. */
const SOLID_ICONS: Partial<Record<keyof typeof ICONS, string>> = {
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  users:
    "M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm8-2a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-1.1 0-2.2.3-3.1.8 1.3 1 2.1 2.3 2.1 3.8v1.4H22V18c0-2-2.2-5-5-5Z",
  building:
    "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6h2a2 2 0 0 1 2 2v8h-4v-3h-2v3H4Zm3-14v2h2V7H7Zm4 0v2h2V7h-2ZM7 11v2h2v-2H7Zm4 0v2h2v-2h-2Zm-4 4v2h2v-2H7Zm4 0v2h2v-2h-2Z",
  briefcase:
    "M10 3a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v4h18V8a1 1 0 0 0-1-1h-4V5a2 2 0 0 0-2-2h-4Zm0 2h4v2h-4V5ZM3 14v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5h-8v1.5h-2V14H3Z",
  shield:
    "M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5l-8-3Zm-1.2 13.4L7.6 12.2l1.4-1.4 1.8 1.8 4.2-4.2 1.4 1.4-5.6 5.6Z",
  layers: "M12 4 4 8l8 4 8-4-8-4ZM4 12l8 4 8-4M4 16l8 4 8-4",
  key: "M7 14a4 4 0 1 1 3.9-5H21v4h-2v2h-3v-2h-5.1A4 4 0 0 1 7 14Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
};

export type AdminIconName = keyof typeof ICONS;

export function AdminIcon({
  name,
  className,
  solid,
}: {
  name: AdminIconName;
  className?: string;
  solid?: boolean;
}) {
  const solidPath = solid ? SOLID_ICONS[name] : undefined;
  if (solidPath) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d={solidPath} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------ page header */
/** Tiêu đề trang nằm ở topbar; ở đây chỉ còn các nút hành động của trang. */
export function PageHeader({ action }: { action?: ReactNode }) {
  if (!action) return null;
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageActions}>{action}</div>
    </div>
  );
}

export function Field({
  label,
  children,
  full,
  hint,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  hint?: string;
}) {
  return (
    <label className={cx(styles.field, full && styles.full)}>
      <span>{label}</span>
      {children}
      {hint ? <small className={styles.hint}>{hint}</small> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ badge */
export type BadgeTone = "neutral" | "info" | "ok" | "warn" | "danger";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: styles.badgeNeutral,
  info: styles.badgeInfo,
  ok: styles.badgeOk,
  warn: styles.badgeWarn,
  danger: styles.badgeDanger,
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  title,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={cx(styles.badge, TONE_CLASS[tone], dot && styles.badgeDot)} title={title}>
      {children}
    </span>
  );
}

export const SCOPE_NAME: Record<PermissionScope, string> = {
  OWN: "Cá nhân",
  PROJECT: "Dự án",
  ALL: "Toàn công ty",
};

const SCOPE_CLASS: Record<PermissionScope, string> = {
  OWN: styles.scopeOwn,
  PROJECT: styles.scopeProject,
  ALL: styles.scopeAll,
};

export function ScopeBadge({ scope }: { scope: PermissionScope }) {
  return <span className={cx(styles.badge, SCOPE_CLASS[scope])}>{SCOPE_NAME[scope]}</span>;
}

export function StatusBadge({
  active,
  on = "Hoạt động",
  off = "Đã khóa",
}: {
  active: boolean;
  on?: string;
  off?: string;
}) {
  return (
    <Badge tone={active ? "ok" : "neutral"} dot>
      {active ? on : off}
    </Badge>
  );
}

/* ---------------------------------------------------------------- stat tile */
export function StatTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: AdminIconName;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? styles.statIconWarning
      : tone === "danger"
        ? styles.statIconDanger
        : tone === "success"
          ? styles.statIconSuccess
          : "";
  return (
    <div className={cx(styles.card, styles.stat)}>
      <span className={cx(styles.statIcon, toneClass)}>
        <AdminIcon name={icon} />
      </span>
      <div>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        {hint ? <span className={styles.statHint}>{hint}</span> : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- toolbar */
export function SearchBox({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.search}>
      <AdminIcon name="search" />
      <input
        className={styles.input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  label,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  onChange: (page: number) => void;
}) {
  return (
    <div className={styles.pagination}>
      <span>
        {total} {label} · Trang {page}/{totalPages}
      </span>
      <div>
        <button
          type="button"
          className="secondary-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Trước
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export function SkeletonRows({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className={styles.skeletonRow}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              <span
                className={styles.skeleton}
                style={{ width: `${55 + ((row + column) % 4) * 10}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function UserCell({
  id,
  name,
  email,
  avatarUrl,
  subtitle,
}: {
  id: number | string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  subtitle?: string;
}) {
  return (
    <div className={styles.cellUser}>
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl ?? undefined}
        size={34}
      />
      <span>
        <strong>{name}</strong>
        <small>{subtitle ?? email}</small>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */
type Toast = { id: number; kind: "success" | "error"; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.toasts} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(styles.toast, toast.kind === "error" && styles.toastError)}
          >
            <span>{toast.message}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast phải nằm trong ToastProvider");
  return context;
}

/* ------------------------------------------------------- permission gating */
/** Chặn UI khi role hiện tại thiếu quyền; backend vẫn là nơi kiểm tra thật. */
export function RequirePermission({ code, children }: { code: string; children: ReactNode }) {
  const session = useAuthSession();
  const user = session?.currentUser ?? PENDING_USER;
  if (!user.id) return null;
  if (!canCode(user, code)) {
    return (
      <div className={styles.denied}>
        <div>
          <h2>Bạn không có quyền truy cập</h2>
          <p>
            Role hiện tại chưa được cấp quyền cho khu vực này. Liên hệ quản trị viên để được cấu
            hình.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ------------------------------------------------------------- page title */
export const AdminTitleContext = createContext<(title: string | null) => void>(() => {});

/** Đẩy tiêu đề riêng của trang (vd. tên phòng ban) lên header; tự khôi phục khi rời trang. */
export function useAdminTitle(title: string | null | undefined) {
  const setTitle = useContext(AdminTitleContext);
  useEffect(() => {
    if (!title) return;
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}

/** Debounce giá trị (dùng cho ô tìm kiếm). */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
