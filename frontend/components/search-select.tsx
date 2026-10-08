"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Dòng phụ hiển thị mờ bên dưới nhãn (ví dụ mã dự án). */
  meta?: string;
  /** Chuỗi chỉ dùng để tìm kiếm, không hiển thị. */
  searchText?: string;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  /** Nhãn hiển thị khi chưa chọn; đồng thời là nhãn của lựa chọn "bỏ chọn". */
  placeholder?: string;
  /** Cho phép chọn lại giá trị rỗng. */
  clearable?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  ariaLabel?: string;
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = t("Chọn..."),
  clearable = false,
  disabled,
  title,
  className = "task-detail-control",
  ariaLabel,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(normalizedQuery) ||
          option.meta?.toLowerCase().includes(normalizedQuery) ||
          option.searchText?.toLowerCase().includes(normalizedQuery),
      )
    : options;

  function choose(next: string) {
    onChange(next);
    setIsOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="select-root" title={title}>
      <button
        type="button"
        className={`${className} select-trigger-button`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        onKeyDown={(event) => event.key === "Escape" && setIsOpen(false)}
      >
        <div className="select-trigger-value">
          <span className={`cell-truncate${selected ? "" : " select-placeholder"}`}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="select-chevron"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && !disabled ? (
        <ul className="select-menu select-menu-inline" role="listbox">
          <li className="select-search" role="presentation">
            <input
              type="text"
              className="app-input"
              placeholder={t("Tìm kiếm...")}
              aria-label={t("Tìm kiếm")}
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setIsOpen(false)}
            />
          </li>
          {clearable ? (
            <li
              role="option"
              aria-selected={value === ""}
              tabIndex={0}
              className={`select-option select-option-muted${value === "" ? " is-selected" : ""}`}
              onClick={() => choose("")}
              onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && choose("")}
            >
              {placeholder}
            </li>
          ) : null}
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                tabIndex={0}
                className={`select-option${option.value === value ? " is-selected" : ""}`}
                onClick={() => choose(option.value)}
                onKeyDown={(event) =>
                  (event.key === "Enter" || event.key === " ") && choose(option.value)
                }
              >
                <div className="select-option-copy">
                  <span className="select-option-title cell-truncate">{option.label}</span>
                  {option.meta ? <span className="select-option-meta">{option.meta}</span> : null}
                </div>
              </li>
            ))
          ) : (
            <li className="popover-empty" role="presentation">
              {t("Không tìm thấy kết quả")}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
