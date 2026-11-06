import type { ReactNode } from "react";

import { EmptyState, Surface } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";

import { cx } from "./admin-ui";
import styles from "./admin-table.module.css";

/**
 * Khung trang danh sách của admin: thanh lọc (tự xuống hàng khi hẹp) rồi bảng.
 * Dùng chung cho người dùng, phòng ban, chức danh, vai trò.
 */
export function AdminListPage({ filters, children }: { filters: ReactNode; children: ReactNode }) {
  return (
    <div className={cx("filtered-list-page", styles.listPage)}>
      {filters}
      {children}
    </div>
  );
}

type AdminListSurfaceProps = {
  /** Có dữ liệu hoặc đang tải thì hiện bảng, ngược lại hiện trạng thái rỗng. */
  hasContent: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
  /** Phân trang hoặc tóm tắt, đặt dưới bảng. */
  footer?: ReactNode;
  children: ReactNode;
};

export function AdminListSurface({
  hasContent,
  emptyTitle,
  emptyDescription,
  className,
  footer,
  children,
}: AdminListSurfaceProps) {
  return (
    <Surface className={cx(styles.surface, "filtered-list-table", className)}>
      {hasContent ? (
        <>
          <div className={cx(styles.wrap, "table-scroll")}>{children}</div>
          {footer}
        </>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription ?? ""} />
      )}
    </Surface>
  );
}

/**
 * Bảng admin. Mỗi `td` cần `data-label` (tên cột) để hiện thành thẻ trên màn hình nhỏ.
 * Thuộc tính tùy chọn trên `th`/`td`: `data-primary` (ô tên, làm tiêu đề thẻ), `data-actions` (ô hành động),
 * `data-priority="low"` (cột phụ, ẩn trên laptop nhỏ).
 */
export function AdminTable({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cx(styles.table, className)}>{children}</table>;
}

export const adminTableStyles = {
  actionButton: styles.actionButton,
};

export function AdminUserCell({
  name,
  subtitle,
  avatarUrl,
}: {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className={styles.userCell}>
      <UserAvatar name={name} avatarUrl={avatarUrl ?? undefined} size={28} />
      <span className={styles.userCellCopy}>
        <strong>{name}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </div>
  );
}
