"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useConfirmDialog } from "@/components/confirm-dialog";
import { Modal } from "@/components/modal";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/utils/format";
import { resolveLogworkTitle } from "@/lib/utils/logwork";
import { logworkApi } from "@/services/api/logworks";
import type { DashboardRecentLogwork } from "@/types";

import styles from "../styles/dashboard.module.css";
import { DashCard } from "./dashboard-card";
import { t } from "@/lib/i18n";

const STATUS_LABEL: Record<string, string> = { APPROVED: "Đã duyệt", REJECTED: "Từ chối", PENDING: "Chờ duyệt" };
const STATUS_PILL: Record<string, string> = { APPROVED: "pill-on-track", REJECTED: "pill-critical", PENDING: "pill-watch" };

export function LogworkActivity({
  logworks,
  pendingCount,
  pendingHours,
}: {
  logworks: DashboardRecentLogwork[];
  pendingCount: number;
  pendingHours: number;
}) {
  const { confirm } = useConfirmDialog();
  // Kết quả duyệt/từ chối cục bộ, phủ lên dữ liệu server cho tới lần tải lại tiếp theo
  const [resolved, setResolved] = useState<Record<string, Pick<DashboardRecentLogwork, "status" | "canApprove">>>({});
  const [selected, setSelected] = useState<DashboardRecentLogwork | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = useMemo(
    () => logworks.map((log) => (resolved[log.id] ? { ...log, ...resolved[log.id] } : log)),
    [logworks, resolved],
  );
  const settled = logworks.filter((log) => resolved[log.id] && log.status === "PENDING");
  const pending = {
    count: Math.max(0, pendingCount - settled.length),
    hours: Math.max(0, Math.round((pendingHours - settled.reduce((sum, log) => sum + log.hours, 0)) * 10) / 10),
  };


  const resolve = async (kind: "approve" | "reject") => {
    if (!selected) return;
    if (kind === "reject") {
      const ok = await confirm({
        title: t("Từ chối logwork"),
        message: t("Bạn có chắc muốn từ chối bản ghi logwork này?"),
        confirmLabel: t("Từ chối"),
        tone: "danger",
      });
      if (!ok) return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await (kind === "approve" ? logworkApi.approve : logworkApi.reject)(Number(selected.id));
      const patch = { status: kind === "approve" ? "APPROVED" : "REJECTED", canApprove: false };
      setResolved((prev) => ({ ...prev, [selected.id]: patch }));
      setSelected({ ...selected, ...patch });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : kind === "approve" ? t("Không thể duyệt logwork") : t("Không thể từ chối logwork"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <DashCard id="dashboard-logwork" title={t("Hoạt động logwork")} subtitle={t("Bản ghi mới nhất · nhấn để xem chi tiết")}>
        {pending.count > 0 ? (
          <div className={styles.pendingBanner}>
            <span>
              <strong>{pending.count}</strong>  {t("logwork chờ duyệt ·")} {pending.hours}h
            </span>
            <Link href="/logwork">{t("Duyệt ngay")}</Link>
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className={styles.empty}>{t("Chưa có logwork gần đây.")}</div>
        ) : (
          <div className={styles.scroll}>
            {items.map((log) => {
              const status = (log.status || "PENDING").toUpperCase();
              return (
                <button
                  key={log.id}
                  type="button"
                  className={styles.logRow}
                  onClick={() => {
                    setActionError(null);
                    setSelected(log);
                  }}
                >
                  <UserAvatar name={log.userName}
                    avatarUrl={log.userAvatarUrl} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.taskTitle}>{resolveLogworkTitle(log.title, log.note)}</div>
                    <div className={styles.taskMeta}>
                      <span>
                        {log.userName} · {log.taskKey}
                      </span>
                    </div>
                  </div>
                  <div className={styles.logSide}>
                    <span className={`pill ${STATUS_PILL[status] ?? "pill-neutral"}`}>{log.hours}h</span>
                    <span className={styles.due}>{log.workDate ? formatDate(log.workDate) : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DashCard>

      {selected ? (
        <Modal
          title={resolveLogworkTitle(selected.title, selected.note)}
          titleId="logwork-detail-title"
          subtitle={[selected.taskKey, selected.taskTitle, selected.projectName].filter(Boolean).join(" · ")}
          size="lg"
          onClose={() => {
            if (!actionLoading) setSelected(null);
          }}
        >
          <div className="app-modal-body">
            <article className="detail-card">
              <div className="detail-card-head">
                <div>
                  <strong className="detail-card-title">{selected.userName}</strong>
                  <span className="detail-card-meta">{t("Ngày logwork:")} {formatDate(selected.workDate)}</span>
                </div>
                <div className="detail-card-side">
                  <strong>{selected.hours}h</strong>
                  <span className={`pill ${STATUS_PILL[(selected.status || "PENDING").toUpperCase()] ?? "pill-neutral"}`}>
                    {t(STATUS_LABEL[(selected.status || "PENDING").toUpperCase()] ?? "Chờ duyệt")}
                  </span>
                </div>
              </div>
              <div className="detail-card-body">{selected.note || t("Không có mô tả công việc.")}</div>
              {selected.progressPercent != null ? (
                <div className="detail-card-meta">
                  {t("Tiến độ báo cáo:")} <strong>{selected.progressPercent}%</strong>
                </div>
              ) : null}
            </article>
            {actionError ? (
              <div className="error-state form-error" role="alert">
                {actionError}
              </div>
            ) : null}
          </div>
          <div className="app-modal-footer">
            <button type="button" className="secondary-button" disabled={actionLoading} onClick={() => setSelected(null)}>
              {t("Đóng")}</button>
            {selected.status === "PENDING" && selected.canApprove ? (
              <>
                <button type="button" className="danger-button" disabled={actionLoading} aria-busy={actionLoading || undefined} onClick={() => void resolve("reject")}>
                  {actionLoading ? t("Đang xử lý...") : t("Từ chối")}
                </button>
                <button type="button" className="primary-button" disabled={actionLoading} aria-busy={actionLoading || undefined} onClick={() => void resolve("approve")}>
                  {actionLoading ? t("Đang xử lý...") : t("Duyệt")}
                </button>
              </>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
