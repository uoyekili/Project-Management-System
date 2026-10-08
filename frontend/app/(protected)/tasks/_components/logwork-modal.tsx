import { useState, type FormEvent } from "react";
import { toVietnamDateInputValue } from "@/lib/utils/format";
import { taskApi } from "@/services/api";
import { Modal } from "@/components/modal";
import { t } from "@/lib/i18n";

interface LogworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  userId: string;
  onSuccess?: () => void | Promise<void>;
}

export function LogworkModal({
  isOpen,
  onClose,
  taskId,
  userId,
  onSuccess,
}: LogworkModalProps) {
  void userId;
  const [hours, setHours] = useState("0");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toVietnamDateInputValue());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setFormError(null);
    onClose();
  };

  if (!isOpen) return null;

  async function handleLogwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const hoursVal = parseFloat(hours);
    if (isNaN(hoursVal)) {
      setFormError(t("Số giờ log không hợp lệ."));
      return;
    }

    if (hoursVal < 0) {
      setFormError(t("Số giờ logwork không được âm."));
      return;
    }

    if (!title.trim()) {
      setFormError(t("Vui lòng nhập tên logwork."));
      return;
    }

    if (!description.trim()) {
      setFormError(t("Vui lòng nhập nội dung công việc."));
      return;
    }

    setIsSubmitting(true);
    try {
      await taskApi.addLogwork(taskId, {
        workDate: date,
        hoursSpent: hoursVal,
        title: title.trim(),
        workContent: description.trim(),
        progressPercent: 0,
      });

      if (onSuccess) {
        await onSuccess();
      }

      setHours("0");
      setTitle("");
      setDescription("");
      handleClose();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : t("Không thể lưu logwork."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={t("Tạo logwork")} titleId="logwork-title" size="md" onClose={handleClose} testId="logwork-modal">
        <form onSubmit={handleLogwork} data-testid="logwork-form" className="app-modal-form">
          <div className="app-modal-body" style={{ paddingBottom: "var(--space-4)" }}>
            <div className="app-modal-grid-2">
              <div className="app-field">
                <label className="app-label">{t("Số giờ")}</label>
                <input
                  data-testid="logwork-hours"
                  className="app-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder={t("Ví dụ: 2.5")}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="app-field">
                <label className="app-label">{t("Ngày thực hiện")}</label>
                <input
                  data-testid="logwork-date"
                  className="app-input"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="app-field form-grid-span">
                <label className="app-label">{t("Tên logwork")}</label>
                <input
                  data-testid="logwork-title"
                  className="app-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isSubmitting}
                  required
                  maxLength={255}
                  placeholder={t("Ví dụ: Fix lỗi đăng nhập, họp sprint...")}
                />
              </div>
              <div className="app-field form-grid-span">
                <label className="app-label">{t("Nội dung công việc")}</label>
                <textarea
                  data-testid="logwork-description"
                  className="app-input"
                  rows={8}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                  required
                  placeholder={t("Mô tả phần việc đã làm và kết quả đạt được...")}
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
            <button
              type="button"
              className="secondary-button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("Hủy")}</button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
              data-testid="logwork-submit"
            >
              {t("Lưu")}</button>
          </div>
        </form>
    </Modal>
  );
}
