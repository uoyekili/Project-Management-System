import { CustomSelect } from "@/components/custom-select";
import { AssigneeMultiSelect } from "@/components/assignee-multi-select";
import { DateField } from "@/components/date-field";
import type { ReactNode } from "react";

import type { Task, UserProfile } from "@/types";
import styles from "./task-detail-view.module.css";
import { t } from "@/lib/i18n";

export interface TaskDraft {
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  assigneeIds: string[];
  startDate: string;
  dueDate: string;
  estimateHours: string;
  parentTaskId: string;
}

export const EMPTY_TASK_DRAFT: TaskDraft = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  assigneeIds: [],
  startDate: "",
  dueDate: "",
  estimateHours: "",
  parentTaskId: "",
};

/** Hạn chót = ngày bắt đầu + số ngày làm việc ước tính (8 giờ/ngày). */
function dueDateFromEstimate(startDate: string, estimateHours: number) {
  const due = new Date(startDate);
  due.setDate(due.getDate() + Math.ceil(estimateHours / 8) - 1);
  return due.toISOString().split("T")[0];
}

interface TaskPropertyFieldsProps {
  draft: TaskDraft;
  onChange: (patch: Partial<TaskDraft>) => void;
  /** Toàn bộ trường bị khoá (chế độ xem). */
  readOnly: boolean;
  /** Được sửa các trường ngoài trạng thái (quản lý / người tạo). */
  canEditFields: boolean;
  /** Dòng thông tin bổ sung hiển thị đầu danh sách (ví dụ: Dự án). */
  leading?: ReactNode;
  /** Đánh dấu bắt buộc cho ngày bắt đầu / hạn chót. */
  requireDates?: boolean;
  dateError?: string | null;
  className?: string;
}

export function TaskPropertyFields({
  draft,
  onChange,
  readOnly,
  canEditFields,
  leading,
  requireDates = false,
  dateError,
  className,
}: TaskPropertyFieldsProps) {
  const fieldsLocked = readOnly || !canEditFields;
  const estimate = parseFloat(draft.estimateHours) || 0;

  return (
    <div className={className ? `${styles.props} ${className}` : styles.props}>
      {leading}

      <div className={styles.prop}>
        <span className={styles.propLabel}>{t("Trạng thái")}</span>
        <CustomSelect
          className="task-detail-control"
          value={draft.status}
          onChange={(value) => onChange({ status: value as Task["status"] })}
          disabled={readOnly}
          style={{
            color: `var(--status-${draft.status === "DONE" ? "done" : draft.status === "IN_PROGRESS" ? "progress" : "todo"})`,
            backgroundColor: `var(--status-${draft.status === "DONE" ? "done" : draft.status === "IN_PROGRESS" ? "progress" : "todo"}-soft)`,
          }}
          options={[
            { value: "TODO", label: t("Cần làm") },
            { value: "IN_PROGRESS", label: t("Đang tiến hành") },
            { value: "DONE", label: t("Hoàn thành") },
          ]}
        />
      </div>

      <div className={styles.prop}>
        <span className={styles.propLabel}>
          {t("Ngày bắt đầu")}{requireDates ? <span className={styles.required} aria-hidden="true">*</span> : null}
        </span>
        <DateField
          ariaLabel={t("Ngày bắt đầu")}
          value={draft.startDate}
          disabled={fieldsLocked}
          onChange={(startDate) =>
            onChange({
              startDate,
              ...(estimate > 0 && startDate ? { dueDate: dueDateFromEstimate(startDate, estimate) } : {}),
            })
          }
        />
      </div>

      <div className={styles.prop}>
        <span className={styles.propLabel}>
          {t("Hạn chót")}{requireDates ? <span className={styles.required} aria-hidden="true">*</span> : null}
        </span>
        <DateField
          ariaLabel={t("Hạn chót")}
          value={draft.dueDate}
          disabled={fieldsLocked}
          onChange={(dueDate) => onChange({ dueDate })}
        />
      </div>

      {dateError ? (
        <div className={styles.fieldError} role="alert">
          {dateError}
        </div>
      ) : null}

      <div className={styles.prop}>
        <span className={styles.propLabel}>{t("Ưu tiên")}</span>
        <CustomSelect
          className="task-detail-control"
          value={draft.priority}
          onChange={(value) => onChange({ priority: value as Task["priority"] })}
          disabled={fieldsLocked}
          style={{
            color: `var(--priority-${draft.priority.toLowerCase()})`,
            backgroundColor: `var(--priority-${draft.priority.toLowerCase()}-soft)`,
          }}
          options={[
            { value: "LOW", label: t("Thấp") },
            { value: "MEDIUM", label: t("Trung bình") },
            { value: "HIGH", label: "Cao" },
            { value: "CRITICAL", label: t("Khẩn cấp") },
          ]}
        />
      </div>

      <label className={styles.prop}>
        <span className={styles.propLabel}>{t("Thời gian ước tính")}</span>
        <span className={styles.suffixWrap}>
          <input
            className="task-detail-control"
            type="number"
            min="0"
            step="0.5"
            aria-label={t("Thời gian ước tính")}
            placeholder="0"
            value={draft.estimateHours}
            onChange={(event) => {
              const value = event.target.value;
              const hours = parseFloat(value) || 0;
              onChange({
                estimateHours: value,
                ...(hours > 0 && draft.startDate
                  ? { dueDate: dueDateFromEstimate(draft.startDate, hours) }
                  : {}),
              });
            }}
            disabled={fieldsLocked}
          />
          <span className={styles.suffix} aria-hidden="true">{t("giờ")}</span>
        </span>
      </label>
    </div>
  );
}

interface TaskAssigneesCardProps {
  assigneeIds: string[];
  onChange: (assigneeIds: string[]) => void;
  /** Người dùng có thể chọn thêm. */
  options: UserProfile[];
  /** Người dùng đã giao nhưng có thể không còn trong options. */
  knownUsers: UserProfile[];
  disabled: boolean;
  title?: string;
}

export function TaskAssigneesCard({
  assigneeIds,
  onChange,
  options,
  knownUsers,
  disabled,
  title,
}: TaskAssigneesCardProps) {
  return (
    <section className={styles.card} title={title}>
      <h3 className={styles.cardTitle}>{t("Người thực hiện")}</h3>
      {disabled && assigneeIds.length === 0 ? (
        <p className={styles.hint}>{t("Chưa giao cho ai.")}</p>
      ) : (
        <AssigneeMultiSelect
          value={assigneeIds}
          onChange={onChange}
          options={options}
          knownUsers={knownUsers}
          disabled={disabled}
        />
      )}
    </section>
  );
}
