"use client";

import Link from "next/link";
import { useMemo } from "react";

import { FilterSelect } from "@/components/filter-select";
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
          <span>{task.key}</span>
          {task.projectName ? <span>· {task.projectName}</span> : null}
          {task.assigneeName ? <span>· {task.assigneeName}</span> : null}
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

function useProjectOptions(tasks: DashboardTaskPreview[], project: string) {
  const options = useMemo(() => {
    const names = new Map<string, string>();
    for (const task of tasks) {
      if (task.projectId && task.projectName) names.set(String(task.projectId), task.projectName);
    }
    return [
      { value: "", label: t("Tất cả dự án") },
      ...Array.from(names, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "vi")),
    ];
  }, [tasks]);
  const filtered = useMemo(
    () => (project ? tasks.filter((task) => String(task.projectId) === project) : tasks),
    [tasks, project],
  );
  return { options, filtered };
}

type ListProps = {
  tasks: DashboardTaskPreview[];
  project: string;
  onProjectChange: (project: string) => void;
};

export function OverdueList({ tasks, total, project, onProjectChange }: ListProps & { total: number }) {
  const { options, filtered } = useProjectOptions(tasks, project);

  return (
    <DashCard
      id="dashboard-overdue"
      title={t("Task quá hạn")}
      subtitle={t("Trễ lâu nhất hiển thị trước")}
      aside={
        <>
          {options.length > 2 ? (
            <FilterSelect options={options} value={project} onChange={onProjectChange} searchable />
          ) : null}
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

export function UpcomingList({ tasks, project, onProjectChange }: ListProps) {
  const { options, filtered } = useProjectOptions(tasks, project);

  const groups = useMemo(() => {
    const buckets: Array<{ label: string; items: DashboardTaskPreview[] }> = [
      { label: t("Hôm nay"), items: [] },
      { label: t("Ngày mai"), items: [] },
      { label: t("Trong 7 ngày tới"), items: [] },
    ];
    for (const task of filtered) {
      const days = daysFromToday(task.dueDate);
      buckets[days === null || days > 1 ? 2 : days <= 0 ? 0 : 1].items.push(task);
    }
    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [filtered]);

  return (
    <DashCard
      title={t("Sắp đến hạn")}
      subtitle={t("Trong 7 ngày tới")}
      aside={
        <>
          {options.length > 2 ? (
            <FilterSelect options={options} value={project} onChange={onProjectChange} searchable />
          ) : null}
          <span className={styles.count}>{filtered.length}</span>
        </>
      }
    >
      {groups.length === 0 ? (
        <div className={styles.empty}>{t("Không có task nào đến hạn trong 7 ngày tới.")}</div>
      ) : (
        <div className={styles.scroll}>
          {groups.map((group) => (
            <div key={group.label}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map((task) => (
                <TaskRow key={task.id} task={task} tone="blue" />
              ))}
            </div>
          ))}
        </div>
      )}
    </DashCard>
  );
}
