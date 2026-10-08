import type { DashboardTaskPreview } from "@/types";
import { t } from "@/lib/i18n";

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Ngày hiện tại theo múi giờ Việt Nam (YYYY-MM-DD). */
export function todayKey(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TIME_ZONE }).format(now);
}

function toUtcDay(dateKey: string) {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
}

/** Số ngày từ hôm nay đến `date` (âm = đã trễ). null nếu không có/không hợp lệ. */
export function daysFromToday(date?: string | null, now: Date = new Date()) {
  if (!date) return null;
  const target = toUtcDay(date);
  if (Number.isNaN(target)) return null;
  return Math.round((target - toUtcDay(todayKey(now))) / 86_400_000);
}

export function dueLabel(days: number | null) {
  if (days === null) return t("Chưa có hạn");
  if (days < 0) return t("Trễ {v0} ngày", { v0: Math.abs(days) });
  if (days === 0) return t("Hôm nay");
  if (days === 1) return t("Ngày mai");
  return t("Còn {v0} ngày", { v0: days });
}

/** Link tới project, mở đúng tab và highlight task (gantt cho waterfall, kanban cho agile). */
export function taskHref(task: DashboardTaskPreview, color: "red" | "blue" | "green") {
  if (!task.projectId) return "#";
  const tab = (task.projectType || "").toLowerCase() === "waterfall" ? "gantt" : "kanban";
  return `/projects/${task.projectId}?tab=${tab}&highlightTaskId=${task.id}&highlightColor=${color}`;
}

export function projectStatusPillClass(status: string) {
  switch ((status || "").toUpperCase()) {
    case "AT_RISK":
      return "pill-critical";
    case "COMPLETED":
      return "pill-on-track";
    case "ON_HOLD":
      return "pill-watch";
    case "PLANNING":
    case "INACTIVE":
      return "pill-neutral";
    default:
      return "pill-accent";
  }
}

export function barColorForHealth(health: "on-track" | "watch" | "critical") {
  if (health === "critical") return "var(--color-danger)";
  if (health === "watch") return "var(--color-warning)";
  return "var(--color-success)";
}

export function percentOf(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/* ───────── Màu ngữ nghĩa — mỗi ý nghĩa một màu, không dùng chung giữa các nhóm ─────────
 * Trạng thái task : xám xanh (chưa bắt đầu) · cobalt (đang làm) · xanh lá (xong)
 * Sức khỏe        : xanh lá (ổn) · hổ phách (theo dõi) · đỏ (rủi ro) — cũng là màu "quá hạn"
 * Mức ưu tiên     : thang tím đậm dần (thấp → khẩn cấp), không trùng với bất kỳ nhóm nào khác
 * Xu hướng        : cyan (tạo mới) · xanh lá (hoàn thành) · cobalt (giờ làm)
 */
export const STATUS_COLORS = {
  todo: "var(--status-todo)",
  progress: "var(--status-progress)",
  done: "var(--status-done)",
} as const;

export const HEALTH_COLORS = {
  "on-track": "var(--color-success)",
  watch: "var(--color-warning)",
  critical: "var(--color-danger)",
} as const;

export const PRIORITY_COLORS = {
  low: "#c4b5fd",
  medium: "#a78bfa",
  high: "#7c3aed",
  critical: "#4c1d95",
} as const;

export const TREND_COLORS = {
  created: "var(--chart-2)",
  completed: "var(--color-success)",
  hours: "var(--color-primary)",
} as const;

export function formatDayMonth(date: string) {
  const [, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}`;
}

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function formatDayTitle(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const weekday = t(WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]);
  return `${weekday}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}
