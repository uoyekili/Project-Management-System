"""Catalog permission + role mặc định (không phụ thuộc app).

Mỗi permission = resource + action + scope, code dạng ``resource.action:SCOPE``.
Scope cao bao phủ scope thấp: ALL ⊃ PROJECT ⊃ OWN.
"""

from dataclasses import dataclass

OWN = "OWN"
PROJECT = "PROJECT"
ALL = "ALL"

SCOPE_RANK = {OWN: 1, PROJECT: 2, ALL: 3}
SCOPES = (OWN, PROJECT, ALL)


@dataclass(frozen=True)
class PermissionDef:
    resource: str
    action: str
    scope: str
    name: str
    description: str = ""

    @property
    def code(self) -> str:
        return make_code(self.resource, self.action, self.scope)


def make_code(resource: str, action: str, scope: str) -> str:
    return f"{resource}.{action}:{scope}"


def _p(resource: str, action: str, scope: str, name: str, description: str = "") -> PermissionDef:
    return PermissionDef(resource, action, scope, name, description)


PERMISSION_DEFS: list[PermissionDef] = [
    # --- Quản trị (chỉ Admin) ---
    _p("admin", "access", ALL, "Truy cập trang quản trị", "Vào khu vực Admin"),
    _p("user", "manage", ALL, "Quản lý người dùng", "Tạo, sửa, khóa tài khoản, đặt lại mật khẩu"),
    _p("department", "manage", ALL, "Quản lý phòng ban", "Tạo, sửa, xóa phòng ban và gán nhân sự"),
    _p("catalog", "manage", ALL, "Quản lý chức danh", "Danh mục Job Title"),
    _p("role", "manage", ALL, "Quản lý role & phân quyền", "Tạo role và cấu hình permission"),
    # --- Nhân sự ---
    _p("user", "view", OWN, "Chỉ xem bản thân"),
    _p("user", "view", PROJECT, "Xem nhân sự cùng dự án"),
    _p("user", "view", ALL, "Xem toàn bộ nhân sự công ty"),
    # --- Project ---
    _p("project", "view", PROJECT, "Xem dự án mình tham gia"),
    _p("project", "view", ALL, "Xem toàn bộ dự án công ty", "Không cần là thành viên dự án"),
    _p("project", "create", ALL, "Tạo dự án"),
    _p("project", "update", PROJECT, "Sửa dự án mình tham gia"),
    _p("project", "update", ALL, "Sửa mọi dự án"),
    _p("project", "delete", PROJECT, "Xóa dự án mình tham gia"),
    _p("project", "delete", ALL, "Xóa mọi dự án"),
    _p("project", "member_add", PROJECT, "Thêm thành viên vào dự án mình tham gia"),
    _p("project", "member_add", ALL, "Thêm thành viên vào mọi dự án"),
    _p("project", "member_remove", PROJECT, "Xóa thành viên khỏi dự án mình tham gia"),
    _p("project", "member_remove", ALL, "Xóa thành viên khỏi mọi dự án"),
    _p("sprint", "manage", PROJECT, "Quản lý sprint", "Tạo, sửa, đóng sprint trong dự án mình tham gia"),
    # --- Task ---
    _p("task", "view", OWN, "Xem task được giao / do mình tạo"),
    _p("task", "view", PROJECT, "Xem mọi task trong dự án mình tham gia"),
    _p("task", "view", ALL, "Xem mọi task toàn công ty"),
    _p("task", "create", OWN, "Tạo task cho bản thân"),
    _p("task", "create", PROJECT, "Tạo task cho người khác trong dự án"),
    _p("task", "update", OWN, "Sửa task của bản thân"),
    _p("task", "update", PROJECT, "Sửa task của người khác trong dự án"),
    _p("task", "delete", OWN, "Xóa task của bản thân"),
    _p("task", "delete", PROJECT, "Xóa task của người khác trong dự án"),
    _p("task", "assign", PROJECT, "Giao task", "Thêm hoặc đổi người thực hiện task"),
    # --- Logwork ---
    _p("logwork", "view", OWN, "Xem logwork của bản thân"),
    _p("logwork", "view", PROJECT, "Xem logwork trong dự án mình tham gia"),
    _p("logwork", "view", ALL, "Xem logwork toàn công ty"),
    _p("logwork", "create", OWN, "Tạo logwork"),
    _p("logwork", "update", OWN, "Sửa logwork của bản thân"),
    _p("logwork", "delete", OWN, "Xóa logwork của bản thân"),
    _p("logwork", "approve", PROJECT, "Duyệt logwork trong dự án mình tham gia"),
    _p("logwork", "approve", ALL, "Duyệt logwork toàn công ty"),
]

