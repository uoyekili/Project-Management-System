"use client";

import type { ReactNode } from "react";

import { Tabs } from "@/components/tabs";

import styles from "./section-header.module.css";
import { t } from "@/lib/i18n";

export type SectionHeaderTab<T extends string = string> = {
  id: T;
  label: string;
  href?: string;
};

type SectionHeaderProps<T extends string = string> = {
  tabs?: Array<SectionHeaderTab<T>>;
  activeTab?: T;
  onTabChange?: (id: T) => void;
  primaryAction?: ReactNode;
  /** Đặt bên trái thanh, trước các tab (ví dụ nút quay lại). */
  leading?: ReactNode;
  /** Nội dung đặt trong hàng, giữa tab và hành động chính; vị trí do phần tử truyền vào quyết định (row là position: relative). */
  middle?: ReactNode;
  ariaLabel?: string;
};

export function SectionHeader<T extends string = string>({
  tabs = [],
  activeTab,
  onTabChange,
  primaryAction,
  leading,
  middle,
  ariaLabel = t("Điều hướng"),
}: SectionHeaderProps<T>) {
  if (tabs.length === 0 && !primaryAction) {
    return null;
  }

  return (
    <div className={styles.row}>
      {leading || tabs.length > 0 ? (
        <div className={styles.lead}>
          {leading}
          {tabs.length > 0 ? (
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} ariaLabel={ariaLabel} />
          ) : null}
        </div>
      ) : null}

      {middle}

      {primaryAction ? <div className={styles.actions}>{primaryAction}</div> : null}
    </div>
  );
}
