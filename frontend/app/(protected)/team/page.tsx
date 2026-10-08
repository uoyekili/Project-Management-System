"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { userApi, workspaceApi } from "@/services/api";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import type {
  PaginatedUsers,
  UserProfile,
  WorkspaceShellData,
  Department,
} from "@/types";

import styles from "./styles/team.module.css";
import { TeamFilter } from "./_components/team-filter";
import { UserTable } from "./_components/user-table";
import { t } from "@/lib/i18n";

/** Giới hạn tối đa của API mỗi lần gọi. */
const DIRECTORY_FETCH_SIZE = 100;

const EMPTY_DIRECTORY: PaginatedUsers = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

function toDirectoryFilterParam(values: string[]): string {
  return values.length === 0 ? "ALL" : values.join(",");
}

export default function TeamPage() {
  const session = useAuthSession();
  const currentActor = session?.currentUser ?? PENDING_USER;
  const [shellData, setShellData] = useState<WorkspaceShellData>({
    currentUser: currentActor,
    activeProjects: 0,
    openTasks: 0,
    missingLogwork: 0,
    alertCount: 0,
  });
  const [directory, setDirectory] = useState<PaginatedUsers>(EMPTY_DIRECTORY);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [departments, setDepartments] = useState<Department[]>([]);
  const canAccessTeamPage = currentActor.id ? true : null;
  const canFilterDepartment = true;
  const directoryDepartments = departments;
  const roleOptions = useMemo(
    () => Array.from(new Set(allUsers.map((user) => user.role).filter(Boolean))).sort(),
    [allUsers],
  );
  const router = useRouter();

  useEffect(() => {
    if (canAccessTeamPage !== true) {
      return;
    }

    let isCancelled = false;
    async function loadStaticData() {
      try {
        const [
          { data: nextShellData },
          { data: nextUsers },
          { data: nextDepartments },
        ] = await Promise.all([
          workspaceApi.getShellData(currentActor),
          userApi.list(currentActor),
          userApi.getDepartments(),
        ]);

        if (isCancelled) return;
        setShellData(nextShellData);
        setAllUsers(nextUsers);
        setDepartments(nextDepartments);
      } catch (loadError) {
        if (!isCancelled)
          setError(
            loadError instanceof Error ? loadError.message : t("Không thể tải danh sách người dùng."),
          );
      }
    }
    void loadStaticData();
    return () => {
      isCancelled = true;
    };
  }, [canAccessTeamPage, currentActor, reloadKey]);

  useEffect(() => {
    if (canAccessTeamPage !== true) {
      return;
    }

    let isCancelled = false;
    async function loadDirectory() {
      try {
        const filters = {
          search,
          status: toDirectoryFilterParam(statusFilter),
          role: toDirectoryFilterParam(roleFilter),
          department: canFilterDepartment
            ? toDirectoryFilterParam(departmentFilter)
            : (currentActor.department ?? "ALL"),
          pageSize: DIRECTORY_FETCH_SIZE,
        };
        // Hiển thị toàn bộ nhân sự trong một danh sách: API giới hạn mỗi lần, nên gom các trang.
        const { data: first } = await userApi.listDirectory({ ...filters, page: 1 }, currentActor);
        const items = [...first.items];
        for (let next = 2; next <= first.totalPages; next += 1) {
          const { data } = await userApi.listDirectory({ ...filters, page: next }, currentActor);
          items.push(...data.items);
        }
        if (isCancelled) return;
        setDirectory({ ...first, items, page: 1, pageSize: items.length, totalPages: 1 });
      } catch (loadError) {
        if (!isCancelled)
          setError(
            loadError instanceof Error ? loadError.message : t("Không thể tải bảng người dùng."),
          );
      } finally {
        if (!isCancelled) setIsDirectoryLoading(false);
      }
    }
    void loadDirectory();
    return () => {
      isCancelled = true;
    };
  }, [canAccessTeamPage, currentActor, reloadKey, roleFilter, departmentFilter, search, statusFilter]);

  return (
    <WorkspaceShell
      shellData={shellData}
      heading={t("Danh sách nhân sự")}
      subheading={t("Giao diện bảng hỗ trợ tìm kiếm nhanh, phân trang và xem nhanh thông tin liên hệ, phòng ban và chức danh.")}
      highlightLabel="Users"
      highlightValue={`${directory.total}`}
      fillViewport
    >
      <div className={`${styles.pageStack} filtered-list-page`}>
        <TeamFilter
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
          }}
          roleFilter={roleFilter}
          onRoleFilterChange={(v) => {
            setRoleFilter(v);
          }}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={(v) => {
            setDepartmentFilter(v);
          }}
          departments={directoryDepartments}
          roles={roleOptions}
          canFilterDepartment={canFilterDepartment}
          currentDepartment={currentActor.department || ""}
          onReset={() => {
            setSearch("");
            setStatusFilter([]);
            setRoleFilter([]);
            if (canFilterDepartment) setDepartmentFilter([]);
          }}
        />

        <UserTable
          directory={directory}
          isLoading={isDirectoryLoading}
          onUserSelect={(user) => router.push(`/profile/${encodeURIComponent(user.id)}`)}
        />
      </div>

    </WorkspaceShell>
  );
}
