"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import type { GlobalDashboardOverview as GlobalDashboardOverviewType } from "@/types";

import styles from "../styles/dashboard.module.css";
import { AttentionStrip } from "./attention-strip";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { OverdueList, UpcomingList } from "./deadline-lists";
import { KpiRow } from "./kpi-row";
import { LogworkActivity } from "./logwork-activity";
import { ProjectHealthList } from "./project-health-list";
import { SprintProgress } from "./sprint-progress";
import { TaskDistribution } from "./task-distribution";
import { TrendCard } from "./trend-card";
import { WorkloadPanel } from "./workload-panel";
import { t } from "@/lib/i18n";

type GlobalDashboardOverviewProps = {
  overview: GlobalDashboardOverviewType | null;
  isLoading?: boolean;
};

/**
 * Bố cục theo thứ tự ưu tiên khi đọc:
 * 1. Pulse — KPI + cảnh báo: dự án đang ở trạng thái nào?
 * 2. Xu hướng — đang tốt lên hay xấu đi?
 * 3. Phân tích — sức khỏe dự án, phân bổ task, sprint, workload
 * 4. Hành động — quá hạn, sắp đến hạn, logwork
 * Chọn một dự án ở "Sức khỏe dự án" để lọc hai danh sách task ở tầng hành động.
 */
export function GlobalDashboardOverview({ overview, isLoading = false }: GlobalDashboardOverviewProps) {
  const [focusProjectId, setFocusProjectId] = useState("");

  const focusProject = useMemo(
    () => overview?.projectHealths.find((project) => project.id === focusProjectId) ?? null,
    [overview, focusProjectId],
  );

  const focusAndReveal = (projectId: string) => {
    setFocusProjectId(projectId);
    if (projectId) {
      document.getElementById("dashboard-overdue")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!overview) {
    return (
      <EmptyState title={t("Không có dữ liệu")} description={t("Không thể tải tổng quan hệ thống. Thử tải lại trang.")} />
    );
  }

  if (overview.totalProjects === 0) {
    return (
      <EmptyState
        title={t("Chưa có dự án nào")}
        description={t("Bạn chưa tham gia dự án nào. Khi được thêm vào dự án, tổng quan sẽ hiển thị tại đây.")}
      />
    );
  }

  return (
    <div className={styles.page}>
      <KpiRow overview={overview} />
      <AttentionStrip overview={overview} />

      <div className={styles.analysisGrid}>
        <div className={styles.spanFull}>
          <TrendCard trend={overview.trend} />
        </div>
        <div className={styles.spanHealth}>
          <ProjectHealthList
            projects={overview.projectHealths}
            focusProjectId={focusProjectId}
            onFocusProject={focusAndReveal}
          />
        </div>
        <div className={styles.spanDistribution}>
          <TaskDistribution summary={overview.taskSummary} priority={overview.priorityBreakdown} />
        </div>
        <div className={styles.spanHalf}>
          <SprintProgress sprints={overview.activeSprints} />
        </div>
        <div className={styles.spanHalf}>
          <WorkloadPanel members={overview.globalWorkload} />
        </div>
      </div>

      {focusProject ? (
        <div className={styles.focusBar} role="status">
          <span>
            {t("Đang lọc theo dự án")} <strong>{focusProject.name}</strong>
          </span>
          <button type="button" onClick={() => setFocusProjectId("")}>
            {t("Bỏ lọc")}</button>
        </div>
      ) : null}

      <div className={styles.actionGrid}>
        <OverdueList
          tasks={overview.overdueTasks}
          total={overview.taskSummary.overdue}
          project={focusProjectId}
          onProjectChange={setFocusProjectId}
        />
        <UpcomingList tasks={overview.upcomingDeadlines} project={focusProjectId} onProjectChange={setFocusProjectId} />
        <LogworkActivity
          logworks={overview.recentLogworks}
          pendingCount={overview.pendingLogworkCount}
          pendingHours={overview.pendingLogworkHours}
        />
      </div>
    </div>
  );
}
