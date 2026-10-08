"use client";

import { useMemo, useState } from "react";

import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import {
  formatDate,
  formatHours,
  formatRange,
  projectStatusLabel,
  projectTypeLabel,
  roleDisplayLabels,
  sprintStatusLabel,
} from "@/lib/utils/format";
import type { DashboardOverview, EnrichedTask, Project, Sprint } from "@/types";

import {
  daysFromToday,
  dueLabel,
  percentOf,
  STATUS_COLORS,
  todayKey,
} from "../../dashboard/_components/dashboard-utils";
import styles from "../styles/project-overview.module.css";
import { t } from "@/lib/i18n";

type ProjectOverviewProps = {
  project: Project | null;
  tasks: EnrichedTask[];
  sprints: Sprint[];
  overview: DashboardOverview | null;
  isLoading?: boolean;
  onOpenTask: (taskId: string) => void;
  onOpenTasksTab: () => void;
  onOpenMembersTab: () => void;
};

type Tone = "on-track" | "watch" | "critical";
type AttentionKind = "overdue" | "soon" | "unassigned";
type AttentionFilter = "all" | AttentionKind;

type AttentionItem = {
  task: EnrichedTask;
  kind: AttentionKind;
  days: number | null;
};

type Milestone = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  done: number;
  total: number;
  state: "active" | "upcoming" | "done" | "late";
  stateLabel: string;
};

const DAY_MS = 86_400_000;
const SOON_DAYS = 7;

const TONE_COLOR: Record<Tone, string> = {
  "on-track": "var(--color-success)",
  watch: "var(--color-warning)",
  critical: "var(--color-danger)",
};

const KIND_LABEL: Record<AttentionKind, string> = {
  overdue: "Quá hạn",
  soon: "Sắp đến hạn",
  unassigned: "Chưa giao",
};

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function dayIndex(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

function relativeDay(date: string) {
  const days = daysFromToday(date);
  if (days === null) return "";
  if (days === 0) return t("Hôm nay");
  if (days === -1) return t("Hôm qua");
  if (days < 0) return t("{v0} ngày trước", { v0: Math.abs(days) });
  return formatDate(date);
}

/** Task lá = đơn vị công việc thật; task cha chỉ là nhóm WBS nên không tính vào thống kê. */
function buildTaskIndex(tasks: EnrichedTask[]) {
  const children = new Map<string, EnrichedTask[]>();
  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const list = children.get(task.parentTaskId) ?? [];
    list.push(task);
    children.set(task.parentTaskId, list);
  }
  const leaves = tasks.filter((task) => !children.has(task.id));

  const leavesUnder = (task: EnrichedTask): EnrichedTask[] => {
    const kids = children.get(task.id);
    return kids ? kids.flatMap(leavesUnder) : [task];
  };

  return { children, leaves, leavesUnder };
}

function scheduleHealth(project: Project, progress: number) {
  const today = dayIndex(todayKey());
  const start = dayIndex(project.startDate);
  const end = project.endDate ? dayIndex(project.endDate) : null;

  if (project.status === "COMPLETED") {
    return { tone: "on-track" as Tone, label: t("Đã hoàn thành"), expected: 100, daysLeft: null as number | null, elapsedDays: 0, totalDays: 0 };
  }

  const totalDays = end !== null ? Math.max(1, Math.round((end - start) / DAY_MS)) : 0;
  const elapsedDays = Math.max(0, Math.round((today - start) / DAY_MS));
  const daysLeft = end !== null ? Math.round((end - today) / DAY_MS) : null;
  const expected = totalDays ? clamp(Math.round((elapsedDays / totalDays) * 100)) : 0;

  if (project.status === "PLANNING" && today < start) {
    return { tone: "on-track" as Tone, label: t("Chưa bắt đầu"), expected: 0, daysLeft, elapsedDays, totalDays };
  }
  if (daysLeft !== null && daysLeft < 0) {
    return { tone: "critical" as Tone, label: t("Quá hạn dự án {v0} ngày", { v0: Math.abs(daysLeft) }), expected: 100, daysLeft, elapsedDays, totalDays };
  }

  const delta = progress - expected;
  const tone: Tone = delta >= -10 ? "on-track" : delta >= -25 ? "watch" : "critical";
  const label = delta >= 5 ? t("Vượt tiến độ") : tone === "on-track" ? t("Đúng tiến độ") : tone === "watch" ? t("Cần theo dõi") : t("Chậm tiến độ");
  return { tone, label, expected, daysLeft, elapsedDays, totalDays };
}

