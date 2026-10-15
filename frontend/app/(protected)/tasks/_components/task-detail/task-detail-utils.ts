import type { EnrichedTask, Task, TaskLogworkEntry, UserProfile } from "@/types";
import { t } from "@/lib/i18n";
import type { TaskDraft } from "../task-form-fields";

/** Bỏ cú pháp markdown để hiển thị/soạn mô tả dạng văn bản thường. */
export function stripMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/^#{1,6}\s+(.*)/gm, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*>\s+(.*)/gm, "$1");
}

export function buildDraft(source: EnrichedTask | Task): TaskDraft {
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

/** Người thực hiện chính của task; dựng hồ sơ tạm khi không tìm thấy trong danh sách người dùng. */
export function resolveAssignee(
  task: EnrichedTask | Task | null,
  users: UserProfile[],
): UserProfile | null {
  if (!task) return null;
  if ("assignee" in task && task.assignee) return task.assignee;
  if (!task.assigneeId) return null;

  const known = users.find((user) => user.id === task.assigneeId);
  if (known) return known;

  return {
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
  } satisfies UserProfile;
}

export interface LogworkProgress {
  loggedHours: number;
  estimateHours: number;
  percent: number;
  isOver: boolean;
}

/** Giờ đã ghi nhận (không tính logwork bị từ chối) so với ước tính. */
export function computeProgress(
  logworks: TaskLogworkEntry[],
  estimate: number | string | null | undefined,
): LogworkProgress {
  const loggedHours = logworks
    .filter((entry) => entry.status !== "REJECTED")
    .reduce((sum, entry) => sum + entry.hoursSpent, 0);
  const estimateHours = Number(estimate || 0);
  return {
    loggedHours,
    estimateHours,
    percent: estimateHours > 0 ? Math.min(100, Math.round((loggedHours / estimateHours) * 100)) : 0,
    isOver: estimateHours > 0 && loggedHours > estimateHours,
  };
}
