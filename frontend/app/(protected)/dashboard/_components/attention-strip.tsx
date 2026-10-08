"use client";

import type { GlobalDashboardOverview } from "@/types";

import styles from "../styles/dashboard.module.css";
import { t } from "@/lib/i18n";

type Item = { key: string; dot: string; count: number; label: string; target: string };

function jumpTo(target: string) {
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function AttentionStrip({ overview }: { overview: GlobalDashboardOverview }) {
  const criticalProjects = overview.projectHealths.filter((p) => p.health === "critical").length;
  const watchProjects = overview.projectHealths.filter((p) => p.health === "watch").length;
  const lateSprints = overview.activeSprints.filter((s) => s.health === "critical").length;

  const items: Item[] = [
    { key: "overdue", dot: styles.dotDanger, count: overview.taskSummary.overdue, label: t("task quá hạn"), target: "dashboard-overdue" },
    { key: "critical", dot: styles.dotDanger, count: criticalProjects, label: t("dự án rủi ro cao"), target: "dashboard-projects" },
    { key: "sprint", dot: styles.dotWarning, count: lateSprints, label: t("sprint chậm tiến độ"), target: "dashboard-sprints" },
    { key: "watch", dot: styles.dotWarning, count: watchProjects, label: t("dự án cần theo dõi"), target: "dashboard-projects" },
    { key: "pending", dot: styles.dotInfo, count: overview.pendingLogworkCount, label: t("logwork chờ duyệt"), target: "dashboard-logwork" },
  ].filter((item) => item.count > 0);

  if (items.length === 0) {
    return <div className={`${styles.attention} ${styles.attentionOk}`}>{t("Mọi thứ đang ổn — không có mục nào cần chú ý.")}</div>;
  }

  return (
    <div className={styles.attention} role="status">
      <span className={styles.attentionTitle}>{t("Cần chú ý")}</span>
      {items.map((item) => (
        <button key={item.key} type="button" className={styles.attentionItem} onClick={() => jumpTo(item.target)}>
          <span className={`${styles.dot} ${item.dot}`} />
          <strong>{item.count}</strong> {item.label}
        </button>
      ))}
    </div>
  );
}
