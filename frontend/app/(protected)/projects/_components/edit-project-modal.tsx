import { useState, useEffect, useEffectEvent, type FormEvent } from "react";
import { roleLabel, projectRoleLabel } from "@/lib/utils/format";
import type { UserProfile, Project } from "@/types";
import { projectApi } from "@/services/api";
import type { ProjectMemberResponse } from "@/services/api/projects";
import { CustomSelect } from "@/components/custom-select";
import { LoadingState } from "@/components/loading-state";
import { Modal } from "@/components/modal";
import { Tabs } from "@/components/tabs";
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
  viewerRole,
  accessibleUsers,
  onProjectUpdated,
}: EditProjectModalProps) {
  void viewerRole;
  const [activeTab, setActiveTab] = useState<"INFO" | "MEMBERS">("INFO");
  
  // Info State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);

  // Members State
  const [members, setMembers] = useState<ProjectMemberResponse[]>([]);
  const [newMemberId, setNewMemberId] = useState("");
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const extractErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const syncModalState = useEffectEvent(() => {
    if (!project) return;

    setEditName(project.name || "");
    setEditDescription(project.description || "");
    setEditStart(project.startDate || "");
    setEditEnd(project.endDate || "");
    setEditStatus(project.status || "ACTIVE");
    setActiveTab("INFO");
    setFormError(null);
    setMembersError(null);
    void loadMembersAndRoles();
  });

  useEffect(() => {
    if (isOpen && project) {
      queueMicrotask(() => {
        syncModalState();
      });
    }
  }, [isOpen, project]);

  async function loadMembersAndRoles() {
    if (!project) return;
    setIsLoadingMembers(true);
    try {
      const membersRes = await projectApi.listMembers(project.id);
      setMembers(membersRes.data || []);

      if (accessibleUsers.length > 0) {
        setNewMemberId(accessibleUsers[0].id);
      }
    } catch (error: unknown) {
      setMembersError(extractErrorMessage(error, t("Không thể tải danh sách thành viên.")));
    } finally {
      setIsLoadingMembers(false);
    }
  }

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

  async function handleAddMember() {
    setMembersError(null);
    if (!newMemberId) return;
    try {
      await projectApi.addMember(project!.id, newMemberId);
      await loadMembersAndRoles();
      onProjectUpdated(); // Refresh project list to update member counts if needed
    } catch (error: unknown) {
      setMembersError(extractErrorMessage(error, t("Thêm thành viên thất bại.")));
    }
  }

  async function handleRemoveMember(memberId: number) {
    setMembersError(null);
    try {
      await projectApi.removeMember(project!.id, memberId);
      await loadMembersAndRoles();
      onProjectUpdated();
    } catch (error: unknown) {
      setMembersError(extractErrorMessage(error, t("Xóa thành viên thất bại.")));
    }
  }

  // Khác user hiện tại (trong danh sách dropdown thêm)
  const availableUsersToAdd = accessibleUsers.filter(
    (u) => !members.some((m) => m.userId.toString() === u.id.replace("usr-", ""))
  );

  return (
    <Modal
      title={t("Chỉnh sửa dự án: {v0}", { v0: project.name })}
      titleId="edit-project-title"
      size="lg"
      onClose={onClose}
    >
      <div className="app-modal-tabs">
        <Tabs
          tabs={[
            { id: "INFO", label: t("Thông tin chung") },
            { id: "MEMBERS", label: t("Thành viên") },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel={t("Chỉnh sửa dự án")}
        />
      </div>

        {activeTab === "INFO" && (
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
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                {t("Hủy")}</button>
              <button type="submit" className="primary-button">
                {t("Lưu thay đổi")}</button>
            </div>
          </form>
        )}

        {activeTab === "MEMBERS" && (
          <div className="app-modal-form">
            <div className="app-modal-body">
              <div className="table-scroll modal-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("Tên")}</th>
                      <th>Email</th>
                      <th style={{ width: "180px" }}>{t("Vị trí")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingMembers ? (
                      <tr>
                        <td colSpan={3}>
                          <LoadingState variant="spinner" label={t("Đang tải thành viên...")} />
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr><td colSpan={3} className="popover-empty">{t("Chưa có thành viên.")}</td></tr>
                    ) : (
                      members.map((m) => {
                        const canEdit = true;
                        return (
                          <tr key={m.id}>
                            <td><strong>{m.userName}</strong></td>
                            <td className="cell-muted">{m.userEmail}</td>
                            <td>
                              <span className="pill pill-neutral cell-truncate" title={m.position || m.systemRole}>
                                {m.position || m.systemRole || t("Thành viên")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="app-modal-footer">
              <button type="button" className="secondary-button" onClick={onClose}>
                {t("Đóng")}</button>
            </div>
          </div>
        )}
    </Modal>
  );
}
