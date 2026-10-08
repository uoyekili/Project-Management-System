import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { LoadingState } from "@/components/loading-state";
import { SearchSelect } from "@/components/search-select";
import { canInProject } from "@/lib/permissions";
import { projectApi, taskApi } from "@/services/api";
import type { EnrichedTask, Project, UserProfile } from "@/types";
import {
  EMPTY_TASK_DRAFT,
  TaskAssigneesCard,
  TaskPropertyFields,
  type TaskDraft,
} from "./task-form-fields";
import styles from "./task-detail-view.module.css";
import { t } from "@/lib/i18n";

interface TaskCreateViewProps {
  projectId: string;
  parentTaskId: string;
  users: UserProfile[];
  viewer: UserProfile;
}

export function TaskCreateView({ projectId, parentTaskId, users, viewer }: TaskCreateViewProps) {
  const router = useRouter();
  const { alert } = useConfirmDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<EnrichedTask[]>([]);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_TASK_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    projectApi
      .list(undefined, viewer)
      .then(({ data }) => setProjects(data))
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.id]);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const [{ data: nextProject }, { data: tasks }] = await Promise.all([
          projectApi.get(selectedProjectId, viewer),
          taskApi.getEnrichedBoard({ projectId: selectedProjectId }, viewer, { users }),
        ]);
        if (isCancelled) return;

        const isInitial = isFirstLoadRef.current;
        isFirstLoadRef.current = false;
        const parent = isInitial
          ? tasks.find((task) => String(task.id) === String(parentTaskId))
          : undefined;

        setProject(nextProject);
        setProjectTasks(tasks);
        // Đổi dự án thì người thực hiện và task cha của dự án cũ không còn hợp lệ.
        setDraft((current) => ({
          ...current,
          assigneeIds: [],
          parentTaskId: parent ? String(parent.id) : "",
        }));
      } catch (error: unknown) {
        if (isCancelled) return;
        await alert({
          title: t("Không thể tải dự án"),
          message: error instanceof Error ? error.message : t("Không thể tải thông tin dự án."),
        });
        if (isFirstLoadRef.current) router.replace("/projects");
      }
    }

    void load();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, parentTaskId, viewer.id]);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/projects/${selectedProjectId}`);
    }
  }

  const hasDateOrderError = Boolean(
    draft.startDate && draft.dueDate && draft.dueDate < draft.startDate,
  );
  const canSubmit =
    Boolean(project) &&
    project?.id === selectedProjectId &&
    draft.title.trim() !== "" &&
    draft.startDate !== "" &&
    draft.dueDate !== "" &&
    !hasDateOrderError;

  function handleParentChange(nextParentId: string) {
    setDraft((current) => {
      const parent = projectTasks.find((task) => String(task.id) === String(nextParentId));
      const allowed = parent
        ? parent.assigneeIds?.length
          ? parent.assigneeIds
          : parent.assigneeId
            ? [parent.assigneeId]
            : []
        : [];
      const keptAssignees = parent
        ? current.assigneeIds.filter((id) => allowed.includes(id))
        : current.assigneeIds;
      return {
        ...current,
        parentTaskId: nextParentId,
        assigneeIds: keptAssignees,
      };
    });
  }

  async function handleCreate() {
    if (!project || !canSubmit) return;

    setIsSaving(true);
    try {
      const response = await taskApi.create({
        projectId: project.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status,
        priority: draft.priority,
        startDate: draft.startDate,
        dueDate: draft.dueDate,
        estimateHours: parseFloat(draft.estimateHours) || 0,
        assigneeId: draft.assigneeIds[0] ?? "",
        assigneeIds: draft.assigneeIds,
        sprintId: null,
        parentTaskId: draft.parentTaskId || null,
        spentHours: 0,
        tags: [],
        blockers: [],
        commentsCount: 0,
        lastActivity: "",
        key: "",
        reporterId: "",
      });
      router.replace(`/tasks/${response.data.id}`);
    } catch (error: unknown) {
      await alert({
        title: t("Tạo công việc thất bại"),
        message: error instanceof Error ? error.message : t("Lỗi tạo công việc."),
      });
      setIsSaving(false);
    }
  }

  if (!project) {
    return <LoadingState variant="cards" />;
  }

  const isAgile = project.projectType === "agile";
  const parentTask = draft.parentTaskId
    ? projectTasks.find((task) => String(task.id) === String(draft.parentTaskId))
    : undefined;
  const parentAssigneeIds = parentTask
    ? parentTask.assigneeIds?.length
      ? parentTask.assigneeIds
      : parentTask.assigneeId
        ? [parentTask.assigneeId]
        : []
    : [];
  // task.create:OWN chỉ được tạo cho bản thân; task.create:PROJECT được giao cho người khác.
  const canCreateForOthers = canInProject(project, "task", "create", "PROJECT");
  const memberUsers = users.filter(
    (user) =>
      project.memberIds.includes(user.id) &&
      (canCreateForOthers || user.id === viewer.id) &&
      (!parentTask || parentAssigneeIds.includes(user.id)),
  );
  const projectOptions = (projects.length ? projects : [project]).map((item) => ({
    value: item.id,
    label: item.name,
    meta: item.code,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <BackButton onClick={handleBack} />
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleBack}
            disabled={isSaving}
          >
            {t("Hủy")}</button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => void handleCreate()}
            disabled={isSaving || !canSubmit}
            title={
              canSubmit
                ? undefined
                : t("Nhập tên công việc, ngày bắt đầu và hạn chót hợp lệ để tạo task")
            }
          >
            {isSaving ? t("Đang tạo...") : t("Tạo task")}
          </button>
        </div>
      </div>

      <section className={styles.card}>
        <label htmlFor="task-create-title" className={styles.cardTitle}>
          {t("Tên công việc")}</label>
        <input
          id="task-create-title"
          autoFocus
          className={`app-input ${styles.createTitleInput}`}
          placeholder={t("Nhập tên công việc...")}
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
      </section>

      <TaskAssigneesCard
        assigneeIds={draft.assigneeIds}
        onChange={(assigneeIds) => setDraft((current) => ({ ...current, assigneeIds }))}
        options={memberUsers}
        knownUsers={users}
        disabled={isSaving || isAgile || (Boolean(parentTask) && parentAssigneeIds.length === 0)}
        title={
          isAgile
            ? t("Trong mô hình Agile, người thực hiện được tự động gán khi kéo thả Task trên bảng Kanban.")
            : parentTask
              ? parentAssigneeIds.length
                ? t("Chỉ có thể giao cho người đang thực hiện task cha.")
                : t("Task cha chưa có người thực hiện nên chưa thể giao task con.")
              : ""
        }
      />

      <div className={styles.stack}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t("Thông tin")}</h3>
          <TaskPropertyFields
            draft={draft}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            readOnly={isSaving}
            canEditFields
            className={styles.propsGrid}
            requireDates
            dateError={hasDateOrderError ? t("Hạn chót phải sau hoặc bằng ngày bắt đầu.") : null}
            leading={
              <>
                <div className={`${styles.prop} ${styles.propFull}`}>
                  <span className={styles.propLabel}>{t("Dự án")}</span>
                  <SearchSelect
                    ariaLabel={t("Dự án")}
                    value={selectedProjectId}
                    onChange={(next) => next && setSelectedProjectId(next)}
                    disabled={isSaving}
                    options={projectOptions}
                  />
                </div>
                {!isAgile ? (
                  <div className={`${styles.prop} ${styles.propFull}`}>
                    <span className={styles.propLabel}>Task cha</span>
                    <SearchSelect
                      ariaLabel="Task cha"
                      value={draft.parentTaskId}
                      onChange={handleParentChange}
                      disabled={isSaving}
                      clearable
                      placeholder={t("Không chọn")}
                      options={projectTasks.map((task) => ({
                        value: task.id,
                        label: `${task.key} - ${task.title}`,
                        searchText: String(task.id),
                      }))}
                    />
                  </div>
                ) : null}
              </>
            }
          />
        </section>

        <section className={`${styles.card} ${styles.descCard}`}>
          <h3 className={styles.cardTitle}>{t("Mô tả công việc")}</h3>
          <textarea
            className={`task-detail-description ${styles.description}`}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder={t("Nhập mô tả công việc...")}
            disabled={isSaving}
          />
          <div className={styles.hint}>{draft.description.length}  {t("ký tự")}</div>
        </section>
      </div>
    </div>
  );
}
