import type {
  HealthTone,
  ProjectStatus,
  SprintStatus,
  TaskPriority,
  TaskStatus,
  UserRole,
  UserStatus,
} from "@/types";
import { t } from "@/lib/i18n";

export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

function normalizeApiDateString(date: string) {
  const trimmed = date.trim();

  if (!trimmed) {
    return trimmed;
  }

  // Legacy backend payloads may return UTC timestamps without an explicit offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }

  return trimmed;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "short",
  day: "numeric",
  timeZone: VIETNAM_TIMEZONE,
});

export function formatDate(date: string) {
  if (!date) return t("(Chưa có)");
  const d = new Date(normalizeApiDateString(date));
  if (isNaN(d.getTime())) return t("(Không hợp lệ)");
  return dateFormatter.format(d);
}

export function formatDateTime(date: string) {
  if (!date) return t("(Chưa có)");
  const d = new Date(normalizeApiDateString(date));
  if (isNaN(d.getTime())) return t("(Không hợp lệ)");
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: VIETNAM_TIMEZONE,
  }).format(d);
}

export function toVietnamDateInputValue(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function formatDateNumeric(date: string) {
  if (!date) return t("(Chưa có)");
  const d = new Date(normalizeApiDateString(date));
  if (isNaN(d.getTime())) return t("(Không hợp lệ)");
  const [year, month, day] = toVietnamDateInputValue(d).split("-");
  return `${day}/${month}/${year}`;
}

export function formatRange(start: string, end: string) {
  if (!start && !end) return t("Chưa xác định");
  if (!end) return t("{v0} - (Chưa có)", { v0: formatDate(start) });
  if (!start) return t("(Chưa có) - {v0}", { v0: formatDate(end) });
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatRangeNumeric(start: string, end: string) {
  if (!start && !end) return t("Chưa xác định");
  if (!end) return t("{v0} - (Chưa có)", { v0: formatDateNumeric(start) });
  if (!start) return t("(Chưa có) - {v0}", { v0: formatDateNumeric(end) });
  return `${formatDateNumeric(start)} - ${formatDateNumeric(end)}`;
}

export function formatHours(hours: number) {
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export function roleLabel(role: UserRole) {
  return (role || "").trim();
}

export function splitSlashLabels(label: string): string[] {
  const trimmed = (label || "").trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(/\s*[/／]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toRoleList(
  roles: UserRole | readonly UserRole[] | null | undefined,
  fallback?: UserRole,
): UserRole[] {
  if (Array.isArray(roles)) {
    return roles.filter((role) => typeof role === "string" && role.trim().length > 0);
  }

  if (typeof roles === "string" && roles.trim()) {
    return [roles];
  }

  if (fallback && fallback.trim()) {
    return [fallback];
  }

  return [];
}

export function roleDisplayLabels(
  roles: UserRole | readonly UserRole[] | null | undefined,
  fallback?: UserRole,
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const role of toRoleList(roles, fallback)) {
    for (const label of splitSlashLabels(roleLabel(role))) {
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}

const ROLE_TONES = ["critical", "watch", "on-track", "neutral"] as const;

/** Màu tag chỉ mang tính trang trí: suy ra ổn định từ tên role, không phụ thuộc tên cụ thể. */
export function getRoleTone(role: UserRole) {
  const name = (role || "").trim();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return ROLE_TONES[hash % ROLE_TONES.length];
}

export function projectRoleLabel(roleName: string) {
  return roleName;
}

export function projectStatusLabel(status: ProjectStatus) {
  return {
    PLANNING: t("Đang lập kế hoạch"),
    ACTIVE: t("Đang triển khai"),
    AT_RISK: t("Rủi ro trễ hạn"),
    COMPLETED: t("Đã hoàn thành"),
    ON_HOLD: t("Tạm dừng"),
  }[status];
}

export function projectTypeLabel(projectType: "agile" | "waterfall") {
  return projectType === "waterfall" ? "Waterfall" : "Kanban";
}

export function sprintStatusLabel(status: SprintStatus) {
  return {
    PLANNED: t("Kế hoạch"),
    ACTIVE: t("Đang chạy"),
    REVIEW: t("Đánh giá"),
    CLOSED: t("Đã đóng"),
  }[status];
}

export function toWorkflowTaskStatus(status: TaskStatus): "TODO" | "IN_PROGRESS" | "DONE" {
  if (status === "DONE") {
    return "DONE";
  }

  if (status === "TODO") {
    return "TODO";
  }

  return "IN_PROGRESS";
}

export function getTaskBgColor(status: TaskStatus) {
  switch (toWorkflowTaskStatus(status)) {
    case "TODO":
      return "var(--status-todo-soft)";
    case "IN_PROGRESS":
      return "var(--status-progress-soft)";
    case "DONE":
      return "var(--status-done-soft)";
    default:
      return "var(--color-surface)";
  }
}

export function taskStatusLabel(status: TaskStatus) {
  return {
    TODO: t("Cần làm"),
    IN_PROGRESS: t("Đang tiến hành"),
    DONE: t("Hoàn thành"),
  }[toWorkflowTaskStatus(status)];
}

export function taskStatusTone(status: TaskStatus): "todo" | "progress" | "done" {
  return {
    TODO: "todo" as const,
    IN_PROGRESS: "progress" as const,
    DONE: "done" as const,
  }[toWorkflowTaskStatus(status)];
}

export function taskPriorityLabel(priority: TaskPriority) {
  return {
    LOW: t("Thấp"),
    MEDIUM: t("Trung bình"),
    HIGH: "Cao",
    CRITICAL: t("Khẩn cấp"),
  }[priority];
}

/** Chuẩn hóa priority từ draft AI (lowercase) hoặc API (UPPERCASE). */
export function normalizeTaskPriority(
  priority: string | null | undefined,
): TaskPriority {
  const key = String(priority || "MEDIUM").toUpperCase();
  if (key === "LOW" || key === "HIGH" || key === "CRITICAL") return key;
  return "MEDIUM";
}

/**
 * Màu pill độ ưu tiên — dùng token `--priority-*`, đồng bộ Kanban / Gantt / danh sách.
 */
export function taskPriorityPillStyle(priority: string | null | undefined): {
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  const key = normalizeTaskPriority(priority).toLowerCase();
  return {
    color: `var(--priority-${key})`,
    backgroundColor: `var(--priority-${key}-soft)`,
    borderColor: "transparent",
  };
}

export function healthToneLabel(tone: HealthTone) {
  return {
    "on-track": t("Ổn định"),
    watch: t("Cần theo dõi"),
    critical: t("Rủi ro cao"),
  }[tone];
}

export function presenceLabel(status: "online" | "focus" | "offline") {
  return {
    online: t("Đang hoạt động"),
    focus: t("Đang tập trung"),
    offline: t("Ngoại tuyến"),
  }[status];
}

export function userStatusLabel(status: UserStatus) {
  return {
    ACTIVE: t("Đang hoạt động"),
    INACTIVE: t("Không hoạt động"),
  }[status];
}

export function daysUntil(date: string) {
  const target = new Date(date).getTime();
  const today = new Date("2026-06-29T12:00:00Z").getTime();
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function differenceInDays(start: string | Date, end: string | Date) {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
}

export function generateDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates: Date[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
