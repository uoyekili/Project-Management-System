import type { ReactNode } from "react";

import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect } from "@/components/filter-select";

import { roleLabel, userStatusLabel } from "@/lib/utils/format";
import type { UserStatus } from "@/types";
import { t } from "@/lib/i18n";

const STATUS_OPTIONS: UserStatus[] = ["ACTIVE", "INACTIVE"];

interface TeamFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  roleFilter: string[];
  onRoleFilterChange: (value: string[]) => void;
  departmentFilter: string[];
  onDepartmentFilterChange: (value: string[]) => void;
  departments: { id: number; name: string }[];
  roles: string[];
  canFilterDepartment?: boolean;
  currentDepartment?: string;
  onReset: () => void;
  action?: ReactNode;
}

export function TeamFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  roles,
  canFilterDepartment = true,
  currentDepartment = "",
  onReset,
  action,
}: TeamFilterProps) {
  const roleOptions = roles;

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter.length > 0 ||
    roleFilter.length > 0 ||
    (canFilterDepartment && departmentFilter.length > 0);

  const activeCount =
    (search.trim().length > 0 ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0) +
    (roleFilter.length > 0 ? 1 : 0) +
    (canFilterDepartment && departmentFilter.length > 0 ? 1 : 0);

  return (
    <FilterBar
      search={
        <FilterSearch
          value={search}
          onChange={onSearchChange}
          placeholder={t("Tìm theo tên hoặc mã nhân viên...")}
        />
      }
      activeCount={hasActiveFilters ? activeCount : 0}
      onReset={onReset}
      action={action}
    >
      <FilterItem>
        <FilterSelect
          multiple
          value={statusFilter}
          onChange={onStatusFilterChange}
          placeholder={t("Trạng thái")}
          showSelectAll={false}
          options={STATUS_OPTIONS.map((status) => ({
            value: status,
            label: userStatusLabel(status),
          }))}
        />
      </FilterItem>
      <FilterItem>
        <FilterSelect
          multiple
          value={roleFilter}
          onChange={onRoleFilterChange}
          placeholder={t("Vai trò")}
          showSelectAll={false}
          options={roleOptions.map((role) => ({
            value: role,
            label: roleLabel(role),
          }))}
        />
      </FilterItem>
      <FilterItem>
        {canFilterDepartment ? (
          <FilterSelect
            multiple
            value={departmentFilter}
            onChange={onDepartmentFilterChange}
            placeholder={t("Phòng ban")}
            showSelectAll={false}
            options={departments.map((dept) => ({
              value: dept.name,
              label: dept.name,
            }))}
          />
        ) : (
          <input
            type="text"
            className="app-input"
            value={currentDepartment || "—"}
            aria-label={t("Phòng ban")}
            disabled
          />
        )}
      </FilterItem>
    </FilterBar>
  );
}
