"use client";

import type { ChangeEventHandler, FocusEventHandler, Ref } from "react";

import { EyeIcon, EyeOffIcon, LockIcon } from "./login-icons";
import styles from "../styles/login-form.module.css";

type LoginPasswordInputProps = {
  id: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  isVisible: boolean;
  onToggleVisibility: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  testId?: string;
};

export function LoginPasswordInput({
  id,
  value,
  onChange,
  onBlur,
  isVisible,
  onToggleVisibility,
  disabled,
  invalid,
  describedBy,
  inputRef,
  testId,
}: LoginPasswordInputProps) {
  return (
    <div className={styles.inputWrap}>
      <LockIcon className={styles.inputIcon} width={19} height={19} />
      <input
        ref={inputRef}
        id={id}
        data-testid={testId}
        className={`app-input ${styles.input}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggleVisibility}
        disabled={disabled}
        aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={isVisible}
      >
        {isVisible ? <EyeOffIcon width={19} height={19} /> : <EyeIcon width={19} height={19} />}
      </button>
    </div>
  );
}
