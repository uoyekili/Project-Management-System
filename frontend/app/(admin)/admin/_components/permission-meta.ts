import type { AdminPermission, PermissionScope } from "@/types";

/** Mô hình hiển thị ma trận phân quyền; code thực tế lấy từ catalog backend (`GET /api/admin/permissions`). */
export const SCOPE_ORDER: PermissionScope[] = ["OWN", "PROJECT", "ALL"];
export const SCOPE_RANK: Record<PermissionScope, number> = { OWN: 1, PROJECT: 2, ALL: 3 };

export type MatrixRow = {
  key: string; // resource.action
  resource: string;
  action: string;
  label: string;
  /** Các scope có trong catalog, theo thứ tự OWN → PROJECT → ALL. */
  scopes: PermissionScope[];
};

export type MatrixGroup = {
  key: string;
  label: string;
  description: string;
  /** Nhóm quyền quản trị: chỉ bật/tắt, scope luôn là ALL. */
  admin?: boolean;
  rows: MatrixRow[];
};

const ACTION_LABEL: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xóa",
  assign: "Giao",
  approve: "Duyệt",
  member_add: "Thêm thành viên",
  member_remove: "Gỡ thành viên",
  manage: "Quản lý",
  access: "Truy cập khu vực quản trị",
};

const GROUPS: Array<{
  key: string;
  label: string;
  description: string;
  admin?: boolean;
  resources: string[];
}> = [
  {
    key: "project",
    label: "Dự án",
    description: "Xem, tạo, sửa, xóa dự án và quản lý thành viên.",
    resources: ["project"],
  },
  {
    key: "sprint",
    label: "Sprint",
    description: "Lập kế hoạch và đóng sprint.",
    resources: ["sprint"],
  },
  { key: "task", label: "Task", description: "Tạo, sửa, xóa và giao việc.", resources: ["task"] },
  {
    key: "logwork",
    label: "Logwork",
    description: "Ghi nhận và duyệt thời gian làm việc.",
    resources: ["logwork"],
  },
  {
    key: "user",
    label: "Nhân sự",
    description: "Phạm vi danh bạ nhân sự được xem.",
    resources: ["user"],
  },
  {
    key: "admin",
    label: "Quản trị hệ thống",
    description: "Chỉ dành cho role quản trị; không kết hợp với quyền nghiệp vụ.",
    admin: true,
    resources: ["admin", "user", "department", "catalog", "role"],
  },
];

/** Các hàng quyền quản trị (scope ALL); role giữ `admin.access` chỉ được có các hàng này. */
export const ADMIN_ROW_KEYS = new Set([
  "admin.access",
  "user.manage",
  "department.manage",
  "catalog.manage",
  "role.manage",
]);

export function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? action;
}

export function buildMatrix(permissions: AdminPermission[]): MatrixGroup[] {
  const byRow = new Map<string, AdminPermission[]>();
  for (const permission of permissions) {
    const key = `${permission.resource}.${permission.action}`;
    byRow.set(key, [...(byRow.get(key) ?? []), permission]);
  }

  return GROUPS.map((group) => {
    const rows: MatrixRow[] = [];
    for (const [key, items] of byRow) {
      const { resource, action } = items[0];
      const isAdminPermission =
        items[0].scope === "ALL" && ["manage", "access"].includes(action) && group.admin;
      const belongs = group.admin
        ? isAdminPermission && group.resources.includes(resource)
        : group.resources.includes(resource) && !(resource === "user" && action === "manage");
      if (!belongs) continue;
      rows.push({
        key,
        resource,
        action,
        label: group.admin ? items[0].name : actionLabel(action),
        scopes: [...items].map((item) => item.scope).sort((a, b) => SCOPE_RANK[a] - SCOPE_RANK[b]),
      });
    }
    const order = [
      "view",
      "create",
      "update",
      "delete",
      "assign",
      "member_add",
      "member_remove",
      "approve",
      "manage",
      "access",
    ];
    rows.sort((a, b) => order.indexOf(a.action) - order.indexOf(b.action));
    return {
      key: group.key,
      label: group.label,
      description: group.description,
      admin: group.admin,
      rows,
    };
  }).filter((group) => group.rows.length > 0);
}

/** Từ danh sách code của role → scope cao nhất cho từng hàng. */
export function selectionFromCodes(codes: string[]): Record<string, PermissionScope | null> {
  const selection: Record<string, PermissionScope | null> = {};
  for (const code of codes) {
    const [rowKey, scope] = code.split(":") as [string, PermissionScope];
    const current = selection[rowKey];
    if (!current || SCOPE_RANK[scope] > SCOPE_RANK[current]) selection[rowKey] = scope;
  }
  return selection;
}

export function selectionToIds(
  selection: Record<string, PermissionScope | null>,
  permissions: AdminPermission[],
): number[] {
  const byCode = new Map(permissions.map((permission) => [permission.code, permission.id]));
  const ids: number[] = [];
  for (const [rowKey, scope] of Object.entries(selection)) {
    if (!scope) continue;
    const id = byCode.get(`${rowKey}:${scope}`);
    if (id !== undefined) ids.push(id);
  }
  return ids.sort((a, b) => a - b);
}

export function sameSelection(
  a: Record<string, PermissionScope | null>,
  b: Record<string, PermissionScope | null>,
) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) return false;
  }
  return true;
}

/** Tóm tắt một nhóm: số hàng đang bật và scope cao nhất (dùng cho khung "Tóm tắt phạm vi"). */
export function summarizeGroup(
  group: MatrixGroup,
  selection: Record<string, PermissionScope | null>,
) {
  let enabled = 0;
  let max: PermissionScope | null = null;
  for (const row of group.rows) {
    const scope = selection[row.key] ?? null;
    if (!scope) continue;
    enabled += 1;
    if (!max || SCOPE_RANK[scope] > SCOPE_RANK[max]) max = scope;
  }
  return { enabled, total: group.rows.length, max };
}
