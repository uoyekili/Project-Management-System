/** Kiểu dữ liệu cho trang Admin (khớp backend/app/schemas/admin_schema.py). */

export interface IdName {
  id: number;
  name: string;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  /** Tài khoản quản trị: không thuộc phòng ban hay dự án. */
  is_admin: boolean;
  department: IdName | null;
  job_title: IdName | null;
  role: IdName | null;
  created_at: string;
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserFilters {
  search?: string;
  /** id phòng ban; "none" = chưa phân bổ. */
  department_ids?: string[];
  role_ids?: string[];
  /** ACTIVE / INACTIVE */
  status?: string[];
  page?: number;
  page_size?: number;
}

export interface AdminUserForm {
  full_name: string;
  email: string;
  phone_number?: string | null;
  department_id: number | null;
  job_title_id: number | null;
  role_id: number | null;
}

export interface AdminUserCreated extends AdminUser {
  temporary_password: string;
}

export interface AdminDepartment {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
}

export interface AdminJobTitle {
  id: number;
  name: string;
  description: string | null;
  user_count: number;
}

export type PermissionScope = "OWN" | "PROJECT" | "ALL";

/** Permission = resource + action + scope; code dạng `resource.action:SCOPE`. */
export interface AdminPermission {
  id: number;
  code: string;
  resource: string;
  action: string;
  scope: PermissionScope;
  name: string;
  description: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  is_system: boolean;
  permission_ids: number[];
  permission_codes: string[];
  usage_count: number;
}

export interface AdminRoleMember {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  department: string | null;
  job_title: string | null;
}

export interface AdminCountItem {
  label: string;
  count: number;
}

export interface AdminDashboard {
  total_users: number;
  active_users: number;
  locked_users: number;
  total_departments: number;
  total_roles: number;
  unassigned_users: number;
  users_by_department: AdminCountItem[];
  users_by_role: AdminCountItem[];
}
