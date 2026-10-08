"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { UserProfile } from "@/types";
import { t } from "@/lib/i18n";

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: UserProfile[];
  disabled?: boolean;
  title?: string;
  placeholder?: string;
  className?: string;
}

function UnassignedAvatar({ size }: { size: number }) {
  return (
    <span
      className="assignee-none-avatar"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}

export function AssigneeSelect({
  value,
  onChange,
  options,
  disabled,
  title,
  placeholder = t("Chưa giao"),
  className = "task-detail-control",
}: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.id === value);
  const filteredOptions = options.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.employeeCode && user.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={ref} className="select-root" title={title}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${className} select-trigger-button`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <div className="select-trigger-value">
          {selectedOption ? (
            <div className="select-person">
              <UserAvatar
                name={selectedOption.name}
                avatarUrl={selectedOption.avatarUrl}
                size={24}
                style={{ flexShrink: 0 }}
              />
              <span className="cell-truncate">
                {selectedOption.name} - {selectedOption.employeeCode || (selectedOption.id.startsWith("usr-") ? selectedOption.id : `usr-${selectedOption.id}`)}
              </span>
            </div>
          ) : (
            <div className="select-person">
              <UnassignedAvatar size={24} />
              <span className="cell-truncate select-placeholder">{placeholder}</span>
            </div>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
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

      {isOpen && !disabled && (
        <ul className="select-menu select-menu-inline" role="listbox">
          <li className="select-search" role="presentation">
            <input
              type="text"
              className="app-input"
              placeholder={t("Tìm kiếm...")}
              aria-label={t("Tìm kiếm người dùng")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </li>
          <li
            role="option"
            aria-selected={value === ""}
            tabIndex={0}
            className={`select-option select-option-person select-option-muted${value === "" ? " is-selected" : ""}`}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange("");
                setIsOpen(false);
              }
            }}
          >
            <UnassignedAvatar size={28} />
            <span className="select-option-title">{placeholder}</span>
          </li>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((user) => (
              <li
                key={user.id}
                role="option"
                aria-selected={value === user.id}
                tabIndex={0}
                className={`select-option select-option-person${value === user.id ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(user.id);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(user.id);
                    setIsOpen(false);
                  }
                }}
              >
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size={28}
                  style={{ flexShrink: 0 }}
                />
                <div className="select-option-copy">
                  <span className="select-option-title">{user.name}</span>
                  <span className="select-option-meta">
                    {user.employeeCode || (user.id.startsWith("usr-") ? user.id : `usr-${user.id}`)}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <li className="popover-empty" role="presentation">
              {t("Không tìm thấy kết quả")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
