from types import SimpleNamespace

from app.core.permission_catalog import (
    ADMIN_PERMISSION_CODES,
    ALL,
    ALL_CODES,
    DEFAULT_ROLES,
    OWN,
    PERMISSION_DEFS,
    PROJECT,
    make_code,
)
from app.core.permissions import has_permission, has_scope, max_scope


def make_user(codes, active=True):
    role = SimpleNamespace(permission_codes=set(codes))
    return SimpleNamespace(is_active=active, role_ref=role)


def test_permission_codes_are_unique_and_well_formed():
    codes = [p.code for p in PERMISSION_DEFS]
    assert len(codes) == len(set(codes))
    for p in PERMISSION_DEFS:
        assert p.scope in {OWN, PROJECT, ALL}
        assert p.code == make_code(p.resource, p.action, p.scope)


def test_default_roles_only_use_catalog_codes():
    for role in DEFAULT_ROLES:
        assert set(role.codes) <= ALL_CODES, role.name
        assert len(role.codes) == len(set(role.codes)), role.name


def test_admin_role_is_configuration_only():
    admin = next(r for r in DEFAULT_ROLES if r.name == "Admin")
    assert ADMIN_PERMISSION_CODES <= set(admin.codes)
    # Admin chỉ giữ quyền quản trị: không dự án, task, logwork hay nhân sự nghiệp vụ.
    assert set(admin.codes) == ADMIN_PERMISSION_CODES


def test_only_admin_role_holds_admin_permissions():
    for role in DEFAULT_ROLES:
        if role.name != "Admin":
            assert not set(role.codes) & ADMIN_PERMISSION_CODES, role.name


def test_ceo_sees_everything_but_cannot_edit():
    ceo = make_user(next(r for r in DEFAULT_ROLES if r.name == "CEO").codes)
    for resource in ("project", "task", "logwork"):
        assert max_scope(ceo, resource, "view") == ALL
    assert max_scope(ceo, "task", "update") is None
    assert max_scope(ceo, "task", "create") is None


def test_scope_resolution_prefers_highest_scope():
    user = make_user(["task.update:OWN", "task.update:PROJECT"])
    assert max_scope(user, "task", "update") == PROJECT
    assert has_scope(user, "task", "update", OWN)
    assert has_scope(user, "task", "update", PROJECT)
    assert not has_scope(user, "task", "update", ALL)


def test_inactive_or_missing_user_has_no_permissions():
    assert not has_permission(make_user(["role.manage:ALL"], active=False), "role.manage:ALL")
    assert not has_permission(None, "role.manage:ALL")
    assert max_scope(None, "task", "view") is None
