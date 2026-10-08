import Link from "next/link";
import type { MouseEventHandler } from "react";
import { t } from "@/lib/i18n";

type BackButtonProps = {
  label?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
};

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/** Nút quay lại dùng chung cho cả khu vận hành và admin: icon chevron + nhãn. */
export function BackButton({ label = t("Quay lại"), href, onClick, className }: BackButtonProps) {
  const classes = ["back-button", className].filter(Boolean).join(" ");
  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        <ChevronLeft />
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick}>
      <ChevronLeft />
      <span>{label}</span>
    </button>
  );
}
