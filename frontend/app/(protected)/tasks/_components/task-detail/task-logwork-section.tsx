import { memo, useState } from "react";

import { LoadingState } from "@/components/loading-state";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/utils/format";
import { t } from "@/lib/i18n";
import type { TaskLogworkEntry, UserProfile } from "@/types";
import { CollapsibleCard } from "./collapsible-card";
import styles from "./task-detail.module.css";

const COLLAPSED_COUNT = 8;

function statusLabel(status: TaskLogworkEntry["status"]) {
  if (status === "APPROVED") return t("Đã duyệt");
  if (status === "REJECTED") return t("Từ chối");
  return t("Chờ duyệt");
}

function summarize(entry: TaskLogworkEntry) {
  const value = (entry.title || entry.workContent || "").trim();
  return value || t("Không có mô tả");
}

interface TaskLogworkSectionProps {
  logworks: TaskLogworkEntry[];
  users: UserProfile[];
  isLoading: boolean;
  canLogwork: boolean;
  hasChildren?: boolean;
  onCreate: () => void;
  onSelect: (entry: TaskLogworkEntry) => void;
}

export const TaskLogworkSection = memo(function TaskLogworkSection({
  logworks,
  users,
  isLoading,
  canLogwork,
  hasChildren = false,
  onCreate,
  onSelect,
}: TaskLogworkSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const hidden = Math.max(0, logworks.length - COLLAPSED_COUNT);
  const visible = showAll || hidden === 0 ? logworks : logworks.slice(0, COLLAPSED_COUNT);

  return (
    <CollapsibleCard
      headingId="task-logwork-heading"
      title={
        <>
          Logwork <span className={styles.count}>{logworks.length}</span>
        </>
      }
      actions={
        canLogwork ? (
          <button
            type="button"
            className="task-detail-logwork-button"
            onClick={onCreate}
            disabled={isLoading}
          >
            + Logwork
          </button>
        ) : null
      }
    >
      {hasChildren ? (
        <p className={styles.emptyText}>
          {t(
            "Task này đã được chia nhỏ. Giờ công được ghi ở task con và tự cộng dồn lên task cha.",
          )}
        </p>
      ) : null}
      {isLoading ? (
        <LoadingState variant="cards" />
      ) : logworks.length === 0 ? (
        <p className={styles.emptyText}>{t("Task này chưa có logwork nào.")}</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.logTable}>
              <caption className={styles.srOnly}>{t("Danh sách logwork")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("Nhân sự")}</th>
                  <th scope="col" className={styles.colContent}>
                    {t("Nội dung")}
                  </th>
                  <th scope="col" className={styles.colHours}>
                    {t("Số giờ")}
                  </th>
                  <th scope="col">{t("Trạng thái")}</th>
                  <th scope="col" className={styles.colTime}>
                    {t("Thời gian")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const author = users.find((user) => user.id === entry.userId);
                  return (
                    <tr
                      key={entry.id}
                      className={styles.logRow}
                      tabIndex={0}
                      onClick={() => onSelect(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(entry);
                        }
                      }}
                    >
                      <td>
                        <span className={styles.person}>
                          <UserAvatar
                            name={entry.userName}
                            avatarUrl={author?.avatarUrl}
                            size={24}
                          />
                          <span className={styles.personName}>{entry.userName}</span>
                        </span>
                      </td>
                      <td className={styles.colContent}>
                        <span className={styles.logText}>{summarize(entry)}</span>
                      </td>
                      <td className={styles.colHours}>
                        <span className={styles.hours}>{entry.hoursSpent}h</span>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${styles[`log_${entry.status}`] ?? ""}`}>
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                      <td className={styles.colTime}>{formatDateTime(entry.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hidden > 0 ? (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? t("Thu gọn") : `${t("Xem tất cả")} (${logworks.length})`}
            </button>
          ) : null}
        </>
      )}
    </CollapsibleCard>
  );
});
