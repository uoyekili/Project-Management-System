"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent } from "react";
import { t } from "@/lib/i18n";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  href?: string;
};

type TabsProps<T extends string = string> = {
  tabs: Array<TabItem<T>>;
  activeTab?: T;
  onTabChange?: (id: T) => void;
  ariaLabel?: string;
};

/** Tab gạch chân dùng chung; hỗ trợ điều hướng bàn phím (←/→/Home/End). */
export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = t("Điều hướng"),
}: TabsProps<T>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
    );
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    event.preventDefault();
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % items.length;
    if (event.key === "ArrowLeft") next = (current - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    items[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const className = isActive ? "tab tab-active" : "tab";

        if (tab.href) {
          const handleClick = (event: MouseEvent<HTMLElement>) => {
            if (!onTabChange) return;
            event.preventDefault();
            onTabChange(tab.id);
          };
          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              tabIndex={isActive ? 0 : -1}
              className={className}
              onClick={handleClick}
            >
              {tab.label}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={className}
            onClick={() => onTabChange?.(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
