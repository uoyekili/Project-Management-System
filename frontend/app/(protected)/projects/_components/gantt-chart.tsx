"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  taskPriorityLabel,
  taskStatusLabel,
  toWorkflowTaskStatus,
} from "@/lib/utils/format";
import type { EnrichedTask } from "@/types";
import { LoadingState } from "@/components/loading-state";
import styles from "../styles/gantt.module.css";
import {
  GanttAssigneesCell,
  HeaderMultiFilter,
} from "./gantt-column-filters";
import {
  buildTimeline,
  dateToX,
  GANTT_SCALES,
  ganttScaleLabel,
  intervalToX,
  normalizeGanttScale,
  startOfDay,
  toIsoDate,
  type GanttScale,
} from "./gantt-scale";
import { t as tr, intlLocale } from "@/lib/i18n";

const UNASSIGNED = "__unassigned__";
const TODAY_LINE_OFFSET = 10;
const MIN_BAR_LABEL_WIDTH = 40;

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function TaskGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SignalIcon({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const bars = {
    low: [true, false, false],
    medium: [true, true, false],
    high: [true, true, true],
    critical: [true, true, true],
  };
  const activeBars = bars[level];
  const color = `var(--priority-${level})`;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "10px" }}>
      <div style={{ width: "3px", height: "4px", borderRadius: "var(--radius-sm)", backgroundColor: activeBars[0] ? color : "var(--color-border)" }} />
      <div style={{ width: "3px", height: "7px", borderRadius: "var(--radius-sm)", backgroundColor: activeBars[1] ? color : "var(--color-border)" }} />
      <div style={{ width: "3px", height: "10px", borderRadius: "var(--radius-sm)", backgroundColor: activeBars[2] ? color : "var(--color-border)" }} />
    </div>
  );
}

interface GanttChartProps {
  tasks: EnrichedTask[];
  onTaskClick?: (taskId: string) => void;
  onAddSubtask?: (parentId: string) => void;
  isLoading?: boolean;
  /** Nếu có, thanh Ngày/Tuần/Tháng được render vào phần tử này (cùng hàng với nút tạo task). */
  toolbarHost?: HTMLElement | null;
}

interface WbsNode {
  task: EnrichedTask;
  children: WbsNode[];
  level: number;
}

const MIN_NAME_COL_WIDTH = 140;
const DEFAULT_NAME_COL_WIDTH = 200;
const MAX_NAME_COL_WIDTH = 260;
const STATUS_COL_WIDTH = 128;
const PRIORITY_COL_WIDTH = 108;
const DEFAULT_ASSIGNEE_COL_WIDTH = 156;
const MAX_ASSIGNEE_COL_WIDTH = 156;
const ET_COL_WIDTH = 124;
const TIME_COL_WIDTH = 116;
const BASE_ROW_HEIGHT = 42;

function etPercent(task: EnrichedTask) {
  const estimate = task.estimateHours || 0;
  if (estimate <= 0) return 0;
  return Math.min(100, Math.round(((task.spentHours || 0) / estimate) * 100));
}

function etToneClass(status: EnrichedTask["status"]) {
  const workflow = toWorkflowTaskStatus(status);
  if (workflow === "DONE") return styles.etBarDone;
  if (workflow === "IN_PROGRESS") return styles.etBarProgress;
  return styles.etBarTodo;
}

function assigneeKey(task: EnrichedTask) {
  return task.assignee?.id || task.assigneeId || UNASSIGNED;
}

function statusPillClass(status: EnrichedTask["status"]) {
  const workflow = toWorkflowTaskStatus(status);
  if (workflow === "DONE") return styles.ganttStatusDone;
  if (workflow === "IN_PROGRESS") return styles.ganttStatusProgress;
  return styles.ganttStatusTodo;
}

function priorityPillClass(priority: EnrichedTask["priority"]) {
  switch (priority) {
    case "LOW":
      return styles.priorityLow;
    case "HIGH":
      return styles.priorityHigh;
    case "CRITICAL":
      return styles.priorityCritical;
    case "MEDIUM":
    default:
      return styles.priorityMedium;
  }
}

