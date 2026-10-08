"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";


import { WorkspaceShell } from "@/components/workspace-shell";
import { LoadingState } from "@/components/loading-state";
import {
  getTasksPageCache,
  primeTasksPageData,
  type TaskPageState,
} from "@/services/page-cache/tasks-page";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import type { WorkspaceShellData } from "@/types";
import { GroupedTaskList } from "./_components/grouped-task-list";
import { t as tr } from "@/lib/i18n";

function TasksPageContent() {
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;
  const cachedTaskState = viewer.id ? getTasksPageCache(viewer.id) : null;
  const [taskState, setTaskState] = useState<TaskPageState | null>(cachedTaskState);
  const [isBoardLoading, setIsBoardLoading] = useState(!cachedTaskState);

  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyTaskId = searchParams.get("taskId");
  const selectedProjectId = "ALL";

  // Giữ tương thích link cũ dạng /tasks?taskId=...
  useEffect(() => {
    if (legacyTaskId) {
      router.replace(`/tasks/${legacyTaskId}`);
    }
  }, [legacyTaskId, router]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBoard() {
      if (!viewer.id) {
        return null;
      }

      // Đã có dữ liệu trong bộ nhớ đệm: hiển thị ngay, chỉ làm mới ngầm.
      const hasCache = Boolean(getTasksPageCache(viewer.id));
      if (!hasCache) setIsBoardLoading(true);
      try {
        const nextState = await primeTasksPageData(viewer, hasCache);

        if (isCancelled) {
          return null;
        }

        setTaskState(nextState);
        return nextState;
      } finally {
        if (!isCancelled) {
          setIsBoardLoading(false);
        }
      }
    }

    void loadBoard();

    return () => {
      isCancelled = true;
    };
  }, [viewer]);

  const shellData =
    taskState?.shellData ??
    ({
      currentUser: viewer,
      activeProjects: 0,
      openTasks: 0,
      missingLogwork: 0,
      alertCount: 0,
    } satisfies WorkspaceShellData);

  // Lọc chỉ các task ĐƯỢC GÁN cho viewer và chưa hoàn thành
  const myTasks = taskState?.tasks?.filter(t => t.assigneeId === viewer.id && t.status !== "DONE") ?? [];
  const filteredTasks = selectedProjectId === "ALL"
    ? myTasks
    : myTasks.filter((task) => task.projectId === selectedProjectId);
  const openTaskCount = filteredTasks.filter((task) => task.status !== "DONE").length;

  return (
    <WorkspaceShell
      shellData={shellData}
      heading={tr("Nhiệm vụ cá nhân")}
      subheading={tr("Nhiệm vụ bạn được giao và nhiệm vụ bạn đã giao cho người khác trên tất cả dự án.")}
      highlightLabel={tr("Task đang mở")}
      highlightValue={`${openTaskCount}`}
      fillViewport
      stickyTopbar
    >
      <div className="page-section-stack">
        <GroupedTaskList
          isLoading={isBoardLoading || !viewer.id}
          projects={taskState?.projects ?? []}
          tasks={filteredTasks}
          selectedProjectId={selectedProjectId}
          onTaskClick={(taskId) => {
            router.push(`/tasks/${taskId}`);
          }}
        />

      </div>

    </WorkspaceShell>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceShell
          shellData={{
            currentUser: PENDING_USER,
            activeProjects: 0,
            openTasks: 0,
            missingLogwork: 0,
            alertCount: 0,
          }}
          heading={tr("Nhiệm vụ cá nhân")}
          subheading={tr("Nhiệm vụ bạn được giao và nhiệm vụ bạn đã giao cho người khác trên tất cả dự án.")}
          highlightLabel={tr("Task đang mở")}
          highlightValue="0"
          fillViewport
          stickyTopbar
        >
          <LoadingState variant="cards" />
        </WorkspaceShell>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
