import { useToast } from "@/components/toast";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { taskApi, sprintApi } from "@/services/api";
import { EnrichedTask, Sprint } from "@/types";
import { TaskPriorityBadge } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { LoadingState } from "@/components/loading-state";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { useBacklogCollapsed } from "@/hooks/use-backlog-collapsed";
import { toWorkflowTaskStatus } from "@/lib/utils/format";
import styles from "./project-kanban-board.module.css";
import { intlLocale, t as tr } from "@/lib/i18n";

interface ProjectKanbanBoardProps {
  tasks: EnrichedTask[];
  sprints?: Sprint[];
  selectedSprintId?: string | null;
  viewerId: string;
  onTaskUpdated: () => void;
  onTaskClick: (taskId: string) => void;
  onSelectedSprintIdChange?: (sprintId: string | null) => void;
  onSprintUpdated?: () => void;
  onEditSprint?: (sprintId: string) => void;
  isLoading?: boolean;
}

const KANBAN_COLUMNS = [
  { id: "TODO", label: "Cần làm" },
  { id: "IN_PROGRESS", label: "Đang tiến hành" },
  { id: "DONE", label: "Đã hoàn thành" },
];

// Helper to extract clean base topic from task title for grouping related tasks
function getTaskTopic(title: string): string {
  let clean = title.replace(/^\[(Epic|Feature|Bug|Task)\]\s*/i, "");
  clean = clean.replace(/^(US|Task|Feature|Bug|Technical debt):\s*/i, "");
  clean = clean.replace(/(\s*-\s*Part\s*\d+|\s*Part\s*\d+|\s*Phần\s*\d+|\s*#\d+)/i, "");
  return clean.trim().toLowerCase();
}

const PRIORITY_WEIGHT: Record<string, number> = {
  "CRITICAL": 4,
  "HIGH": 3,
  "MEDIUM": 2,
  "LOW": 1,
};

function normalizeSprintStatus(status?: string) {
  const normalized = status?.trim().toUpperCase();

  if (normalized === "PLANNED" || normalized === "PLANNING") {
    return "PLANNED";
  }

  if (normalized === "ACTIVE") {
    return "ACTIVE";
  }

  if (normalized === "CLOSED" || normalized === "DONE" || normalized === "COMPLETED") {
    return "CLOSED";
  }

  return normalized ?? "";
}

/** Backlog: ưu tiên cao trước, cùng mức thì gom theo chủ đề rồi theo tên. Kanban không có task cha/con. */
/** Backlog phẳng: ưu tiên cao trước, cùng ưu tiên thì gom theo chủ đề rồi theo tên. */
function sortBacklogTasks(tasks: EnrichedTask[]): EnrichedTask[] {
  return [...tasks].sort((a, b) => {
    const weightA = PRIORITY_WEIGHT[a.priority] || 0;
    const weightB = PRIORITY_WEIGHT[b.priority] || 0;
    if (weightA !== weightB) return weightB - weightA;

    const topicA = getTaskTopic(a.title);
    const topicB = getTaskTopic(b.title);
    if (topicA !== topicB) return topicA.localeCompare(topicB, "vi", { sensitivity: "base" });
    return a.title.localeCompare(b.title, "vi", { numeric: true, sensitivity: "base" });
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(intlLocale(), { day: "2-digit", month: "2-digit" });
}

function daysUntil(value: string) {
  const end = new Date(value);
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay.getTime() - startOfToday().getTime()) / 86_400_000);
}

export function ProjectKanbanBoard({
  tasks,
  sprints,
  selectedSprintId: selectedSprintIdProp,
  viewerId,
  onTaskUpdated,
  onTaskClick,
  onSelectedSprintIdChange,
  onSprintUpdated,
  onEditSprint,
  isLoading = false,
}: ProjectKanbanBoardProps) {
  const { confirm } = useConfirmDialog();
  const showToast = useToast();
  const { collapsed: isBacklogCollapsed, toggle: toggleBacklog } = useBacklogCollapsed();
  const searchParams = useSearchParams();
  const highlightTaskId = searchParams.get("highlightTaskId");
  const highlightColor = searchParams.get("highlightColor") || "green";
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [localTasks, setLocalTasks] = useState<EnrichedTask[]>(tasks);
  const setErrorMessage = (message: string) => showToast(message, { tone: "danger", duration: 5000 });

  useEffect(() => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const weightA = PRIORITY_WEIGHT[a.priority] || 0;
      const weightB = PRIORITY_WEIGHT[b.priority] || 0;
      if (weightA !== weightB) {
        return weightB - weightA; // Higher priority first
      }
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(); // Newer activity first as secondary
    });
    setLocalTasks(sortedTasks);
  }, [tasks]);
  const selectedSprintId = selectedSprintIdProp ?? null;

  useEffect(() => {
    if (!highlightTaskId || localTasks.length === 0) return;

    const highlighted = localTasks.find((task) => String(task.id) === String(highlightTaskId));
    if (highlighted?.sprintId && selectedSprintId !== String(highlighted.sprintId)) {
      onSelectedSprintIdChange?.(String(highlighted.sprintId));
    }

    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`kanban-task-${highlightTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);

    const clearTimer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("highlightTaskId");
      url.searchParams.delete("highlightColor");
      window.history.replaceState({}, "", url.pathname + url.search);
    }, 5000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightTaskId, localTasks, onSelectedSprintIdChange, selectedSprintId]);

  useEffect(() => {
    if (!selectedSprintId && sprints && sprints.length > 0) {
      const active = sprints.find((s) => normalizeSprintStatus(s.status) === "ACTIVE");
      const nextSprintId = active ? String(active.id) : String(sprints[0].id);
      onSelectedSprintIdChange?.(nextSprintId);
    }
  }, [onSelectedSprintIdChange, selectedSprintId, sprints]);

  const selectedSprint = sprints?.find((s) => String(s.id) === selectedSprintId);
  const selectedSprintStatus = normalizeSprintStatus(selectedSprint?.status);
  
  const handleUpdateSprintStatus = async (status: "ACTIVE" | "CLOSED") => {
    if (!selectedSprint) return;
    try {
      await sprintApi.update(String(selectedSprint.id), { status });
      if (onSprintUpdated) {
        onSprintUpdated();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : tr("Lỗi cập nhật Sprint"));
    }
  };
  
  // Kanban tasks: belong to selected sprint
  const kanbanTasks = selectedSprint ? localTasks.filter((t) => String(t.sprintId) === String(selectedSprint.id)) : [];
  


  // Backlog tasks: don't belong to ANY sprint (strict backlog)
  const rawBacklogTasks = useMemo(() => localTasks.filter((t) => !t.sprintId), [localTasks]);
  const backlogTasks = useMemo(() => sortBacklogTasks(rawBacklogTasks), [rawBacklogTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    if (selectedSprint && selectedSprintStatus !== "ACTIVE") {
      showToast(
        selectedSprintStatus === "CLOSED"
          ? tr("Sprint này đã đóng. Chỉ backlog mới có thể tiếp tục nhận task chưa hoàn thành.")
          : tr("Sprint này chưa được bắt đầu. Bạn không thể kéo thả task vào bảng Kanban."),
        { tone: "warning", duration: 4500 },
      );
    }
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    
    // Force the browser to use only this specific card as the ghost image
    if (e.currentTarget instanceof Element) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
    
    // Defer state update to allow browser to capture drag ghost
    setTimeout(() => {
      setDraggedTaskId(taskId);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (colId !== "BACKLOG" && selectedSprintStatus !== "ACTIVE") {
      e.dataTransfer.dropEffect = "none";
      if (dragOverColumn === colId) setDragOverColumn(null);
      return;
    }
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTaskId) return;

    const task = localTasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task) return;

    try {
      if (targetId === "BACKLOG") {
        // Move to backlog
        if (task.sprintId) {
          setLocalTasks(prev => {
            const filtered = prev.filter(t => t.id !== task.id);
            return [...filtered, { ...task, sprintId: null, status: "TODO", assigneeId: "" }];
          });
          await taskApi.update(task.id, { sprintId: null, status: "TODO" });
          await taskApi.updateAssignee(task.id, "");
          onTaskUpdated();
        }
      } else {
        // Move to kanban column
        if (!selectedSprint) {
          setErrorMessage(tr("Vui lòng chọn một Sprint trước khi kéo task vào Kanban board!"));
          return;
        }
        if (selectedSprintStatus !== "ACTIVE") {
          setErrorMessage(tr("Chỉ có thể kéo task vào Kanban board khi Sprint đang ở trạng thái Active!"));
          return;
        }
        
        const newStatus = targetId as EnrichedTask["status"];
        if (String(task.sprintId) !== String(selectedSprint.id) || toWorkflowTaskStatus(task.status) !== targetId) {
          setLocalTasks(prev => {
            const filtered = prev.filter(t => t.id !== task.id);
            const updatedTask = { ...task, sprintId: String(selectedSprint.id), status: newStatus };
            if (viewerId) {
              updatedTask.assigneeId = viewerId;
              updatedTask.assignee = { 
                ...(task.assignee || {}),
                id: viewerId, 
                name: task.assignee?.name || tr("Bạn"),
                email: task.assignee?.email || "",
                role: task.assignee?.role || "MEMBER",
                roles: task.assignee?.roles || ["MEMBER"],
                title: task.assignee?.title || "",
                initials: task.assignee?.initials || "B",
                presence: task.assignee?.presence || "online",
                capacityHours: task.assignee?.capacityHours || 40,
                workloadHours: task.assignee?.workloadHours || 0,
                focusScore: task.assignee?.focusScore || 100,
                isActive: task.assignee?.isActive ?? true,
                status: task.assignee?.status || "ACTIVE",
              };
            }
            return [...filtered, updatedTask];
          });
          
          await taskApi.update(task.id, { sprintId: String(selectedSprint.id), status: newStatus });
          if (viewerId) {
            await taskApi.updateAssignee(task.id, viewerId);
          }
          onTaskUpdated();
        }
      }
    } catch (err: unknown) {
      setLocalTasks(tasks); // Revert on error
      setErrorMessage(err instanceof Error ? err.message : tr("Lỗi khi di chuyển task"));
    }
  };

  const renderTaskCard = (task: EnrichedTask, isBacklog = false) => {
    const isOverdue =
      Boolean(task.dueDate) && daysUntil(task.dueDate) < 0 && toWorkflowTaskStatus(task.status) !== "DONE";
    const highlightClass =
      highlightTaskId === String(task.id)
        ? highlightColor === "red"
          ? styles.highlightFlashRed
          : styles.highlightFlash
        : "";

    return (
      <div
        key={task.id}
        id={`kanban-task-${task.id}`}
        draggable
        tabIndex={0}
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onTaskClick(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onTaskClick(task.id);
        }}
        className={`${styles.card} ${draggedTaskId === task.id ? styles.dragging : ""} ${highlightClass}`}
      >
        <div className={styles.cardHead}>
          <span className={styles.taskKey}>{task.key}</span>
          <TaskPriorityBadge priority={task.priority} />
        </div>

        <div className={styles.taskTitle}>{task.title}</div>

        {(!isBacklog || task.dueDate) && (
          <div className={styles.cardFoot}>
            {!isBacklog ? (
              task.assignee ? (
                <div className={styles.assignee}>
                  <UserAvatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={20} />
                  <span>{task.assignee.name}</span>
                </div>
              ) : (
                <div className={`${styles.assignee} ${styles.unassigned}`}>
                  <span>{tr("Chưa giao")}</span>
                </div>
              )
            ) : (
              <span />
            )}
            {task.dueDate ? (
              <span className={`${styles.dueDate} ${isOverdue ? styles.overdue : ""}`} title={tr("Hạn chót")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
                {formatShortDate(task.dueDate)}
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const sprintStatusLabel = (status: string) =>
    status === "ACTIVE" ? tr("Đang chạy") : status === "PLANNED" ? tr("Chưa bắt đầu") : tr("Đã đóng");

  const sprintDaysLeft =
    selectedSprint && selectedSprintStatus === "ACTIVE" && selectedSprint.plannedEnd
      ? daysUntil(selectedSprint.plannedEnd)
      : null;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <LoadingState variant="cards" />
      </div>
    );
  }

  const canDropInSprint = selectedSprintStatus === "ACTIVE";

  return (
    <div className={`${styles.container} ${draggedTaskId ? styles.isDragging : ""}`}>
      {sprints && sprints.length > 0 ? (
        <div className={styles.toolbar}>
          <div className={styles.sprintPicker}>
            <FilterSelect
              value={selectedSprintId || ""}
              onChange={(val) => onSelectedSprintIdChange?.(val)}
              menuMinWidth={360}
              searchable
              searchPlaceholder={tr("Tìm Sprint...")}
              options={sprints.map((s): FilterOption => {
                const status = normalizeSprintStatus(s.status);
                return {
                  value: String(s.id),
                  label: s.name,
                  tag:
                    status === "ACTIVE"
                      ? { label: sprintStatusLabel(status), tone: "success" }
                      : status === "PLANNED"
                        ? { label: sprintStatusLabel(status), tone: "warning" }
                        : { label: sprintStatusLabel(status), tone: "neutral" },
                };
              })}
              placeholder={tr("-- Chọn Sprint --")}
            />
          </div>

          {selectedSprint ? (
            <>
              <div className={styles.sprintMeta}>
                {selectedSprint.plannedStart || selectedSprint.plannedEnd ? (
                  <span>
                    {selectedSprint.plannedStart ? formatShortDate(selectedSprint.plannedStart) : "—"}
                    {" – "}
                    {selectedSprint.plannedEnd ? formatShortDate(selectedSprint.plannedEnd) : "—"}
                  </span>
                ) : null}
                {sprintDaysLeft !== null ? (
                  <span className={sprintDaysLeft < 0 ? styles.overdue : undefined}>
                    {sprintDaysLeft < 0
                      ? tr("Quá hạn {v0} ngày", { v0: Math.abs(sprintDaysLeft) })
                      : tr("Còn {v0} ngày", { v0: sprintDaysLeft })}
                  </span>
                ) : null}
              </div>

              <div className={styles.sprintActions}>
                {selectedSprintStatus === "PLANNED" ? (
                  <button
                    type="button"
                    className="action-button action-button-add"
                    onClick={() => handleUpdateSprintStatus("ACTIVE")}
                  >
                    {tr("Bắt đầu Sprint")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`danger-button ${styles.endSprintButton}`}
                  disabled={selectedSprintStatus !== "ACTIVE"}
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: tr("Kết thúc Sprint"),
                      message: tr("Bạn có chắc muốn hoàn thành Sprint này?"),
                      confirmLabel: tr("Kết thúc"),
                      tone: "danger",
                    });
                    if (confirmed) {
                      handleUpdateSprintStatus("CLOSED");
                    }
                  }}
                >
                  {tr("Kết thúc Sprint")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!selectedSprint && sprints !== undefined && sprints.length === 0 ? (
        <div className={styles.notice}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{tr("Dự án chưa có Sprint nào. Bạn có thể sử dụng nút Tạo Sprint mới ở góc phải để bắt đầu.")}</span>
        </div>
      ) : null}

      <div className={styles.layout}>
        {/* Backlog */}
        <aside
          className={`${styles.backlog} ${isBacklogCollapsed ? styles.backlogCollapsed : ""} ${dragOverColumn === "BACKLOG" ? styles.dragOver : ""}`}
          onDragOver={(e) => handleDragOver(e, "BACKLOG")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "BACKLOG")}
        >
          <div className={styles.columnHeader}>
            <h3 className={styles.columnTitle}>Backlog</h3>
            <div className={styles.headerRight}>
              <span className={styles.columnCount}>{backlogTasks.length}</span>
              <button
                type="button"
                className={styles.collapseButton}
                onClick={toggleBacklog}
                aria-expanded={!isBacklogCollapsed}
                title={isBacklogCollapsed ? tr("Mở rộng Backlog") : tr("Thu gọn Backlog")}
                aria-label={isBacklogCollapsed ? tr("Mở rộng Backlog") : tr("Thu gọn Backlog")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={isBacklogCollapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.cards}>
            {backlogTasks.map((task) => renderTaskCard(task, true))}
            {backlogTasks.length === 0 ? <div className={styles.empty}>{tr("Backlog trống")}</div> : null}
          </div>
        </aside>

        {/* Bảng trạng thái */}
        <div className={styles.board}>
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = kanbanTasks.filter((t) => toWorkflowTaskStatus(t.status) === col.id);
            return (
              <section
                key={col.id}
                className={`${styles.column} ${dragOverColumn === col.id ? styles.dragOver : ""}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={styles.columnHeader}>
                  <h3 className={`${styles.columnTitle} ${col.id === "TODO" ? styles.dotTodo : col.id === "IN_PROGRESS" ? styles.dotProgress : styles.dotDone}`}>
                    {tr(col.label)}
                  </h3>
                  <span className={styles.columnCount}>{columnTasks.length}</span>
                </div>
                <div className={styles.cards}>
                  {columnTasks.map((task) => renderTaskCard(task, false))}
                  {columnTasks.length === 0 ? (
                    <div className={styles.empty}>
                      {draggedTaskId && !canDropInSprint && selectedSprint
                        ? selectedSprintStatus === "CLOSED"
                          ? tr("Sprint đã đóng")
                          : tr("Sprint chưa bắt đầu")
                        : tr("Kéo thả công việc vào đây")}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
