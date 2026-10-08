import Link from "next/link";

import type { DashboardSprintSummary } from "@/types";
import { formatDate, healthToneLabel } from "@/lib/utils/format";

import styles from "../styles/dashboard.module.css";
import { Legend, Tip } from "./charts";
import { Bar, DashCard } from "./dashboard-card";
import { HEALTH_COLORS, barColorForHealth, daysFromToday, dueLabel } from "./dashboard-utils";
import { t } from "@/lib/i18n";

export function SprintProgress({ sprints }: { sprints: DashboardSprintSummary[] }) {
  return (
    <DashCard
      id="dashboard-sprints"
      title={t("Sprint đang chạy")}
      subtitle={t("Tiến độ thực tế so với thời gian đã trôi qua")}
      aside={<span className={styles.count}>{sprints.length}</span>}
    >
      <div className={`${styles.legendBar} ${styles.legendInline}`}>
        <Legend
          items={[
            { key: "on-track", label: t("Đúng tiến độ"), color: HEALTH_COLORS["on-track"] },
            { key: "watch", label: t("Cần theo dõi"), color: HEALTH_COLORS.watch },
            { key: "critical", label: t("Chậm"), color: HEALTH_COLORS.critical },
          ]}
        />
      </div>
      {sprints.length === 0 ? (
        <div className={styles.empty}>{t("Không có sprint nào đang chạy.")}</div>
      ) : (
        <div className={`${styles.sprintList} ${styles.scroll}`}>
          {sprints.map((sprint) => {
            const days = daysFromToday(sprint.endDate);
            return (
              <div key={sprint.id} className={styles.sprintItem}>
                <div className={styles.sprintHead}>
                  <div>
                    <div className={styles.sprintName}>{sprint.name}</div>
                    <div className={styles.sprintMeta}>
                      {sprint.projectId ? (
                        <Link href={`/projects/${sprint.projectId}`}>{sprint.projectName}</Link>
                      ) : null}
                      {" · "}
                      {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                    </div>
                  </div>
                  <span
                    className={`pill ${sprint.health === "critical" ? "pill-critical" : sprint.health === "watch" ? "pill-watch" : "pill-on-track"}`}
                  >
                    {healthToneLabel(sprint.health)}
                  </span>
                </div>
                <Tip
                  className={styles.sprintLine}
                  text={t("Thực tế: {v0}%\nThời gian đã trôi: {v1}%", { v0: sprint.actualProgress, v1: sprint.plannedProgress })}
                >
                  <Bar
                    value={sprint.actualProgress}
                    marker={sprint.plannedProgress}
                    color={barColorForHealth(sprint.health)}
                    label={t("Tiến độ thực tế {v0}", { v0: sprint.name })}
                  />
                </Tip>
                <div className={styles.sprintFoot}>
                  <Tip text={t("Task hoàn thành / tổng số task")} className={styles.chip}>
                    {sprint.doneCount}/{sprint.totalTasks} task
                  </Tip>
                  <Tip text={t("Giờ đã duyệt / giờ ước tính")} className={`${styles.chip} ${styles.chipHours}`}>
                    {sprint.loggedHours}/{sprint.estimatedHours}h
                  </Tip>
                  <Tip
                    text={t("Kết thúc {v0}", { v0: formatDate(sprint.endDate) })}
                    className={`${styles.chip} ${days !== null && days < 0 ? styles.chipDanger : ""}`}
                  >
                    {dueLabel(days)}
                  </Tip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashCard>
  );
}
