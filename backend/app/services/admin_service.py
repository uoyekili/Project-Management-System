"""Nghiệp vụ trang Admin: user, phòng ban, chức danh, role & permission."""

import math
import secrets
import string
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.department_model import Department
from app.models.job_title_model import JobTitle
from app.models.permission_model import Permission, role_permissions
from app.models.role_model import Role
from app.models.user_model import User
from app.repositories import refresh_token_repository
from app.schemas import admin_schema as s
from app.services.azure_blob_service import DEFAULT_AVATAR_BLOB
from app.utils.password_hash import hash_password

from app.core.permission_catalog import (
    ADMIN_PERMISSION_CODES,
    ADMIN_REQUIRED_CODES,
)

ADMIN_PERMISSION = "admin.access:ALL"


def _bad(detail: str, code: int = status.HTTP_400_BAD_REQUEST):
    raise HTTPException(status_code=code, detail=detail)


def _get_or_404(db: Session, model, item_id: int, label: str):
    item = db.get(model, item_id)
    if not item:
        _bad(f"Không tìm thấy {label}.", status.HTTP_404_NOT_FOUND)
    return item


def _ensure_unique_name(db: Session, model, name: str, exclude_id: int | None = None):
    query = db.query(model).filter(func.lower(model.name) == name.lower())
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)
    if query.first():
        _bad("Tên đã tồn tại.")


def _commit(db: Session, item=None):
    db.commit()
    if item is not None:
        db.refresh(item)
    return item


# ---------------------------------------------------------------- dashboard
def get_dashboard(db: Session) -> s.AdminDashboard:
    total = db.query(func.count(User.id)).scalar() or 0
    active = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    by_department = (
        db.query(Department.name, func.count(User.id))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.id)
        .order_by(Department.name)
        .all()
    )
    by_role = (
        db.query(Role.name, func.count(User.id))
        .outerjoin(User, User.role_id == Role.id)
        .group_by(Role.id)
        .order_by(Role.name)
        .all()
    )
    return s.AdminDashboard(
        total_users=total,
        active_users=active,
        locked_users=total - active,
        total_departments=db.query(func.count(Department.id)).scalar() or 0,
        total_roles=db.query(func.count(Role.id)).scalar() or 0,
        unassigned_users=db.query(func.count(User.id))
        .filter(User.department_id.is_(None), ~User.id.in_(_admin_user_ids(db)))
        .scalar()
        or 0,
        users_by_department=[s.CountItem(label=n, count=c) for n, c in by_department],
        users_by_role=[s.CountItem(label=n, count=c) for n, c in by_role],
    )


# -------------------------------------------------------------------- users
def _user_query(db: Session):
    return db.query(User).options(
        joinedload(User.department),
        joinedload(User.job_title),
        joinedload(User.role_ref),
    )


def _to_user_item(user: User) -> s.AdminUserItem:
    return s.AdminUserItem(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_admin=user.is_admin,
        department=user.department,
        job_title=user.job_title,
        role=user.role_ref,
        created_at=user.created_at,
    )


def _csv(value: str | None) -> list[str]:
    return [part.strip() for part in (value or "").split(",") if part.strip()]


def list_users(
    db: Session,
    search: str | None,
    department_ids: str | None,
    role_ids: str | None,
    status_filter: str | None,
    page: int,
    page_size: int,
) -> s.AdminUserList:
    query = _user_query(db)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(or_(User.email.ilike(term), User.full_name.ilike(term)))
    departments = _csv(department_ids)
    if departments:
        ids = [int(item) for item in departments if item.isdigit()]
        conditions = [User.department_id.in_(ids)] if ids else []
        if "none" in departments:
            conditions.append(User.department_id.is_(None))
        if conditions:
            query = query.filter(or_(*conditions))
    roles = [int(item) for item in _csv(role_ids) if item.isdigit()]
    if roles:
        query = query.filter(User.role_id.in_(roles))
    statuses = {item.upper() for item in _csv(status_filter)}
    if statuses == {"ACTIVE"}:
        query = query.filter(User.is_active.is_(True))
    elif statuses == {"INACTIVE"}:
        query = query.filter(User.is_active.is_(False))

    total = query.count()
    users = (
        query.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )
    return s.AdminUserList(
        items=[_to_user_item(u) for u in users],
        total=total,
        page=page,
        pageSize=page_size,
        totalPages=math.ceil(total / page_size) if total else 1,
    )


def _validate_user_refs(db: Session, data: dict) -> None:
    if data.get("department_id") is not None:
        _get_or_404(db, Department, data["department_id"], "phòng ban")
    if data.get("job_title_id") is not None:
        _get_or_404(db, JobTitle, data["job_title_id"], "chức danh")
    if data.get("role_id") is not None:
        _get_or_404(db, Role, data["role_id"], "role")


