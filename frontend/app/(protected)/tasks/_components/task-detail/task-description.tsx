import { memo } from "react";

import { t } from "@/lib/i18n";
import { CollapsibleCard } from "./collapsible-card";
import styles from "./task-detail.module.css";

interface TaskDescriptionProps {
  text: string;
  isEditing: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}

export const TaskDescription = memo(function TaskDescription({
  text,
  isEditing,
  disabled,
  onChange,
}: TaskDescriptionProps) {
  return (
    <CollapsibleCard headingId="task-description-heading" title={t("Mô tả công việc")}>
      {isEditing ? (
        <>
          <textarea
            className={`task-detail-description ${styles.descriptionInput}`}
            aria-labelledby="task-description-heading"
            value={text}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t("Mô tả mục tiêu, phạm vi và tiêu chí hoàn thành...")}
          />
          <div className={styles.charCount}>
            {text.length} {t("ký tự")}
          </div>
        </>
      ) : text.trim() ? (
        <p className={styles.descriptionText}>{text}</p>
      ) : (
        <p className={styles.emptyText}>{t("Chưa có mô tả.")}</p>
      )}
    </CollapsibleCard>
  );
});
