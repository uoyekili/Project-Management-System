"use client";

import { useRef, useState } from "react";

import styles from "./date-field.module.css";
import { t } from "@/lib/i18n";

interface DateFieldProps {
  /** Giá trị ISO `yyyy-mm-dd` (rỗng nếu chưa chọn). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function isoToDisplay(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function displayToIso(display: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1) return null;
  return `${year}-${month}-${day}`;
}

/** Tự chèn dấu "/" khi gõ số liên tục: 09102026 → 09/10/2026. */
function maskDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateField({ value, onChange, disabled, ariaLabel }: DateFieldProps) {
  const [draft, setDraft] = useState(isoToDisplay(value));
  const [hasError, setHasError] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setDraft(isoToDisplay(value));
    setHasError(false);
  }

  function commit() {
    if (!draft.trim()) {
      setHasError(false);
      if (value) onChange("");
      return;
    }
    const iso = displayToIso(draft);
    if (!iso) {
      setHasError(true);
      return;
    }
    setHasError(false);
    if (iso !== value) onChange(iso);
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker || disabled) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  }

  return (
    <span className={styles.root}>
      <input
        className={`task-detail-control ${styles.input}${hasError ? ` ${styles.invalid}` : ""}`}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        aria-label={ariaLabel}
        aria-invalid={hasError}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(maskDisplay(event.target.value))}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
      <button
        type="button"
        className={styles.iconButton}
        onClick={openPicker}
        disabled={disabled}
        aria-label={t("Chọn ngày")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        className={styles.nativePicker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(event) => event.target.value && onChange(event.target.value)}
      />
    </span>
  );
}
