"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect } from "@/components/filter-select";
import { TableBodySkeleton } from "@/components/loading-state";
import { Badge, EmptyState, StatusPill, Surface } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminDepartment, AdminJobTitle, AdminRole, AdminUserList } from "@/types";
import { formatEmployeeCode } from "@/lib/utils/employee";

import teamStyles from "../../../(protected)/team/styles/team.module.css";
import styles from "../_components/admin.module.css";
import {
  EmptyDash,
  errorMessage,
  RequirePermission,
  useDebounced,
  useToast,
} from "../_components/admin-ui";

// Hiển thị toàn bộ người dùng, bảng tự cuộn bên trong (không phân trang).
const PAGE_SIZE = 1000;

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Đã khóa" },
];

type Lookups = {
  departments: AdminDepartment[];
  jobTitles: AdminJobTitle[];
  roles: AdminRole[];
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}

/* ------------------------------------------------------------------ page */
function AdminUsersContent() {
  const router = useRouter();
  const toast = useToast();

  const [lookups, setLookups] = useState<Lookups>({ departments: [], jobTitles: [], roles: [] });
  const [list, setList] = useState<AdminUserList | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([adminApi.listDepartments(), adminApi.listJobTitles(), adminApi.listRoles()])
      .then(([departments, jobTitles, roles]) => setLookups({ departments, jobTitles, roles }))
      .catch((err) => toast.error(errorMessage(err)));
  }, [toast]);

  const load = useCallback(async () => {
    try {
      const result = await adminApi.listUsers({
        search: debouncedSearch.trim() || undefined,
        department_ids: departmentFilter,
        role_ids: roleFilter,
        status: statusFilter,
        page_size: PAGE_SIZE,
      });
      setList(result);
    } catch (err) {
      toast.error(errorMessage(err));
      setList(
        (current) =>
          current ?? { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 },
      );
    }
  }, [debouncedSearch, departmentFilter, roleFilter, statusFilter, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách theo bộ lọc
    void load();
  }, [load]);

  const activeCount =
    (search.trim() ? 1 : 0) +
    (statusFilter.length ? 1 : 0) +
    (roleFilter.length ? 1 : 0) +
    (departmentFilter.length ? 1 : 0);

  const departmentOptions = useMemo(
    () => [
      ...lookups.departments.map((item) => ({ value: String(item.id), label: item.name })),
      { value: "none", label: "Chưa phân bổ" },
    ],
    [lookups.departments],
  );

  function resetFilters() {
    setSearch("");
    setStatusFilter([]);
    setRoleFilter([]);
    setDepartmentFilter([]);
  }

  const isLoading = list === null;

  return (
    <div className="filtered-list-page">
      <FilterBar
        search={
          <FilterSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
            }}
            placeholder="Tìm theo tên hoặc email..."
          />
        }
        activeCount={activeCount}
        onReset={resetFilters}
        action={
          <ActionButton kind="add" onClick={() => router.push("/admin/users/new")}>
            Thêm nhân viên
          </ActionButton>
        }
      >
        <FilterItem>
          <FilterSelect
            multiple
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
            }}
            placeholder="Role"
            showSelectAll={false}
            options={lookups.roles.map((role) => ({ value: String(role.id), label: role.name }))}
          />
        </FilterItem>
        <FilterItem>
          <FilterSelect
            multiple
            value={departmentFilter}
            onChange={(value) => {
              setDepartmentFilter(value);
            }}
            placeholder="Phòng ban"
            showSelectAll={false}
            options={departmentOptions}
          />
        </FilterItem>
        <FilterItem>
          <FilterSelect
            multiple
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
            }}
            placeholder="Trạng thái"
            showSelectAll={false}
            options={STATUS_OPTIONS}
          />
        </FilterItem>
      </FilterBar>

      <Surface className={`${teamStyles.tableSurface} ${styles.usersTable} filtered-list-table`}>
        {isLoading || (list && list.items.length > 0) ? (
          <>
            <div className={`${teamStyles.tableWrap} table-scroll`}>
              <table className={teamStyles.table}>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Chức danh</th>
                    <th>Role</th>
                    <th>Phòng ban</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {!list ? (
                    <TableBodySkeleton rows={10} columns={9} />
                  ) : (
                    list.items.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className={`${teamStyles.userCellButton} ${styles.staticCell}`}>
                            <UserAvatar
                              name={user.full_name}
                              avatarUrl={user.avatar_url ?? undefined}
                              size={24}
                              className={teamStyles.avatarToken}
                            />
                            <span className={teamStyles.userCellCopy}>
                              <strong>{user.full_name}</strong>
                              <small>{formatEmployeeCode(user.id)}</small>
                            </span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.job_title ? user.job_title.name : <EmptyDash />}</td>
                        <td>
                          {user.role ? (
                            <Badge tone="accent">{user.role.name}</Badge>
                          ) : (
                            <EmptyDash />
                          )}
                        </td>
                        <td>{user.is_admin ? null : user.department?.name}</td>
                        <td>{user.phone_number || <EmptyDash />}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>
                          <StatusPill
                            label={user.is_active ? "Hoạt động" : "Đã khóa"}
                            tone={user.is_active ? "on-track" : "critical"}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`secondary-button ${teamStyles.detailButton}`}
                            onClick={() => {
                              router.push(`/admin/users/${user.id}`);
                            }}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            title="Không tìm thấy người dùng phù hợp"
            description="Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc để xem nhiều kết quả hơn."
          />
        )}
      </Surface>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePermission code={PERM.userManage}>
      <AdminUsersContent />
    </RequirePermission>
  );
}
