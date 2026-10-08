import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { t } from "@/lib/i18n";

export type LogworkDatePeriod = "" | "day" | "week" | "month";

const DATE_PERIOD_OPTIONS: FilterOption[] = [
  { value: "day", label: "Trong ngày" },
  { value: "week", label: "Trong tuần" },
  { value: "month", label: "Trong tháng" },
];

type LogworkApprovalsFilterProps = {
  search: string;
  onSearchChange: (value: string) => void;
  projectFilter: string[];
  onProjectFilterChange: (value: string[]) => void;
  projectOptions: FilterOption[];
  staffFilter: string[];
  onStaffFilterChange: (value: string[]) => void;
  staffOptions: FilterOption[];
  datePeriod: LogworkDatePeriod;
  onDatePeriodChange: (value: LogworkDatePeriod) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
};

export function LogworkApprovalsFilter({
  search,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  projectOptions,
  staffFilter,
  onStaffFilterChange,
  staffOptions,
  datePeriod,
  onDatePeriodChange,
  hasActiveFilters,
  onReset,
}: LogworkApprovalsFilterProps) {
  const activeCount =
    (search.trim() ? 1 : 0) +
    (staffFilter.length > 0 ? 1 : 0) + (projectFilter.length > 0 ? 1 : 0) + (datePeriod ? 1 : 0);

  return (
    <FilterBar
      search={
        <FilterSearch
          value={search}
          onChange={onSearchChange}
          placeholder={t("Tìm theo tên logwork...")}
          ariaLabel={t("Tìm kiếm tên logwork")}
        />
      }
      activeCount={hasActiveFilters ? Math.max(activeCount, 1) : 0}
      onReset={onReset}
    >
      <FilterItem>
        <FilterSelect
          multiple
          searchable
          searchPlaceholder={t("Tìm nhân sự...")}
          value={staffFilter}
          onChange={onStaffFilterChange}
          placeholder={t("Chọn nhân sự")}
          showSelectAll={false}
          options={staffOptions}
        />
      </FilterItem>
      <FilterItem>
        <FilterSelect
          multiple
          searchable
          searchPlaceholder={t("Tìm dự án...")}
          value={projectFilter}
          onChange={onProjectFilterChange}
          placeholder={t("Chọn dự án")}
          showSelectAll={false}
          options={projectOptions}
        />
      </FilterItem>
      <FilterItem compact>
        <FilterSelect
          menuMinWidth={170}
          value={datePeriod}
          onChange={(value) => onDatePeriodChange(value as LogworkDatePeriod)}
          placeholder={t("Chọn thời gian")}
          options={DATE_PERIOD_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
        />
      </FilterItem>
    </FilterBar>
  );
}
