import type { Project, UserProfile } from "@/types";

/**
 * Permission = resource.action:SCOPE (ví dụ `task.update:OWN`).
 * Backend là nơi quyết định quyền; frontend chỉ dùng danh sách code để ẩn/hiện UI.
 * Danh sách code do Admin cấu hình qua role (catalog ở backend/app/core/permission_catalog.py).
 */
export type Scope = "OWN" | "PROJECT" | "ALL";

export const SCOPE_RANK: Record<Scope, number> = { OWN: 1, PROJECT: 2, ALL: 3 };
export const SCOPES: readonly Scope[] = ["OWN", "PROJECT", "ALL"];

/** Code chính xác cho khu vực quản trị (luôn scope ALL). */
export const PERM = {
  adminAccess: "admin.access:ALL",
  userManage: "user.manage:ALL",
  departmentManage: "department.manage:ALL",
  catalogManage: "catalog.manage:ALL",
  roleManage: "role.manage:ALL",
  projectCreate: "project.create:ALL",
} as const;

type CodeHolder = { permissions?: string[] } | null | undefined;
type Viewer = Pick<UserProfile, "permissions"> | null | undefined;

export function makeCode(resource: string, action: string, scope: Scope) {
  return `${resource}.${action}:${scope}`;
}

function scopeFromCodes(codes: string[] | undefined, resource: string, action: string): Scope | null {
  if (!codes?.length) return null;
  for (const scope of ["ALL", "PROJECT", "OWN"] as const) {
    if (codes.includes(makeCode(resource, action, scope))) return scope;
  }
  return null;
}

/** Kiểm tra chính xác một code, vd `PERM.roleManage`. */
export function canCode(holder: CodeHolder, code: string): boolean {
  return Boolean(holder?.permissions?.includes(code));
}

/** Scope cao nhất của user cho (resource, action); null nếu không có quyền. */
export function maxScope(viewer: Viewer, resource: string, action: string): Scope | null {
  return scopeFromCodes(viewer?.permissions, resource, action);
}

/** User có (resource, action) ở scope tối thiểu `minimum`. */
export function can(viewer: Viewer, resource: string, action: string, minimum: Scope = "OWN"): boolean {
  const scope = maxScope(viewer, resource, action);
  return scope !== null && SCOPE_RANK[scope] >= SCOPE_RANK[minimum];
}

export function isAdmin(viewer: Viewer): boolean {
  return canCode(viewer, PERM.adminAccess);
}

/** Xem được toàn bộ dự án công ty mà không cần là thành viên (project.view:ALL). */
export function hasCompanywideProjectAccess(viewer: Viewer): boolean {
  return maxScope(viewer, "project", "view") === "ALL";
}

/** Scope hiệu lực trên một dự án: backend trả `myPermissions` đã lọc theo membership. */
export function projectScope(
  project: Pick<Project, "myPermissions"> | null | undefined,
  resource: string,
  action: string,
): Scope | null {
  return scopeFromCodes(project?.myPermissions, resource, action);
}

/** Quyền không gắn bản ghi cụ thể trong dự án (mức PROJECT trở lên), vd tạo task cho người khác. */
export function canInProject(
  project: Pick<Project, "myPermissions"> | null | undefined,
  resource: string,
  action: string,
  minimum: Scope = "PROJECT",
): boolean {
  const scope = projectScope(project, resource, action);
  return scope !== null && SCOPE_RANK[scope] >= SCOPE_RANK[minimum];
}

/** Quyền trên một bản ghi: scope ≥ PROJECT, hoặc scope OWN khi `isOwner`. */
export function canOnRecord(
  project: Pick<Project, "myPermissions"> | null | undefined,
  resource: string,
  action: string,
  isOwner: boolean,
): boolean {
  const scope = projectScope(project, resource, action);
  if (scope === null) return false;
  return SCOPE_RANK[scope] >= SCOPE_RANK.PROJECT || isOwner;
}

/** Có thể duyệt logwork ở bất kỳ phạm vi nào (hiện menu Duyệt logwork). */
export function canApproveLogworkAnywhere(viewer: Viewer): boolean {
  return can(viewer, "logwork", "approve", "PROJECT");
}

/** Nhãn phạm vi dữ liệu hiển thị trên dashboard. */
export const SCOPE_LABEL: Record<Scope, string> = {
  ALL: "Toàn công ty",
  PROJECT: "Dự án tham gia",
  OWN: "Cá nhân",
};
