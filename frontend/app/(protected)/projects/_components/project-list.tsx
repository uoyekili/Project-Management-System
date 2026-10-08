import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { EmptyState, ProgressBar, StatusPill, Surface } from "@/components/ui";
import { FilterBar, FilterItem, FilterSearch } from "@/components/filter-bar";
import { FilterSelect, type FilterOption } from "@/components/filter-select";
import { TableBodySkeleton } from "@/components/loading-state";
import { formatDateNumeric, projectStatusLabel, projectTypeLabel } from "@/lib/utils/format";
import type { Project } from "@/types";
import { canInProject } from "@/lib/permissions";
import { TablePagination } from "@/components/table-pagination";
import styles from "./project-list.module.css";
import { t } from "@/lib/i18n";

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  viewerId: string;
  onAddProjectClick?: () => void;
  onEditProjectClick?: (project: Project) => void;
  isLoading?: boolean;
}

const PROJECTS_PER_PAGE = 15;

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  viewerId,
  onAddProjectClick,
  onEditProjectClick,
  isLoading = false,
}: ProjectListProps) {
  void onSelectProject;
  const router = useRouter();
  const [page, setPage] = useState(1);

  function openProjectOverview(projectId: string) {
    router.push(`/projects/${projectId}?tab=overview`);
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const managerOptions = useMemo(() => {
    const map = new Map<string, FilterOption>();
    projects.forEach((project) => {
      if (project.managerId && !map.has(project.managerId)) {
        const name = project.managerName || t("Chưa rõ");
        map.set(project.managerId, {
          value: project.managerId,
          label: name,
          person: { userId: project.managerId, name, avatarUrl: project.managerAvatarUrl },
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [projects]);

  const activeFilterCount =
    (statusFilter.length > 0 ? 1 : 0) +
    (managerFilter.length > 0 ? 1 : 0) +
    (typeFilter.length > 0 ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== "";

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter([]);
    setManagerFilter([]);
    setTypeFilter([]);
    setPage(1);
  }

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.code.toLowerCase().includes(query);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(project.status);
      const matchesManager =
        managerFilter.length === 0 || managerFilter.includes(project.managerId);
      const matchesType = typeFilter.length === 0 || typeFilter.includes(project.projectType);
      return matchesSearch && matchesStatus && matchesManager && matchesType;
    });
  }, [projects, searchQuery, statusFilter, managerFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE));
  const validPage = Math.min(page, totalPages);
  const canEditProject = (project: Project) => canInProject(project, "project", "update");

  const paginatedProjects = filteredProjects.slice(
    (validPage - 1) * PROJECTS_PER_PAGE,
    validPage * PROJECTS_PER_PAGE,
  );

  return (
    <div className="filtered-list-page">
      <FilterBar
        search={
          <FilterSearch
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            placeholder={t("Tìm theo tên hoặc mã dự án...")}
          />
        }
        activeCount={activeFilterCount + (searchQuery.trim() !== "" ? 1 : 0)}
        onReset={resetFilters}
        action={
          <span
            className={styles.createAction}
            title={onAddProjectClick ? undefined : t("Bạn không có quyền tạo dự án")}
          >
            <ActionButton kind="add" onClick={onAddProjectClick} disabled={!onAddProjectClick}>
              {t("Tạo dự án")}</ActionButton>
          </span>
        }
      >
        <FilterItem>
          <FilterSelect
            multiple
            searchable
            showSelectAll={false}
            searchPlaceholder={t("Tìm người quản lý...")}
            value={managerFilter}
            onChange={(next) => {
              setManagerFilter(next);
              setPage(1);
            }}
            allLabel={t("Người quản lý")}
            options={managerOptions}
          />
        </FilterItem>
        <FilterItem compact>
          <FilterSelect
            multiple
            showSelectAll={false}
            menuMinWidth={200}
            value={typeFilter}
            onChange={(next) => {
              setTypeFilter(next);
              setPage(1);
            }}
            allLabel={t("Loại dự án")}
            options={[
              { value: "agile", label: "Kanban" },
              { value: "waterfall", label: "Waterfall" },
            ]}
          />
        </FilterItem>
        <FilterItem compact>
          <FilterSelect
            multiple
            showSelectAll={false}
            menuMinWidth={200}
            value={statusFilter}
            onChange={(next) => {
              setStatusFilter(next);
              setPage(1);
            }}
            allLabel={t("Trạng thái")}
            options={[
              { value: "ACTIVE", label: t("Đang triển khai") },
              { value: "PLANNING", label: t("Đang lập kế hoạch") },
              { value: "AT_RISK", label: t("Rủi ro trễ hạn") },
              { value: "COMPLETED", label: t("Đã hoàn thành") },
              { value: "ON_HOLD", label: t("Tạm dừng") },
            ]}
          />
        </FilterItem>
      </FilterBar>

      <Surface className={`${styles.compactSurface} filtered-list-table`}>
        {isLoading || filteredProjects.length > 0 ? (
          <>
            <div className={`${styles.tableWrap} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("Dự án")}</th>
                    <th>{t("Mã dự án")}</th>
                    <th>{t("Loại dự án")}</th>
                    <th>{t("Trạng thái")}</th>
                    <th className={styles.colProgress}>{t("Tiến độ")}</th>
                    <th>{t("Ngày bắt đầu")}</th>
                    <th>{t("Ngày kết thúc")}</th>
                    <th className={styles.colActions} />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableBodySkeleton rows={8} columns={8} />
                  ) : (
                    paginatedProjects.map((project) => (
                      <tr
                        key={project.id}
                        className={selectedProjectId === project.id ? "selected-row" : undefined}
                        tabIndex={0}
                        role="link"
                        onClick={() => openProjectOverview(project.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProjectOverview(project.id);
                          }
                        }}
                      >
                        <td>
                          <div className={styles.userCellButton}>
                            <span className={styles.avatarToken}>
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                            <span className={styles.userCellCopy}>
                              <strong>{project.name}</strong>
                              <small>Manager: {project.managerName || t("Chưa rõ")}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <code className={styles.projectCode}>{project.code}</code>
                        </td>
                        <td>
                          <StatusPill
                            label={projectTypeLabel(project.projectType)}
                            tone="neutral"
                          />
                        </td>
                        <td>
                          <StatusPill
                            label={projectStatusLabel(project.status)}
                            tone={
                              project.status === "ACTIVE"
                                ? "progress"
                                : project.status === "PLANNING"
                                  ? "watch"
                                  : project.status === "AT_RISK"
                                    ? "critical"
                                    : project.status === "ON_HOLD"
                                      ? "neutral"
                                      : "on-track"
                            }
                          />
                        </td>
                        <td className={styles.colProgress}>
                          <div className={styles.progressCell}>
                            <ProgressBar value={project.progress} />
                          </div>
                        </td>
                        <td>{formatDateNumeric(project.startDate)}</td>
                        <td>{formatDateNumeric(project.endDate)}</td>
                        <td className={styles.colActions}>
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            {onEditProjectClick && canEditProject(project) && (
                              <button
                                type="button"
                                className="icon-button"
                                title={t("Chỉnh sửa dự án")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditProjectClick(project);
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="13"
                                  height="13"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredProjects.length > 0 ? (
              <TablePagination
                page={validPage}
                pageSize={PROJECTS_PER_PAGE}
                total={filteredProjects.length}
                totalPages={totalPages}
                onPageChange={setPage}
                itemLabel={t("dự án")}
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            title={t("Chưa có dự án")}
            description={
              hasActiveFilters
                ? t("Không tìm thấy dự án nào phù hợp với bộ lọc.")
                : t("Tạo dự án mới hoặc gán bạn vào một dự án để xem dữ liệu tại đây.")
            }
          />
        )}
      </Surface>
    </div>
  );
}
