"""Đồng bộ catalog permission (code) vào DB khi khởi động.

Catalog là nguồn sự thật cho danh sách permission. Hàm này chỉ thêm/sửa/xóa bản ghi
``permissions``; cấu hình ``role_permissions`` do Admin quyết định nên không bị đụng tới
(trừ khi permission bị xóa khỏi catalog).
"""

from sqlalchemy.orm import Session

from app.core.permission_catalog import DEFAULT_ROLES, PERMISSION_DEFS, PERMISSIONS_BY_CODE
from app.models.permission_model import Permission
from app.models.role_model import Role


def sync_permissions(db: Session) -> dict[str, Permission]:
    existing = {p.code: p for p in db.query(Permission).all()}
    for definition in PERMISSION_DEFS:
        row = existing.get(definition.code)
        if row is None:
            row = Permission(code=definition.code)
            db.add(row)
            existing[definition.code] = row
        row.resource = definition.resource
        row.action = definition.action
        row.scope = definition.scope
        row.name = definition.name
        row.description = definition.description or None
    for code, row in list(existing.items()):
        if code not in PERMISSIONS_BY_CODE:
            db.delete(row)
            del existing[code]
    db.flush()
    return existing


def ensure_default_roles(db: Session, permissions: dict[str, Permission] | None = None) -> dict[str, Role]:
    """Tạo role mặc định nếu chưa có (không ghi đè cấu hình quyền đã chỉnh)."""
    permissions = permissions or {p.code: p for p in db.query(Permission).all()}
    roles: dict[str, Role] = {r.name: r for r in db.query(Role).all()}
    # Role mặc định có thể bị đổi tên: chỉ khởi tạo khi hệ thống chưa có role mặc định nào,
    # nếu không sẽ tạo trùng một role cũ ngay lần khởi động sau.
    has_defaults = any(r.is_system for r in roles.values())
    for definition in DEFAULT_ROLES:
        role = roles.get(definition.name)
        if role is None and has_defaults:
            continue
        if role is None:
            role = Role(name=definition.name, description=definition.description, is_system=True)
            role.permissions = [permissions[c] for c in definition.codes]
            db.add(role)
            roles[definition.name] = role
        else:
            role.is_system = True
    db.flush()
    return roles


def sync_catalog(db: Session) -> None:
    permissions = sync_permissions(db)
    ensure_default_roles(db, permissions)
    db.commit()
