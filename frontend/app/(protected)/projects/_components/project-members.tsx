"use client";

import { useEffect, useMemo, useState } from "react";
import { Surface, StatusPill } from "@/components/ui";
import { RoleTags } from "@/components/role-tags";
import { TableBodySkeleton } from "@/components/loading-state";
import { UserAvatar } from "@/components/user-avatar";
import { formatEmployeeCode, matchesNameOrCode } from "@/lib/utils/employee";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { TablePagination } from "@/components/table-pagination";
import { projectApi } from "@/services/api";
import {
  projectRoleLabel,
  roleDisplayLabels,
  splitSlashLabels,
} from "@/lib/utils/format";
import teamStyles from "../../team/styles/team.module.css";
import styles from "./project-members.module.css";
import { MemberFilters } from "./member-filters";
import { AddMemberModal } from "./add-member-modal";
import type { UserProfile } from "@/types";
import type { Project } from "@/types/project";
import { t } from "@/lib/i18n";

type ProjectMemberItem = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  position: string | null;
  systemRole: string;
  departmentName: string | null;
  joinedAt: string;
  isActive: boolean;
};

interface ProjectMembersProps {
  projectId: string;
  viewerId: string;
  canManage: boolean;
  accessibleUsers: UserProfile[];
  project?: Project;
  isAddMemberOpen?: boolean;
  onAddMemberOpenChange?: (open: boolean) => void;
}

const STATUS_FILTER_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Tạm dừng" },
];

function memberRoleLabels(member: ProjectMemberItem, user?: UserProfile) {
  const fromUser = roleDisplayLabels(user?.roles, user?.role);
  if (fromUser.length > 0) {
    return fromUser;
  }
  return splitSlashLabels(projectRoleLabel(member.position || member.systemRole));
}