def _count_admins(db: Session, exclude_user_id: int | None = None) -> int:
    query = (
        db.query(func.count(User.id))
        .join(role_permissions, role_permissions.c.role_id == User.role_id)
        .join(Permission, Permission.id == role_permissions.c.permission_id)
        .filter(Permission.code == ADMIN_PERMISSION, User.is_active.is_(True))
    )
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    return query.scalar() or 0


def _admin_user_ids(db: Session):
    """Id của tài khoản quản trị (role giữ admin.access): không thuộc phòng ban hay dự án nào."""
    return (
        db.query(User.id)
        .join(role_permissions, role_permissions.c.role_id == User.role_id)
        .join(Permission, Permission.id == role_permissions.c.permission_id)
        .filter(Permission.code == ADMIN_PERMISSION)
    )


def _is_admin_role(db: Session, role_id: int | None) -> bool:
    role = db.get(Role, role_id) if role_id else None
    return bool(role and ADMIN_PERMISSION in role.permission_codes)


def _is_admin_user(user: User) -> bool:
    return bool(user.role_ref and ADMIN_PERMISSION in user.role_ref.permission_codes)


_PASSWORD_ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0OIl1")


def generate_password(length: int = 10) -> str:
    """Mật khẩu ngẫu nhiên (bỏ ký tự dễ nhầm), luôn có chữ hoa, chữ thường và số."""
    while True:
        value = "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))
        if (
            any(c.islower() for c in value)
            and any(c.isupper() for c in value)
            and any(c.isdigit() for c in value)
        ):
            return value


def create_user(db: Session, data: s.AdminUserCreate) -> s.AdminUserCreated:
    email = data.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        _bad("Email đã được sử dụng.")
    _validate_user_refs(db, data.model_dump())

    password = generate_password()
    user = User(
        full_name=data.full_name.strip(),
        email=email,
        phone_number=data.phone_number,
        password_hash=hash_password(password),
        avatar_url=DEFAULT_AVATAR_BLOB,
        department_id=data.department_id,
        job_title_id=data.job_title_id,
        role_id=data.role_id,
        is_active=True,
    )
    if _is_admin_role(db, data.role_id):
        # Tài khoản quản trị không thuộc phòng ban / chức danh nào.
        user.department_id = user.job_title_id = None
    db.add(user)
    db.commit()
    item = _to_user_item(_user_query(db).filter(User.id == user.id).one())
    return s.AdminUserCreated(**item.model_dump(), temporary_password=password)


def get_user(db: Session, user_id: int) -> s.AdminUserItem:
    user = _user_query(db).filter(User.id == user_id).first()
    if not user:
        _bad("Không tìm thấy người dùng.", status.HTTP_404_NOT_FOUND)
    return _to_user_item(user)


def update_user(
    db: Session, actor: User, user_id: int, data: s.AdminUserUpdate
) -> s.AdminUserItem:
    user = _user_query(db).filter(User.id == user_id).first()
    if not user:
        _bad("Không tìm thấy người dùng.", status.HTTP_404_NOT_FOUND)

    changes = data.model_dump(exclude_unset=True)
    if "role_id" in changes and changes["role_id"] is None:
        _bad("Role là bắt buộc.")
    if "full_name" in changes and not (changes["full_name"] or "").strip():
        _bad("Họ tên không được để trống.")
    _validate_user_refs(db, changes)

    if "role_id" in changes and changes["role_id"] != user.role_id and _is_admin_user(user):
        new_role = db.get(Role, changes["role_id"])
        if ADMIN_PERMISSION not in new_role.permission_codes and _count_admins(db, user.id) == 0:
            _bad("Không thể hạ quyền quản trị viên cuối cùng.")

    for key, value in changes.items():
        setattr(user, key, value.strip() if isinstance(value, str) else value)
    if _is_admin_role(db, user.role_id):
        user.department_id = user.job_title_id = None
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _to_user_item(_user_query(db).filter(User.id == user_id).one())


def set_user_status(
    db: Session, actor: User, user_id: int, is_active: bool
) -> s.AdminUserItem:
    user = _user_query(db).filter(User.id == user_id).first()
    if not user:
        _bad("Không tìm thấy người dùng.", status.HTTP_404_NOT_FOUND)
    if not is_active:
        if user.id == actor.id:
            _bad("Bạn không thể tự khóa tài khoản của mình.")
        if _is_admin_user(user) and _count_admins(db, user.id) == 0:
            _bad("Không thể khóa quản trị viên cuối cùng.")
        refresh_token_repository.revoke_all_for_user(db, user.id)
    user.is_active = is_active
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _to_user_item(_user_query(db).filter(User.id == user_id).one())


