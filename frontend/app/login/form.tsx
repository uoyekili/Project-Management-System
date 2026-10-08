"use client";


import { AlertCircleIcon, LoaderIcon, MailIcon } from "./_components/login-icons";
import { LoginPasswordInput } from "./_components/login-password-input";
import { useLoginForm } from "./use-login-form";
import styles from "./styles/login-form.module.css";

export default function LoginForm() {
  const {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    error,
    fieldErrors,
    isPending,
    emailRef,
    passwordRef,
    handleEmailChange,
    handlePasswordChange,
    handleFieldBlur,
    handleRememberChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useLoginForm();

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate data-testid="login-form">
      <div className={styles.field}>
        <label htmlFor="login-email" className={styles.label}>
          Email
        </label>
        <div className={styles.inputWrap}>
          <MailIcon className={styles.inputIcon} width={19} height={19} />
          <input
            ref={emailRef}
            id="login-email"
            className={`app-input ${styles.input}`}
            data-testid="login-email"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            onBlur={handleFieldBlur("email")}
            disabled={isPending}
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="ten@congty.com"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          />
        </div>
        <p id="login-email-error" className={styles.fieldError}>
          {fieldErrors.email}
        </p>
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor="login-password" className={styles.label}>
            Mật khẩu
          </label>
        </div>
        <LoginPasswordInput
          id="login-password"
          testId="login-password"
          value={password}
          onChange={(event) => handlePasswordChange(event.target.value)}
          onBlur={handleFieldBlur("password")}
          isVisible={isPasswordVisible}
          onToggleVisibility={togglePasswordVisibility}
          disabled={isPending}
          invalid={Boolean(fieldErrors.password)}
          describedBy={fieldErrors.password ? "login-password-error" : undefined}
          inputRef={passwordRef}
        />
        <p id="login-password-error" className={styles.fieldError}>
          {fieldErrors.password}
        </p>
      </div>

      <label className={styles.rememberOption}>
        <input
          checked={rememberMe}
          onChange={(event) => handleRememberChange(event.target.checked)}
          disabled={isPending}
          type="checkbox"
        />
        <span>Ghi nhớ đăng nhập</span>
      </label>

      {error ? (
        <div key={error} className={styles.serverError} role="alert" aria-live="assertive">
          <AlertCircleIcon width={18} height={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        className={`primary-button ${styles.submit}`}
        type="submit"
        disabled={isPending}
        aria-busy={isPending || undefined}
        data-testid="login-submit"
      >
        {isPending ? (
          <>
            <LoaderIcon className={styles.spinner} width={18} height={18} />
            Đang đăng nhập...
          </>
        ) : (
          "Đăng nhập"
        )}
      </button>

      <p className={styles.help}>Cần cấp quyền truy cập? Liên hệ quản trị viên.</p>
    </form>
  );
}
