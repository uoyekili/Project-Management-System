"use client";

import { useMemo, useState } from "react";

import { useConfirmDialog } from "@/components/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/utils/format";
import { resolveLogworkTitle } from "@/lib/utils/logwork";
import { logworkApi } from "@/services/api/logworks";
import type { DashboardRecentLogwork } from "@/types";

import styles from "../styles/dashboard.module.css";
import { LogworkDetailModal } from "../../logwork/_components/logwork-detail-modal";
import { DashCard } from "./dashboard-card";
import { t } from "@/lib/i18n";

const STATUS_PILL: Record<string, string> = { APPROVED: "pill-on-track", REJECTED: "pill-critical", PENDING: "pill-watch" };

export function LogworkActivity({
  logworks,
}: {
  logworks: DashboardRecentLogwork[];
}) {
  const { confirm, alert } = useConfirmDialog();
  // Kết quả duyệt/từ chối cục bộ, phủ lên dữ liệu server cho tới lần tải lại tiếp theo
  const [resolved, setResolved] = useState<Record<string, Pick<DashboardRecentLogwork, "status" | "canApprove">>>({});
  const [selected, setSelected] = useState<DashboardRecentLogwork | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const items = useMemo(
    () => logworks.map((log) => (resolved[log.id] ? { ...log, ...resolved[log.id] } : log)),
    [logworks, resolved],
  );

  const canAct = (selected?.status || "PENDING").toUpperCase() === "PENDING" && Boolean(selected?.canApprove);

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
    try {
      await (kind === "approve" ? logworkApi.approve : logworkApi.reject)(Number(selected.id));
      const patch = { status: kind === "approve" ? "APPROVED" : "REJECTED", canApprove: false };
      setResolved((prev) => ({ ...prev, [selected.id]: patch }));
      setSelected(null);
    } catch (err) {
      await alert({
        title: kind === "approve" ? t("Không thể duyệt") : t("Không thể từ chối"),
        message: err instanceof Error ? err.message : kind === "approve" ? t("Lỗi khi duyệt logwork") : t("Lỗi khi từ chối logwork"),
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <DashCard id="dashboard-logwork" title={t("Hoạt động logwork")} subtitle={t("Bản ghi mới nhất · nhấn để xem chi tiết")}
        aside={<span className={styles.count}>{items.length}</span>}
      >
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
                    setSelected(log);
                  }}
                >
                  <UserAvatar name={log.userName}
                    avatarUrl={log.userAvatarUrl} size={28} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.taskTitle}>{resolveLogworkTitle(log.title, log.note)}</div>
                    <div className={styles.taskMeta}>
                      <span>{log.userName}</span>
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
        <LogworkDetailModal
          logwork={{
            id: selected.id,
            title: resolveLogworkTitle(selected.title, selected.note),
            userName: selected.userName,
            userAvatarUrl: selected.userAvatarUrl,
            status: selected.status,
            projectId: selected.projectId,
            projectName: selected.projectName,
            taskId: selected.taskId,
            taskTitle: selected.taskTitle,
            hours: selected.hours,
            workDate: selected.workDate,
            content: selected.note,
          }}
          onClose={() => setSelected(null)}
          busy={actionLoading}
          onApprove={canAct ? () => void resolve("approve") : undefined}
          onReject={canAct ? () => void resolve("reject") : undefined}
        />
      ) : null}
    </>
  );
}
