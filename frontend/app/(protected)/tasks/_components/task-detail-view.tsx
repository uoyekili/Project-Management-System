import { useState } from "react";

import type { TaskLogworkEntry, UserProfile } from "@/types";
import { t } from "@/lib/i18n";
import { LogworkEntryDetailModal } from "./logwork-entry-detail-modal";
import { LogworkModal } from "./logwork-modal";
import { CollapsibleCard } from "./task-detail/collapsible-card";
import { TaskDescription } from "./task-detail/task-description";
import { TaskDetailHeader } from "./task-detail/task-detail-header";
import { TaskLogworkSection } from "./task-detail/task-logwork-section";
import { TaskProgressCard } from "./task-detail/task-progress-card";
import { buildDraft } from "./task-detail/task-detail-utils";
import { useTaskDetail } from "./task-detail/use-task-detail";
import detail from "./task-detail/task-detail.module.css";
import { TaskComments } from "./task-comments";
import { TaskAssigneesCard, TaskPropertyFields } from "./task-form-fields";

interface TaskDetailViewProps {
  taskId: string;
  users: UserProfile[];
  viewer: UserProfile;
  /** Task được mở từ trong dự án: ẩn nút "Đi tới dự án" vì đã có nút quay lại. */
  fromProject?: boolean;
}

export function TaskDetailView({
  taskId,
  users,
  viewer,
  fromProject = false,
}: TaskDetailViewProps) {
  const state = useTaskDetail({ taskId, users, viewer });
  const { task, draft, isEditing, isLoading, isSaving, permissions, actions } = state;

  const [isLogworkModalOpen, setIsLogworkModalOpen] = useState(false);
  const [selectedLogwork, setSelectedLogwork] = useState<TaskLogworkEntry | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Chế độ xem hiển thị từ task; chế độ sửa hiển thị bản nháp.
  const view = isEditing ? draft : task ? buildDraft(task) : draft;

  return (
    <div className={detail.page}>
      <TaskDetailHeader
        task={task}
        draftTitle={draft.title}
        isLoading={isLoading}
        isSaving={isSaving}
        isEditing={isEditing}
        showProjectLink={!fromProject}
        canEditTask={permissions.canEditTask}
        canDeleteTask={permissions.canDeleteTask}
        actions={actions}
      />

      <div className={detail.layout}>
        <div className={detail.main}>
          {task ? (
            <TaskAssigneesCard
              assigneeIds={view.assigneeIds}
              onChange={(assigneeIds) => actions.patchDraft({ assigneeIds })}
              options={state.assignee.options}
              knownUsers={state.assignee.known}
              disabled={state.assignee.disabled}
              title={state.assignee.lockReason}
            />
          ) : null}

          <TaskDescription
            text={view.description}
            isEditing={isEditing}
            disabled={isSaving}
            onChange={(description) => actions.patchDraft({ description })}
          />

          {!isEditing ? (
            <>
              <TaskLogworkSection
                logworks={state.logworks}
                users={users}
                isLoading={isLoading}
                canLogwork={permissions.canLogwork}
                hasChildren={Boolean(task?.hasChildren)}
                onCreate={() => setIsLogworkModalOpen(true)}
                onSelect={setSelectedLogwork}
              />

              <CollapsibleCard
                headingId="task-comments-heading"
                title={
                  <>
                    {t("Bình luận")} <span className={detail.count}>{commentCount}</span>
                  </>
                }
              >
                <TaskComments
                  taskId={taskId}
                  users={users}
                  mentionableUsers={state.projectUsers}
                  viewer={viewer}
                  canManage={permissions.canEditTask}
                  onCountChange={setCommentCount}
                />
              </CollapsibleCard>
            </>
          ) : null}
        </div>

        <aside className={detail.rail}>
          {!isEditing ? <TaskProgressCard progress={state.progress} /> : null}

          <section className={detail.card} aria-labelledby="task-info-heading">
            <h3 id="task-info-heading" className={detail.sectionTitle}>
              {t("Thông tin")}
            </h3>
            {task ? (
              <TaskPropertyFields
                draft={view}
                onChange={actions.patchDraft}
                readOnly={!isEditing || isLoading || isSaving}
                canEditFields={permissions.canEditTask}
              />
            ) : null}
          </section>
        </aside>
      </div>

      {task ? (
        <LogworkModal
          isOpen={isLogworkModalOpen}
          onClose={() => setIsLogworkModalOpen(false)}
          taskId={task.id}
          userId={viewer.id}
          onSuccess={actions.reloadLogworks}
        />
      ) : null}

      <LogworkEntryDetailModal
        entry={selectedLogwork}
        isOpen={!!selectedLogwork}
        onClose={() => setSelectedLogwork(null)}
        canGoToApprovals={permissions.canGoToLogworkApprovals}
      />
    </div>
  );
}
