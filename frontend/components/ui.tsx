import type { ReactNode } from "react";
import { UserAvatar } from "@/components/user-avatar";
import {
  normalizeTaskPriority,
  taskPriorityLabel,
  taskStatusLabel,
  taskStatusTone,
} from "@/lib/utils/format";
import type { TaskPriority, TaskStatus } from "@/types";
import { t } from "@/lib/i18n";

type Tone = "accent" | "on-track" | "watch" | "critical" | "neutral" | "todo" | "progress" | "done";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Surface({
  title,
  kicker,
  aside,
  className,
  style,
  children,
}: {
  title?: string;
  kicker?: string;
  aside?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const isFlexColumn =
    style?.display === "flex" &&
    (style.flexDirection === "column" || style.flexDirection === undefined);
  const hasHeader = Boolean(title || kicker || aside);

  return (
    <section className={classNames("surface", className)} style={style}>
      {hasHeader ? (
        <div className="surface-header" style={isFlexColumn ? { flexShrink: 0 } : undefined}>
          <div>
            {kicker ? <span className="kicker">{kicker}</span> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      ) : null}
      {isFlexColumn ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <span className={classNames("pill", `pill-${tone}`)}>{label}</span>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-block">
      {label ? (
        <div className="progress-meta">
          <span>{label}</span>
          <strong>{value}%</strong>
        </div>
      ) : null}
      <div className="progress-track">
        <span
          className="progress-fill"
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone = "accent",
}: {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
}) {
  return (
    <article className={classNames("stat-card", `stat-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

export function AvatarRail({
  items,
}: {
  items: Array<{ id: string; initials: string; name: string; email?: string; avatarUrl?: string }>;
}) {
  return (
    <div className="avatar-rail">
      {items.map((item) => (
        <UserAvatar
          key={item.id}
          name={item.name}
          avatarUrl={item.avatarUrl}
          size={32}
        />
      ))}
    </div>
  );
}

export function KeyValueList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="key-value-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function SegmentBar({
  segments,
  showLegend = true,
}: {
  segments: Array<{ label: string; value: number; tone: "todo" | "progress" | "done" | "outdate" }>;
  showLegend?: boolean;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="segment-bar-stack">
      <div className="segment-bar-track" aria-hidden="true">
        {segments.map((segment) => {
          const width = total ? Math.max(6, (segment.value / total) * 100) : 0;

          return (
            <span
              key={segment.label}
              className={classNames("segment-bar-fill", `segment-bar-${segment.tone}`)}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      {showLegend ? (
        <div className="segment-legend">
          {segments.map((segment) => (
            <div key={segment.label} className="segment-legend-item">
              <span className={classNames("segment-dot", `segment-dot-${segment.tone}`)} />
              <span>{segment.label}</span>
              <strong>{segment.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: Array<{ value: number; tone: "todo" | "progress" | "done" | "outdate" | "neutral" }>;
  centerLabel: string;
  centerValue: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const colors = {
    todo: "var(--status-todo)",
    progress: "var(--status-progress)",
    done: "var(--status-done)",
    outdate: "var(--color-danger)",
    neutral: "var(--color-text-subtle)",
  } as Record<string, string>;

  const gradient = segments
    .reduce<Array<string>>((parts, segment, index) => {
      const previous = segments
        .slice(0, index)
        .reduce((sum, current) => sum + (total ? (current.value / total) * 100 : 0), 0);
      const percentage = total ? (segment.value / total) * 100 : 0;
      const from = previous;
      const to = previous + percentage;

      parts.push(`${colors[segment.tone]} ${from}% ${to}%`);
      return parts;
    }, [])
    .join(", ");

  return (
    <div className="donut-chart-shell">
      <div
        className="donut-chart"
        style={{ backgroundImage: `conic-gradient(${gradient || "var(--color-border) 0 100%"})` }}
      >
        <div className="donut-chart-center">
          <span>{centerLabel}</span>
          <strong>{centerValue}</strong>
        </div>
      </div>
    </div>
  );
}

export function MiniBars({
  items,
}: {
  items: Array<{ label: string; value: number; note?: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="mini-bars">
      {items.map((item) => (
        <div key={item.label} className="mini-bar-row">
          <div className="mini-bar-copy">
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
          </div>
          <div className="mini-bar-track">
            <span
              className="mini-bar-fill"
              style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
            />
          </div>
          {item.note ? <small>{item.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";

const COLUMN_STATUS_COLORS = {
  accent: "var(--color-primary)",
  "on-track": "var(--color-success)",
  watch: "var(--color-warning)",
  critical: "var(--color-danger)",
  neutral: "var(--color-text-subtle)",
} as const;

export type ColumnChartTone = keyof typeof COLUMN_STATUS_COLORS;

export function ColumnChart({
  items,
  height = "100%",
}: {
  items: Array<{
    label: string;
    value: number;
    tone?: ColumnChartTone;
    href?: string;
  }>;
  /** Fixed px or CSS size; use "100%" to fill the parent card body */
  height?: number | string;
}) {
  const max = Math.max(...items.map((item) => item.value), 100);

  return (
    <div
      className="column-chart"
      style={{ height, flex: height === "100%" ? 1 : undefined }}
    >
      <div className="column-chart-track">
        {items.map((item) => {
          const barPct = Math.max(4, (item.value / max) * 100);
          const color = COLUMN_STATUS_COLORS[item.tone ?? "accent"];

          const content = (
            <div className="column-chart-item">
              <div className="column-chart-plot">
                <div className="column-chart-bar-wrap" style={{ height: `${barPct}%` }}>
                  <span className="column-chart-value">{item.value}%</span>
                  <div
                    className="column-chart-bar"
                    style={{ backgroundColor: color }}
                    title={`${item.label}: ${item.value}%`}
                  />
                </div>
              </div>
              <span className="column-chart-label" title={item.label}>
                {item.label}
              </span>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="column-chart-column"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.label} className="column-chart-column">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HEALTH_BAR_COLORS = {
  "on-track": "var(--color-success)",
  watch: "var(--color-warning)",
  critical: "var(--color-danger)",
} as const;

export function HorizontalBarChart({
  items,
  maxHeight = 460,
  valueSuffix = "%",
}: {
  items: Array<{
    id: string;
    label: string;
    value: number;
    max?: number;
    tone?: "on-track" | "watch" | "critical";
    meta?: string;
    href?: string;
  }>;
  maxHeight?: number;
  valueSuffix?: string;
}) {
  const scaleMax = Math.max(...items.map((item) => item.max ?? item.value), 1);

  return (
    <div
      className="hbar-chart"
      style={{
        maxHeight,
        minHeight: Math.min(maxHeight, Math.max(items.length * 36, 120)),
      }}
    >
      {items.length === 0 ? (
        <div className="popover-empty">{t("Chưa có dữ liệu")}</div>
      ) : (
        items.map((item) => {
          const width = Math.max(4, Math.round((item.value / scaleMax) * 100));
          const color = HEALTH_BAR_COLORS[item.tone ?? "on-track"];
          const row = (
            <div className="hbar-row">
              <span className="hbar-label" title={item.label}>
                {item.label}
              </span>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${width}%`, background: color }} />
              </div>
              <span className="hbar-value">
                <strong>
                  {item.value}
                  {valueSuffix}
                </strong>
                {item.meta ? ` · ${item.meta}` : ""}
              </span>
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="hbar-link">
                {row}
              </Link>
            );
          }

          return <div key={item.id}>{row}</div>;
        })
      )}
    </div>
  );
}

/* ───────── Component dùng chung ───────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={classNames("btn", `btn-${variant}`, size === "sm" && "btn-sm", loading && "is-loading", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={classNames("pill", `pill-${tone}`)}>{children}</span>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={taskStatusTone(status)}>{taskStatusLabel(status)}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority | string }) {
  const key = normalizeTaskPriority(priority);
  return (
    <span className={classNames("pill", `pill-priority-${key.toLowerCase()}`)}>
      {taskPriorityLabel(key)}
    </span>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="error-state" role="alert">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function PageToolbar({
  children,
  actions,
}: {
  children?: ReactNode;
  /** Hành động chính của trang — luôn nằm bên phải */
  actions?: ReactNode;
}) {
  return (
    <div className="page-toolbar">
      <div className="page-toolbar-main">{children}</div>
      {actions ? <div className="page-toolbar-actions">{actions}</div> : null}
    </div>
  );
}
