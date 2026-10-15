"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { Modal } from "@/components/modal";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateNumeric, formatHours } from "@/lib/utils/format";
import { t } from "@/lib/i18n";

import styles from "../logwork-approvals.module.css";

export interface LogworkDetailData {
  id: number | string;
  title: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  /** PENDING | APPROVED | REJECTED */
  status?: string;
  projectId?: number | string | null;
  projectName?: string | null;
  taskId?: number | string | null;
  taskTitle?: string | null;
  hours: number;
  workDate: string;
  content?: string | null;
}

const STATUS_LABEL: Record<string, string> = { APPROVED: "Đã duyệt", REJECTED: "Từ chối", PENDING: "Chờ duyệt" };
const STATUS_PILL: Record<string, string> = { APPROVED: "pill-on-track", REJECTED: "pill-critical", PENDING: "pill-watch" };

interface LogworkDetailModalProps {
  logwork: LogworkDetailData;
  onClose: () => void;
  closing?: boolean;
  /** Đang gọi API: chặn đóng và khóa nút. */
  busy?: boolean;
  /** Chỉ truyền khi người xem được phép duyệt bản ghi này. */
  onApprove?: () => void;
  onReject?: () => void;
}

/** Popup chi tiết logwork dùng chung cho trang duyệt logwork và dashboard. */
export function LogworkDetailModal({
  logwork,
  onClose,
  closing,
  busy = false,
  onApprove,
  onReject,
}: LogworkDetailModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const status = (logwork.status || "PENDING").toUpperCase();
  const userName = logwork.userName || "Unknown";
  const projectName = logwork.projectName || t("Không xác định");
  const taskTitle = logwork.taskTitle || "---";
  const canAct = Boolean(onApprove && onReject);

  return createPortal(
    <Modal
      title={logwork.title}
      titleId="approval-logwork-title"
      size="lg"
      className={styles.detailModal}
      onClose={onClose}
      dismissible={!busy}
      closing={closing}
    >
      <div className={`app-modal-body ${styles.detailBody}`}>
        <dl className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <dt>{t("Nhân sự")}</dt>
            <dd className={styles.metaPerson}>
              <UserAvatar
                name={userName}
                avatarUrl={logwork.userAvatarUrl}
                size={26}
                className={styles.avatarToken}
              />
              <span className={styles.metaPersonName}>{userName}</span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>{t("Trạng thái")}</dt>
            <dd>
              <span className={`pill ${STATUS_PILL[status] ?? "pill-neutral"}`}>
                {t(STATUS_LABEL[status] ?? "Chờ duyệt")}
              </span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>{t("Dự án")}</dt>
            <dd className={styles.metaValueEllipsis} title={projectName}>
              {logwork.projectId ? (
                <Link href={`/projects/${logwork.projectId}?tab=overview`} className={styles.metaLink}>
                  {projectName}
                </Link>
              ) : (
                projectName
              )}
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Task</dt>
            <dd className={styles.metaValueEllipsis} title={taskTitle}>
              {logwork.taskId && logwork.projectId ? (
                <Link
                  href={`/projects/${logwork.projectId}?highlightTaskId=${logwork.taskId}&highlightColor=green`}
                  className={styles.metaLink}
                >
                  {taskTitle}
                </Link>
              ) : (
                taskTitle
              )}
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt>{t("Số giờ")}</dt>
            <dd>{formatHours(Number(logwork.hours))}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>{t("Ngày tạo")}</dt>
            <dd>{formatDateNumeric(logwork.workDate)}</dd>
          </div>
        </dl>

        <div className={`${styles.sectionPanel} ${styles.contentPanel}`}>
          <span className={styles.sectionLabel}>{t("Nội dung công việc")}</span>
          <div className={styles.contentBox}>{logwork.content?.trim() || t("— Không có mô tả —")}</div>
        </div>
      </div>

      {canAct ? (
        <div className="app-modal-footer">
          <button
            type="button"
            data-testid={`reject-logwork-${logwork.id}`}
            className="danger-button btn-sm"
            onClick={onReject}
            disabled={busy}
          >
            {t("Từ chối")}
          </button>
          <button
            type="button"
            data-testid={`approve-logwork-${logwork.id}`}
            className="primary-button btn-sm"
            onClick={onApprove}
            disabled={busy}
          >
            {t("Duyệt")}
          </button>
        </div>
      ) : null}
    </Modal>,
    document.body,
  );
}
