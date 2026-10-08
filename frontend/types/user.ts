import type { PresenceStatus } from "./common";

export type UserRole = string;
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface Department {
  id: number;
  name: string;
}

export type JobRole =
  | "FULLSTACK"
  | "BACKEND"
  | "FRONTEND"
  | "AI_ENGINEER"
  | "QA"
  | "DEVOPS"
  | "UI_UX"
  | "PROJECT_MANAGER";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  /** Permission của role dạng `resource.action:SCOPE` (Admin cấu hình), backend trả về. */
  permissions: string[];
  title: string;
  initials: string;
  avatarUrl?: string;
  presence: PresenceStatus;
  capacityHours: number;
  workloadHours: number;
  focusScore: number;
  isActive: boolean;
  status?: UserStatus;
  employeeCode?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  address?: string;
  lastLoginAt?: string;
  lastUpdatedAt?: string;
}

export interface UpdateProfilePayload {
  name: string;
  phoneNumber: string;
  department: string;
  jobTitle: string;
  address: string;
}

export interface UserDirectoryFilters {
  search?: string;
  status?: UserStatus | "ALL" | string;
  role?: UserRole | "ALL" | string;
  department?: string | "ALL";
  page?: number;
  pageSize?: number;
}

export interface PaginatedUsers {
  items: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
