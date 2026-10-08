"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FilterPopover, useExclusiveFilter } from "@/components/filter-popover";
import { HighlightMatch } from "@/components/highlight-match";
import { PersonOption, type PersonOptionData } from "@/components/person-option";
import { formatEmployeeCode } from "@/lib/utils/employee";

import styles from "./filter-select.module.css";
import { t } from "@/lib/i18n";

export type FilterOption = {
  value: string;
  label: string;
  /** Option là một nhân viên: hiển thị avatar + tên + mã, và tìm được theo mã. */
  person?: PersonOptionData | null;
  /** Tag màu hiển thị ở cuối dòng (ví dụ trạng thái sprint). */
  tag?: { label: string; tone: "success" | "warning" | "neutral" };
};

function OptionTag({ tag }: { tag?: FilterOption["tag"] }) {
  if (!tag) return null;
  return <span className={classNames(styles.optionTag, styles[`optionTag_${tag.tone}`])}>{tag.label}</span>;
}

function OptionContent({ option, query }: { option: FilterOption; query: string }) {
  if (option.person) return <PersonOption person={option.person} query={query} />;
  return (
    <span className={styles.itemLabel}>
      <span className={styles.itemText}>
        <HighlightMatch text={option.label} query={query} />
      </span>
      <OptionTag tag={option.tag} />
    </span>
  );
}

type FilterSelectBaseProps = {
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  onEditClick?: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: "default" | "lg";
  disabled?: boolean;
  allLabel?: string;
  showSelectAll?: boolean;
  /** Độ rộng tối thiểu của popover (mặc định 320px; 360px với size "lg"). */
  menuMinWidth?: number;
};

type FilterSelectSingleProps = FilterSelectBaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type FilterSelectMultipleProps = FilterSelectBaseProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type FilterSelectProps = FilterSelectSingleProps | FilterSelectMultipleProps;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function selectedInOptionOrder(options: FilterOption[], selected: string[]) {
  const selectedSet = new Set(selected);
  return options.filter((option) => selectedSet.has(option.value));
}

export function formatMultiSelectLabel(selectedLabels: string[], allLabel: string) {
  if (selectedLabels.length === 0) return allLabel;
  if (selectedLabels.length === 1) return selectedLabels[0];
  return `${selectedLabels[0]} +${selectedLabels.length - 1}`;
}

export function toggleMultiSelectValue(
  current: string[],
  toggled: string,
  allValues: string[],
): string[] {
  if (toggled === "ALL") return [];

  const selected = new Set(current);
  if (selected.has(toggled)) selected.delete(toggled);
  else selected.add(toggled);

  return allValues.filter((value) => selected.has(value));
}

export function getSelectAllState(
  selected: string[],
  allValues: string[],
): "checked" | "unchecked" | "indeterminate" {
  if (allValues.length === 0) return "unchecked";
  const selectedSet = new Set(selected);
  let matched = 0;
  allValues.forEach((value) => {
    if (selectedSet.has(value)) matched += 1;
  });
  if (matched === 0) return "unchecked";
  if (matched === allValues.length) return "checked";
  return "indeterminate";
}

export function toggleSelectAll(selected: string[], allValues: string[]): string[] {
  return getSelectAllState(selected, allValues) === "checked" ? [] : [...allValues];
}

export function useIndeterminateCheckbox(state: "checked" | "unchecked" | "indeterminate") {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "indeterminate";
    }
  }, [state]);
  return ref;
}

function MinusIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function FilterSelect(props: FilterSelectProps) {
  const {
    options,
    placeholder = t("-- Chọn trạng thái --"),
    className = "",
    onEditClick,
    searchable: searchableProp = false,
    searchPlaceholder = t("Tìm kiếm..."),
    size = "default",
    disabled = false,
    allLabel,
    showSelectAll = true,
    menuMinWidth,
  } = props;
  const isMultiple = props.multiple === true;
  const { open: isOpen, setOpen } = useExclusiveFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const appliedValues = isMultiple ? props.value : [];
  // Multi-select chỉnh trên bản nháp; chỉ khi bấm "Áp dụng" mới gọi onChange.
  const [draft, setDraft] = useState<string[]>(appliedValues);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  const selectableOptions = useMemo(
    () => (isMultiple ? options.filter((option) => option.value && option.value !== "ALL") : options),
    [isMultiple, options],
  );
  const selectableValues = useMemo(
    () => selectableOptions.map((option) => option.value),
    [selectableOptions],
  );
  const searchable = searchableProp || options.some((option) => option.person);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
  }, [setOpen]);

  function openMenu() {
    setDraft(appliedValues);
    setSearchQuery("");
    setOpen(true);
  }

  useEffect(() => {
    if (isOpen && searchable) {
      const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  const singleValue = isMultiple ? "" : props.value;
  const selectedOptions = useMemo(
    () => selectedInOptionOrder(selectableOptions, appliedValues),
    [selectableOptions, appliedValues],
  );

  const filteredOptions = useMemo(() => {
    const source = isMultiple ? selectableOptions : options;
    if (!searchable || !searchQuery.trim()) return source;
    const query = searchQuery.trim().toLowerCase();
    return source.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query) ||
        (option.person
          ? formatEmployeeCode(option.person.userId, option.person.employeeCode)
              .toLowerCase()
              .includes(query)
          : false),
    );
  }, [isMultiple, options, searchable, searchQuery, selectableOptions]);

  const isLarge = size === "lg";
  const isFiltering = isMultiple
    ? appliedValues.length > 0
    : singleValue !== "" && singleValue !== "ALL";
  const selectAllState = getSelectAllState(draft, selectableValues);
  const selectAllRef = useIndeterminateCheckbox(selectAllState);
  const fallbackAllLabel =
    allLabel || options.find((option) => option.value === "ALL")?.label || placeholder;
  const triggerLabel = isMultiple
    ? formatMultiSelectLabel(
        selectedOptions.map((option) => option.label),
        fallbackAllLabel,
      )
    : options.find((option) => option.value === singleValue)?.label || placeholder;

  function applyDraft() {
    if (props.multiple === true) {
      (onChangeRef.current as (value: string[]) => void)(draft);
    }
    closeMenu();
  }

  const menu = (
    <FilterPopover
      open={isOpen}
      anchorRef={wrapRef}
      onDismiss={closeMenu}
      onApply={applyDraft}
      onClear={() => setDraft([])}
      clearDisabled={draft.length === 0}
      hideFooter={!isMultiple}
      minWidth={menuMinWidth ?? (isLarge ? 360 : undefined)}
    >
      {searchable ? (
        <div className={styles.searchWrap}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onClick={(event) => event.stopPropagation()}
            className={styles.searchInput}
          />
        </div>
      ) : null}

      <ul
        className={classNames(styles.list, isLarge && styles.listLarge)}
        role="listbox"
        aria-multiselectable={isMultiple || undefined}
      >
        {isMultiple && showSelectAll && selectableValues.length > 0 ? (
          <>
            <li>
              <label className={classNames(styles.item, selectAllState === "checked" && styles.itemSelected)}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className={styles.nativeCheckbox}
                  checked={selectAllState === "checked"}
                  onChange={() => setDraft(toggleSelectAll(draft, selectableValues))}
                />
                <span
                  className={classNames(
                    styles.checkbox,
                    selectAllState === "checked" && styles.checkboxChecked,
                    selectAllState === "indeterminate" && styles.checkboxIndeterminate,
                  )}
                  aria-hidden
                >
                  {selectAllState === "checked" ? <CheckIcon /> : selectAllState === "indeterminate" ? <MinusIcon /> : null}
                </span>
                <span className={styles.itemLabel}>{t("Chọn tất cả")}</span>
              </label>
            </li>
            <li className={styles.selectAllDivider} aria-hidden />
          </>
        ) : null}

        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const selected = isMultiple ? draft.includes(option.value) : singleValue === option.value;

            if (isMultiple) {
              return (
                <li key={option.value}>
                  <label className={classNames(styles.item, selected && styles.itemSelected)}>
                    <input
                      type="checkbox"
                      className={styles.nativeCheckbox}
                      checked={selected}
                      aria-label={option.label}
                      onChange={() =>
                        setDraft(toggleMultiSelectValue(draft, option.value, selectableValues))
                      }
                    />
                    <span className={classNames(styles.checkbox, selected && styles.checkboxChecked)} aria-hidden>
                      {selected ? <CheckIcon /> : null}
                    </span>
                    <OptionContent option={option} query={searchQuery} />
                  </label>
                </li>
              );
            }

            return (
              <li key={option.value || "__all__"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={option.label}
                  className={classNames(styles.item, selected && styles.itemSelected)}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    (onChangeRef.current as (value: string) => void)(option.value);
                    closeMenu();
                  }}
                >
                  <OptionContent option={option} query={searchQuery} />
                </button>
              </li>
            );
          })
        ) : (
          <li className={styles.empty}>{t("Không tìm thấy kết quả")}</li>
        )}
      </ul>
    </FilterPopover>
  );

  return (
    <div ref={wrapRef} className={classNames(styles.wrap, isLarge && styles.wrapLarge)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            closeMenu();
            return;
          }
          openMenu();
        }}
        className={classNames(
          styles.trigger,
          isLarge && styles.triggerLarge,
          isOpen && styles.triggerOpen,
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-filtering={isFiltering || undefined}
      >
        <div className={styles.triggerLabel}>
          {!isMultiple && onEditClick && singleValue ? (
            <div
              onClick={(event) => {
                event.stopPropagation();
                onEditClick(singleValue);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-primary)",
                padding: "2px",
                flexShrink: 0,
              }}
              title={t("Xem chi tiết")}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
          ) : null}
          <span className={styles.triggerText} title={triggerLabel}>
            {triggerLabel}
          </span>
          {!isMultiple ? <OptionTag tag={options.find((option) => option.value === singleValue)?.tag} /> : null}
        </div>
        <span className={styles.chevron}>
            <svg
              width={isLarge ? 18 : 16}
              height={isLarge ? 18 : 16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>
      </button>
      {menu}
    </div>
  );
}
