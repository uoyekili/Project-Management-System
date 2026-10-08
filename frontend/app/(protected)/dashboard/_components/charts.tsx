"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "../styles/dashboard.module.css";

/* ───────── hooks ───────── */

/** Bề rộng thực của phần tử (theo ResizeObserver) để SVG co giãn theo container. */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(Math.max(240, Math.round(node.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/* ───────── tooltip & legend ───────── */

/**
 * Tooltip cho badge/segment: hiện khi hover hoặc focus bàn phím, vẽ qua portal với
 * vị trí cố định nên không bị cắt bởi vùng cuộn/overflow. Xuống dòng bằng "\n".
 */
export function Tip({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const id = useId();

  const show = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect();
    const half = 130;
    const x = Math.max(half, Math.min(window.innerWidth - half, rect.left + rect.width / 2));
    const below = rect.top < 72;
    setPos({ x, y: below ? rect.bottom + 8 : rect.top - 8, below });
  };

  return (
    <span
      className={className}
      tabIndex={0}
      aria-describedby={pos ? id : undefined}
      onPointerEnter={(event) => show(event.currentTarget)}
      onPointerLeave={() => setPos(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos && typeof document !== "undefined"
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              className={styles.tipBubble}
              style={{ left: pos.x, top: pos.y, transform: pos.below ? "translateX(-50%)" : "translate(-50%, -100%)" }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

export type LegendItem = {
  key: string;
  label: string;
  color: string;
  value?: ReactNode;
  /** 0–100: hiện thanh nhỏ dưới nhãn để dòng legend lấp đầy chiều ngang */
  fill?: number;
  hidden?: boolean;
};

export function Legend({
  items,
  activeKey,
  onActiveChange,
  onSelect,
  direction = "row",
  selectHint,
}: {
  items: LegendItem[];
  activeKey?: string | null;
  onActiveChange?: (key: string | null) => void;
  onSelect?: (key: string) => void;
  direction?: "row" | "column" | "grid";
  selectHint?: string;
}) {
  return (
    <ul className={`${styles.legend} ${direction === "column" ? styles.legendColumn : direction === "grid" ? styles.legendGrid : ""}`}>
      {items.map((item) => {
        const body = (
          <>
            <span className={styles.legendTop}>
              <span className={styles.swatch} style={{ background: item.color }} />
              <span className={styles.legendLabel}>{item.label}</span>
              {item.value !== undefined ? <span className={styles.legendValue}>{item.value}</span> : null}
            </span>
            {item.fill !== undefined ? (
              <span className={styles.meter}>
                <span style={{ width: `${Math.max(0, Math.min(100, item.fill))}%`, background: item.color }} />
              </span>
            ) : null}
          </>
        );
        const cls = [
          styles.legendItem,
          item.hidden ? styles.legendOff : "",
          activeKey && activeKey !== item.key ? styles.legendDim : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                type="button"
                className={cls}
                title={selectHint}
                aria-pressed={item.hidden === undefined ? undefined : !item.hidden}
                onClick={() => onSelect(item.key)}
                onPointerEnter={() => onActiveChange?.(item.key)}
                onPointerLeave={() => onActiveChange?.(null)}
                onFocus={() => onActiveChange?.(item.key)}
                onBlur={() => onActiveChange?.(null)}
              >
                {body}
              </button>
            ) : (
              <span
                className={cls}
                onPointerEnter={() => onActiveChange?.(item.key)}
                onPointerLeave={() => onActiveChange?.(null)}
              >
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── donut ───────── */

export type DonutSegment = { key: string; label: string; value: number; color: string };

export function InteractiveDonut({
  segments,
  centerLabel,
  centerValue,
  activeKey,
  onActiveChange,
  onSelect,
  ariaLabel,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  activeKey: string | null;
  onActiveChange: (key: string | null) => void;
  onSelect?: (key: string) => void;
  ariaLabel: string;
}) {
  const size = 120;
  const stroke = 16;
  const radius = (size - stroke - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const active = segments.find((segment) => segment.key === activeKey);

  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const gap = visibleSegments.length > 1 ? 2 : 0;
  const arcs = visibleSegments.map((segment, index) => {
    const before = visibleSegments.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const length = (segment.value / total) * circumference;
    return { segment, dash: Math.max(0, length - gap), offset: (before / total) * circumference };
  });

  const onKey = (event: KeyboardEvent, key: string) => {
    if (onSelect && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onSelect(key);
    }
  };

  return (
    <div className={styles.donut}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map(({ segment, dash, offset: start }) => {
            const isActive = activeKey === segment.key;
            return (
              <circle
                key={segment.key}
                className={onSelect ? styles.donutArcLink : styles.donutArc}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={isActive ? stroke + 3 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-start}
                opacity={activeKey && !isActive ? 0.35 : 1}
                tabIndex={onSelect ? 0 : undefined}
                role={onSelect ? "link" : undefined}
                aria-label={`${segment.label}: ${segment.value}`}
                onPointerEnter={() => onActiveChange(segment.key)}
                onPointerLeave={() => onActiveChange(null)}
                onFocus={() => onActiveChange(segment.key)}
                onBlur={() => onActiveChange(null)}
                onClick={() => onSelect?.(segment.key)}
                onKeyDown={(event) => onKey(event, segment.key)}
              />
            );
          })}
        </g>
      </svg>
      <div className={styles.donutCenter} aria-hidden>
        <strong>{active ? active.value : centerValue}</strong>
        <span>{active ? active.label : centerLabel}</span>
        {active && total > 0 ? <em>{Math.round((active.value / total) * 100)}%</em> : null}
      </div>
    </div>
  );
}

/* ───────── bar/trend chart ───────── */

export type TrendSeries = { key: string; label: string; color: string };
export type TrendPoint = { id: string; label: string; title: string; values: Record<string, number> };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 4 ? 4 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function TrendChart({
  points,
  series,
  hidden,
  formatValue,
  ariaLabel,
  height = 232,
}: {
  points: TrendPoint[];
  series: TrendSeries[];
  hidden: Set<string>;
  formatValue: (value: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const visible = series.filter((item) => !hidden.has(item.key));
  const margin = { top: 10, right: 6, bottom: 24, left: 30 };
  const innerW = Math.max(60, width - margin.left - margin.right);
  const innerH = height - margin.top - margin.bottom;
  const count = Math.max(1, points.length);
  const groupW = innerW / count;

  const max = useMemo(() => {
    const peak = Math.max(0, ...points.flatMap((point) => visible.map((item) => point.values[item.key] ?? 0)));
    return niceMax(peak);
  }, [points, visible]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio * 10) / 10);
  const barW = Math.max(2, Math.min(16, (groupW * 0.72) / Math.max(1, visible.length)));
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(innerW / 58))));
  const y = (value: number) => margin.top + innerH - (value / max) * innerH;

  const onMove = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - margin.left;
    setHover(Math.max(0, Math.min(count - 1, Math.floor(x / groupW))));
  };

  const hovered = hover === null ? null : points[hover];
  const tipLeft = hover === null ? 0 : margin.left + hover * groupW + groupW / 2;

  return (
    <div ref={wrapRef} className={styles.trendWrap}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(event) => onMove(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={margin.left - 6} y={y(tick) + 3.5} textAnchor="end" className={styles.axisText}>
              {tick}
            </text>
          </g>
        ))}

        {hover !== null ? (
          <rect x={margin.left + hover * groupW} y={margin.top} width={groupW} height={innerH} fill="var(--color-primary-soft)" opacity={0.7} />
        ) : null}

        {points.map((point, index) => {
          const groupX = margin.left + index * groupW + (groupW - barW * visible.length - (visible.length - 1)) / 2;
          return (
            <g key={point.id}>
              {visible.map((item, seriesIndex) => {
                const value = point.values[item.key] ?? 0;
                const top = y(value);
                return (
                  <rect
                    key={item.key}
                    x={groupX + seriesIndex * (barW + 1)}
                    y={top}
                    width={barW}
                    height={Math.max(0, margin.top + innerH - top)}
                    rx={Math.min(3, barW / 2)}
                    fill={item.color}
                    opacity={hover === null || hover === index ? 1 : 0.55}
                  />
                );
              })}
              {index % labelEvery === 0 ? (
                <text x={margin.left + index * groupW + groupW / 2} y={height - 7} textAnchor="middle" className={styles.axisText}>
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hovered ? (
        <div className={styles.chartTip} style={{ left: Math.max(70, Math.min(width - 70, tipLeft)) }} role="status">
          <strong>{hovered.title}</strong>
          {visible.map((item) => (
            <span key={item.key}>
              <i style={{ background: item.color }} />
              {item.label}
              <b>{formatValue(hovered.values[item.key] ?? 0)}</b>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ───────── sparkline ───────── */

export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const width = 84;
  const height = 28;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const coords = values.map((value, index) => [index * step, height - 3 - ((value - min) / span) * (height - 6)] as const);
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg className={styles.sparkline} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.4} fill={color} />
    </svg>
  );
}
