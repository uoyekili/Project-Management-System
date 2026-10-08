"use client";

import { useMemo, useState } from "react";

import type { DashboardTrendPoint } from "@/types";

import styles from "../styles/dashboard.module.css";
import { Legend, TrendChart, type TrendSeries } from "./charts";
import { DashCard } from "./dashboard-card";
import { TREND_COLORS, formatDayMonth, formatDayTitle } from "./dashboard-utils";
import { t } from "@/lib/i18n";

type Metric = "tasks" | "hours";

const RANGES = [7, 14, 30] as const;

const SERIES: Record<Metric, TrendSeries[]> = {
  tasks: [
    { key: "created", label: "Tạo mới", color: TREND_COLORS.created },
    { key: "completed", label: "Hoàn thành", color: TREND_COLORS.completed },
  ],
  hours: [{ key: "loggedHours", label: "Giờ làm đã duyệt", color: TREND_COLORS.hours }],
};

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={option.value === value ? styles.segmentedOn : undefined}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TrendCard({ trend }: { trend: DashboardTrendPoint[] }) {
  const [metric, setMetric] = useState<Metric>("tasks");
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const slice = useMemo(() => trend.slice(-range), [trend, range]);
  const points = useMemo(
    () =>
      slice.map((point) => ({
        id: point.date,
        label: formatDayMonth(point.date),
        title: formatDayTitle(point.date),
        values: { created: point.created, completed: point.completed, loggedHours: point.loggedHours },
      })),
    [slice],
  );

  const totals = useMemo(
    () => ({
      created: slice.reduce((sum, p) => sum + p.created, 0),
      completed: slice.reduce((sum, p) => sum + p.completed, 0),
      hours: Math.round(slice.reduce((sum, p) => sum + p.loggedHours, 0) * 10) / 10,
    }),
    [slice],
  );

  const series = SERIES[metric].map((item) => ({ ...item, label: t(item.label) }));
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (series.some((item) => item.key !== key && !next.has(item.key))) next.add(key); // luôn giữ ít nhất 1 series
      return next;
    });

  const summary =
    metric === "tasks"
      ? t("{v0} task tạo mới · {v1} hoàn thành", { v0: totals.created, v1: totals.completed })
      : t("{v0}h đã duyệt", { v0: totals.hours });

  return (
    <DashCard
      title={t("Xu hướng")}
      subtitle={t("{v0} trong {v1} ngày qua", { v0: summary, v1: range })}
      aside={
        <>
          <Segmented
            label={t("Chỉ số")}
            value={metric}
            onChange={setMetric}
            options={[
              { value: "tasks", label: "Task" },
              { value: "hours", label: t("Giờ làm") },
            ]}
          />
          <Segmented
            label={t("Khoảng thời gian")}
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: t("{v0} ngày", { v0: value }) }))}
          />
        </>
      }
    >
      {slice.length === 0 || (totals.created + totals.completed + totals.hours === 0) ? (
        <div className={styles.empty}>{t("Chưa có hoạt động nào trong")} {range}  {t("ngày qua.")}</div>
      ) : (
        <>
          <TrendChart
            points={points}
            series={series}
            hidden={hidden}
            formatValue={(value) => (metric === "hours" ? `${value}h` : String(value))}
            ariaLabel={t("Biểu đồ {v0} theo ngày, {v1} ngày gần nhất", { v0: metric === "tasks" ? t("task tạo mới và hoàn thành") : t("giờ làm đã duyệt"), v1: range })}
          />
          {series.length > 1 ? (
            <Legend
              items={series.map((item) => ({ ...item, hidden: hidden.has(item.key) }))}
              onSelect={toggle}
              selectHint={t("Nhấn để ẩn/hiện")}
            />
          ) : (
            <Legend items={series} />
          )}
        </>
      )}
    </DashCard>
  );
}
