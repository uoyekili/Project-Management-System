"""Resolver phân quyền Resource → Action → Scope.

Mỗi user có đúng một role; role giữ các permission dạng ``resource.action:SCOPE``.
Scope cao bao phủ scope thấp (ALL ⊃ PROJECT ⊃ OWN). Backend là nơi quyết định quyền,
frontend chỉ dùng danh sách code để ẩn/hiện UI.

- ``OWN``: bản ghi của chính mình (task được giao / do mình tạo, logwork của mình).
- ``PROJECT``: mọi bản ghi trong các dự án mình là thành viên đang hoạt động.
- ``ALL``: toàn công ty, không cần là thành viên dự án.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.permission_catalog import (
    ALL,
    DEFAULT_ROLES,
    OWN,
    PERMISSION_DEFS,
    PROJECT,
    SCOPE_RANK,
    make_code,
)
from app.models.user_model import User

FORBIDDEN_DETAIL = "Bạn không có quyền thực hiện thao tác này."


def forbidden(detail: str = FORBIDDEN_DETAIL) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


# --------------------------------------------------------------------------- #
# Permission của user
# --------------------------------------------------------------------------- #
def user_codes(user: User | None) -> set[str]:
    if not user or not user.is_active or not user.role_ref:
        return set()
    return user.role_ref.permission_codes


def has_permission(user: User | None, code: str) -> bool:
    """Kiểm tra chính xác một code, vd ``role.manage:ALL``."""
    return bool(user and user.is_active and code in user_codes(user))


def max_scope(user: User | None, resource: str, action: str) -> str | None:
    """Scope cao nhất user có cho (resource, action); None nếu không có quyền."""
    codes = user_codes(user)
    best: str | None = None
    for scope in (ALL, PROJECT, OWN):
        if make_code(resource, action, scope) in codes:
            best = scope
            break
    return best


def has_scope(user: User | None, resource: str, action: str, minimum: str = OWN) -> bool:
    scope = max_scope(user, resource, action)
    return bool(scope and SCOPE_RANK[scope] >= SCOPE_RANK[minimum])


def is_admin(user: User | None) -> bool:
    return has_permission(user, "admin.access:ALL")


# --------------------------------------------------------------------------- #
# Phạm vi theo project
# --------------------------------------------------------------------------- #
def is_project_member(db: Session, user: User | None, project_id: int) -> bool:
    if not user or not user.is_active:
        return False
    from app.models.project_model import ProjectMember

    return (
        db.query(ProjectMember.id)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
            ProjectMember.is_active.is_(True),
        )
        .first()
        is not None
    )


def member_project_ids(db: Session, user: User | None) -> list[int]:
    if not user or not user.is_active:
        return []
    from app.models.project_model import ProjectMember

    rows = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == user.id, ProjectMember.is_active.is_(True))
        .distinct()
        .all()
    )
    return [project_id for (project_id,) in rows]


def effective_scope(
    db: Session, user: User | None, resource: str, action: str, project_id: int
) -> str | None:
    """Scope hiệu lực của user trên một project cụ thể.

    ALL → áp dụng mọi project; PROJECT/OWN → chỉ khi là thành viên project đó.
    """
    scope = max_scope(user, resource, action)
    if scope is None:
        return None
    if scope == ALL:
        return ALL
    return scope if is_project_member(db, user, project_id) else None


def can_in_project(
    db: Session, user: User | None, resource: str, action: str, project_id: int
) -> bool:
    """Có quyền ở mức PROJECT (hoặc ALL) trên project này — dùng cho thao tác không gắn chủ sở hữu."""
    scope = effective_scope(db, user, resource, action, project_id)
    return bool(scope and SCOPE_RANK[scope] >= SCOPE_RANK[PROJECT])


def can_on_record(
    db: Session,
    user: User | None,
    resource: str,
    action: str,
    project_id: int,
    *,
    owner_user_ids: set[int] | list[int] | None = None,
) -> bool:
    """Quyền trên một bản ghi cụ thể: ALL/PROJECT theo project, OWN khi user nằm trong owner_user_ids."""
    scope = effective_scope(db, user, resource, action, project_id)
    if scope is None or user is None:
        return False
    if SCOPE_RANK[scope] >= SCOPE_RANK[PROJECT]:
        return True
    return bool(owner_user_ids) and user.id in set(owner_user_ids)


def ensure(allowed: bool, detail: str = FORBIDDEN_DETAIL) -> None:
    if not allowed:
        raise forbidden(detail)


def project_permission_codes(db: Session, user: User | None, project_id: int) -> list[str]:
    """Các code có hiệu lực trên một project (trả cho frontend ẩn/hiện nút)."""
    codes = user_codes(user)
    if not codes:
        return []
    member = is_project_member(db, user, project_id)
    result = []
    for definition in PERMISSION_DEFS:
        if definition.code not in codes or definition.resource in {"admin", "role", "catalog", "department"}:
            continue
        if definition.scope == ALL or member:
            result.append(definition.code)
    return sorted(result)


def all_permission_codes(user: User | None) -> list[str]:
    return sorted(user_codes(user))


# --------------------------------------------------------------------------- #
# FastAPI dependencies
# --------------------------------------------------------------------------- #
def require_permission(code: str):
    """Yêu cầu chính xác một code (dùng cho khu vực Admin: ``role.manage:ALL``)."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user, code):
            raise forbidden()
        return current_user

    return dependency


def require_scope(resource: str, action: str, minimum: str = OWN):
    """Yêu cầu user có (resource, action) ở scope tối thiểu ``minimum``."""

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not has_scope(current_user, resource, action, minimum):
            raise forbidden()
        return current_user

    return dependency


__all__ = [
    "DEFAULT_ROLES",
    "all_permission_codes",
    "can_in_project",
    "can_on_record",
    "effective_scope",
    "ensure",
    "forbidden",
    "has_permission",
    "has_scope",
    "is_admin",
    "is_project_member",
    "max_scope",
    "member_project_ids",
    "project_permission_codes",
    "require_permission",
    "require_scope",
    "user_codes",
]
