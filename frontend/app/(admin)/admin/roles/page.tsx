"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { FilterBar, FilterSearch } from "@/components/filter-bar";
import { TableBodySkeleton } from "@/components/loading-state";
import { EmptyState, Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminRole } from "@/types";

import teamStyles from "../../../(protected)/team/styles/team.module.css";
import styles from "../_components/admin.module.css";
import { errorMessage, RequirePermission, useToast } from "../_components/admin-ui";
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
    <div className="filtered-list-page">
      <FilterBar
        search={<FilterSearch value={search} onChange={setSearch} placeholder="Tìm role..." />}
        activeCount={search.trim() ? 1 : 0}
        onReset={() => setSearch("")}
        showReset={false}
        action={
          <ActionButton kind="add" onClick={() => router.push("/admin/roles/new")}>
            Thêm role
          </ActionButton>
        }
      />

      <Surface className={`${teamStyles.tableSurface} filtered-list-table`}>
        {!roles || visible.length > 0 ? (
          <div className={`${teamStyles.tableWrap} table-scroll`}>
            <table className={teamStyles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Mô tả</th>
                  <th>Quyền</th>
                  <th>Người dùng</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {!roles ? (
                  <TableBodySkeleton rows={6} columns={5} />
                ) : (
                  visible.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <strong>{role.name}</strong>
                      </td>
                      <td>
                        <DescriptionCell text={role.description} />
                      </td>
                      <td>{role.permission_ids.length}</td>
                      <td>{role.usage_count}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={`secondary-button ${teamStyles.detailButton}`}
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
            </table>
          </div>
        ) : (
          <EmptyState
            title={search ? "Không tìm thấy role phù hợp" : "Chưa có role nào"}
            description={search ? "Thử đổi từ khóa tìm kiếm." : 'Nhấn "Thêm role" để tạo mới.'}
          />
        )}
      </Surface>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <RequirePermission code={PERM.roleManage}>
      <RolesContent />
    </RequirePermission>
  );
}
