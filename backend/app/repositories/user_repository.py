import math
import re

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, joinedload

from app.models.department_model import Department
from app.models.role_model import Role
from app.models.user_model import User


def _code_clauses(search: str) -> list:
    """Mã nhân viên hiển thị là `usr-<id>`, nên khớp chính xác theo id."""
    match = re.fullmatch(r"usr-(\d+)", search.strip().lower())
    return [User.id == int(match.group(1))] if match else []


def _base_query(db: Session):
    return db.query(User).options(
        joinedload(User.department),
        joinedload(User.job_title),
        joinedload(User.role_ref),
    )


def get_by_id(db: Session, user_id: int) -> User | None:
    return _base_query(db).filter(User.id == user_id).first()


def get_by_email(db: Session, email: str) -> User | None:
    return _base_query(db).filter(User.email == email).first()


def _csv_values(value: str | None) -> list[str]:
    if not value or value == "ALL":
        return []
    return [part.strip() for part in value.split(",") if part.strip() and part.strip() != "ALL"]


def get_users(
    db: Session,
    search: str | None = None,
    status: str | None = None,
    role: str | None = None,
    department: str | None = None,
    user_ids: list[int] | None = None,
    page: int = 1,
    page_size: int = 10,
):
    query = _base_query(db)

    if user_ids is not None:
        if not user_ids:
            return [], 0, 1
        query = query.filter(User.id.in_(user_ids))

    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                *_code_clauses(search),
            )
        )

    statuses = _csv_values(status)
    if statuses:
        wants_active = "ACTIVE" in statuses
        wants_inactive = "INACTIVE" in statuses
        if wants_active and not wants_inactive:
            query = query.filter(User.is_active.is_(True))
        elif wants_inactive and not wants_active:
            query = query.filter(User.is_active.is_(False))

    roles = _csv_values(role)
    if roles:
        query = query.join(User.role_ref).filter(Role.name.in_(roles))

    departments = _csv_values(department)
    if departments:
        include_unassigned = "UNASSIGNED" in departments
        names = [name for name in departments if name != "UNASSIGNED"]
        if include_unassigned and names:
            query = query.outerjoin(User.department).filter(
                or_(User.department_id.is_(None), Department.name.in_(names))
            )
        elif include_unassigned:
            query = query.filter(User.department_id.is_(None))
        else:
            query = query.join(User.department).filter(Department.name.in_(names))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    users = (
        query.order_by(desc(User.created_at), desc(User.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return users, total, total_pages


def list_active_by_department_name(
    db: Session,
    department_name: str | None,
    *,
    role: str | None = None,
    search: str | None = None,
    exclude_permission: str | None = None,
) -> list[User]:
    query = _base_query(db).join(User.role_ref).filter(User.is_active.is_(True))
    if department_name:
        query = query.join(User.department).filter(Department.name == department_name)

    if role and role != "ALL":
        query = query.filter(Role.name == role)

    if exclude_permission:
        from app.models.permission_model import Permission, role_permissions

        excluded_role_ids = (
            db.query(role_permissions.c.role_id)
            .join(Permission, Permission.id == role_permissions.c.permission_id)
            .filter(Permission.code == exclude_permission)
        )
        query = query.filter(~User.role_id.in_(excluded_role_ids))

    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                *_code_clauses(search),
            )
        )

    return query.order_by(User.full_name.asc(), User.id.asc()).all()


def list_user_ids_by_department_ids(db: Session, department_ids: list[int]) -> list[int]:
    if not department_ids:
        return []
    rows = (
        db.query(User.id)
        .filter(User.department_id.in_(department_ids))
        .distinct()
        .all()
    )
    return [user_id for (user_id,) in rows]


def list_user_ids_excluding_roles(db: Session, role_names: list[str]) -> list[int]:
    if not role_names:
        rows = db.query(User.id).distinct().all()
        return [user_id for (user_id,) in rows]

    rows = (
        db.query(User.id)
        .join(User.role_ref)
        .filter(~Role.name.in_(role_names))
        .distinct()
        .all()
    )
    return [user_id for (user_id,) in rows]


def list_user_ids_excluding_role(db: Session, role_name: str) -> list[int]:
    return list_user_ids_excluding_roles(db, [role_name])


def create(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_by_id(db, user.id)


def commit_and_refresh(db: Session, user: User) -> User:
    db.commit()
    db.refresh(user)
    return get_by_id(db, user.id)


def update_password(db: Session, user_id: int, hashed_new_password: str) -> None:
    db.query(User).filter(User.id == user_id).update({User.password_hash: hashed_new_password})
    db.commit()