PERMISSIONS_BY_CODE: dict[str, PermissionDef] = {p.code: p for p in PERMISSION_DEFS}
ALL_CODES: set[str] = set(PERMISSIONS_BY_CODE)

# Quyền quản trị chỉ dành cho role Admin: không trộn với quyền nghiệp vụ task/logwork.
ADMIN_PERMISSION_CODES: set[str] = {
    "admin.access:ALL",
    "user.manage:ALL",
    "department.manage:ALL",
    "catalog.manage:ALL",
    "role.manage:ALL",
}

ADMIN_REQUIRED_CODES = {"admin.access:ALL", "role.manage:ALL"}


def _codes(resource: str, action: str, *scopes: str) -> list[str]:
    return [make_code(resource, action, s) for s in scopes]


@dataclass(frozen=True)
class RoleDef:
    name: str
    description: str
    codes: list[str]


_ADMIN = RoleDef(
    "Admin",
    "Quản trị hệ thống: người dùng, phòng ban, danh mục và phân quyền. Không thuộc phòng ban hay dự án nào.",
    sorted(ADMIN_PERMISSION_CODES),
)

_CEO = RoleDef(
    "CEO",
    "Ban điều hành: xem toàn bộ dự án, task, logwork và dashboard công ty",
    _codes("user", "view", ALL)
    + _codes("project", "view", ALL)
    + _codes("task", "view", ALL)
    + _codes("logwork", "view", ALL)
    + _codes("logwork", "approve", ALL),
)

_PM = RoleDef(
    "Project Manager",
    "Quản lý dự án mình phụ trách: thành viên, sprint, task, duyệt logwork",
    _codes("user", "view", PROJECT)
    + _codes("project", "view", PROJECT)
    + _codes("project", "create", ALL)
    + _codes("project", "update", PROJECT)
    + _codes("project", "delete", PROJECT)
    + _codes("project", "member_add", PROJECT)
    + _codes("project", "member_remove", PROJECT)
    + _codes("sprint", "manage", PROJECT)
    + _codes("task", "view", PROJECT)
    + _codes("task", "create", OWN, PROJECT)
    + _codes("task", "update", OWN, PROJECT)
    + _codes("task", "delete", OWN, PROJECT)
    + _codes("task", "assign", PROJECT)
    + _codes("logwork", "view", PROJECT)
    + _codes("logwork", "create", OWN)
    + _codes("logwork", "update", OWN)
    + _codes("logwork", "delete", OWN)
    + _codes("logwork", "approve", PROJECT),
)

_LEADER = RoleDef(
    "Team Leader",
    "Điều phối nhóm trong dự án: giao việc, sửa task, duyệt logwork",
    _codes("user", "view", PROJECT)
    + _codes("project", "view", PROJECT)
    + _codes("sprint", "manage", PROJECT)
    + _codes("task", "view", PROJECT)
    + _codes("task", "create", OWN, PROJECT)
    + _codes("task", "update", OWN, PROJECT)
    + _codes("task", "delete", OWN)
    + _codes("task", "assign", PROJECT)
    + _codes("logwork", "view", PROJECT)
    + _codes("logwork", "create", OWN)
    + _codes("logwork", "update", OWN)
    + _codes("logwork", "delete", OWN)
    + _codes("logwork", "approve", PROJECT),
)

_EMPLOYEE = RoleDef(
    "Employee",
    "Nhân viên: xem dự án mình tham gia, quản lý task và logwork của bản thân",
    _codes("user", "view", PROJECT)
    + _codes("project", "view", PROJECT)
    + _codes("task", "view", PROJECT)
    + _codes("task", "create", OWN)
    + _codes("task", "update", OWN)
    + _codes("task", "delete", OWN)
    + _codes("logwork", "view", OWN)
    + _codes("logwork", "create", OWN)
    + _codes("logwork", "update", OWN)
    + _codes("logwork", "delete", OWN),
)

_INTERN = RoleDef(
    "Intern",
    "Thực tập sinh: chỉ thấy task được giao và ghi logwork của mình",
    _codes("user", "view", OWN)
    + _codes("project", "view", PROJECT)
    + _codes("task", "view", OWN)
    + _codes("task", "update", OWN)
    + _codes("logwork", "view", OWN)
    + _codes("logwork", "create", OWN)
    + _codes("logwork", "update", OWN),
)

DEFAULT_ROLES: list[RoleDef] = [_ADMIN, _CEO, _PM, _LEADER, _EMPLOYEE, _INTERN]
