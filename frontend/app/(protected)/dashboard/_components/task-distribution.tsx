"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DashboardPriorityBreakdown, DashboardTaskSummary } from "@/types";

import styles from "../styles/dashboard.module.css";
import { InteractiveDonut, Tip } from "./charts";
import { DashCard } from "./dashboard-card";
import { PRIORITY_COLORS, STATUS_COLORS, percentOf } from "./dashboard-utils";
import { t } from "@/lib/i18n";

const PRIORITY_ROWS: Array<{ key: keyof DashboardPriorityBreakdown; label: string }> = [
  { key: "critical", label: "Khẩn cấp" },
  { key: "high", label: "Cao" },
  { key: "medium", label: "Trung bình" },
  { key: "low", label: "Thấp" },
];

export function TaskDistribution({
  summary,
  priority,
}: {
  summary: DashboardTaskSummary;
  priority: DashboardPriorityBreakdown;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);

  const segments = [
    { key: "done", label: t("Hoàn thành"), value: summary.done, color: STATUS_COLORS.done },
    { key: "progress", label: t("Đang làm"), value: summary.inProgress, color: STATUS_COLORS.progress },
    { key: "todo", label: t("Chưa bắt đầu"), value: summary.todo, color: STATUS_COLORS.todo },
  ];
  const openTotal = PRIORITY_ROWS.reduce((sum, row) => sum + priority[row.key], 0);
  const maxPriority = Math.max(1, ...PRIORITY_ROWS.map((row) => priority[row.key]));
  const goToTasks = () => router.push("/tasks");

  return (
    <DashCard className={styles.distCard} title={t("Phân bổ task")} subtitle={t("Nhấn vào một phần để xem danh sách task")}>
      {summary.total === 0 ? (
        <div className={styles.empty}>{t("Chưa có task nào.")}</div>
      ) : (
        <div className={styles.donutLayout}>
          <InteractiveDonut
            segments={segments}
            centerLabel={t("Tổng task")}
            centerValue={String(summary.total)}
            activeKey={active}
            onActiveChange={setActive}
            onSelect={goToTasks}
            ariaLabel={t("Phân bổ {v0} task theo trạng thái", { v0: summary.total })}
          />
          <div className={styles.plainLegend}>
            {segments.map((segment) => (
              <div key={segment.key} className={styles.plainLegendRow}>
                <span className={styles.swatch} style={{ background: segment.color }} />
                {segment.label}
                <strong>{segment.value}</strong>
                <span className={styles.plainLegendPct}>{percentOf(segment.value, summary.total)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className={styles.subHead}>
        {t("Mức ưu tiên")} <span className={styles.subHeadNote}>{t("task đang mở ·")} {openTotal}</span>
      </h3>
      {openTotal === 0 ? (
        <div className={styles.empty}>{t("Không có task đang mở.")}</div>
      ) : (
        <div className={styles.priorityList}>
          {PRIORITY_ROWS.map((row) => (
            <Tip
              key={row.key}
              className={styles.priorityRow}
              text={`${t(row.label)}: ${priority[row.key]} task (${percentOf(priority[row.key], openTotal)}%)`}
            >
              <span className={styles.swatch} style={{ background: PRIORITY_COLORS[row.key] }} />
              <span>{t(row.label)}</span>
              <span className={styles.meter}>
                <span style={{ width: `${(priority[row.key] / maxPriority) * 100}%`, background: PRIORITY_COLORS[row.key] }} />
              </span>
              <strong>{priority[row.key]}</strong>
            </Tip>
          ))}
        </div>
      )}
    </DashCard>
  );
}