export function ProjectMembers({
  projectId,
  viewerId,
  canManage,
  accessibleUsers,
  project,
  isAddMemberOpen = false,
  onAddMemberOpenChange,
}: ProjectMembersProps) {
  const { confirm, alert } = useConfirmDialog();
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const MEMBERS_PER_PAGE = 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const extractErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  const reloadMembers = async () => {
    const membersRes = await projectApi.listMembers(projectId);
    setMembers(membersRes.data || []);
  };

  const canManageMembers = canManage;

  const userLookup = useMemo(
    () => new Map(accessibleUsers.map((user) => [user.id, user])),
    [accessibleUsers],
  );

  useEffect(() => {
    async function loadData() {
      try {
        const membersRes = await projectApi.listMembers(projectId);
        setMembers(membersRes.data || []);
      } catch {
        setError(t("Không thể tải danh sách thành viên."));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  const handleRemoveMember = async (memberId: number) => {
    const confirmed = await confirm({
      title: t("Tạm dừng thành viên"),
      message: t("Bạn có chắc muốn tạm dừng thành viên này khỏi dự án?"),
      confirmLabel: t("Tạm dừng"),
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await projectApi.removeMember(projectId, memberId);
      await reloadMembers();
    } catch (err: unknown) {
      await alert({
        title: t("Không thể gỡ thành viên"),
        message: extractErrorMessage(err, t("Lỗi khi gỡ thành viên")),
      });
    }
  };

  const handleRestoreMember = async (member: ProjectMemberItem) => {
    try {
      await projectApi.addMember(projectId, `usr-${member.userId}`, member.position ?? undefined);
      await reloadMembers();
    } catch (err: unknown) {
      await alert({
        title: t("Không thể khôi phục thành viên"),
        message: extractErrorMessage(err, t("Lỗi khi khôi phục thành viên")),
      });
    }
  };

  const roleFilterOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const member of members) {
      for (const label of memberRoleLabels(member, userLookup.get(`usr-${member.userId}`))) {
        labels.add(label);
      }
    }
    return Array.from(labels)
      .sort((left, right) => left.localeCompare(right, "vi"))
      .map((label) => ({ value: label, label }));
  }, [members, userLookup]);

  if (error) return <div style={{ color: "var(--color-danger)" }}>{error}</div>;

  // Project Manager của dự án (project.managerId) không thể bị gỡ; phải đổi PM trước.
  const isProjectManager = (member: ProjectMemberItem) =>
    project?.managerId === `usr-${member.userId}`;

  const filteredMembers = members.filter((member) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (
      normalizedQuery &&
      !matchesNameOrCode(
        normalizedQuery,
        member.userName,
        formatEmployeeCode(member.userId, userLookup.get(`usr-${member.userId}`)?.employeeCode),
        [member.userEmail],
      )
    ) {
      return false;
    }

    if (roleFilter.length > 0) {
      const labels = memberRoleLabels(member, userLookup.get(`usr-${member.userId}`));
      if (!labels.some((label) => roleFilter.includes(label))) {
        return false;
      }
    }

    if (statusFilter.length > 0) {
      const statusValue = member.isActive ? "ACTIVE" : "INACTIVE";
      if (!statusFilter.includes(statusValue)) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
  const validPage = Math.min(page, totalPages);

  const paginatedMembers = filteredMembers.slice(
    (validPage - 1) * MEMBERS_PER_PAGE,
    validPage * MEMBERS_PER_PAGE,
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 || roleFilter.length > 0 || statusFilter.length > 0;

  return (
    <div className="filtered-list-page">
      <AddMemberModal
        isOpen={isAddMemberOpen}
        projectId={projectId}
        project={project}
        accessibleUsers={accessibleUsers}
        existingMembers={members}
        onClose={() => onAddMemberOpenChange?.(false)}
        onAdded={reloadMembers}
      />

      <MemberFilters
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        roleOptions={roleFilterOptions}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => {
          setRoleFilter(value);
          setPage(1);
        }}
        statusOptions={STATUS_FILTER_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onReset={() => {
          setSearchQuery("");
          setRoleFilter([]);
          setStatusFilter([]);
          setPage(1);
        }}
      />

      <Surface className={`${styles.compactSurface} filtered-list-table`}>
        <div className={`${styles.tableWrap} table-scroll`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("Thành viên")}</th>
                <th>Email</th>
                <th>{t("Vị trí")}</th>
                <th>{t("Ngày tham gia")}</th>
                <th>{t("Trạng thái")}</th>
                {canManageMembers ? <th className={styles.colActions} /> : null}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableBodySkeleton rows={6} columns={canManageMembers ? 6 : 5} />
              ) : (
                <>
                  {paginatedMembers.map((member) => {
                    const memberUser = userLookup.get(`usr-${member.userId}`);
                    const roleLabels = memberRoleLabels(member, memberUser);

                    return (
                      <tr key={member.id} className={styles.memberRow}>
                        <td className={styles.memberPrimary}>
                          <div className={styles.memberCell}>
                            <UserAvatar
                              name={member.userName}
                              avatarUrl={memberUser?.avatarUrl}
                              size={28}
                              className={teamStyles.avatarToken}
                            />
                            <span className={styles.memberCopy}>
                              <strong className={styles.memberName} title={member.userName}>
                                {member.userName}
                              </strong>
                              <small>{formatEmployeeCode(member.userId, memberUser?.employeeCode)}</small>
                            </span>
                          </div>
                        </td>
                        <td
                          className={styles.emailCell}
                          data-label="Email"
                          title={member.userEmail}
                        >
                          {member.userEmail}
                        </td>
                        <td className={styles.roleCell} data-label={t("Vai trò")}>
                          <RoleTags labels={roleLabels} className={styles.roleTags} />
                        </td>
                        <td className={styles.joinedCell} data-label={t("Ngày tham gia")}>
                          {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className={styles.statusCell} data-label={t("Trạng thái")}>
                          <StatusPill
                            label={member.isActive ? t("Hoạt động") : t("Tạm dừng")}
                            tone={member.isActive ? "on-track" : "critical"}
                          />
                        </td>
                        {canManageMembers ? (
                        <td className={`${styles.actionCell} ${styles.colActions}`}>
                          {member.userId.toString() !== viewerId.replace("usr-", "") &&
                            (member.isActive ? (
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  color: "var(--color-danger)",
                                  opacity: isProjectManager(member) ? 0.5 : 1,
                                  cursor: isProjectManager(member) ? "not-allowed" : "pointer",
                                }}
                                disabled={isProjectManager(member) || !canManageMembers}
                                title={isProjectManager(member) ? t("Không thể gỡ Project Manager của dự án") : ""}
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                {t("Gỡ bỏ")}</button>
                            ) : (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleRestoreMember(member)}
                              >
                                {t("Thêm lại")}</button>
                            ))}
                        </td>
                        ) : null}
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={canManageMembers ? 6 : 5} className={styles.tableEmpty}>
                        {hasActiveFilters
                          ? t("Không tìm thấy thành viên phù hợp")
                          : t("Chưa có thành viên nào")}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {filteredMembers.length > 0 ? (
          <TablePagination
            page={validPage}
            pageSize={MEMBERS_PER_PAGE}
            total={filteredMembers.length}
            totalPages={totalPages}
            onPageChange={setPage}
            itemLabel={t("thành viên")}
          />
        ) : null}
      </Surface>
    </div>
  );
}
