import type { ReactNode } from "react";

import { ActionButton } from "@/components/action-button";

import styles from "./admin.module.css";

type AdminDetailActionsProps = {
  editing: boolean;
  saving: boolean;
  /** Có thay đổi mới cho phép lưu. Bỏ qua để luôn cho lưu. */
  canSave?: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  /** Bỏ qua nếu trang không cho xóa. */
  onDelete?: () => void;
};

/** Nhóm nút ở đầu trang chi tiết: Xóa và Chỉnh sửa khi xem, Hủy và Lưu thay đổi khi sửa. Tự xuống hàng khi hẹp. */
export function AdminDetailActions({
  editing,
  saving,
  canSave = true,
  disabled = false,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: AdminDetailActionsProps) {
  return (
    <div className={styles.detailTopbarActions}>
      {editing ? (
        <>
          <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || !canSave}
            onClick={onSave}
          >
            {saving ? "Đang lưu" : "Lưu thay đổi"}
          </button>
        </>
      ) : (
        <>
          {onDelete ? (
            <ActionButton kind="delete" disabled={disabled} onClick={onDelete}>
              Xóa
            </ActionButton>
          ) : null}
          <ActionButton kind="edit" disabled={disabled} onClick={onEdit}>
            Chỉnh sửa
          </ActionButton>
        </>
      )}
    </div>
  );
}

/** Hàng đầu trang chi tiết: nút quay lại bên trái, hành động bên phải. */
export function AdminDetailTopbar({ back, children }: { back: ReactNode; children?: ReactNode }) {
  return (
    <div className={styles.detailTopbar}>
      {back}
      {children}
    </div>
  );
}
