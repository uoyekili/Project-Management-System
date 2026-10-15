import { useState, useEffect, useEffectEvent, type FormEvent } from "react";
import type { UserProfile, Project } from "@/types";
import { projectApi } from "@/services/api";
import { CustomSelect } from "@/components/custom-select";
import { Modal } from "@/components/modal";
import { t } from "@/lib/i18n";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  viewerId: string;
  viewerRole: string;
  accessibleUsers: UserProfile[];
  onProjectUpdated: () => void;
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}: EditProjectModalProps) {
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);
  const extractErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const syncModalState = useEffectEvent(() => {
    if (!project) return;

    setEditName(project.name || "");
    setEditDescription(project.description || "");
    setEditStart(project.startDate || "");
    setEditEnd(project.endDate || "");
    setEditStatus(project.status || "ACTIVE");
    setFormError(null);
  });

  useEffect(() => {
    if (isOpen && project) {
      queueMicrotask(() => {
        syncModalState();
      });
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;


  async function handleUpdateInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!editName.trim() || !editStart) {
      setFormError(t("Vui lòng nhập đầy đủ tên dự án và ngày bắt đầu."));
      return;
    }

    if (editEnd && editEnd < editStart) {
      setFormError(t("Ngày kết thúc dự kiến phải sau ngày bắt đầu."));
      return;
    }

    try {
      await projectApi.update(project!.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        status: editStatus as Project["status"],
        startDate: editStart,
        endDate: editEnd,
      });
      onProjectUpdated();
      onClose();
    } catch (error: unknown) {
      setFormError(extractErrorMessage(error, t("Cập nhật thất bại.")));
    }
  }

  return (
    <Modal
      title={project.name}
      titleId="edit-project-title"
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleUpdateInfo} className="app-modal-form">
        <div className="app-modal-body">
          <div className="app-modal-grid-2">
            <div className="app-field form-grid-span">
              <label className="app-label">
                {t("Tên dự án")}</label>
              <input
                className="app-input"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </div>
            
            <div className="app-field">
              <label className="app-label">
                {t("Trạng thái")}</label>
              <CustomSelect
                className="app-input"
                value={editStatus}
                onChange={(val) => setEditStatus(val)}
                options={[
                  { value: "ACTIVE", label: t("Đang triển khai") },
                  { value: "PLANNING", label: t("Đang lập kế hoạch") },
                  { value: "AT_RISK", label: t("Rủi ro trễ hạn") },
                  { value: "COMPLETED", label: t("Đã hoàn thành") },
                  { value: "ON_HOLD", label: t("Tạm dừng") },
                ]}
              />
            </div>
            
            <div className="app-field">
              <label className="app-label">
                {t("Ngày bắt đầu")}</label>
              <input
                className="app-input"
                type="date"
                value={editStart}
                onChange={(event) => setEditStart(event.target.value)}
                required
              />
            </div>
            
            <div className="app-field">
              <label className="app-label">
                {t("Ngày kết thúc dự kiến")}</label>
              <input
                className="app-input"
                type="date"
                value={editEnd}
                onChange={(event) => setEditEnd(event.target.value)}
              />
            </div>

            <div className="app-field form-grid-span">
              <label className="app-label">
                {t("Mô tả chi tiết")}</label>
              <textarea
                className="app-input"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
              />
            </div>
          </div>

          {formError && (
            <div className="error-state form-error" role="alert">
              {formError}
            </div>
          )}
        </div>

        <div className="app-modal-footer">
          <button type="submit" className="primary-button">
            {t("Lưu thay đổi")}</button>
        </div>
      </form>
    </Modal>
  );
}