function getPriorityPresentation(priority: EnrichedTask["priority"]) {
  switch (priority) {
    case "LOW":
      return {
        label: taskPriorityLabel(priority),
        icon: <SignalIcon level="low" />,
        textClass: styles.textPriorityLow,
        barClass: styles.ganttBarLow,
      };
    case "HIGH":
      return {
        label: taskPriorityLabel(priority),
        icon: <SignalIcon level="high" />,
        textClass: styles.textPriorityHigh,
        barClass: styles.ganttBarHigh,
      };
    case "CRITICAL":
      return {
        label: taskPriorityLabel(priority),
        icon: <SignalIcon level="critical" />,
        textClass: styles.textPriorityCritical,
        barClass: styles.ganttBarCritical,
      };
    case "MEDIUM":
    default:
      return {
        label: taskPriorityLabel(priority),
        icon: <SignalIcon level="medium" />,
        textClass: styles.textPriorityMedium,
        barClass: styles.ganttBarMedium,
      };
  }
}

type TooltipAnchor = { task: EnrichedTask; childCount: number; x: number; rect: DOMRect };

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

function statusToneKey(status: EnrichedTask["status"]) {
  const workflow = toWorkflowTaskStatus(status);
  if (workflow === "DONE") return "done";
  if (workflow === "IN_PROGRESS") return "progress";
  return "todo";
}

function barToneClass(status: EnrichedTask["status"]) {
  const tone = statusToneKey(status);
  if (tone === "done") return styles.ganttBarDone;
  if (tone === "progress") return styles.ganttBarProgress;
  return styles.ganttBarTodo;
}

/** Số ngày còn lại / quá hạn, chỉ tính cho task chưa hoàn thành và có hạn. */
function dueHint(task: EnrichedTask) {
  if (toWorkflowTaskStatus(task.status) === "DONE" || !task.dueDate) return null;
  const today = startOfDay(new Date()).getTime();
  const diff = Math.round((startOfDay(task.dueDate).getTime() - today) / DAY_MS);
  if (diff < 0) return { overdue: true, label: tr("Quá hạn {v0} ngày", { v0: -diff }) };
  if (diff === 0) return { overdue: false, label: tr("Đến hạn hôm nay") };
  return { overdue: false, label: tr("Còn {v0} ngày", { v0: diff }) };
}

