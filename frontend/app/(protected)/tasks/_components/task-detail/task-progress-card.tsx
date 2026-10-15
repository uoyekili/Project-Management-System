import { memo } from "react";

import { t } from "@/lib/i18n";
import type { LogworkProgress } from "./task-detail-utils";
import styles from "./task-detail.module.css";

export const TaskProgressCard = memo(function TaskProgressCard({
  progress,
}: {
  progress: LogworkProgress;
}) {
  const { loggedHours, estimateHours, percent, isOver } = progress;
  const barTone = isOver ? styles.barOver : percent >= 100 ? styles.barDone : "";

  return (
    <section className={styles.card} aria-labelledby="task-progress-heading">
      <div className={styles.progressHead}>
        <h3 id="task-progress-heading" className={styles.sectionTitle}>
          {t("Tiến độ logwork")}
        </h3>
        <strong className={styles.progressValue}>{percent}%</strong>
      </div>
      <div
        className={`${styles.bar} ${barTone}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="task-progress-heading"
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>{t("Đã ghi nhận")}</dt>
          <dd>{loggedHours}h</dd>
        </div>
        <div>
          <dt>{t("Ước tính")}</dt>
          <dd>{estimateHours}h</dd>
        </div>
        <div className={isOver ? styles.statOver : undefined}>
          <dt>{isOver ? t("Vượt") : t("Còn lại")}</dt>
          <dd>{Math.abs(estimateHours - loggedHours)}h</dd>
        </div>
      </dl>
    </section>
  );
});