def reset_user_password(db: Session, user_id: int) -> str:
    user = _get_or_404(db, User, user_id, "người dùng")
    new_password = generate_password()
    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    refresh_token_repository.revoke_all_for_user(db, user.id)
    db.commit()
    return new_password


# -------------------------------------------------------------- departments
def _department_item(db: Session, department: Department) -> s.DepartmentItem:
    count = (
        db.query(func.count(User.id)).filter(User.department_id == department.id).scalar() or 0
    )
    return s.DepartmentItem(
        id=department.id,
        name=department.name,
        description=department.description,
        member_count=count,
    )


def list_departments(db: Session) -> list[s.DepartmentItem]:
    rows = (
        db.query(Department, func.count(User.id))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.id)
        .order_by(Department.name)
        .all()
    )
    return [
        s.DepartmentItem(id=d.id, name=d.name, description=d.description, member_count=c)
        for d, c in rows
    ]


def create_department(db: Session, data: s.DepartmentCreate) -> s.DepartmentItem:
    _ensure_unique_name(db, Department, data.name)
    department = Department(name=data.name, description=data.description)
    db.add(department)
    _commit(db, department)
    return _department_item(db, department)


def update_department(db: Session, department_id: int, data: s.DepartmentUpdate):
    department = _get_or_404(db, Department, department_id, "phòng ban")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            _bad("Tên không được để trống.")
        _ensure_unique_name(db, Department, name, department.id)
        department.name = name
    if "description" in changes:
        department.description = changes["description"]
    _commit(db, department)
    return _department_item(db, department)


def delete_department(db: Session, department_id: int) -> None:
    department = _get_or_404(db, Department, department_id, "phòng ban")
    if db.query(User.id).filter(User.department_id == department.id).first():
        _bad("Phòng ban còn nhân sự. Hãy chuyển hoặc gỡ nhân sự trước khi xóa.")
    db.delete(department)
    db.commit()


def list_department_members(db: Session, department_id: int) -> list[s.AdminUserItem]:
    _get_or_404(db, Department, department_id, "phòng ban")
    users = (
        _user_query(db)
        .filter(User.department_id == department_id)
        .order_by(User.full_name)
        .all()
    )
    return [_to_user_item(u) for u in users]


def add_department_members(db: Session, department_id: int, user_ids: list[int]):
    _get_or_404(db, Department, department_id, "phòng ban")
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    if len(users) != len(set(user_ids)):
        _bad("Có người dùng không tồn tại.")
    if any(_is_admin_user(user) for user in users):
        _bad("Tài khoản quản trị không thuộc phòng ban nào.")
    for user in users:
        user.department_id = department_id
        user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return list_department_members(db, department_id)


def remove_department_member(db: Session, department_id: int, user_id: int):
    user = _get_or_404(db, User, user_id, "người dùng")
    if user.department_id != department_id:
        _bad("Người dùng không thuộc phòng ban này.")
    user.department_id = None
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return list_department_members(db, department_id)


# ----------------------------------------------- job titles (catalog)
def list_job_titles(db: Session) -> list[s.JobTitleItem]:
    rows = (
        db.query(JobTitle, func.count(User.id))
        .outerjoin(User, User.job_title_id == JobTitle.id)
        .group_by(JobTitle.id)
        .order_by(JobTitle.name)
        .all()
    )
    return [
        s.JobTitleItem(id=j.id, name=j.name, description=j.description, user_count=c)
        for j, c in rows
    ]


def create_job_title(db: Session, data: s.NamedItemCreate) -> s.JobTitleItem:
    _ensure_unique_name(db, JobTitle, data.name)
    item = JobTitle(name=data.name, description=data.description)
    db.add(item)
    _commit(db, item)
    return s.JobTitleItem(id=item.id, name=item.name, description=item.description)


def update_job_title(db: Session, item_id: int, data: s.NamedItemUpdate) -> s.JobTitleItem:
    item = _get_or_404(db, JobTitle, item_id, "chức danh")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            _bad("Tên không được để trống.")
        _ensure_unique_name(db, JobTitle, name, item.id)
        item.name = name
    if "description" in changes:
        item.description = changes["description"]
    _commit(db, item)
    count = db.query(func.count(User.id)).filter(User.job_title_id == item.id).scalar() or 0
    return s.JobTitleItem(
        id=item.id, name=item.name, description=item.description, user_count=count
    )


