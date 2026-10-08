import type {
  AdminUserCreated,
  AdminDashboard,
  AdminDepartment,
  AdminJobTitle,
  AdminPermission,
  AdminRole,
  AdminRoleMember,
  AdminUser,
  AdminUserFilters,
  AdminUserForm,
  AdminUserList,
} from "@/types";
import { requestApi, type EndpointMethod } from "./core";

const BASE = "/api/admin";

function endpoint(method: EndpointMethod, path: string) {
  return { method, path: `${BASE}${path}` };
}

function body(payload: unknown) {
  return { body: JSON.stringify(payload) };
}

async function data<T>(promise: ReturnType<typeof requestApi<T>>): Promise<T> {
  return (await promise).data;
}

type NamedPayload = { name?: string; description?: string | null };

export const adminApi = {
  dashboard: () => data<AdminDashboard>(requestApi(endpoint("GET", "/dashboard"))),

  // ---- users
  listUsers(filters: AdminUserFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.department_ids?.length)
      params.set("department_ids", filters.department_ids.join(","));
    if (filters.role_ids?.length) params.set("role_ids", filters.role_ids.join(","));
    if (filters.status?.length) params.set("status", filters.status.join(","));
    params.set("page", String(filters.page ?? 1));
    params.set("page_size", String(filters.page_size ?? 10));
    return data<AdminUserList>(requestApi(endpoint("GET", `/users?${params.toString()}`)));
  },
  getUser: (id: number) => data<AdminUser>(requestApi(endpoint("GET", `/users/${id}`))),
  createUser: (payload: AdminUserForm) =>
    data<AdminUserCreated>(requestApi(endpoint("POST", "/users"), body(payload))),
  updateUser: (id: number, payload: Partial<AdminUserForm>) =>
    data<AdminUser>(requestApi(endpoint("PATCH", `/users/${id}`), body(payload))),
  setUserStatus: (id: number, isActive: boolean) =>
    data<AdminUser>(
      requestApi(endpoint("PATCH", `/users/${id}/status`), body({ is_active: isActive })),
    ),
  resetPassword: (id: number) =>
    data<{ temporary_password: string }>(
      requestApi(endpoint("POST", `/users/${id}/reset-password`)),
    ),

  // ---- departments
  listDepartments: () => data<AdminDepartment[]>(requestApi(endpoint("GET", "/departments"))),
  createDepartment: (payload: NamedPayload) =>
    data<AdminDepartment>(requestApi(endpoint("POST", "/departments"), body(payload))),
  updateDepartment: (id: number, payload: NamedPayload) =>
    data<AdminDepartment>(requestApi(endpoint("PATCH", `/departments/${id}`), body(payload))),
  deleteDepartment: (id: number) =>
    data<unknown>(requestApi(endpoint("DELETE", `/departments/${id}`))),
  listDepartmentMembers: (id: number) =>
    data<AdminUser[]>(requestApi(endpoint("GET", `/departments/${id}/members`))),
  addDepartmentMembers: (id: number, userIds: number[]) =>
    data<AdminUser[]>(
      requestApi(endpoint("POST", `/departments/${id}/members`), body({ user_ids: userIds })),
    ),
  removeDepartmentMember: (id: number, userId: number) =>
    data<AdminUser[]>(requestApi(endpoint("DELETE", `/departments/${id}/members/${userId}`))),

  // ---- job titles
  listJobTitles: () => data<AdminJobTitle[]>(requestApi(endpoint("GET", "/job-titles"))),
  createJobTitle: (payload: NamedPayload) =>
    data<AdminJobTitle>(requestApi(endpoint("POST", "/job-titles"), body(payload))),
  updateJobTitle: (id: number, payload: NamedPayload) =>
    data<AdminJobTitle>(requestApi(endpoint("PATCH", `/job-titles/${id}`), body(payload))),
  deleteJobTitle: (id: number) =>
    data<unknown>(requestApi(endpoint("DELETE", `/job-titles/${id}`))),

  // ---- roles & permissions
  listPermissions: () => data<AdminPermission[]>(requestApi(endpoint("GET", "/permissions"))),
  listRoles: () => data<AdminRole[]>(requestApi(endpoint("GET", "/roles"))),
  listRoleMembers: (id: number) =>
    data<AdminRoleMember[]>(requestApi(endpoint("GET", `/roles/${id}/members`))),
  createRole: (payload: NamedPayload & { permission_ids?: number[] }) =>
    data<AdminRole>(requestApi(endpoint("POST", "/roles"), body(payload))),
  updateRole: (id: number, payload: NamedPayload) =>
    data<AdminRole>(requestApi(endpoint("PATCH", `/roles/${id}`), body(payload))),
  setRolePermissions: (id: number, permissionIds: number[]) =>
    data<AdminRole>(
      requestApi(
        endpoint("PUT", `/roles/${id}/permissions`),
        body({ permission_ids: permissionIds }),
      ),
    ),
  deleteRole: (id: number) => data<unknown>(requestApi(endpoint("DELETE", `/roles/${id}`))),
};
