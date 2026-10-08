import { Modal } from "@/components/modal";
import { useState, useEffect } from "react";
import { sprintApi } from "@/services/api";

import type { Sprint } from "@/types";
import { t } from "@/lib/i18n";

interface CreateSprintModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSprintId?: string) => void;
  sprintToEdit?: Sprint | null;
  canManage?: boolean;
}

const today = new Date().toISOString().split("T")[0];
// Tương lai 2 tuần
const twoWeeksLater = new Date();
twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
const defaultEnd = twoWeeksLater.toISOString().split("T")[0];

export function CreateSprintModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess,
  sprintToEdit,
  canManage = true,
}: CreateSprintModalProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (sprintToEdit) {
        setName(sprintToEdit.name || "");
        setGoal(sprintToEdit.goal || "");
        setStartDate(sprintToEdit.plannedStart || today);
        setEndDate(sprintToEdit.plannedEnd || defaultEnd);
      } else {
        setName("");
        setGoal("");
        setStartDate(today);
        setEndDate(defaultEnd);
      }
      setFormError(null);
    }
  }, [isOpen, sprintToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim() || !startDate || !endDate) {
      setFormError(t("Vui lòng nhập tên, ngày bắt đầu và ngày kết thúc."));
      return;
    }

    if (endDate < startDate) {
      setFormError(t("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu."));
      return;
    }

    setIsLoading(true);
    try {
      if (sprintToEdit) {
        await sprintApi.update(sprintToEdit.id, {
          name: name.trim(),
          goal: goal.trim(),
          plannedStart: startDate,
          plannedEnd: endDate,
        });
      } else {
        const response = await sprintApi.create(projectId, {
          name: name.trim(),
          goal: goal.trim(),
          status: "PLANNING",
          progress: 0,
          committedPoints: 0,
          completedPoints: 0,
          plannedStart: startDate,
          plannedEnd: endDate,
          health: "on_track",
          focusAreas: ["Goal alignment", "Task readiness", "Resource allocation"],
        } as any);
        
        // Xoá trắng
        setName("");
        setGoal("");
        setStartDate(today);
        setEndDate(defaultEnd);

        onSuccess(String(response.data.id));
        return;
      }

      // Xoá trắng
      setName("");
      setGoal("");
      setStartDate(today);
      setEndDate(defaultEnd);

      onSuccess(sprintToEdit ? String(sprintToEdit.id) : undefined);
    } catch (err: any) {
      setFormError(err.message || t("Đã xảy ra lỗi khi tạo sprint."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={sprintToEdit ? t("Chi tiết Sprint") : t("Tạo Sprint mới")}
      titleId="create-sprint-title"
      size="sm"
      onClose={onClose}
      testId="create-sprint-modal"
    >
      <form onSubmit={handleSubmit} data-testid="create-sprint-form" className="app-modal-form">
        <div className="app-modal-body">
          <div>
            <label className="form-label">{t("Tên Sprint")}<span className="required-asterisk" aria-hidden="true">*</span></label>
            <input className="app-input"
              data-testid="sprint-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sprint 1"
              required
              disabled={!!sprintToEdit && !canManage}
            />
          </div>

          <div>
            <label className="form-label">{t("Mục tiêu trọng tâm")}</label>
            <textarea className="app-input"
              data-testid="sprint-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t("VD: Hoàn thiện tính năng đăng nhập...")}
              rows={3}
              disabled={!!sprintToEdit && !canManage}
            />
          </div>

          <div className="app-modal-grid-2">
            <div>
              <label className="form-label">{t("Ngày bắt đầu")}<span className="required-asterisk" aria-hidden="true">*</span></label>
              <input className="app-input"
                data-testid="sprint-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={!!sprintToEdit && !canManage}
              />
            </div>
            <div>
              <label className="form-label">{t("Ngày kết thúc")}<span className="required-asterisk" aria-hidden="true">*</span></label>
              <input className="app-input"
                data-testid="sprint-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={!!sprintToEdit && !canManage}
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
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
              disabled={isLoading}
            >
              {t("Đóng")}</button>
            {(!sprintToEdit || canManage) && (
              <button
                type="submit"
                data-testid="create-sprint-submit"
                className="primary-button"
                disabled={isLoading || !name.trim() || !startDate || !endDate}
              >
                {isLoading ? t("Đang lưu...") : sprintToEdit ? t("Cập nhật Sprint") : t("Tạo Sprint")}
              </button>
            )}
        </div>
      </form>
    </Modal>
  );
}