def delete_job_title(db: Session, item_id: int) -> None:
    item = _get_or_404(db, JobTitle, item_id, "chức danh")
    if db.query(User.id).filter(User.job_title_id == item.id).first():
        _bad("Chức danh đang được sử dụng, không thể xóa.")
    db.delete(item)
    db.commit()


# ------------------------------------------------------- roles & permissions
def list_permissions(db: Session) -> list[Permission]:
    return db.query(Permission).order_by(Permission.resource, Permission.action, Permission.id).all()


def _role_usage(db: Session, role: Role) -> int:
    return db.query(func.count(User.id)).filter(User.role_id == role.id).scalar() or 0


def _role_item(db: Session, role: Role) -> s.RoleItem:
    return s.RoleItem(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        permission_ids=sorted(p.id for p in role.permissions),
        permission_codes=sorted(p.code for p in role.permissions),
        usage_count=_role_usage(db, role),
    )


def list_roles(db: Session) -> list[s.RoleItem]:
    return [_role_item(db, r) for r in db.query(Role).order_by(Role.id).all()]


def list_role_members(db: Session, role_id: int) -> list[s.RoleMember]:
    _get_or_404(db, Role, role_id, "role")
    users = _user_query(db).filter(User.role_id == role_id).order_by(User.full_name).all()
    return [
        s.RoleMember(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            is_active=u.is_active,
            department=u.department.name if u.department else None,
            job_title=u.job_title.name if u.job_title else None,
        )
        for u in users
    ]


def _load_permissions(db: Session, ids: list[int]) -> list[Permission]:
    permissions = db.query(Permission).filter(Permission.id.in_(ids)).all() if ids else []
    if len(permissions) != len(set(ids)):
        _bad("Có permission không tồn tại.")
    codes = {p.code for p in permissions}
    if ADMIN_PERMISSION in codes and codes - ADMIN_PERMISSION_CODES:
        _bad("Role quản trị chỉ được giữ quyền quản trị, không kèm quyền dự án, task hay logwork.")
    if codes & (ADMIN_PERMISSION_CODES - {ADMIN_PERMISSION}) and ADMIN_PERMISSION not in codes:
        _bad("Các quyền quản trị yêu cầu kèm quyền admin.access.")
    return permissions


def create_role(db: Session, data: s.RoleCreate) -> s.RoleItem:
    _ensure_unique_name(db, Role, data.name)
    role = Role(name=data.name, description=data.description, is_system=False)
    role.permissions = _load_permissions(db, list(data.permission_ids))
    db.add(role)
    _commit(db, role)
    return _role_item(db, role)


def update_role(db: Session, role_id: int, data: s.RoleUpdate) -> s.RoleItem:
    role = _get_or_404(db, Role, role_id, "role")
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            _bad("Tên không được để trống.")
        _ensure_unique_name(db, Role, name, role.id)
        role.name = name
    if "description" in changes:
        role.description = changes["description"]
    _commit(db, role)
    return _role_item(db, role)


def set_role_permissions(
    db: Session, actor: User, role_id: int, permission_ids: list[int]
) -> s.RoleItem:
    role = _get_or_404(db, Role, role_id, "role")
    permissions = _load_permissions(db, permission_ids)
    codes = {p.code for p in permissions}

    if ADMIN_PERMISSION in role.permission_codes and not ADMIN_REQUIRED_CODES <= codes:
        # Không để hệ thống mất toàn bộ quản trị viên: giữ admin.access + role.manage
        others = (
            db.query(func.count(User.id))
            .join(Role, Role.id == User.role_id)
            .join(role_permissions, role_permissions.c.role_id == Role.id)
            .join(Permission, Permission.id == role_permissions.c.permission_id)
            .filter(
                Permission.code == ADMIN_PERMISSION,
                User.is_active.is_(True),
                Role.id != role.id,
            )
            .scalar()
            or 0
        )
        if others == 0:
            _bad("Phải giữ quyền admin.access và role.manage cho role quản trị.")
    role.permissions = permissions
    db.commit()
    db.refresh(role)
    return _role_item(db, role)


def delete_role(db: Session, role_id: int) -> None:
    role = _get_or_404(db, Role, role_id, "role")
    if _role_usage(db, role) > 0:
        _bad("Role đang có người dùng, hãy chuyển họ sang role khác trước khi xóa.")
    if ADMIN_PERMISSION in role.permission_codes:
        others = (
            db.query(Role)
            .join(Role.permissions)
            .filter(Role.id != role.id, Permission.code == ADMIN_PERMISSION)
            .count()
        )
        if not others:
            _bad("Không thể xóa role quản trị cuối cùng của hệ thống.")
    db.delete(role)
    db.commit()
