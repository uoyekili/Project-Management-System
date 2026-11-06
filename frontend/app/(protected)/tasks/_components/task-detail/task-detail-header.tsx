import { memo } from "react";

import { ActionButton } from "@/components/action-button";
import { BackButton } from "@/components/back-button";
import { t } from "@/lib/i18n";
import type { TaskDetailState } from "./use-task-detail";
import styles from "./task-detail.module.css";

interface TaskDetailHeaderProps {
  task: TaskDetailState["task"];
  draftTitle: string;
  isLoading: boolean;
  isSaving: boolean;
  isEditing: boolean;
  showProjectLink: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  actions: TaskDetailState["actions"];
}

/** Hàng thao tác (quay lại + hành động) theo chuẩn hệ thống, rồi đến card tên task. */
export const TaskDetailHeader = memo(function TaskDetailHeader({
  task,
  draftTitle,
  isLoading,
  isSaving,
  isEditing,
  showProjectLink,
  canEditTask,
  canDeleteTask,
  actions,
}: TaskDetailHeaderProps) {
  const editingTitle = isEditing && canEditTask;

  return (
    <>
      <div className={styles.toolbar}>
        <BackButton onClick={actions.goBack} />
        <div className={styles.toolbarActions}>
          {task?.projectId && showProjectLink ? (
            <ActionButton kind="open" onClick={actions.goToProject}>
              {t("Đi tới dự án")}
            </ActionButton>
          ) : null}
          {isEditing ? (
            <>
              <ActionButton kind="cancel" onClick={actions.cancelEditing} disabled={isSaving}>
                {t("Hủy")}
              </ActionButton>
              <ActionButton kind="save" onClick={() => void actions.saveEditing()} disabled={isSaving}>
                {isSaving ? t("Đang lưu") : t("Lưu thay đổi")}
              </ActionButton>
            </>
          ) : (
            <>
              {canEditTask ? (
                <ActionButton kind="edit" onClick={actions.startEditing} disabled={isLoading || !task}>
                  {t("Chỉnh sửa")}
                </ActionButton>
              ) : null}
              {canDeleteTask ? (
                <ActionButton
                  kind="delete"
                  onClick={() => void actions.deleteTask()}
                  disabled={isLoading || isSaving}
                >
                  {t("Xóa task")}
                </ActionButton>
              ) : null}
            </>
          )}
        </div>
      </div>

      <section className={`${styles.card} ${styles.titleCard}`}>
        {editingTitle ? (
          <>
            <label htmlFor="task-detail-title-input" className={styles.sectionTitle}>
              {t("Tên công việc")}
            </label>
            <input
              id="task-detail-title-input"
              autoFocus
              className={`app-input ${styles.titleInput}`}
              placeholder={t("Nhập tên công việc")}
              value={draftTitle}
              onChange={(event) => actions.patchDraft({ title: event.target.value })}
            />
          </>
        ) : (
          <div className={styles.titleRow}>
            <span className={styles.keyBadge}>{task?.key}</span>
            <h2 id="task-detail-title" className={styles.title}>
              {task?.title}
            </h2>
          </div>
        )}
      </section>
    </>
  );
});
