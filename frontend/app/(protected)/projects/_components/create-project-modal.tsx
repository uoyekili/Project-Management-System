import { useState, useEffect, type FormEvent } from "react";
import type { UserProfile } from "@/types";
import { projectApi } from "@/services/api";
import { Modal } from "@/components/modal";
import { t } from "@/lib/i18n";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewerId: string;
  viewerName: string;
  viewerRole: string;
  accessibleUsers: UserProfile[];
  onProjectCreated: (projectId: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  viewerId,
  viewerName,
  viewerRole: _viewerRole,
  accessibleUsers: _accessibleUsers,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectStart, setNewProjectStart] = useState("2026-07-01");
  const [newProjectEnd, setNewProjectEnd] = useState("2026-08-15");
  const [newProjectType, setNewProjectType] = useState<"agile" | "waterfall">("agile");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const handleClose = () => {
    setFormError(null);
    onClose();
  };

  if (!isOpen) return null;

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (
      !newProjectName.trim() ||
      !newProjectDescription.trim() ||
      !newProjectStart ||
      !newProjectEnd
    ) {
      setFormError(t("Vui lòng nhập đầy đủ tên dự án, mô tả, ngày bắt đầu và ngày kết thúc."));
      return;
    }

    if (newProjectEnd < newProjectStart) {
      setFormError(t("Ngày kết thúc dự kiến phải sau ngày bắt đầu."));
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await projectApi.create({
        name: newProjectName.trim(),
        project_type: newProjectType,
        description: newProjectDescription.trim(),
        start_date: newProjectStart,
        end_date: newProjectEnd,
        // Server luôn gắn manager = người tạo; gửi viewerId để tương thích schema cũ.
        manager_id: parseInt(String(viewerId).replace("usr-", ""), 10),
      });

      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectStart("2026-07-01");
      setNewProjectEnd("2026-08-15");

      onProjectCreated(created.data.id);
      handleClose();
    } catch (error: unknown) {
      setFormError(extractErrorMessage(error, t("Không thể tạo dự án. Vui lòng thử lại.")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={t("Tạo dự án mới")}
      titleId="add-project-title"
      size="lg"
      onClose={handleClose}
      testId="create-project-modal"
    >
      <form onSubmit={handleCreateProject} data-testid="create-project-form" className="app-modal-form">
          <div className="app-modal-body">
            <div className="app-modal-grid-2">
              <div className="app-field">
                <label className="app-label">{t("Tên dự án")}</label>
                <input
                  data-testid="project-name"
                  className="app-input"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder={t("Nhập tên dự án...")}
                  required
                />
              </div>
              <div className="app-field">
                <label className="app-label">{t("Người quản lý")}</label>
                <input
                  data-testid="project-manager"
                  className="app-input"
                  value={viewerName}
                  disabled
                  readOnly
                />
              </div>
              <div className="app-field">
                <label className="app-label">{t("Phương pháp quản lý")}</label>
                <div className="radio-row">
                  <label className="radio-option">
                    <input
                      data-testid="project-type-agile"
                      type="radio"
                      name="projectType"
                      value="agile"
                      checked={newProjectType === "agile"}
                      onChange={() => setNewProjectType("agile")}
                                          />
                    Kanban
                  </label>
                  <label className="radio-option">
                    <input
                      data-testid="project-type-waterfall"
                      type="radio"
                      name="projectType"
                      value="waterfall"
                      checked={newProjectType === "waterfall"}
                      onChange={() => setNewProjectType("waterfall")}
                                          />
                    Waterfall
                  </label>
                </div>
              </div>

              <div className="app-field form-grid-span">
                <label className="app-label">{t("Mô tả chi tiết")}</label>
                <textarea
                  data-testid="project-description"
                  className="app-input"
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  placeholder={t("Mô tả mục tiêu và phạm vi của dự án...")}
                  required
                  rows={4}
                />
              </div>

              <div className="app-field">
                <label className="app-label">{t("Ngày bắt đầu")}</label>
                <input
                  data-testid="project-start-date"
                  className="app-input"
                  type="date"
                  value={newProjectStart}
                  onChange={(event) => setNewProjectStart(event.target.value)}
                  required
                />
              </div>
              <div className="app-field">
                <label className="app-label">{t("Ngày kết thúc dự kiến")}</label>
                <input
                  data-testid="project-end-date"
                  className="app-input"
                  type="date"
                  value={newProjectEnd}
                  onChange={(event) => setNewProjectEnd(event.target.value)}
                  required
                />
              </div>
            </div>

            {formError ? (
              <div className="error-state form-error" role="alert">
                {formError}
              </div>
            ) : null}
          </div>

          <div className="app-modal-footer">
            <button type="button" className="secondary-button" onClick={handleClose} disabled={isSubmitting}>
              {t("Hủy")}</button>
            <button type="submit" className="primary-button" disabled={isSubmitting} data-testid="create-project-submit">
              {isSubmitting ? t("Đang tạo...") : t("Tạo dự án")}
            </button>
          </div>
      </form>
    </Modal>
  );
}
