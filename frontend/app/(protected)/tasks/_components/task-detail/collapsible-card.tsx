import { useId, useState, type ReactNode } from "react";

import { t } from "@/lib/i18n";
import styles from "./task-detail.module.css";

interface CollapsibleCardProps {
  /** Dùng để gắn `aria-labelledby`/id tiêu đề. */
  headingId: string;
  title: ReactNode;
  /** Nút thao tác bên phải tiêu đề (vd. "+ Logwork"); luôn hiển thị kể cả khi thu gọn. */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Card có nút thu gọn/mở rộng; nội dung vẫn được giữ trong DOM (ẩn) để không mất trạng thái bên trong. */
export function CollapsibleCard({
  headingId,
  title,
  actions,
  defaultOpen = true,
  children,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <h3 id={headingId} className={styles.sectionTitle}>
          {title}
        </h3>
        <div className={styles.sectionActions}>
          {actions}
          <button
            type="button"
            className={styles.collapseButton}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            aria-label={isOpen ? t("Thu gọn") : t("Mở rộng")}
            title={isOpen ? t("Thu gọn") : t("Mở rộng")}
            onClick={() => setIsOpen((current) => !current)}
          >
            <svg
              className={`${styles.chevron}${isOpen ? "" : ` ${styles.chevronClosed}`}`}
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div id={bodyId} hidden={!isOpen} className={styles.collapsibleBody}>
        {children}
      </div>
    </section>
  );
}
