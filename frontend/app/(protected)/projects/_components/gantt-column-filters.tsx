"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { FilterPopover, useExclusiveFilter } from "@/components/filter-popover";
import { HighlightMatch } from "@/components/highlight-match";
import type { FilterOption } from "@/components/filter-select";
import { PersonOption } from "@/components/person-option";
import { UserAvatar } from "@/components/user-avatar";
import { formatEmployeeCode } from "@/lib/utils/employee";
import { toVietnamDateInputValue } from "@/lib/utils/format";
import styles from "../styles/gantt.module.css";
import { t } from "@/lib/i18n";

export type FilterPerson = {
  name: string;
  employeeCode?: string | null;
  userId?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type { FilterOption };

const PERSON_AVATAR_SIZE = 22;

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function GanttPersonCell({ person }: { person?: FilterPerson | null }) {
  const name = person?.name?.trim() || t("Chưa giao");
  const code = person ? formatEmployeeCode(person.userId, person.employeeCode) : "";
  const hasPhoto = Boolean(person?.avatarUrl);

  return (
    <span className={styles.ganttPerson}>
      {hasPhoto && person ? (
        <UserAvatar
          name={person.name}
          avatarUrl={person.avatarUrl}
          size={PERSON_AVATAR_SIZE}
          className={styles.ganttPersonAvatar}
        />
      ) : (
        <span className={`${styles.ganttPersonAvatar} ${styles.ganttPersonAvatarFallback}`} aria-hidden>
          {person ? personInitials(name) : "?"}
        </span>
      )}
      <span className={styles.ganttPersonCopy}>
        <span className={styles.ganttPersonName}>{name}</span>
        {code ? <span className={styles.ganttPersonCode}>{code}</span> : null}
      </span>
    </span>
  );
}

const MAX_STACKED_AVATARS = 3;

/** 1 người: avatar + tên + mã; nhiều người: chỉ avatar xếp chồng, quá nhiều thì thêm "…". */
export function GanttAssigneesCell({ people }: { people: FilterPerson[] }) {
  if (people.length <= 1) return <GanttPersonCell person={people[0] ?? null} />;

  const visible = people.slice(0, MAX_STACKED_AVATARS);
  const hasMore = people.length > MAX_STACKED_AVATARS;
  return (
    <span className={styles.ganttAvatarStack} title={people.map((person) => person.name).join(", ")}>
      {visible.map((person, index) => (
        <span key={person.userId ?? index} className={styles.ganttStackItem}>
          <UserAvatar
            name={person.name}
            avatarUrl={person.avatarUrl}
            size={PERSON_AVATAR_SIZE}
            className={styles.ganttPersonAvatar}
          />
        </span>
      ))}
      {hasMore ? <span className={styles.ganttStackMore}>…</span> : null}
    </span>
  );
}

function toggleValue(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function FilterIconButton({
  label,
  active,
  open,
  count,
  icon = "filter",
  buttonRef,
  onToggle,
}: {
  label: string;
  active: boolean;
  open: boolean;
  count?: number;
  icon?: "filter" | "search";
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${styles.colFilterIconBtn} ${active ? styles.colFilterIconBtnActive : ""} ${open ? styles.colFilterIconBtnOpen : ""}`}
      aria-label={label}
      aria-expanded={open}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {icon === "search" ? <SearchIcon /> : <FilterIcon />}
      {active ? (
        <span className={styles.colFilterDot}>{count && count > 1 ? count : null}</span>
      ) : null}
    </button>
  );
}

export function HeaderTextFilter({
  label,
  value,
  onChange,
  placeholder,
  icon = "filter",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: "filter" | "search";
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen } = useExclusiveFilter();
  const [draft, setDraft] = useState(value);

  const apply = () => {
    onChange(draft.trim());
    setOpen(false);
  };

  return (
    <>
      <FilterIconButton
        label={label}
        active={value.trim().length > 0}
        open={open}
        icon={icon}
        buttonRef={buttonRef}
        onToggle={() => {
          if (!open) setDraft(value);
          setOpen(!open);
        }}
      />
      <FilterPopover
        open={open}
        anchorRef={buttonRef}
        align="end"
        onDismiss={() => setOpen(false)}
        onApply={apply}
        clearLabel={t("Xóa")}
        clearDisabled={draft.length === 0}
        onClear={() => setDraft("")}
      >
        <input
          type="text"
          className={styles.colFilterSearch}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") apply();
          }}
        />
      </FilterPopover>
    </>
  );
}

export function HeaderMultiFilter({
  label,
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = t("Tìm..."),
  minWidth,
}: {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  minWidth?: number;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen } = useExclusiveFilter();

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => {
      const code = option.person
        ? formatEmployeeCode(option.person.userId, option.person.employeeCode)
        : "";
      return `${option.label} ${code}`.toLowerCase().includes(needle);
    });
  }, [options, query]);

  return (
    <>
      <FilterIconButton
        label={label}
        active={value.length > 0}
        open={open}
        count={value.length}
        buttonRef={buttonRef}
        onToggle={() => {
          if (!open) {
            setDraft(value);
            setQuery("");
          }
          setOpen(!open);
        }}
      />
      <FilterPopover
        open={open}
        anchorRef={buttonRef}
        align="end"
        minWidth={minWidth}
        onDismiss={() => setOpen(false)}
        onApply={() => {
          onChange(draft);
          setOpen(false);
        }}
        clearDisabled={draft.length === 0}
        onClear={() => setDraft([])}
      >
        {searchable ? (
          <input
            type="text"
            className={styles.colFilterSearch}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoFocus
          />
        ) : null}
        <ul className={styles.colFilterList}>
          {visibleOptions.length === 0 ? (
            <li className={styles.colFilterEmpty}>{t("Không có mục phù hợp")}</li>
          ) : (
            visibleOptions.map((option) => (
              <li key={option.value}>
                <label className={styles.colFilterItem}>
                  <input
                    type="checkbox"
                    checked={draft.includes(option.value)}
                    onChange={() => setDraft(toggleValue(draft, option.value))}
                  />
                  {option.person ? (
                    <PersonOption person={option.person} query={query} avatarSize={26} />
                  ) : (
                    <span>
                      <HighlightMatch text={option.label} query={query} />
                    </span>
                  )}
                </label>
              </li>
            ))
          )}
        </ul>
      </FilterPopover>
    </>
  );
}

export function HeaderDateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen } = useExclusiveFilter();
  const [draft, setDraft] = useState(value);

  return (
    <>
      <FilterIconButton
        label={label}
        active={Boolean(value)}
        open={open}
        buttonRef={buttonRef}
        onToggle={() => {
          if (!open) setDraft(value);
          setOpen(!open);
        }}
      />
      <FilterPopover
        open={open}
        anchorRef={buttonRef}
        align="end"
        minWidth={320}
        onDismiss={() => setOpen(false)}
        onApply={() => {
          onChange(draft);
          setOpen(false);
        }}
        clearDisabled={!draft}
        onClear={() => setDraft("")}
      >
        <div className={styles.colDateValue}>{draft ? isoToDmy(draft) : t("Chưa chọn ngày")}</div>
        <MiniCalendar value={draft} onSelect={setDraft} />
      </FilterPopover>
    </>
  );
}

function isoToDmy(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function MiniCalendar({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (iso: string) => void;
}) {
  const today = toVietnamDateInputValue();
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const [view, setView] = useState(() => {
    const base = selected || today;
    const [year, month] = base.split("-").map(Number);
    return { year, month: month - 1 };
  });

  useEffect(() => {
    if (!selected) return;
    const [year, month] = selected.split("-").map(Number);
    setView({ year, month: month - 1 });
  }, [selected]);

  const first = new Date(view.year, view.month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={styles.colCalendar} role="group" aria-label={t("Chọn ngày")}>
      <div className={styles.colCalendarHead}>
        <button
          type="button"
          aria-label={t("Tháng trước")}
          onClick={() =>
            setView((current) =>
              current.month === 0
                ? { year: current.year - 1, month: 11 }
                : { year: current.year, month: current.month - 1 },
            )
          }
        >
          ‹
        </button>
        <span>
          {t("Tháng")} {view.month + 1}/{view.year}
        </span>
        <button
          type="button"
          aria-label={t("Tháng sau")}
          onClick={() =>
            setView((current) =>
              current.month === 11
                ? { year: current.year + 1, month: 0 }
                : { year: current.year, month: current.month + 1 },
            )
          }
        >
          ›
        </button>
      </div>
      <div className={styles.colCalendarWeek}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={styles.colCalendarGrid}>
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const iso = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              className={`${styles.colCalendarDay} ${isToday ? styles.colCalendarDayToday : ""} ${isSelected ? styles.colCalendarDaySelected : ""}`}
              onClick={() => onSelect(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
