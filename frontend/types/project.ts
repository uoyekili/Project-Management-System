export type ProjectStatus = "PLANNING" | "ACTIVE" | "AT_RISK" | "COMPLETED" | "ON_HOLD";

export interface ProjectMetrics {
  completedTasks: number;
  overdueTasks: number;
  logworkCoverage: number;
  velocity: number;
  totalTasks: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  projectType: "agile" | "waterfall";
  status: ProjectStatus;
  progress: number;
  managerId: string;
  managerName?: string;
  managerAvatarUrl?: string;
  memberIds: string[];
  startDate: string;
  endDate: string;
  currentSprintId: string | null;
  objectives: string[];
  metrics: ProjectMetrics;
  /** Permission của người đang xem trong dự án này (backend tính từ project role). */
  myPermissions?: string[];
}

export interface ProjectFilters {
  status?: ProjectStatus;
  managerId?: string;
  search?: string;
}
