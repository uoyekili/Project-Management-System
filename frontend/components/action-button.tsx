import type { ButtonHTMLAttributes, ReactNode } from "react";

type Kind = "add" | "edit" | "delete";

const ICONS: Record<Kind, ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
};

/** Nút hành động có icon (thêm / chỉnh sửa / xóa): cùng kích thước nút quay lại, tông trung tính. */
export function ActionButton({
  kind,
  children,
  className,
  ...props
}: { kind: Kind } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = ["action-button", `action-button-${kind}`, className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} {...props}>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[kind]}
      </svg>
      <span>{children}</span>
    </button>
  );
}
