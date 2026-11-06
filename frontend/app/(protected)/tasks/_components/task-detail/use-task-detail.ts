import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useConfirmDialog } from "@/components/confirm-dialog";
import { canApproveLogworkAnywhere, canInProject, canOnRecord } from "@/lib/permissions";
import { taskApi } from "@/services/api";
import type { EnrichedTask, Task, TaskLogworkEntry, UserProfile } from "@/types";
import { t } from "@/lib/i18n";
import { EMPTY_TASK_DRAFT, type TaskDraft } from "../task-form-fields";
import { buildDraft, computeProgress, resolveAssignee } from "./task-detail-utils";

/** Toàn bộ dữ liệu, quyền và thao tác của trang chi tiết task (giao diện chỉ việc hiển thị). */
export function useTaskDetail({
  taskId,
  users,
  viewer,
}: {
  taskId: string;
  users: UserProfile[];
  viewer: UserProfile;
}) {
  const router = useRouter();
  const viewerId = viewer.id;
  const { confirm, alert } = useConfirmDialog();

  const [task, setTask] = useState<EnrichedTask | Task | null>(null);
  const [logworks, setLogworks] = useState<TaskLogworkEntry[]>([]);
  // Người thực hiện của task cha; null = task không có cha (không giới hạn).
  const [parentAssigneeIds, setParentAssigneeIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_TASK_DRAFT);

  const taskProject = task && "project" in task ? task.project : null;
  // Chủ sở hữu task (scope OWN): người được giao hoặc người tạo.
  const isTaskAssignee = Boolean(
    task && (task.assigneeId === viewerId || task.assigneeIds?.includes(viewerId)),
  );
  const isTaskOwner = Boolean(task && (isTaskAssignee || task.reporterId === viewerId));
  const canEditTask = canOnRecord(taskProject, "task", "update", isTaskOwner);
  const canAssignTask = canInProject(taskProject, "task", "assign");
  const canDeleteTask = canOnRecord(taskProject, "task", "delete", isTaskOwner);
  const canLogwork =
    isTaskAssignee && !task?.hasChildren && canInProject(taskProject, "logwork", "create", "OWN");
  const canGoToLogworkApprovals = canApproveLogworkAnywhere(viewer);

  const projectType = taskProject?.projectType;
  const isWaterfall = projectType === "waterfall";
  const isAgile = projectType === "agile";

  const resolvedAssignee = useMemo(() => resolveAssignee(task, users), [task, users]);

  const projectMemberIds = taskProject?.memberIds;
  const projectUsers = useMemo(
    () => (projectMemberIds ? users.filter((u) => projectMemberIds.includes(u.id)) : users),
    [projectMemberIds, users],
  );

  const assigneeOptions = useMemo(() => {
    const all = canAssignTask
      ? resolvedAssignee && !projectUsers.some((user) => user.id === resolvedAssignee.id)
        ? [resolvedAssignee, ...projectUsers]
        : projectUsers
      : resolvedAssignee && resolvedAssignee.id !== viewerId
        ? [resolvedAssignee, ...projectUsers.filter((user) => user.id === viewerId)]
        : projectUsers.filter((user) => user.id === viewerId);
    // Task con chỉ giao cho người thuộc task cha.
    return parentAssigneeIds ? all.filter((user) => parentAssigneeIds.includes(user.id)) : all;
  }, [canAssignTask, parentAssigneeIds, projectUsers, resolvedAssignee, viewerId]);

  const parentHasNoAssignee = parentAssigneeIds !== null && parentAssigneeIds.length === 0;
  const progress = useMemo(
    () => computeProgress(logworks, task?.estimateHours),
    [logworks, task?.estimateHours],
  );

  const loadTask = useEffectEvent(async (nextTaskId: string) => {
    setIsLoading(true);
    try {
      const [taskResponse, logworkResponse] = await Promise.all([
        taskApi.getEnrichedTask(nextTaskId, undefined, { users }),
        taskApi.listLogworks(nextTaskId),
      ]);
      setTask(taskResponse.data);
      setLogworks(logworkResponse.data);
      const parentId = taskResponse.data.parentTaskId;
      if (parentId) {
        const parent = (await taskApi.getEnrichedTask(parentId, undefined, { users })).data;
        setParentAssigneeIds(
          parent.assigneeIds?.length ? parent.assigneeIds : parent.assigneeId ? [parent.assigneeId] : [],
        );
      } else {
        setParentAssigneeIds(null);
      }
    } catch (error: unknown) {
      await alert({
        title: t("Không thể tải công việc"),
        message: t("Không thể tải thông tin công việc: {v0}", {
          v0: error instanceof Error ? error.message : "Unknown error",
        }),
      });
      router.replace("/tasks");
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    queueMicrotask(() => {
      void loadTask(taskId);
    });
  }, [taskId]);

  async function reloadLogworks() {
    if (!task) return;
    const response = await taskApi.listLogworks(task.id);
    setLogworks(response.data);
  }

  function patchDraft(patch: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function startEditing() {
    if (!task) return;
    setDraft(buildDraft(task));
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  async function saveEditing() {
    if (!task) return;

    const title = draft.title.trim();
    if (!title) {
      await alert({ title: t("Thiếu tên công việc"), message: t("Vui lòng nhập tên công việc.") });
      return;
    }
    if (draft.startDate && draft.dueDate && draft.dueDate < draft.startDate) {
      await alert({
        title: t("Ngày không hợp lệ"),
        message: t("Hạn chót phải sau hoặc bằng ngày bắt đầu."),
      });
      return;
    }

    const original = buildDraft(task);
    const updates: Partial<Task> = {};
    if (title !== original.title) updates.title = title;
    if (draft.description !== original.description) updates.description = draft.description;
    if (draft.status !== original.status) updates.status = draft.status;
    if (draft.priority !== original.priority) updates.priority = draft.priority;
    if (draft.startDate !== original.startDate) updates.startDate = draft.startDate;
    if (draft.dueDate !== original.dueDate) updates.dueDate = draft.dueDate;
    if (draft.estimateHours !== original.estimateHours) {
      updates.estimateHours = parseFloat(draft.estimateHours) || 0;
    }

    setIsSaving(true);
    try {
      if (Object.keys(updates).length > 0) {
        await taskApi.update(task.id, updates);
      }
      const sameAssignees =
        draft.assigneeIds.length === original.assigneeIds.length &&
        draft.assigneeIds.every((id) => original.assigneeIds.includes(id));
      if (canAssignTask && !sameAssignees) {
        await taskApi.updateAssignee(task.id, draft.assigneeIds);
      }
      const refreshed = await taskApi.getEnrichedTask(task.id, undefined, { users });
      setTask(refreshed.data);
      setIsEditing(false);
    } catch (error: unknown) {
      await alert({
        title: t("Cập nhật thất bại"),
        message: t("Cập nhật thất bại: {v0}", {
          v0: error instanceof Error ? error.message : "Unknown error",
        }),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(task?.projectId ? `/projects/${task.projectId}` : "/tasks");
    }
  }

  function goToProject() {
    if (!task?.projectId) return;
    const tab = isWaterfall ? "gantt" : "kanban";
    // Kèm highlightTaskId để Kanban hoặc Gantt cuộn tới và nháy sáng đúng task vừa xem.
    router.push(`/projects/${task.projectId}?tab=${tab}&highlightTaskId=${task.id}&highlightColor=blue`);
  }

  async function deleteTask() {
    if (!task) return;
    const confirmed = await confirm({
      title: t("Xóa task"),
      message: t("Bạn có chắc chắn muốn xoá task này không?"),
      confirmLabel: t("Xóa"),
      tone: "danger",
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await taskApi.remove(task.id);
      router.replace(task.projectId ? `/projects/${task.projectId}` : "/tasks");
    } catch {
      await alert({ title: t("Không thể xóa"), message: t("Lỗi khi xoá task") });
    } finally {
      setIsSaving(false);
    }
  }

  const assigneeLockReason = parentHasNoAssignee
    ? t("Task cha chưa có người thực hiện nên chưa thể giao task con.")
    : parentAssigneeIds
      ? t("Chỉ có thể giao cho người đang thực hiện task cha.")
      : !canAssignTask
        ? isAgile
          ? t("Trong mô hình Agile, người thực hiện được tự động gán khi kéo thả Task trên bảng Kanban.")
          : t("Bạn không có quyền giao task người thực hiện trong dự án Waterfall.")
        : "";

  return {
    task,
    logworks,
    users,
    viewer,
    projectUsers,
    isLoading,
    isSaving,
    isEditing,
    draft,
    progress,
    permissions: { canEditTask, canAssignTask, canDeleteTask, canLogwork, canGoToLogworkApprovals },
    assignee: {
      options: assigneeOptions,
      known: resolvedAssignee ? [resolvedAssignee, ...users] : users,
      disabled: !canAssignTask || !isEditing || parentHasNoAssignee,
      lockReason: assigneeLockReason,
    },
    actions: {
      patchDraft,
      startEditing,
      cancelEditing,
      saveEditing,
      goBack,
      goToProject,
      deleteTask,
      reloadLogworks,
    },
  };
}

export type TaskDetailState = ReturnType<typeof useTaskDetail>;
