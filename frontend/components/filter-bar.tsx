import type { ReactNode } from "react";

import { Surface } from "@/components/ui";
import { t } from "@/lib/i18n";

type FilterBarProps = {
  /** Ô tìm kiếm (nếu có) — luôn đứng đầu hàng. */
  search?: ReactNode;
  /** Các bộ lọc (FilterSelect…), tự co giãn đều nhau. */
  children?: ReactNode;
  /** Số bộ lọc đang bật; 0 → nút xóa bị làm mờ. */
  activeCount: number;
  onReset: () => void;
  /** Ẩn nút "Xóa bộ lọc" khi trang chỉ có ô tìm kiếm. */
  showReset?: boolean;
  /** Hành động chính của trang (vd. "+ Tạo dự án") — luôn ở cuối bên phải. */
  action?: ReactNode;
};

/**
 * Thanh lọc chuẩn: card riêng phía trên bảng, một hàng:
 * [tìm kiếm] [bộ lọc…] [Xóa bộ lọc] [hành động chính].
 * `showReset={false}` bỏ nút xóa bộ lọc.
 */
export function FilterBar({ search, children, activeCount, onReset, action, showReset = true }: FilterBarProps) {
  const isActive = activeCount > 0;

  return (
    <Surface className="filter-card">
      <div className="filter-bar">
        {search}
        {children}
        <div className="filter-bar-actions">
          {showReset ? (
            <button
              type="button"
              className={`secondary-button filter-reset${isActive ? " is-active" : ""}`}
              disabled={!isActive}
              onClick={onReset}
            >
              {t("Xóa bộ lọc")}</button>
          ) : null}
          {action}
        </div>
      </div>
    </Surface>
  );
}

type FilterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
};

export function FilterSearch({ value, onChange, placeholder, ariaLabel }: FilterSearchProps) {
  return (
    <div className="filter-search">
      <svg
        className="filter-search-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className={`app-input${value.trim() ? " is-filtering" : ""}`}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Bọc một bộ lọc để có độ rộng chuẩn. `compact` cho bộ lọc có ít/ngắn lựa chọn. */
export function FilterItem({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={compact ? "filter-item filter-item-compact" : "filter-item"}>{children}</div>;
}
