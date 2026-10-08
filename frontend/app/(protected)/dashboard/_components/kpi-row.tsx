import type { ReactNode } from "react";

import type { GlobalDashboardOverview } from "@/types";

import styles from "../styles/dashboard.module.css";
import { ProgressRing } from "./dashboard-card";
import { t } from "@/lib/i18n";

function Icon({ children, tone }: { children: ReactNode; tone: "accent" | "success" | "warning" | "danger" }) {
  return (
    <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${tone}`]}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

/** Bốn chỉ số tổng quan — chỉ để xem, không có tương tác. */
export function KpiRow({ overview }: { overview: GlobalDashboardOverview }) {
  const { taskSummary, projectStatusCounts } = overview;
  const openTasks = taskSummary.todo + taskSummary.inProgress;
  const completedWeek = overview.trend.slice(-7).reduce((sum, point) => sum + point.completed, 0);
  const atRisk = projectStatusCounts.AT_RISK ?? 0;
  const onHold = projectStatusCounts.ON_HOLD ?? 0;

  const progress = overview.overallProgress;
  const progressColor = progress >= 70 ? "var(--color-success)" : progress >= 35 ? "var(--color-primary)" : "var(--color-warning)";

  const projectNotes = [
    atRisk > 0 ? t("{v0} dự án rủi ro", { v0: atRisk }) : null,
    onHold > 0 ? t("{v0} tạm dừng", { v0: onHold }) : null,
    overview.completedProjects > 0 ? t("{v0} hoàn thành", { v0: overview.completedProjects }) : null,
  ].filter(Boolean) as string[];

  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpi}>
        <Icon tone={atRisk > 0 ? "warning" : "accent"}>
          <path d="M4 8l8-4 8 4-8 4-8-4Z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 16l8 4 8-4" />
        </Icon>
        <div className={styles.kpiBody}>
          <span className={styles.kpiLabel}>{t("Dự án đang chạy")}</span>
          <span className={styles.kpiValue}>
            {overview.activeProjects}
            <small> / {overview.totalProjects}</small>
          </span>
          <span className={styles.kpiNote}>{projectNotes.length ? projectNotes.join(" · ") : t("Tất cả đang ổn định")}</span>
        </div>
      </div>

      <div className={styles.kpi}>
        <ProgressRing value={progress} color={progressColor} />
        <div className={styles.kpiBody}>
          <span className={styles.kpiLabel}>{t("Tiến độ tổng")}</span>
          <span className={styles.kpiValue}>{progress}%</span>
          <span className={styles.kpiNote}>
            {taskSummary.done}/{taskSummary.total}  {t("task hoàn thành")}{completedWeek > 0 ? <b className={styles.kpiGood}> · +{completedWeek}  {t("tuần này")}</b> : null}
          </span>
        </div>
      </div>

      <div className={styles.kpi}>
        <Icon tone="accent">
          <rect x="4" y="4" width="6" height="16" rx="1" />
          <rect x="14" y="4" width="6" height="10" rx="1" />
        </Icon>
        <div className={styles.kpiBody}>
          <span className={styles.kpiLabel}>{t("Task đang mở")}</span>
          <span className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {openTasks}
              <small> / {taskSummary.total}</small>
            </span>
          </span>
          <span className={styles.kpiNote}>
            {taskSummary.inProgress}  {t("đang làm ·")} {taskSummary.todo}  {t("chưa bắt đầu")}</span>
        </div>
      </div>

      <div className={styles.kpi}>
        <Icon tone={taskSummary.overdue > 0 ? "danger" : "success"}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </Icon>
        <div className={styles.kpiBody}>
          <span className={styles.kpiLabel}>{t("Quá hạn")}</span>
          <span className={`${styles.kpiValue} ${taskSummary.overdue > 0 ? styles.kpiValueDanger : ""}`}>
            {taskSummary.overdue}
          </span>
          <span className={styles.kpiNote}>
            {overview.dueSoonCount > 0 ? t("{v0} task đến hạn trong 7 ngày", { v0: overview.dueSoonCount }) : t("Không có task sắp đến hạn")}
          </span>
        </div>
      </div>
    </div>
  );
}
