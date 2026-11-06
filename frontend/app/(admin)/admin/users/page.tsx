"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect } from "@/components/filter-select";
import { TableBodySkeleton } from "@/components/loading-state";
import { TablePagination } from "@/components/table-pagination";
import { Badge, StatusPill } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminDepartment, AdminJobTitle, AdminRole, AdminUserList } from "@/types";
import { formatEmployeeCode } from "@/lib/utils/employee";

import {
  AdminListPage,
  AdminListSurface,
  AdminTable,
  adminTableStyles,
  AdminUserCell,
} from "../_components/admin-table";
import {
  EmptyDash,
  errorMessage,
  RequirePermission,
  useDebounced,
  useToast,
} from "../_components/admin-ui";

// Tải toàn bộ người dùng một lần rồi phân trang phía client.
const FETCH_SIZE = 1000;
const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(1);

  // Đổi bộ lọc thì quay về trang đầu.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đặt lại trang khi bộ lọc đổi
    setPage(1);
  }, [debouncedSearch, departmentFilter, roleFilter, statusFilter]);

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
        page_size: FETCH_SIZE,
      });
      setList(result);
    } catch (err) {
      toast.error(errorMessage(err));
      setList(
        (current) =>
          current ?? { items: [], total: 0, page: 1, pageSize: FETCH_SIZE, totalPages: 1 },
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
  const items = list?.items ?? [];
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const validPage = Math.min(page, totalPages);
  const pageItems = items.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  return (
    <AdminListPage
      filters={
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
            placeholder="Vai trò"
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
      }
    >
      <AdminListSurface
        hasContent={isLoading || total > 0}
        emptyTitle="Không tìm thấy người dùng phù hợp"
        emptyDescription="Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc để xem nhiều kết quả hơn."
        footer={
          !isLoading && total > 0 ? (
            <TablePagination
              page={validPage}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              itemLabel="người dùng"
            />
          ) : null
        }
      >
        <AdminTable>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Email</th>
              <th data-priority="low">Chức danh</th>
              <th>Vai trò</th>
              <th>Phòng ban</th>
              <th data-priority="low">Số điện thoại</th>
              <th data-priority="low">Ngày tạo</th>
              <th>Trạng thái</th>
              <th data-actions aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!list ? (
              <TableBodySkeleton rows={10} columns={9} />
            ) : (
              pageItems.map((user) => (
                <tr key={user.id}>
                  <td data-primary data-label="Người dùng">
                    <AdminUserCell
                      name={user.full_name}
                      subtitle={formatEmployeeCode(user.id)}
                      avatarUrl={user.avatar_url}
                    />
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-priority="low" data-label="Chức danh">
                    {user.job_title ? user.job_title.name : <EmptyDash />}
                  </td>
                  <td data-label="Vai trò">
                    {user.role ? <Badge tone="accent">{user.role.name}</Badge> : <EmptyDash />}
                  </td>
                  <td data-label="Phòng ban">{user.is_admin ? null : user.department?.name}</td>
                  <td data-priority="low" data-label="Số điện thoại">
                    {user.phone_number || <EmptyDash />}
                  </td>
                  <td data-priority="low" data-label="Ngày tạo">
                    {formatDate(user.created_at)}
                  </td>
                  <td data-label="Trạng thái">
                    <StatusPill
                      label={user.is_active ? "Hoạt động" : "Đã khóa"}
                      tone={user.is_active ? "on-track" : "critical"}
                    />
                  </td>
                  <td data-actions>
                    <button
                      type="button"
                      className={`secondary-button ${adminTableStyles.actionButton}`}
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
        </AdminTable>
      </AdminListSurface>
    </AdminListPage>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePermission code={PERM.userManage}>
      <AdminUsersContent />
    </RequirePermission>
  );
}