function GanttTaskTooltip({ anchor }: { anchor: TooltipAnchor }) {
  const { task, childCount, x, rect } = anchor;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; placement: "below" | "above" } | null>(null);
  const spent = task.spentHours || 0;
  const estimate = task.estimateHours || 0;
  const pct = etPercent(task);
  const due = task.dueDate || task.startDate;
  const priority = getPriorityPresentation(task.priority);
  const tone = statusToneKey(task.status);
  const hint = dueHint(task);
  const days = Math.max(1, Math.round((startOfDay(due).getTime() - startOfDay(task.startDate).getTime()) / DAY_MS) + 1);

  // Đặt tooltip bên dưới thanh task (lật lên trên nếu thiếu chỗ) để không che chính task đang hover.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 12;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const roomBelow = vh - rect.bottom - gap - margin;
    const roomAbove = rect.top - gap - margin;
    const placement = roomBelow >= height || roomBelow >= roomAbove ? "below" : "above";
    let top = placement === "below" ? rect.bottom + gap : rect.top - gap - height;
    top = Math.max(margin, Math.min(top, vh - height - margin));
    const left = Math.max(margin, Math.min(x - 28, vw - width - margin));
    setPos({ left, top, placement });
  }, [task.id, x, rect]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={styles.ganttTooltip}
      data-placement={pos?.placement}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      <div className={styles.ganttTooltipHead}>
        <span className={styles.ganttTooltipKey}>{task.key}</span>
        <p className={styles.ganttTooltipTitle}>{task.title}</p>
        <div className={styles.ganttTooltipBadges}>
          <span className={`${styles.ganttStatusPill} ${statusPillClass(task.status)}`}>
            <span
              className={`${styles.statusCircle} ${tone === "done" ? styles.circleGreen : tone === "progress" ? styles.circleBlue : styles.circleYellow}`}
            />
            <span className={styles.statusText}>{taskStatusLabel(task.status)}</span>
          </span>
          <span className={`${styles.priorityBadge} ${priorityPillClass(task.priority)}`}>
            {priority.icon}
            {priority.label}
          </span>
          {hint ? (
            <span className={`${styles.ganttTooltipHint} ${hint.overdue ? styles.ganttTooltipHintOverdue : ""}`}>
              {hint.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.ganttTooltipProgress}>
        <div className={styles.ganttTooltipProgressTop}>
          <span className={styles.ganttTooltipPct}>{estimate > 0 ? `${pct}%` : "—"}</span>
          <span className={styles.ganttTooltipHours}>
            {estimate > 0 ? (
              <>
                <strong>{spent}h</strong> / {estimate}h
              </>
            ) : (
              <>
                <strong>{spent}h</strong>  {tr("đã log")}</>
            )}
          </span>
        </div>
        <div className={styles.etBarTrack}>
          <div className={`${styles.etBarFill} ${etToneClass(task.status)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <dl className={styles.ganttTooltipMeta}>
        <div className={styles.ganttTooltipRow}>
          <dt>{tr("Người thực hiện")}</dt>
          <dd>
            <GanttAssigneesCell people={taskAssigneePeople(task)} />
          </dd>
        </div>
        <div className={styles.ganttTooltipRow}>
          <dt>{tr("Thời gian")}</dt>
          <dd>{days}  {tr("ngày")}</dd>
        </div>
        {task.sprint?.name ? (
          <div className={styles.ganttTooltipRow}>
            <dt>Sprint</dt>
            <dd>{task.sprint.name}</dd>
          </div>
        ) : null}
        {childCount > 0 ? (
          <div className={styles.ganttTooltipRow}>
            <dt>{tr("Công việc con")}</dt>
            <dd>{childCount}  {tr("công việc")}</dd>
          </div>
        ) : null}
      </dl>
    </div>,
    document.body,
  );
}

/** Viền hai bên + gutter thanh cuộn dọc của khung danh sách. */
const LEFT_PANE_CHROME_WIDTH = 12;

function taskAssigneePeople(task: EnrichedTask) {
  const list = task.assignees?.length
    ? task.assignees
    : task.assignee?.id
      ? [task.assignee]
      : [];
  return list.map((person) => ({
    name: person.name,
    userId: person.id,
    email: person.email,
    avatarUrl: person.avatarUrl,
    employeeCode: (person as { employeeCode?: string }).employeeCode,
  }));
}

export function GanttChart({ tasks, onTaskClick, onAddSubtask, isLoading = false, toolbarHost }: GanttChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightTaskId = searchParams.get("highlightTaskId");
  const highlightColor = searchParams.get("highlightColor") || "blue";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nameColWidth, setNameColWidth] = useState(DEFAULT_NAME_COL_WIDTH);
  const [assigneeColWidth, setAssigneeColWidth] = useState(DEFAULT_ASSIGNEE_COL_WIDTH);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipAnchor | null>(null);
  const [activeBarId, setActiveBarId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scale, setScale] = useState<GanttScale>("day");
  const activeScale = normalizeGanttScale(scale);
  const scaleRef = useRef<GanttScale>(activeScale);

  const fixedPaneWidth = STATUS_COL_WIDTH + PRIORITY_COL_WIDTH + assigneeColWidth + ET_COL_WIDTH + TIME_COL_WIDTH;
  const leftPaneWidth = nameColWidth + fixedPaneWidth;
  // Danh sách chỉ chiếm vừa đủ các cột (cộng viền + thanh cuộn), tối đa 58%; phần còn lại nhường cho lịch.
  const leftColumnWidth = `min(${leftPaneWidth + LEFT_PANE_CHROME_WIDTH}px, 58%)`;

  useEffect(() => {
    if (!toolbarHost) return;
    toolbarHost.style.setProperty("left", `calc(${leftColumnWidth} + 8px)`);
    return () => {
      toolbarHost.style.removeProperty("left");
    };
  }, [toolbarHost, leftColumnWidth]);

  const onResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current) return;
    const delta = e.clientX - dragState.current.startX;
    setNameColWidth(Math.max(MIN_NAME_COL_WIDTH, dragState.current.startWidth + delta));
  }, []);

  const onResizeMouseUp = useCallback(() => {
    dragState.current = null;
    document.removeEventListener("mousemove", onResizeMouseMove);
    document.removeEventListener("mouseup", onResizeMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onResizeMouseMove]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: nameColWidth };
    document.addEventListener("mousemove", onResizeMouseMove);
    document.addEventListener("mouseup", onResizeMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [nameColWidth, onResizeMouseMove, onResizeMouseUp]);

  const measureColumns = useCallback((currentTasks: EnrichedTask[]) => {
    if (currentTasks.length === 0) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bodyFont = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.font = `11px ${bodyFont}`;

    let maxNameWidth = DEFAULT_NAME_COL_WIDTH;
    let maxAssigneeWidth = DEFAULT_ASSIGNEE_COL_WIDTH;

    const getLevel = (taskId: string, tasksMap: Map<string, EnrichedTask>): number => {
      let level = 0;
      let curr = tasksMap.get(taskId);
      while (curr && curr.parentTaskId) {
        level++;
        curr = tasksMap.get(curr.parentTaskId);
      }
      return level;
    };

    const map = new Map(currentTasks.map((t) => [t.id, t]));

    currentTasks.forEach((task) => {
      const level = getLevel(task.id, map);
      const indent = level * 18;
      const iconWidth = 24;
      ctx.font = `11px ${bodyFont}`;
      const measuredName = ctx.measureText(task.title).width + indent + iconWidth + 32;
      if (measuredName > maxNameWidth) maxNameWidth = measuredName;

      const assigneeName = task.assignee?.name || tr("Chưa giao");
      const assigneeCode = task.assignee?.employeeCode || "";
      ctx.font = `11px ${bodyFont}`;
      const nameWidth = ctx.measureText(assigneeName).width;
      ctx.font = `9px ${bodyFont}`;
      const codeWidth = assigneeCode ? ctx.measureText(assigneeCode).width : 0;
      const measuredAssignee = Math.max(nameWidth, codeWidth) + 22 + 8 + 16;
      if (measuredAssignee > maxAssigneeWidth) maxAssigneeWidth = measuredAssignee;
    });

    setNameColWidth(Math.ceil(Math.min(maxNameWidth, MAX_NAME_COL_WIDTH)));
    setAssigneeColWidth(Math.ceil(Math.min(maxAssigneeWidth, MAX_ASSIGNEE_COL_WIDTH)));
  }, []);

  useEffect(() => {
    measureColumns(tasks);
  }, [tasks, measureColumns]);

  const onResizeDblClick = useCallback(() => {
    measureColumns(tasks);
  }, [tasks, measureColumns]);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => toWorkflowTaskStatus(task.status)))).map((status) => ({
        value: status,
        label: taskStatusLabel(status),
      })),
    [tasks],
  );

  const priorityOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => task.priority))).map((priority) => ({
        value: priority,
        label: taskPriorityLabel(priority),
      })),
    [tasks],
  );

  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, { label: string; person?: { name: string; employeeCode?: string; userId?: string; email?: string; avatarUrl?: string } | null }>();
    tasks.forEach((task) => {
      const key = assigneeKey(task);
      if (!seen.has(key)) {
        const assignee = task.assignee;
        seen.set(key, {
          label: assignee?.name || tr("Chưa giao"),
          person: assignee?.id
            ? {
                name: assignee.name,
                employeeCode: assignee.employeeCode,
                userId: assignee.id,
                email: assignee.email,
                avatarUrl: assignee.avatarUrl,
              }
            : null,
        });
      }
    });
    return Array.from(seen.entries())
      .map(([value, item]) => ({ value, label: item.label, person: item.person }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [tasks]);

  const rootNodes = useMemo(() => {
    const taskMap = new Map<string, WbsNode>();
    const roots: WbsNode[] = [];

    tasks.forEach((task) => {
      taskMap.set(task.id, { task, children: [], level: 0 });
    });

    tasks.forEach((task) => {
      const node = taskMap.get(task.id);
      if (node) {
        if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
          taskMap.get(task.parentTaskId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    function setLevels(nodes: WbsNode[], currentLevel: number) {
      nodes.forEach((node) => {
        node.level = currentLevel;
        setLevels(node.children, currentLevel + 1);
      });
    }
    setLevels(roots, 0);
    return roots;
  }, [tasks]);

  const filtersActive =
    statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    assigneeFilter.length > 0;

  const clearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setAssigneeFilter([]);
  }, []);

  const taskMatches = useCallback(
    (task: EnrichedTask) => {
      if (statusFilter.length > 0 && !statusFilter.includes(toWorkflowTaskStatus(task.status))) {
        return false;
      }
      if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
        return false;
      }
      if (assigneeFilter.length > 0 && !assigneeFilter.includes(assigneeKey(task))) {
        return false;
      }
      return true;
    },
    [assigneeFilter, priorityFilter, statusFilter],
  );

  const filteredNodes = useMemo(() => {
    function filterTree(nodes: WbsNode[]): WbsNode[] {
      const next: WbsNode[] = [];
      nodes.forEach((node) => {
        const children = filterTree(node.children);
        if (taskMatches(node.task) || children.length > 0) {
          next.push({ ...node, children });
        }
      });
      return next;
    }
    return filtersActive ? filterTree(rootNodes) : rootNodes;
  }, [filtersActive, rootNodes, taskMatches]);

  const visibleRows = useMemo(() => {
    const rows: WbsNode[] = [];
    function walk(nodes: WbsNode[]) {
      nodes.forEach((node) => {
        rows.push(node);
        const isExpanded = filtersActive || expanded[node.task.id] !== false;
        if (isExpanded && node.children.length > 0) {
          walk(node.children);
        }
      });
    }
    walk(filteredNodes);
    return rows;
  }, [expanded, filteredNodes, filtersActive]);

  const timeline = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    tasks.forEach((task) => {
      const start = task.startDate ? new Date(task.startDate).getTime() : NaN;
      const end = task.dueDate ? new Date(task.dueDate).getTime() : (isNaN(start) ? NaN : start);
      if (!isNaN(start) && start < min) min = start;
      if (!isNaN(end) && end > max) max = end;
    });

    if (min === Infinity || max === -Infinity) {
      min = Date.now();
      max = Date.now();
    }

    const minDate = new Date(min);
    minDate.setDate(minDate.getDate() - 15);
    const maxDate = new Date(max);
    if (activeScale === "month") {
      maxDate.setMonth(maxDate.getMonth() + 6);
    } else if (activeScale === "week") {
      maxDate.setDate(maxDate.getDate() + 90);
    } else {
      maxDate.setDate(maxDate.getDate() + 180);
    }

    return buildTimeline(toIsoDate(minDate), toIsoDate(maxDate), activeScale);
  }, [activeScale, tasks]);

  const todayOffset = useMemo(() => {
    if (!timeline.columns.length) return null;
    const x = dateToX(todayStr, timeline);
    if (x < 0 || x > timeline.width) return null;
    return x + TODAY_LINE_OFFSET;
  }, [timeline, todayStr]);

  const scrollTodayIntoView = useCallback((smooth = false) => {
    const pane = rightPaneRef.current;
    if (!pane || todayOffset === null) return;
    const viewportWidth = pane.clientWidth;
    if (viewportWidth <= 0) return;
    const maxScroll = Math.max(0, pane.scrollWidth - viewportWidth);
    const next = Math.max(0, Math.min(maxScroll, todayOffset - viewportWidth / 2));
    if (smooth) {
      pane.scrollTo({ left: next, behavior: "smooth" });
      return;
    }
    pane.scrollLeft = next;
  }, [todayOffset]);

  useLayoutEffect(() => {
    const scaleChanged = scaleRef.current !== activeScale;
    scaleRef.current = activeScale;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) scrollTodayIntoView(scaleChanged);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [activeScale, scrollTodayIntoView, timeline.width, tasks.length]);

  useEffect(() => {
    if (isLoading) return;
    const pane = rightPaneRef.current;
    if (!pane) return;

    const observer = new ResizeObserver(() => {
      scrollTodayIntoView();
    });
    observer.observe(pane);
    const handleResize = () => scrollTodayIntoView(true);
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isLoading, scrollTodayIntoView]);

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  };

  const handleRowClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    } else {
      router.push(`/tasks/${taskId}`);
    }
  };

  const showTooltip = (node: WbsNode, event: React.MouseEvent<HTMLElement>) => {
    setActiveBarId(node.task.id);
    setTooltip({
      task: node.task,
      childCount: node.children.length,
      x: event.clientX,
      rect: event.currentTarget.getBoundingClientRect(),
    });
  };

  const showTooltipForFocus = (node: WbsNode, event: React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveBarId(node.task.id);
    setTooltip({ task: node.task, childCount: node.children.length, x: rect.left + 28, rect });
  };

  const hideTooltip = () => {
    setTooltip(null);
    setActiveBarId(null);
  };

  const onRowEnter = useCallback((taskId: string) => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    setHoveredRowId(String(taskId));
  }, []);

  const onRowLeave = useCallback((taskId: string) => {
    hoverLeaveTimer.current = setTimeout(() => {
      setHoveredRowId((current) => (current === String(taskId) ? null : current));
    }, 60);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (highlightTaskId) {
      setTimeout(() => {
        const pane = leftPaneRef.current;
        const el = document.getElementById(`gantt-row-${highlightTaskId}`);
        if (pane && el) {
          const paneRect = pane.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const delta = elRect.top - paneRect.top - pane.clientHeight / 2 + elRect.height / 2;
          pane.scrollTo({ top: pane.scrollTop + delta, behavior: "smooth" });
        }
      }, 500);

      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("highlightTaskId");
        url.searchParams.delete("highlightColor");
        window.history.replaceState({}, "", url.pathname + url.search);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [highlightTaskId, expanded]);

  if (isLoading) {
    return <LoadingState variant="gantt" />;
  }

  if (tasks.length === 0) {
    return (
      <div className={styles.ganttContainer} style={{ padding: "2rem", textAlign: "center" }}>
        {tr("Chưa có nhiệm vụ nào.")}</div>
    );
  }

  const renderLeftRow = (node: WbsNode) => {
    const isExpanded = filtersActive || expanded[node.task.id] !== false;
    const hasChildren = node.children.length > 0;
    const isRoot = node.level === 0;
    const priorityPresentation = getPriorityPresentation(node.task.priority);
    const spent = node.task.spentHours || 0;
    const estimate = node.task.estimateHours || 0;
    const pct = etPercent(node.task);
    const isHovered = String(hoveredRowId) === String(node.task.id);

    let circleClass = styles.circleYellow;
    const stateText = taskStatusLabel(node.task.status);
    if (node.task.status === "DONE") {
      circleClass = styles.circleGreen;
    } else if (node.task.status === "IN_PROGRESS") {
      circleClass = styles.circleBlue;
    }

    return (
      <div
        key={node.task.id}
        id={`gantt-row-${node.task.id}`}
        className={`${styles.ganttRow} ${isRoot ? styles.ganttRowRoot : styles.ganttRowChild} ${node.level >= 2 ? styles.ganttRowNested : ""} ${isHovered ? styles.ganttRowHovered : ""} ${String(node.task.id) === String(highlightTaskId) ? (highlightColor === "red" ? styles.flashHighlightRed : highlightColor === "green" ? styles.flashHighlightGreen : styles.flashHighlightBlue) : ""}`}
        style={{ height: BASE_ROW_HEIGHT }}
        data-gantt-row={node.task.id}
        onMouseEnter={() => onRowEnter(node.task.id)}
        onMouseLeave={() => onRowLeave(node.task.id)}
      >
        <div className={styles.ganttLeftCell} style={{ width: `${leftPaneWidth}px` }}>
          <div className={styles.ganttLeftCol} style={{ width: `${nameColWidth}px` }}>
            {node.level > 0 ? (
              <div style={{ width: `${node.level * 18}px`, flexShrink: 0 }} />
            ) : null}
            {hasChildren ? (
              <button
                type="button"
                className={`${styles.taskTypeIcon} ${styles.taskTypeFolder}`}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? tr("Thu gọn công việc con") : tr("Mở rộng công việc con")}
                onClick={(e) => toggleExpand(node.task.id, e)}
              >
                <FolderIcon open={isExpanded} />
              </button>
            ) : (
              <span className={`${styles.taskTypeIcon} ${styles.taskTypeLeaf}`}>
                <TaskGlyph />
              </span>
            )}
            <button
              type="button"
              className={styles.taskName}
              onClick={() => handleRowClick(node.task.id)}
            >
              {node.task.title}
            </button>
            {onAddSubtask ? (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddSubtask(node.task.id);
                }}
                title={tr("Tạo subtask")}
                style={{ marginLeft: "auto" }}
              >
                +
              </button>
            ) : null}
          </div>
          <div className={styles.ganttLeftCol} style={{ width: `${TIME_COL_WIDTH}px` }}>
            <div className={styles.ganttTimeCell}>
              <span>{new Date(node.task.startDate).toLocaleDateString(intlLocale(), dateFmt)}</span>
              <span>{new Date(node.task.dueDate || node.task.startDate).toLocaleDateString(intlLocale(), dateFmt)}</span>
            </div>
          </div>
          <div className={styles.ganttLeftCol} style={{ width: `${ET_COL_WIDTH}px` }}>
            <div
              className={`${styles.etInline} ${barToneClass(node.task.status)}`}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${spent}h / ${estimate}h`}
            >
              <span className={styles.etInlineFill} style={{ width: `${pct}%` }} />
              <span className={styles.etInlineText}>
                {spent} / {estimate}
              </span>
            </div>
          </div>
          <div className={`${styles.ganttLeftCol} ${styles.ganttAssigneeCol}`} style={{ width: `${assigneeColWidth}px` }}>
            <GanttAssigneesCell people={taskAssigneePeople(node.task)} />
          </div>
          <div className={`${styles.ganttLeftCol} ${styles.priorityCol}`} style={{ width: `${PRIORITY_COL_WIDTH}px` }}>
            <span className={`${styles.priorityBadge} ${priorityPillClass(node.task.priority)}`}>
              {priorityPresentation.icon}
              {priorityPresentation.label}
            </span>
          </div>
          <div className={`${styles.ganttLeftCol} ${styles.statusCol}`} style={{ width: `${STATUS_COL_WIDTH}px` }}>
            <span className={`${styles.ganttStatusPill} ${statusPillClass(node.task.status)}`}>
              <span className={`${styles.statusCircle} ${circleClass}`} />
              <span className={styles.statusText}>{stateText}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderRightRow = (node: WbsNode) => {
    const hasChildren = node.children.length > 0;
    const isRoot = node.level === 0;
    const effectiveDueDate = node.task.dueDate || node.task.startDate;
    const priorityPresentation = getPriorityPresentation(node.task.priority);
    const isLeaf = !hasChildren;
    
    const geometry = intervalToX(node.task.startDate, effectiveDueDate, timeline);
    const showSummaryBar = hasChildren;
    const isHovered = String(hoveredRowId) === String(node.task.id);
    const isActive = isHovered || activeBarId === node.task.id;

    return (
      <div
        key={node.task.id}
        className={`${styles.ganttRow} ${isRoot ? styles.ganttRowRoot : styles.ganttRowChild} ${node.level >= 2 ? styles.ganttRowNested : ""} ${isHovered ? styles.ganttRowHovered : ""}`}
        style={{ height: BASE_ROW_HEIGHT }}
        data-gantt-row={node.task.id}
        onMouseEnter={() => onRowEnter(node.task.id)}
        onMouseLeave={() => onRowLeave(node.task.id)}
      >
        <div
          className={styles.ganttRightCell}
          style={{
            width: `${timeline.width}px`,
            minWidth: `${timeline.width}px`,
          }}
        >
          {showSummaryBar ? (
            <div
              className={`${styles.ganttEpicBar} ${isActive ? styles.ganttBarActive : ""}`}
              style={{
                left: geometry.left,
                width: geometry.width,
                top: 6,
              }}
              tabIndex={0}
              aria-label={`${node.task.title}: ${etPercent(node.task)}%`}
              onMouseEnter={(event) => showTooltip(node, event)}
              onMouseMove={(event) => showTooltip(node, event)}
              onMouseLeave={hideTooltip}
              onFocus={(event) => showTooltipForFocus(node, event)}
              onBlur={hideTooltip}
            >
              <div className={styles.ganttEpicProgress} style={{ width: `${etPercent(node.task)}%` }} />
              {geometry.width >= MIN_BAR_LABEL_WIDTH ? (
                <span className={styles.ganttEpicLabel}>{node.task.title}</span>
              ) : null}
              <div className={styles.ganttEpicCap} data-side="left" />
              <div className={styles.ganttEpicCap} data-side="right" />
            </div>
          ) : null}

          {isLeaf ? (
            <>
              <div
                className={`${styles.ganttBar} ${priorityPresentation.barClass} ${barToneClass(node.task.status)} ${isActive ? styles.ganttBarActive : ""}`}
                style={{
                  left: geometry.left,
                  width: geometry.width,
                  top: 12,
                }}
                tabIndex={0}
                aria-label={`${node.task.title}: ${etPercent(node.task)}%`}
                onMouseEnter={(event) => showTooltip(node, event)}
                onMouseMove={(event) => showTooltip(node, event)}
                onMouseLeave={hideTooltip}
                onFocus={(event) => showTooltipForFocus(node, event)}
                onBlur={hideTooltip}
              >
                <span className={styles.ganttBarFill} style={{ width: `${etPercent(node.task)}%` }} />
                {geometry.width >= MIN_BAR_LABEL_WIDTH ? (
                  <span className={styles.ganttBarLabel}>{node.task.title}</span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const toolbarControls = (
    <div
      className={styles.ganttToolbar}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {filtersActive ? (
        <div className={styles.ganttClearWrap}>
        <button
          type="button"
          className={styles.ganttClearFilters}
          onClick={clearAllFilters}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13.013 3H2l8 9.06v7L18 21v-8.94l1.627-1.838" />
            <path d="m16 16 5 5" />
            <path d="m21 16-5 5" />
          </svg>
          {tr("Xóa bộ lọc")}</button>
        </div>
      ) : null}
          <div className={styles.ganttHeaderControls}>
            <div className={styles.ganttScaleToggle} role="group" aria-label={tr("Chế độ xem thời gian")}>
              {GANTT_SCALES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.ganttScaleButton} ${activeScale === item ? styles.ganttScaleButtonActive : ""}`}
                  aria-pressed={activeScale === item}
                  onClick={() => setScale(item)}
                >
                  {ganttScaleLabel(item)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.ganttTodayBtn}
              title={tr("Về hôm nay")}
              onClick={() => scrollTodayIntoView(true)}
            >
              <span className={styles.ganttTodayDot} aria-hidden />
              {tr("Hôm nay")}</button>
          </div>
    </div>
  );
  const toolbar = toolbarHost ? (
    createPortal(toolbarControls, toolbarHost)
  ) : (
    <div className={styles.ganttChrome}>{toolbarControls}</div>
  );

  return (
    <div className={styles.ganttContainer} style={{ flex: 1, width: "100%", height: "100%" }}>
      {toolbar}
      <div className={styles.ganttSplit} style={{ gridTemplateColumns: `${leftColumnWidth} minmax(0, 1fr)` }}>
        <div className={styles.ganttLeftPane}>
          <div className={styles.ganttLeftScroll} ref={leftPaneRef}>
          <div className={styles.ganttLeftInner} style={{ width: leftPaneWidth }}>
            <div className={styles.ganttLeftHeader} style={{ width: leftPaneWidth }}>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${nameColWidth}px`, position: "relative" }}>
                <span className={styles.ganttHeaderLabel}>{tr("Tên công việc")}</span>
                <div
                  className={styles.colResizeHandle}
                  onMouseDown={onResizeMouseDown}
                  onDoubleClick={onResizeDblClick}
                  title={tr("Kéo để thay đổi kích thước. Double-click để tự khớp.")}
                />
              </div>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${TIME_COL_WIDTH}px` }}>
                <span className={styles.ganttHeaderLabel}>{tr("Thời gian")}</span>
              </div>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${ET_COL_WIDTH}px` }}>
                <span className={styles.ganttHeaderLabel}>{tr("Tiến độ")}</span>
              </div>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${assigneeColWidth}px` }}>
                <span className={styles.ganttHeaderLabel}>{tr("Người thực hiện")}</span>
                <HeaderMultiFilter
                  label={tr("Lọc người thực hiện")}
                  options={assigneeOptions}
                  value={assigneeFilter}
                  onChange={setAssigneeFilter}
                  searchable
                  searchPlaceholder={tr("Tìm theo tên hoặc mã nhân viên...")}
                  minWidth={360}
                />
              </div>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${PRIORITY_COL_WIDTH}px` }}>
                <span className={styles.ganttHeaderLabel}>{tr("Ưu tiên")}</span>
                <HeaderMultiFilter
                  label={tr("Lọc ưu tiên")}
                  options={priorityOptions}
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  minWidth={216}
                />
              </div>
              <div className={styles.ganttLeftHeaderCell} style={{ width: `${STATUS_COL_WIDTH}px` }}>
                <span className={styles.ganttHeaderLabel}>{tr("Trạng thái")}</span>
                <HeaderMultiFilter
                  label={tr("Lọc trạng thái")}
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  minWidth={216}
                />
              </div>
            </div>

            <div className={styles.ganttBody}>
              {visibleRows.length === 0 ? (
                <div className={styles.ganttEmptyFilter}>{tr("Không có công việc phù hợp bộ lọc.")}</div>
              ) : (
                visibleRows.map(renderLeftRow)
              )}
            </div>
          </div>
          </div>
        </div>

        <div className={styles.ganttRightPane}>
          <div className={styles.ganttRightScroll} ref={rightPaneRef}>
          <div className={styles.ganttRightInner} style={{ width: timeline.width, minWidth: timeline.width }}>
            <div
              className={styles.ganttRightHeader}
              style={{ width: `${timeline.width}px`, minWidth: `${timeline.width}px` }}
            >
              <div className={styles.ganttRightHeaderTop}>
                {timeline.bands.map((band, i) => (
                  <div key={`${band.label}-${i}`} className={styles.ganttMonthHeader} style={{ left: band.offset, width: band.width }}>
                    {band.label}
                  </div>
                ))}
              </div>
              <div className={styles.ganttRightHeaderBottom}>
                {timeline.columns.map((column, i) => (
                  <div
                    key={i}
                    className={styles.ganttDayHeader}
                    style={{ left: column.offset, width: column.width }}
                    title={column.title}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
            </div>

            {todayOffset !== null ? (
              <div className={styles.todayLine} style={{ left: todayOffset }} />
            ) : null}

            <div className={styles.ganttBody}>
              <div className={`${styles.ganttBodyRows} ${activeBarId ? styles.ganttBodyRowsFocus : ""}`}>
                <div className={styles.ganttGridLines} style={{ width: `${timeline.width}px` }}>
                  {timeline.columns.map((column, i) => (
                    <div key={i} className={styles.ganttGridLine} style={{ left: column.offset }} />
                  ))}
                </div>
                {visibleRows.map(renderRightRow)}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {tooltip ? <GanttTaskTooltip anchor={tooltip} /> : null}
    </div>
  );
}
