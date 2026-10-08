import type { CSSProperties, ReactNode } from "react";

import styles from "../styles/dashboard.module.css";

export function DashCard({
  title,
  subtitle,
  aside,
  id,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={[styles.card, className].filter(Boolean).join(" ")}>
      <header className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {subtitle ? <p className={styles.cardSub}>{subtitle}</p> : null}
        </div>
        {aside ? <div className={styles.cardAside}>{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** Thanh tiến độ; `marker` (0-100) đánh dấu mốc kế hoạch. Giá trị 0% hiển thị đúng 0. */
export function Bar({
  value,
  color,
  marker,
  showValue = true,
  label,
}: {
  value: number;
  color?: string;
  marker?: number;
  showValue?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={styles.bar}>
      <div
        className={styles.barTrack}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span
          className={styles.barFill}
          style={{ width: `${clamped}%`, "--bar-color": color } as CSSProperties}
        />
        {marker !== undefined ? (
          <span className={styles.barMarker} style={{ left: `${Math.max(0, Math.min(100, marker))}%` }} />
        ) : null}
      </div>
      {showValue ? <span className={styles.barValue}>{clamped}%</span> : null}
    </div>
  );
}

export function ProgressRing({ value, color = "var(--color-primary)" }: { value: number; color?: string }) {
  const size = 64;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.ring} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-hover)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className={styles.ringLabel}>{Math.round(clamped)}%</span>
    </div>
  );
}
