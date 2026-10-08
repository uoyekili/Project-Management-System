"use client";

import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect } from "@/components/filter-select";
import { t } from "@/lib/i18n";

type FilterOption = {
  value: string;
  label: string;
};

type MemberFiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleOptions: FilterOption[];
  roleFilter: string[];
  onRoleFilterChange: (value: string[]) => void;
  statusOptions: FilterOption[];
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  onReset: () => void;
};

export function MemberFilters({
  searchQuery,
  onSearchChange,
  roleOptions,
  roleFilter,
  onRoleFilterChange,
  statusOptions,
  statusFilter,
  onStatusFilterChange,
  onReset,
}: MemberFiltersProps) {
  const activeCount =
    (searchQuery.trim().length > 0 ? 1 : 0) +
    (roleFilter.length > 0 ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0);

  return (
    <FilterBar
      search={
        <FilterSearch
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t("Tìm theo tên hoặc mã nhân viên...")}
          ariaLabel={t("Tìm kiếm thành viên")}
        />
      }
      activeCount={activeCount}
      onReset={onReset}
    >
      <FilterItem compact>
        <FilterSelect
          multiple
          searchable
          searchPlaceholder={t("Tìm vai trò...")}
          showSelectAll={false}
          menuMinWidth={240}
          value={roleFilter}
          onChange={onRoleFilterChange}
          placeholder={t("Vai trò")}
          options={roleOptions}
        />
      </FilterItem>
      <FilterItem compact>
        <FilterSelect
          multiple
          showSelectAll={false}
          menuMinWidth={200}
          value={statusFilter}
          onChange={onStatusFilterChange}
          placeholder={t("Trạng thái")}
          options={statusOptions}
        />
      </FilterItem>
    </FilterBar>
  );
}
