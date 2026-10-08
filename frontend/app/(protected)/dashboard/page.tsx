"use client";

import { useCallback, useEffect, useState } from "react";

import { WorkspaceShell } from "@/components/workspace-shell";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import { SCOPE_LABEL } from "@/lib/permissions";
import { dashboardApi } from "@/services/api";
import type { GlobalDashboardOverview as GlobalDashboardOverviewType, WorkspaceShellData } from "@/types";
import { GlobalDashboardOverview } from "./_components/global-dashboard-overview";
import { t } from "@/lib/i18n";

type DashboardState = {
  overview: GlobalDashboardOverviewType;
};

export default function DashboardPage() {
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      try {
        const { data: overview } = await dashboardApi.getGlobalOverview();

        if (isCancelled) {
          return;
        }

        setDashboardState({
          overview,
        });
        setLoadError(false);
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load dashboard:", err);
          setLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [viewer, reloadKey]);

  const overview = dashboardState?.overview ?? null;
  const dataScope = overview?.dataScope;

  const shellData: WorkspaceShellData = {
    currentUser: viewer,
    activeProjects: overview?.activeProjects ?? 0,
    openTasks: overview?.taskSummary.inProgress ?? 0,
    missingLogwork: 0,
    alertCount: overview?.taskSummary.overdue ?? 0,
  };

  return (
    <WorkspaceShell
      shellData={shellData}
      heading={t("Tổng quan")}
      subheading={t("Tổng hợp tiến độ, rủi ro và khối lượng công việc theo phạm vi quyền của bạn.")}
      highlightLabel="Scope"
      highlightValue={dataScope && dataScope !== "NONE" ? t(SCOPE_LABEL[dataScope]) : "—"}
    >
      {loadError && !overview ? (
        <div className="error-state" role="alert">
          <strong>{t("Không thể tải tổng quan")}</strong>
          <p>{t("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.")}</p>
          <button type="button" className="secondary-button" onClick={retry}>
            {t("Thử lại")}</button>
        </div>
      ) : (
        <GlobalDashboardOverview overview={overview} isLoading={isLoading} />
      )}
    </WorkspaceShell>
  );
}
