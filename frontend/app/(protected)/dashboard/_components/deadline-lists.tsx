"use client";

import Link from "next/link";
import { useMemo } from "react";

import { TaskPriorityBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils/format";
import type { DashboardTaskPreview } from "@/types";

import styles from "../styles/dashboard.module.css";
import { DashCard } from "./dashboard-card";
import { daysFromToday, dueLabel, taskHref } from "./dashboard-utils";
import { t } from "@/lib/i18n";

function TaskRow({ task, tone }: { task: DashboardTaskPreview; tone: "red" | "blue" }) {
  const days = daysFromToday(task.dueDate);
  const dueClass = days !== null && days < 0 ? styles.dueLate : days !== null && days <= 1 ? styles.dueSoon : "";

  return (
    <Link href={taskHref(task, tone)} className={styles.taskRow}>
      <div style={{ minWidth: 0 }}>
        <div className={styles.taskTitle} title={task.title}>
          {task.title}
        </div>
        <div className={styles.taskMeta}>
          {task.projectName ? <span>{task.projectName}</span> : null}
        </div>
      </div>
      <div className={styles.taskSide}>
        <span className={`${styles.due} ${dueClass}`} title={task.dueDate ? formatDate(task.dueDate) : undefined}>
          {dueLabel(days)}
        </span>
        <TaskPriorityBadge priority={task.priority} />
      </div>
    </Link>
  );
}

function useProjectFilter(tasks: DashboardTaskPreview[], project: string) {
  return useMemo(
    () => (project ? tasks.filter((task) => String(task.projectId) === project) : tasks),
    [tasks, project],
  );
}

type ListProps = {
  tasks: DashboardTaskPreview[];
  project: string;
};

export function OverdueList({ tasks, total, project }: ListProps & { total: number }) {
  const filtered = useProjectFilter(tasks, project);

  return (
    <DashCard
      id="dashboard-overdue"
      title={t("Task quá hạn")}
      subtitle={t("Trễ lâu nhất hiển thị trước")}
      aside={
        <>
          <span className={`${styles.count} ${styles.countDanger}`}>{project ? filtered.length : total}</span>
        </>
      }
    >
      {filtered.length === 0 ? (
        <div className={styles.empty}>{project ? t("Dự án này không có task quá hạn.") : t("Không có task quá hạn.")}</div>
      ) : (
        <div className={styles.scroll}>
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} tone="red" />
          ))}
        </div>
      )}
    </DashCard>
  );
}

export function UpcomingList({ tasks, project }: ListProps) {
  const filtered = useProjectFilter(tasks, project);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (daysFromToday(a.dueDate) ?? 99) - (daysFromToday(b.dueDate) ?? 99)),
    [filtered],
  );

  return (
    <DashCard
      title={t("Sắp đến hạn")}
      subtitle={t("Trong 7 ngày tới")}
      aside={
        <>
          <span className={styles.count}>{filtered.length}</span>
        </>
      }
    >
      {sorted.length === 0 ? (
        <div className={styles.empty}>{t("Không có task nào đến hạn trong 7 ngày tới.")}</div>
      ) : (
        <div className={styles.scroll}>
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} tone="blue" />
          ))}
        </div>
      )}
    </DashCard>
  );
}
