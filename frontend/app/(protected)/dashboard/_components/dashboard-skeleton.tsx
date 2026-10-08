import styles from "../styles/dashboard.module.css";
import { t } from "@/lib/i18n";

/** Skeleton khớp bố cục thật: KPI → cảnh báo → phân tích → hành động. */
export function DashboardSkeleton({ label = t("Đang tải dữ liệu tổng quan...") }: { label?: string }) {
  const card = (className: string, rows = 4) => (
    <div className={`${styles.card} ${className}`}>
      <span className={`${styles.skel} ${styles.skelTitle}`} />
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className={`${styles.skel} ${styles.skelLine}`} />
      ))}
    </div>
  );

  return (
    <div className={styles.page} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.kpiGrid}>
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={`${styles.skel} ${styles.skelKpi}`} />
        ))}
      </div>
      <span className={`${styles.skel} ${styles.skelStrip}`} />
      <div className={styles.analysisGrid}>
        {card(styles.spanFull, 6)}
        {card(styles.spanHealth, 5)}
        {card(styles.spanDistribution, 5)}
        {card(styles.spanHalf, 4)}
        {card(styles.spanHalf, 4)}
      </div>
      <div className={styles.actionGrid}>
        {card("", 4)}
        {card("", 4)}
        {card("", 4)}
      </div>
    </div>
  );
}
