"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";
import type { UserProfile } from "@/types";

import styles from "./assignee-multi-select.module.css";

interface AssigneeMultiSelectProps {
  /** Id những người đã chọn (hiện thành chip trong ô chọn). */
  value: string[];
  onChange: (value: string[]) => void;
  /** Người có thể chọn thêm. */
  options: UserProfile[];
  /** Tra cứu thông tin để hiển thị chip, kể cả người không còn trong `options`. */
  knownUsers?: UserProfile[];
  disabled?: boolean;
  placeholder?: string;
}

const codeOf = (user: UserProfile) =>
  user.employeeCode || (user.id.startsWith("usr-") ? user.id : `usr-${user.id}`);

/** Chọn nhiều người: người đã chọn nằm trong ô dưới dạng chip có dấu × để bỏ. */
export function AssigneeMultiSelect({
  value,
  onChange,
  options,
  knownUsers = [],
  disabled,
  placeholder = t("Thêm người thực hiện..."),
}: AssigneeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const lookup = useMemo(() => {
    const map = new Map<string, UserProfile>();
    [...knownUsers, ...options].forEach((user) => map.set(user.id, user));
    return map;
  }, [knownUsers, options]);

  const needle = query.trim().toLowerCase();
  const available = options.filter(
    (user) =>
      !value.includes(user.id) &&
      (!needle || user.name.toLowerCase().includes(needle) || codeOf(user).toLowerCase().includes(needle)),
  );

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter((item) => item !== id));

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        className={`${styles.control} ${isOpen ? styles.controlOpen : ""} ${disabled ? styles.controlDisabled : ""}`}
        onClick={() => {
          if (disabled) return;
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value.map((id) => {
          const user = lookup.get(id);
          const name = user?.name ?? t("Người dùng");
          return (
            <span key={id} className={`${styles.chip} ${disabled ? styles.chipDisabled : ""}`}>
              <UserAvatar name={name} avatarUrl={user?.avatarUrl} size={22} style={{ flexShrink: 0 }} />
              <span className={styles.chipName}>{name}</span>
              {!disabled ? (
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={t("Bỏ {v0}", { v0: name })}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(id);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              ) : null}
            </span>
          );
        })}
        {!disabled ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={query}
            placeholder={value.length === 0 ? placeholder : ""}
            aria-label={placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
              else if (event.key === "Enter" && available[0]) {
                event.preventDefault();
                add(available[0].id);
              } else if (event.key === "Backspace" && !query && value.length > 0) {
                remove(value[value.length - 1]);
              }
            }}
          />
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <ul className={styles.menu} role="listbox" aria-multiselectable="true">
          {available.length > 0 ? (
            available.map((user) => (
              <li
                key={user.id}
                role="option"
                aria-selected="false"
                className={styles.option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(user.id)}
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={28} style={{ flexShrink: 0 }} />
                <span className={styles.optionCopy}>
                  <span>{user.name}</span>
                  <span className={styles.optionMeta}>{codeOf(user)}</span>
                </span>
              </li>
            ))
          ) : (
            <li className={styles.empty}>{t("Không tìm thấy kết quả")}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