function Ring({ value, color }: { value: number; color: string }) {
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={styles.ring} role="img" aria-label={t("Tiến độ {v0}%", { v0: value })}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamp(value) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.ringValue}>
        {value}
        <small>%</small>
      </span>
    </div>
  );
}

function Card({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          {subtitle ? <p className={styles.cardSub}>{subtitle}</p> : null}
        </div>
        {aside ? <div className={styles.cardAside}>{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function ProjectOverview({
  project,
  tasks,
  sprints,
  overview,
  isLoading = false,
  onOpenTask,
  onOpenTasksTab,
  onOpenMembersTab,
}: ProjectOverviewProps) {
  const [filter, setFilter] = useState<AttentionFilter>("all");

  const data = useMemo(() => {
    if (!project) return null;
    const index = buildTaskIndex(tasks);
    const leaves = index.leaves;
    const open = leaves.filter((task) => task.status !== "DONE");

    const counts = {
      todo: leaves.filter((task) => task.status === "TODO").length,
      doing: leaves.filter((task) => task.status === "IN_PROGRESS").length,
      done: leaves.filter((task) => task.status === "DONE").length,
      total: leaves.length,
    };

    const attention: AttentionItem[] = [];
    for (const task of open) {
      const days = task.dueDate ? daysFromToday(task.dueDate) : null;
      if (days !== null && days < 0) attention.push({ task, kind: "overdue", days });
      else if (days !== null && days <= SOON_DAYS) attention.push({ task, kind: "soon", days });
      else if (!task.assigneeId || task.assigneeId === "0") attention.push({ task, kind: "unassigned", days });
    }
    const kindRank: Record<AttentionKind, number> = { overdue: 0, soon: 1, unassigned: 2 };
    attention.sort(
      (a, b) =>
        kindRank[a.kind] - kindRank[b.kind] ||
        (a.days ?? 999) - (b.days ?? 999) ||
        (PRIORITY_RANK[a.task.priority] ?? 9) - (PRIORITY_RANK[b.task.priority] ?? 9),
    );

    const progress = clamp(Math.round(overview?.projectProgress ?? project.progress ?? 0));
    const health = scheduleHealth(project, progress);

    const estimate = sumBy(leaves, (task) => task.estimateHours || 0);
    const logged = sumBy(leaves, (task) => task.spentHours || 0);

    // Lộ trình: phase WBS (task gốc có con) cho Waterfall, sprint cho Agile.
    const today = todayKey();
    let milestones: Milestone[] = [];
    if (project.projectType === "waterfall") {
      milestones = tasks
        .filter((task) => !task.parentTaskId && index.children.has(task.id))
        .map((phase) => {
          const under = index.leavesUnder(phase);
          const done = under.filter((task) => task.status === "DONE").length;
          const pct = percentOf(done, under.length);
          const isDone = under.length > 0 && done === under.length;
          const late = !isDone && !!phase.dueDate && phase.dueDate.slice(0, 10) < today;
          const started = !!phase.startDate && phase.startDate.slice(0, 10) <= today;
          const state: Milestone["state"] = isDone ? "done" : late ? "late" : started || pct > 0 ? "active" : "upcoming";
          return {
            id: phase.id,
            name: phase.title,
            start: phase.startDate,
            end: phase.dueDate,
            progress: pct,
            done,
            total: under.length,
            state,
            stateLabel: { done: t("Hoàn thành"), late: t("Trễ hạn"), active: t("Đang thực hiện"), upcoming: t("Sắp tới") }[state],
          };
        })
        .sort((a, b) => (a.start || a.end || "").localeCompare(b.start || b.end || ""));
    } else {
      milestones = sprints
        .map((sprint) => {
          const sprintLeaves = leaves.filter((task) => task.sprintId === sprint.id);
          const done = sprintLeaves.filter((task) => task.status === "DONE").length;
          const state: Milestone["state"] =
            sprint.status === "CLOSED" ? "done" : sprint.status === "ACTIVE" || sprint.status === "REVIEW" ? "active" : "upcoming";
          return {
            id: sprint.id,
            name: sprint.name,
            start: sprint.plannedStart,
            end: sprint.plannedEnd,
            progress: sprintLeaves.length ? percentOf(done, sprintLeaves.length) : clamp(Math.round(sprint.progress || 0)),
            done,
            total: sprintLeaves.length,
            state,
            stateLabel: sprintStatusLabel(sprint.status),
          };
        })
        .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    }

    return { counts, attention, progress, health, estimate, logged, milestones, openCount: open.length };
  }, [project, tasks, sprints, overview]);

  if (isLoading) {
    return <LoadingState variant="dashboard" label={t("Đang tổng hợp dữ liệu dự án...")} />;
  }

  if (!project || !data) {
    return <EmptyState title={t("Không có dữ liệu")} description={t("Không thể tải tổng quan dự án. Thử tải lại trang.")} />;
  }

  const { counts, attention, progress, health, estimate, logged, milestones } = data;
  const overdueCount = attention.filter((item) => item.kind === "overdue").length;
  const soonCount = attention.filter((item) => item.kind === "soon").length;
  const healthColor = TONE_COLOR[health.tone];
  const visibleAttention = (filter === "all" ? attention : attention.filter((item) => item.kind === filter)).slice(0, 7);
  const hiddenAttention = (filter === "all" ? attention.length : attention.filter((item) => item.kind === filter).length) - visibleAttention.length;

  const workload = (overview?.workloadBoard ?? []).slice().sort((a, b) => b.assignedTasks - a.assignedTasks);
  const maxAssigned = Math.max(1, ...workload.map((member) => member.assignedTasks));
  const logs = (overview?.recentLogwork ?? []).slice(0, 5);
  const taskTabLabel = project.projectType === "waterfall" ? "Gantt" : "Kanban";
  const markerPct = health.totalDays ? clamp(health.expected) : null;
  const hoursPct = estimate > 0 ? Math.round((logged / estimate) * 100) : 0;

  const filters: Array<{ id: AttentionFilter; label: string }> = [
    { id: "all", label: t("Tất cả") },
    { id: "overdue", label: t("Quá hạn") },
    { id: "soon", label: t("Sắp đến hạn") },
    { id: "unassigned", label: t("Chưa giao") },
  ];

  return (
    <div className={styles.page}>
      {/* ───── Hero: danh tính + sức khỏe tiến độ ───── */}
      <section className={styles.hero} style={{ "--health": healthColor } as React.CSSProperties}>
        <div className={styles.heroMain}>
          <div className={styles.heroInfo}>
            <div className={styles.heroEyebrow}>
              <span className={styles.code}>{project.code}</span>
              <span className={styles.eyebrowSep} aria-hidden />
              <span>{projectTypeLabel(project.projectType)}</span>
            </div>
            <div className={styles.heroTitleRow}>
              <h2 className={styles.heroTitle}>{project.name}</h2>
              <span className={styles.statusPill}>{projectStatusLabel(project.status)}</span>
            </div>

            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>{t("Quản lý")}</dt>
                <dd>
                  {project.managerName ? (
                    <UserAvatar name={project.managerName}
                    avatarUrl={project.managerAvatarUrl} size={22} />
                  ) : null}
                  {project.managerName || t("Chưa có PM")}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{t("Thành viên")}</dt>
                <dd>{overview?.memberCount || project.memberIds.length}</dd>
              </div>
              {health.daysLeft !== null && project.status !== "COMPLETED" ? (
                <div className={styles.fact}>
                  <dt>{t("Còn lại")}</dt>
                  <dd className={health.daysLeft < 0 ? styles.factDanger : undefined}>
                    {health.daysLeft < 0 ? t("Trễ {v0} ngày", { v0: Math.abs(health.daysLeft) }) : health.daysLeft === 0 ? t("Hôm nay") : t("{v0} ngày", { v0: health.daysLeft })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className={styles.heroProgress}>
            <Ring value={progress} color={healthColor} />
            <div className={styles.heroProgressText}>
              <span className={styles.healthChip}>
                <span className={styles.healthDot} />
                {health.label}
              </span>
              <strong>{t("Tiến độ hoàn thành")}</strong>
              <span>
                {health.totalDays ? t("Theo kế hoạch thời gian: {v0}%", { v0: health.expected }) : t("Chưa đặt ngày kết thúc")}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineTrack} aria-hidden>
            <span className={styles.timelineFill} style={{ width: `${progress}%` }} />
            {markerPct !== null ? (
              <span className={styles.timelineMarker} style={{ left: `${markerPct}%` }}>
                <i>{t("Hôm nay")}</i>
              </span>
            ) : null}
          </div>
          <div className={styles.timelineLabels}>
            <span>{formatDate(project.startDate)}</span>
            <span>{project.endDate ? formatDate(project.endDate) : t("Chưa có hạn")}</span>
          </div>
        </div>
      </section>

      {/* ───── Dải chỉ số ───── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t("Hoàn thành")}</span>
          <span className={styles.statValue}>
            {counts.done}
            <small> / {counts.total} task</small>
          </span>
          <div className={styles.stackBar} aria-hidden>
            <span style={{ width: `${percentOf(counts.done, counts.total)}%`, background: STATUS_COLORS.done }} />
            <span style={{ width: `${percentOf(counts.doing, counts.total)}%`, background: STATUS_COLORS.progress }} />
            <span style={{ width: `${percentOf(counts.todo, counts.total)}%`, background: STATUS_COLORS.todo, opacity: 0.35 }} />
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t("Đang làm")}</span>
          <span className={styles.statValue}>{counts.doing}</span>
          <span className={styles.statNote}>{counts.todo}  {t("chưa bắt đầu")}</span>
        </div>
        <div className={`${styles.stat} ${overdueCount > 0 ? styles.statDanger : ""}`}>
          <span className={styles.statLabel}>{t("Quá hạn")}</span>
          <span className={styles.statValue}>{overdueCount}</span>
          <span className={styles.statNote}>
            {soonCount > 0 ? t("{v0} task đến hạn trong {v1} ngày", { v0: soonCount, v1: SOON_DAYS }) : t("Không có task sắp đến hạn")}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t("Giờ công")}</span>
          <span className={styles.statValue}>
            {formatHours(logged)}
            <small> / {estimate > 0 ? formatHours(estimate) : "—"}</small>
          </span>
          <span className={styles.statNote}>
            {estimate > 0 ? t("Đã dùng {v0}% ước tính", { v0: hoursPct }) : t("Chưa có ước tính giờ")}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.colMain}>
          {/* ───── Cần chú ý ───── */}
          <Card
            title={t("Cần chú ý")}
            subtitle={t("Task mở đã trễ, sắp đến hạn hoặc chưa có người phụ trách")}
            aside={
              <div className={styles.segmented} role="tablist" aria-label={t("Lọc task cần chú ý")}>
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.id}
                    className={`${styles[`seg_${item.id}`]} ${filter === item.id ? styles.segActive : ""}`}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            {visibleAttention.length === 0 ? (
              <div className={styles.okState}>
                <span className={styles.okIcon} aria-hidden>
                  ✓
                </span>
                <strong>{attention.length === 0 ? t("Không có điểm nóng") : t("Không có task trong nhóm này")}</strong>
                <span>
                  {attention.length === 0
                    ? t("Mọi task đang mở đều có người phụ trách và chưa đến hạn gấp.")
                    : t("Chọn nhóm khác để xem các task còn lại.")}
                </span>
              </div>
            ) : (
              <ul className={styles.list}>
                {visibleAttention.map(({ task, kind, days }) => (
                  <li key={task.id}>
                    <button type="button" className={styles.taskRow} onClick={() => onOpenTask(task.id)}>
                      <span className={`${styles.kindBar} ${styles[`kind_${kind}`]}`} aria-hidden />
                      <span className={styles.taskMain}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className={styles.taskMeta}>
                          {task.key} · {task.assigneeName || t("Chưa giao")}
                        </span>
                      </span>
                      <span className={styles.taskSide}>
                        <span className={`${styles.reason} ${styles[`reason_${kind}`]}`}>
                          {kind === "unassigned" ? t(KIND_LABEL.unassigned) : dueLabel(days)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {hiddenAttention > 0 || attention.length > 0 ? (
              <button type="button" className={styles.linkButton} onClick={onOpenTasksTab}>
                {hiddenAttention > 0 ? t("Còn {v0} task khác · ", { v0: hiddenAttention }) : ""}{t("Mở")} {taskTabLabel} →
              </button>
            ) : null}
          </Card>

          {/* ───── Lộ trình ───── */}
          <Card
            title={project.projectType === "waterfall" ? t("Lộ trình theo giai đoạn") : t("Lộ trình theo sprint")}
            subtitle={project.projectType === "waterfall" ? t("Các nhóm công việc cấp cao nhất trong WBS") : t("Các sprint đã lên kế hoạch")}
          >
            {milestones.length === 0 ? (
              <div className={styles.emptyLine}>
                {project.projectType === "waterfall"
                  ? t("Chưa có giai đoạn nào. Tạo task cha có task con để hình thành mốc.")
                  : t("Chưa có sprint nào. Tạo sprint để lên lộ trình.")}
              </div>
            ) : (
              <ol className={styles.milestones}>
                {milestones.map((item) => (
                  <li key={item.id} className={`${styles.milestone} ${styles[`ms_${item.state}`]}`}>
                    <span className={styles.msDot} aria-hidden />
                    <div className={styles.msBody}>
                      <div className={styles.msHead}>
                        <strong title={item.name}>{item.name}</strong>
                        <span className={styles.msState}>{item.stateLabel}</span>
                      </div>
                      <div className={styles.msMeta}>
                        {item.start || item.end ? formatRange(item.start, item.end) : t("Chưa có lịch")}
                        {item.total ? ` · ${item.done}/${item.total} task` : ""}
                      </div>
                      <div className={styles.msBar} role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                        <span style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                    <span className={styles.msPct}>{item.progress}%</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className={styles.colSide}>
          {/* ───── Đội ngũ ───── */}
          <Card
            title={t("Đội ngũ")}
            subtitle={t("Tải việc hiện tại")}
            aside={
              <button type="button" className={styles.inlineLink} onClick={onOpenMembersTab}>
                {t("Quản lý")}</button>
            }
          >
            {workload.length === 0 ? (
              <div className={styles.emptyLine}>{t("Chưa có task nào được giao cho thành viên.")}</div>
            ) : (
              <ul className={styles.people}>
                {workload.slice(0, 6).map((member) => {
                  const openTasks = member.todoTasks + member.inProgressTasks;
                  return (
                    <li key={member.userId} className={styles.person}>
                      <UserAvatar name={member.name}
                        avatarUrl={member.avatarUrl} size={32} />
                      <div className={styles.personBody}>
                        <div className={styles.personHead}>
                          <strong title={member.name}>{member.name}</strong>
                          <span>
                            {openTasks}  {t("đang mở")}{member.overdueTasks > 0 ? <b className={styles.textDanger}> · {member.overdueTasks}  {t("trễ")}</b> : null}
                          </span>
                        </div>
                        <div className={styles.personBar} aria-hidden>
                          <span
                            style={{ width: `${(member.doneTasks / maxAssigned) * 100}%`, background: STATUS_COLORS.done }}
                          />
                          <span
                            style={{ width: `${(member.inProgressTasks / maxAssigned) * 100}%`, background: STATUS_COLORS.progress }}
                          />
                          <span
                            style={{ width: `${(member.todoTasks / maxAssigned) * 100}%`, background: STATUS_COLORS.todo, opacity: 0.35 }}
                          />
                        </div>
                        <div className={styles.personSub}>
                          {roleDisplayLabels(member.roleName)[0] ?? member.roleName} · {formatHours(member.loggedHours)}  {t("đã log")}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {workload.length > 6 ? (
              <button type="button" className={styles.linkButton} onClick={onOpenMembersTab}>
                {t("Xem thêm")} {workload.length - 6}  {t("thành viên →")}</button>
            ) : null}
          </Card>

          {/* ───── Hoạt động ───── */}
          <Card title={t("Hoạt động gần đây")} subtitle={t("Logwork mới nhất")}>
            {logs.length === 0 ? (
              <div className={styles.emptyLine}>{t("Chưa có logwork nào trong dự án.")}</div>
            ) : (
              <ul className={styles.feed}>
                {logs.map((log) => (
                  <li key={log.id} className={styles.feedItem}>
                    <UserAvatar name={log.userName}
                        avatarUrl={log.userAvatarUrl} size={24} />
                    <div className={styles.feedBody}>
                      <p>
                        <strong>{log.userName}</strong> log <b>{formatHours(log.hours)}</b> cho{" "}
                        <button type="button" className={styles.feedTask} onClick={() => onOpenTask(log.taskId)}>
                          {log.taskKey}
                        </button>
                      </p>
                      <span>
                        {relativeDay(log.workDate)}
                        {log.status === "PENDING" ? t(" · Chờ duyệt") : log.status === "REJECTED" ? t(" · Bị từ chối") : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
