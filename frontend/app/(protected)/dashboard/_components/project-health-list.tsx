"use client";

import Link from "next/link";

import type { ProjectHealthPreview } from "@/types";

import styles from "../styles/dashboard.module.css";
import { Legend, Tip } from "./charts";
import { DashCard } from "./dashboard-card";
import { STATUS_COLORS, percentOf } from "./dashboard-utils";
import { t } from "@/lib/i18n";

const HEALTH_RANK = { critical: 0, watch: 1, "on-track": 2 } as const;

function StackedStatus({ project }: { project: ProjectHealthPreview }) {
  const done = project.doneCount ?? 0;
  const inProgress = project.inProgressCount ?? 0;
  const todo = project.todoCount ?? Math.max(0, project.totalTasks - done - inProgress);
  const total = project.totalTasks;
  const parts = [
    { label: t("Hoàn thành"), value: done, color: STATUS_COLORS.done },
    { label: t("Đang làm"), value: inProgress, color: STATUS_COLORS.progress },
    { label: t("Chưa bắt đầu"), value: todo, color: STATUS_COLORS.todo },
  ];

  if (total === 0) return <span className={styles.projectMeta}>{t("Chưa có task")}</span>;

  return (
    <div className={styles.stacked} role="img" aria-label={t("{v0}/{v1} task hoàn thành, tiến độ {v2}%", { v0: done, v1: total, v2: project.progress })}>
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <span key={part.label} className={styles.stackedCell} style={{ flexGrow: part.value }}>
            <Tip
              className={styles.stackedPart}
              text={`${project.name}\n${part.label}: ${part.value} (${percentOf(part.value, total)}%)`}
            >
              <span style={{ background: part.color }} />
            </Tip>
          </span>
        ))}
    </div>
  );
}

export function ProjectHealthList({
  projects,
  focusProjectId,
  onFocusProject,
}: {
  projects: ProjectHealthPreview[];
  focusProjectId: string;
  onFocusProject: (projectId: string) => void;
}) {
  // Rủi ro cao nhất lên đầu, cùng mức thì tiến độ thấp hơn lên trước
  const sorted = [...projects].sort(
    (a, b) =>
      HEALTH_RANK[a.health] - HEALTH_RANK[b.health] ||
      a.progress - b.progress ||
      a.name.localeCompare(b.name, "vi"),
  );

  return (
    <DashCard
      id="dashboard-projects"
      title={t("Sức khỏe dự án")}
      subtitle={t("Chọn một dự án để lọc các danh sách task bên dưới")}
      aside={<span className={styles.count}>{projects.length}</span>}
    >
      <div className={styles.legendBar}>
        <Legend
          items={[
            { key: "done", label: t("Hoàn thành"), color: STATUS_COLORS.done },
            { key: "progress", label: t("Đang làm"), color: STATUS_COLORS.progress },
            { key: "todo", label: t("Chưa bắt đầu"), color: STATUS_COLORS.todo },
          ]}
        />
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>{t("Chưa có dự án nào trong phạm vi của bạn.")}</div>
      ) : (
        <div className={`${styles.projectList} ${styles.scroll}`}>
          {sorted.map((project) => {
            const isFocused = focusProjectId === project.id;
            return (
              <div key={project.id} className={`${styles.projectRow} ${isFocused ? styles.projectRowOn : ""}`}>
                <button
                  type="button"
                  className={styles.rowMain}
                  aria-pressed={isFocused}
                  title={isFocused ? t("Bỏ lọc dự án") : t("Lọc task theo dự án này")}
                  onClick={() => onFocusProject(isFocused ? "" : project.id)}
                >
                  <span className={styles.projectName}>
                    <span className={styles.ellipsis}>{project.name}</span>
                    <span className={styles.projectCode}>{project.code}</span>
                  </span>
                  <span className={styles.projectBar}>
                    <StackedStatus project={project} />
                    <span className={styles.barValue}>{project.progress}%</span>
                  </span>
                </button>
                <div className={styles.projectStats}>
                  <Link href={`/projects/${project.id}`} className={styles.openLink} aria-label={t("Mở dự án {v0}", { v0: project.name })} title={t("Mở dự án")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashCard>
  );
}
