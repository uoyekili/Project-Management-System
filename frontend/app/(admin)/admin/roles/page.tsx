"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { FilterBar, FilterSearch } from "@/components/filter-bar";
import { TableBodySkeleton } from "@/components/loading-state";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminRole } from "@/types";

import styles from "../_components/admin.module.css";
import { errorMessage, RequirePermission, useToast } from "../_components/admin-ui";
import { AdminListPage, AdminListSurface, AdminTable, adminTableStyles } from "../_components/admin-table";
import { DescriptionCell } from "../_components/description-cell";

function RolesContent() {
  const router = useRouter();
  const toast = useToast();
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setRoles(await adminApi.listRoles());
    } catch (err) {
      toast.error(errorMessage(err));
      setRoles((current) => current ?? []);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles ?? [];
    return (roles ?? []).filter((role) => role.name.toLowerCase().includes(term));
  }, [roles, search]);

  return (
    <AdminListPage
      filters={
        <FilterBar
          search={<FilterSearch value={search} onChange={setSearch} placeholder="Tìm vai trò" />}
          activeCount={search.trim() ? 1 : 0}
          onReset={() => setSearch("")}
          showReset={false}
          action={
            <ActionButton kind="add" onClick={() => router.push("/admin/roles/new")}>
              Thêm vai trò
            </ActionButton>
          }
        />
      }
    >
      <AdminListSurface
        hasContent={!roles || visible.length > 0}
        emptyTitle={search ? "Không tìm thấy vai trò phù hợp" : "Chưa có vai trò nào"}
        emptyDescription={search ? "Thử đổi từ khóa tìm kiếm." : 'Nhấn "Thêm vai trò" để tạo mới.'}
      >
        <AdminTable>
          <thead>
            <tr>
              <th>Vai trò</th>
              <th>Mô tả</th>
              <th>Quyền</th>
              <th>Người dùng</th>
              <th data-actions aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {!roles ? (
              <TableBodySkeleton rows={6} columns={5} />
            ) : (
              visible.map((role) => (
                <tr key={role.id}>
                  <td data-primary data-label="Vai trò">
                    <strong>{role.name}</strong>
                  </td>
                  <td data-label="Mô tả">
                    <DescriptionCell text={role.description} />
                  </td>
                  <td data-label="Quyền">{role.permission_ids.length}</td>
                  <td data-label="Người dùng">{role.usage_count}</td>
                  <td data-actions>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`secondary-button ${adminTableStyles.actionButton}`}
                        onClick={() => {
                          router.push(`/admin/roles/${role.id}`);
                        }}
                      >
                        Chi tiết
                      </button>
                    </div>
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

export default function AdminRolesPage() {
  return (
    <RequirePermission code={PERM.roleManage}>
      <RolesContent />
    </RequirePermission>
  );
}
