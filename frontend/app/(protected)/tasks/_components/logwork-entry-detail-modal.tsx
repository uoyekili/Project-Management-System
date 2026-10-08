"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { formatDate, formatDateTime, formatHours } from "@/lib/utils/format";
import type { TaskLogworkEntry } from "@/types";
import { Modal } from "@/components/modal";
import styles from "./logwork-entry-detail-modal.module.css";
import { t } from "@/lib/i18n";

function logworkStatusLabel(status: TaskLogworkEntry["status"]) {
  if (status === "APPROVED") return t("Đã duyệt");
  if (status === "REJECTED") return t("Từ chối");
  return t("Chờ duyệt");
}

interface LogworkEntryDetailModalProps {
  entry: TaskLogworkEntry | null;
  isOpen: boolean;
  onClose: () => void;
  canGoToApprovals?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function LogworkEntryDetailModal({
  entry,
  isOpen,
  onClose,
  canGoToApprovals = false,
  canEdit = false,
  onEdit,
}: LogworkEntryDetailModalProps) {
  const router = useRouter();

  if (!isOpen || !entry) return null;

  const handleGoToApprovals = () => {
    onClose();
    router.push(`/logwork?highlightLogworkId=${encodeURIComponent(entry.id)}`);
  };

  return (
    <Modal
      title={entry.title || entry.userName}
      titleId="logwork-entry-title"
      size="md"
      onClose={onClose}
    >
      <div className="app-modal-body">
        <div className={styles.metaPanel}>
          <dl className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <dt>{t("Nhân sự")}</dt>
              <dd>{entry.userName}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>{t("Ngày làm việc")}</dt>
              <dd>{formatDate(entry.workDate)}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>{t("Số giờ")}</dt>
              <dd>{formatHours(entry.hoursSpent)}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>{t("Trạng thái")}</dt>
              <dd>
                <span
                  className={`pill ${entry.status === "APPROVED" ? "pill-done" : entry.status === "REJECTED" ? "pill-critical" : "pill-watch"}`}
                >
                  {logworkStatusLabel(entry.status)}
                </span>
              </dd>
            </div>
            <div className={styles.metaItem}>
              <dt>{t("Ghi nhận lúc")}</dt>
              <dd>{formatDateTime(entry.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.sectionPanel}>
          <span className={styles.sectionLabel}>{t("Nội dung công việc")}</span>
          <div className={styles.contentBox}>
            {entry.workContent?.trim() || t("— Không có mô tả —")}
          </div>
        </div>
      </div>

      <div className="app-modal-footer">
        <button type="button" className={"secondary-button"} onClick={onClose}>
          {t("Đóng")}</button>
        {canEdit && onEdit ? (
          <ActionButton
            kind="edit"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            {t("Sửa logwork")}</ActionButton>
        ) : canGoToApprovals ? (
          <button type="button" className={"primary-button"} onClick={handleGoToApprovals}>
            {t("Chuyển tới duyệt logwork")}</button>
        ) : null}
      </div>
    </Modal>
  );
}
