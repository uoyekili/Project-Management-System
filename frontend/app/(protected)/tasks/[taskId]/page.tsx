"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace-shell";
import { LoadingState } from "@/components/loading-state";
import { EmptyState, Surface } from "@/components/ui";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import { userApi, workspaceApi } from "@/services/api";
import type { UserProfile, WorkspaceShellData } from "@/types";
import { TaskDetailView } from "../_components/task-detail-view";
import { t } from "@/lib/i18n";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = typeof params?.taskId === "string" ? params.taskId : "";
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;

  const [shellData, setShellData] = useState<WorkspaceShellData | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer.id) return;
    let isCancelled = false;

    Promise.all([workspaceApi.getShellData(viewer), userApi.list(viewer)])
      .then(([{ data: nextShellData }, { data: nextUsers }]) => {
        if (isCancelled) return;
        setShellData(nextShellData);
        setUsers(nextUsers);
      })
      .catch(() => {
        if (!isCancelled) setError(t("Không thể tải dữ liệu công việc."));
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer]);

  return (
    <WorkspaceShell
      shellData={
        shellData ??
        ({
          currentUser: viewer,
          activeProjects: 0,
          openTasks: 0,
          missingLogwork: 0,
          alertCount: 0,
        } satisfies WorkspaceShellData)
      }
      heading={t("Chi tiết công việc")}
      subheading=""
      highlightLabel={t("Task đang mở")}
      highlightValue={`${shellData?.openTasks ?? 0}`}
    >
      {error ? (
        <Surface title={t("Lỗi")}>
          <EmptyState title={t("Không thể hiển thị")} description={error} />
        </Surface>
      ) : users && taskId ? (
        <TaskDetailView key={taskId} taskId={taskId} users={users} viewer={viewer} />
      ) : (
        <LoadingState variant="cards" />
      )}
    </WorkspaceShell>
  );
}
