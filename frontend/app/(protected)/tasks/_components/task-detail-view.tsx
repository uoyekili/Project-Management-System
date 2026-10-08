import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/action-button";
import { BackButton } from "@/components/back-button";
import { UserAvatar } from "@/components/user-avatar";
import { taskApi } from "@/services/api";
import { LoadingState } from "@/components/loading-state";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/utils/format";
import { canApproveLogworkAnywhere, canInProject, canOnRecord } from "@/lib/permissions";
import type { EnrichedTask, Task, TaskLogworkEntry, UserProfile } from "@/types";
import { LogworkModal } from "./logwork-modal";
import { TaskComments } from "./task-comments";
import {
  EMPTY_TASK_DRAFT as EMPTY_DRAFT,
  TaskAssigneesCard,
  TaskPropertyFields,
  type TaskDraft,
} from "./task-form-fields";
import { LogworkEntryDetailModal } from "./logwork-entry-detail-modal";
import styles from "./task-detail-view.module.css";
import { t } from "@/lib/i18n";

function truncateText(text: string, max = 52) {
  const value = text.trim();
  if (!value) return t("Không có mô tả");
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function logworkStatusLabel(status: TaskLogworkEntry["status"]) {
  if (status === "APPROVED") return t("Đã duyệt");
  if (status === "REJECTED") return t("Từ chối");
  return t("Chờ duyệt");
}

function stripMarkdown(md: string): string {
  if (!md) return "";
  let output = md;
  // Remove headers
  output = output.replace(/^#{1,6}\s+(.*)/gm, "$1");
  // Remove bold
  output = output.replace(/\*\*(.*?)\*\*/g, "$1");
  output = output.replace(/__(.*?)__/g, "$1");
  // Remove italic
  output = output.replace(/\*(.*?)\*/g, "$1");
  output = output.replace(/_(.*?)_/g, "$1");
  // Remove strikethrough
  output = output.replace(/~~(.*?)~~/g, "$1");
  // Remove inline code
  output = output.replace(/`(.*?)`/g, "$1");
  // Remove images
  output = output.replace(/!\[(.*?)\]\(.*?\)/g, "$1");
  // Remove links
  output = output.replace(/\[(.*?)\]\(.*?\)/g, "$1");
  // Remove blockquotes
  output = output.replace(/^\s*>\s+(.*)/gm, "$1");
  return output;
}

interface TaskDetailViewProps {
  taskId: string;
  users: UserProfile[];
  viewer: UserProfile;
}

export function TaskDetailView({ taskId, users, viewer }: TaskDetailViewProps) {
  const router = useRouter();
  const viewerId = viewer.id;
  const { confirm, alert } = useConfirmDialog();
  const [task, setTask] = useState<EnrichedTask | Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [isLogworkModalOpen, setIsLogworkModalOpen] = useState(false);
  const [selectedLogworkEntry, setSelectedLogworkEntry] = useState<TaskLogworkEntry | null>(null);

  // Người thực hiện của task cha; null = task không có cha (không giới hạn).
  const [parentAssigneeIds, setParentAssigneeIds] = useState<string[] | null>(null);
  const [logworks, setLogworks] = useState<TaskLogworkEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"logwork" | "comments">("logwork");

  const taskProject = task && "project" in task ? task.project : null;
  // Chủ sở hữu task (scope OWN): người được giao hoặc người tạo.
  const isTaskAssignee = Boolean(
    task && (task.assigneeId === viewerId || task.assigneeIds?.includes(viewerId)),
  );
  const isTaskOwner = Boolean(task && (isTaskAssignee || task.reporterId === viewerId));
  const canEditTask = canOnRecord(taskProject, "task", "update", isTaskOwner);
  const canAssignTask = canInProject(taskProject, "task", "assign");
  const canDeleteTask = canOnRecord(taskProject, "task", "delete", isTaskOwner);
  const canLogwork = isTaskAssignee && canInProject(taskProject, "logwork", "create", "OWN");

  const resolvedAssignee =
    task && "assignee" in task && task.assignee
      ? task.assignee
      : task?.assigneeId
        ? (users.find((user) => user.id === task.assigneeId) ??
          ({
            id: task.assigneeId,
            name: task.assigneeName || t("Người dùng"),
            email: task.assigneeEmail || "",
            role: "MEMBER",
            roles: ["MEMBER"],
            permissions: [],
            title: task.assigneeEmail || t("Thành viên dự án"),
            initials: (task.assigneeName || "ND")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join(""),
            presence: "online",
            capacityHours: 40,
            workloadHours: 0,
            focusScore: 0,
            isActive: true,
            status: "ACTIVE",
            avatarUrl: task.assigneeAvatarUrl,
          } satisfies UserProfile))
        : null;

  const projectMemberIds = task && "project" in task ? task.project?.memberIds : null;
  const projectUsers = projectMemberIds
    ? users.filter((u) => projectMemberIds.includes(u.id))
    : users;

  const assigneeOptionsAll = canAssignTask
    ? resolvedAssignee && !projectUsers.some((user) => user.id === resolvedAssignee.id)
      ? [resolvedAssignee, ...projectUsers]
      : projectUsers
    : resolvedAssignee && resolvedAssignee.id !== viewerId
      ? [resolvedAssignee, ...projectUsers.filter((user) => user.id === viewerId)]
      : projectUsers.filter((user) => user.id === viewerId);
  // Task con chỉ giao cho người thuộc task cha.
  const assigneeOptions = parentAssigneeIds
    ? assigneeOptionsAll.filter((user) => parentAssigneeIds.includes(user.id))
    : assigneeOptionsAll;
  const parentHasNoAssignee = parentAssigneeIds !== null && parentAssigneeIds.length === 0;

  const isWaterfall = task && "project" in task && task.project?.projectType === "waterfall";
  const isAgile = task && "project" in task && task.project?.projectType === "agile";

  // Quyền giao task theo vai trò trong dự án (backend không phân biệt waterfall/agile). Agile vẫn tự gán khi kéo thả trên Kanban.
  const canEditAssignee = canAssignTask;
  const canGoToLogworkApprovals = canApproveLogworkAnywhere(viewer);

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
        message: t("Không thể tải thông tin công việc: {v0}", { v0: error instanceof Error ? error.message : "Unknown error" }),
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

  function buildDraft(source: EnrichedTask | Task): TaskDraft {
    return {
      title: source.title,
      description: stripMarkdown(source.description || ""),
      status: source.status,
      priority: source.priority,
      assigneeIds: source.assigneeIds?.length
        ? source.assigneeIds
        : source.assigneeId
          ? [source.assigneeId]
          : [],
      startDate: source.startDate || "",
      dueDate: source.dueDate || "",
      estimateHours: source.estimateHours ? String(source.estimateHours) : "",
      parentTaskId: source.parentTaskId || "",
    };
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
      if (canEditAssignee && !sameAssignees) {
        await taskApi.updateAssignee(task.id, draft.assigneeIds);
      }
      const refreshed = await taskApi.getEnrichedTask(task.id, undefined, { users });
      setTask(refreshed.data);
      setIsEditing(false);
    } catch (error: unknown) {
      await alert({
        title: t("Cập nhật thất bại"),
        message: t("Cập nhật thất bại: {v0}", { v0: error instanceof Error ? error.message : "Unknown error" }),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(task?.projectId ? `/projects/${task.projectId}` : "/tasks");
    }
  }

  async function handleDeleteTask() {
    if (!task) return;
    const confirmed = await confirm({
      title: t("Xóa task"),
      message: t("Bạn có chắc chắn muốn xoá task này không?"),
      confirmLabel: t("Xóa"),
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

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

  const loggedHours = logworks
    .filter((entry) => entry.status !== "REJECTED")
    .reduce((sum, entry) => sum + entry.hoursSpent, 0);
  const estimateHours = Number(task?.estimateHours || 0);
  const isOverEstimate = estimateHours > 0 && loggedHours > estimateHours;
  const progressPercent =
    estimateHours > 0 ? Math.min(100, Math.round((loggedHours / estimateHours) * 100)) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <BackButton onClick={handleBack} />
        <div className={styles.topActions}>
          {task?.projectId ? (
            <button
              type="button"
              className={styles.projectButton}
              onClick={() =>
                router.push(`/projects/${task.projectId}?tab=${isWaterfall ? "gantt" : "kanban"}`)
              }
            >
              {t("Đi tới dự án →")}</button>
          ) : null}
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={cancelEditing}
                disabled={isSaving}
              >
                {t("Hủy")}</button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={() => void saveEditing()}
                disabled={isSaving}
              >
                {isSaving ? t("Đang lưu...") : t("Lưu thay đổi")}
              </button>
            </>
          ) : (
            <>
              {canEditTask ? (
                <ActionButton kind="edit" onClick={startEditing} disabled={isLoading || !task}>
                  {t("Chỉnh sửa")}</ActionButton>
              ) : null}
              {canDeleteTask ? (
                <ActionButton
                  kind="delete"
                  onClick={() => void handleDeleteTask()}
                  disabled={isLoading || isSaving}
                >
                  {t("Xóa task")}</ActionButton>
              ) : null}
            </>
          )}
        </div>
      </div>

      <section className={`${styles.card} ${styles.hero}`}>
        {isEditing && canEditTask ? (
          <>
            <label htmlFor="task-detail-title-input" className={styles.cardTitle}>
              {t("Tên công việc")}</label>
            <input
              id="task-detail-title-input"
              autoFocus
              className={`app-input ${styles.titleInput}`}
              placeholder={t("Nhập tên công việc...")}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </>
        ) : (
          <>
            <div className={styles.keyBadge}>{task?.key}</div>
            <h2 id="task-detail-title" className={styles.title}>
              {task?.title}
            </h2>
          </>
        )}
      </section>

      {task ? (
        <TaskAssigneesCard
          assigneeIds={isEditing ? draft.assigneeIds : buildDraft(task).assigneeIds}
          onChange={(assigneeIds) => setDraft((current) => ({ ...current, assigneeIds }))}
          options={assigneeOptions}
          knownUsers={resolvedAssignee ? [resolvedAssignee, ...users] : users}
          disabled={!canEditAssignee || !isEditing || parentHasNoAssignee}
          title={
            parentHasNoAssignee
              ? t("Task cha chưa có người thực hiện nên chưa thể giao task con.")
              : parentAssigneeIds
                ? t("Chỉ có thể giao cho người đang thực hiện task cha.")
                : !canAssignTask
              ? isAgile
                ? t("Trong mô hình Agile, người thực hiện được tự động gán khi kéo thả Task trên bảng Kanban.")
                : t("Bạn không có quyền giao task người thực hiện trong dự án Waterfall.")
              : ""
          }
        />
      ) : null}

      <div className={styles.body}>
        <div className={styles.content}>
          <section className={`${styles.card} ${styles.descCard}`}>
            <h3 className={styles.cardTitle}>{t("Mô tả công việc")}</h3>
            <textarea
              className={`task-detail-description ${styles.description}`}
              value={isEditing ? draft.description : stripMarkdown(task?.description || "")}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              readOnly={!isEditing || !canEditTask}
              disabled={isSaving}
              placeholder={
                isEditing && canEditTask
                  ? t("Mô tả mục tiêu, phạm vi và tiêu chí hoàn thành...")
                  : t("Chưa có mô tả.")
              }
            />
            {isEditing ? <div className={styles.hint}>{draft.description.length}  {t("ký tự")}</div> : null}
          </section>

          {!isEditing ? (
            <section className={`${styles.card} ${styles.logworkCard}`}>
              <div className={styles.cardHead}>
                <div className={styles.tabs} role="tablist" aria-label={t("Logwork và bình luận")}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "logwork"}
                    className={`${styles.tab}${activeTab === "logwork" ? ` ${styles.tabActive}` : ""}`}
                    onClick={() => setActiveTab("logwork")}
                  >
                    Logwork
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "comments"}
                    className={`${styles.tab}${activeTab === "comments" ? ` ${styles.tabActive}` : ""}`}
                    onClick={() => setActiveTab("comments")}
                  >
                    {t("Bình luận")}</button>
                </div>
                {canLogwork && activeTab === "logwork" ? (
                  <button
                    type="button"
                    className="task-detail-logwork-button"
                    onClick={() => setIsLogworkModalOpen(true)}
                    disabled={isLoading}
                  >
                    + Logwork
                  </button>
                ) : null}
              </div>

              <div role="tabpanel" hidden={activeTab !== "logwork"}>
                <div className={styles.list}>
                  {isLoading ? (
                    <LoadingState variant="cards" />
                  ) : logworks.length ? (
                    logworks.map((entry) => {
                      const author = users.find((user) => user.id === entry.userId);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelectedLogworkEntry(entry)}
                          className={styles.logworkItem}
                        >
                          <UserAvatar
                            name={entry.userName}
                            avatarUrl={author?.avatarUrl}
                            size={32}
                          />
                          <div className={styles.itemBody}>
                            <div className={styles.itemHead}>
                              <strong>{entry.userName}</strong>
                              <span className={styles.hours}>{entry.hoursSpent}h</span>
                              <span
                                className={`${styles.pill} ${styles.pillSm} ${styles[`logwork_${entry.status}`] ?? ""}`}
                              >
                                {logworkStatusLabel(entry.status)}
                              </span>
                              <span className={styles.time}>{formatDateTime(entry.createdAt)}</span>
                            </div>
                            <p className={styles.itemText}>
                              {truncateText(entry.title || entry.workContent, 160)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="task-detail-empty">{t("Task này chưa có logwork nào.")}</div>
                  )}
                </div>
              </div>
              <div role="tabpanel" hidden={activeTab !== "comments"}>
                <TaskComments
                  taskId={taskId}
                  users={users}
                  mentionableUsers={projectUsers}
                  viewer={viewer}
                  canManage={canEditTask}
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <section className={`${styles.card} ${styles.infoCard}`}>
            <h3 className={styles.cardTitle}>{t("Thông tin")}</h3>
            {task ? (
              <TaskPropertyFields
                draft={isEditing ? draft : buildDraft(task)}
                onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                readOnly={!isEditing || isLoading || isSaving}
                canEditFields={canEditTask}
              />
            ) : null}
          </section>

          {!isEditing ? (
            <section className={`${styles.card} ${styles.progressCard}`}>
              <div className={styles.progress}>
                <div className={styles.progressTop}>
                  <span>{t("Tiến độ logwork")}</span>
                  <strong className={styles.progressValue}>{progressPercent}%</strong>
                </div>
                <div
                  className={`${styles.progressBar}${isOverEstimate ? ` ${styles.progressOver}` : progressPercent >= 100 ? ` ${styles.progressDone}` : ""}`}
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("Tiến độ logwork")}
                >
                  <i style={{ width: `${progressPercent}%` }} />
                </div>
                <div className={styles.progressStats}>
                  <div>
                    <span>{t("Đã ghi nhận")}</span>
                    <strong>{loggedHours}h</strong>
                  </div>
                  <div>
                    <span>{t("Ước tính")}</span>
                    <strong>{estimateHours}h</strong>
                  </div>
                  <div className={isOverEstimate ? styles.statOver : undefined}>
                    <span>{isOverEstimate ? t("Vượt") : t("Còn lại")}</span>
                    <strong>{Math.abs(estimateHours - loggedHours)}h</strong>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {task ? (
        <LogworkModal
          isOpen={isLogworkModalOpen}
          onClose={() => setIsLogworkModalOpen(false)}
          taskId={task.id}
          userId={viewerId}
          onSuccess={async () => {
            const response = await taskApi.listLogworks(task.id);
            setLogworks(response.data);
          }}
        />
      ) : null}

      <LogworkEntryDetailModal
        entry={selectedLogworkEntry}
        isOpen={!!selectedLogworkEntry}
        onClose={() => setSelectedLogworkEntry(null)}
        canGoToApprovals={canGoToLogworkApprovals}
      />
    </div>
  );
}
