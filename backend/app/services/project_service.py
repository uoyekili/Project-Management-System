import math
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.core.permission_catalog import ALL, SCOPE_RANK
from app.models.logworks import LogWork
from app.models.notification_model import Notification  # noqa: F401
from app.models.project_model import Project, ProjectMember
from app.models.sprint_model import Sprint
from app.models.task_comment_model import TaskComment
from app.models.task_model import Task, TaskAssignees, TaskAttachment
from app.models.user_model import User
from app.repositories import project_repository, user_repository
from app.schemas.project_schema import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectUpdate,
)
from app.utils.project_helpers import (
    list_accessible_project_ids,
    to_db_status,
)


def parse_project_id(project_id: str) -> int:
    raw = project_id.replace("prj-", "") if project_id.startswith("prj-") else project_id
    try:
        return int(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mã dự án không hợp lệ.")


def _split_permission(permission: str) -> tuple[str, str]:
    resource, action = permission.split(".", 1)
    return resource, action


def require_project_access(
    db: Session,
    project_id: int,
    current_user: User,
    require_manager: bool = False,
    permission: str | None = None,
) -> Project:
    """Lấy project và kiểm tra quyền.

    - mặc định: ``project.view`` (PROJECT hoặc ALL)
    - ``require_manager``: ``project.update``
    - ``permission="resource.action"``: quyền tùy chọn, yêu cầu scope PROJECT trở lên
    """
    project = project_repository.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án.")

    if permission:
        resource, action = _split_permission(permission)
        detail = "Bạn không có quyền thực hiện thao tác này trong dự án."
    elif require_manager:
        resource, action = "project", "update"
        detail = "Bạn không có quyền quản lý dự án này."
    else:
        resource, action = "project", "view"
        detail = "Bạn không có quyền truy cập dự án này."

    scope = perm.effective_scope(db, current_user, resource, action, project_id)
    if scope is None or SCOPE_RANK[scope] < SCOPE_RANK["PROJECT"]:
        raise HTTPException(status_code=403, detail=detail)
    return project


def list_projects(
    db: Session,
    current_user: User,
    search: str | None = None,
    status: str | None = None,
    manager_id: int | None = None,
    start_date_from: date | None = None,
    start_date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
):
    manager_project_ids = None
    if manager_id is not None:
        rows = db.query(Project.id).filter(Project.manager_id == manager_id).all()
        manager_project_ids = [project_id for (project_id,) in rows]

    accessible_project_ids = list_accessible_project_ids(db, current_user)
    projects, total = project_repository.list_projects(
        db=db,
        project_ids=accessible_project_ids,
        search=search,
        db_status=to_db_status(status) if status and status != "ALL" else None,
        start_date_from=start_date_from,
        start_date_to=start_date_to,
        manager_project_ids=manager_project_ids,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return projects, total, total_pages


def _load_assignable_user(db: Session, user_id: int) -> User:
    user = project_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Người dùng đã bị vô hiệu hóa.")
    if perm.is_admin(user):
        raise HTTPException(status_code=400, detail="Tài khoản Admin không tham gia dự án.")
    return user


def _ensure_member(db: Session, project_id: int, user_id: int, position: str | None = None):
    existing = project_repository.get_project_member(db, project_id, user_id, include_inactive=True)
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.joined_at = datetime.now(timezone.utc)
        if position is not None:
            existing.position = position
        db.flush()
        return existing
    member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        position=position,
        joined_at=datetime.now(timezone.utc),
        is_active=True,
    )
    return project_repository.add_project_member(db, member)


def create_project(db: Session, current_user: User, data: ProjectCreate) -> Project:
    if not perm.has_permission(current_user, "project.create:ALL"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền tạo dự án.")

    existing_project = project_repository.get_project_by_name(db, data.name)
    if existing_project:
        raise HTTPException(status_code=400, detail="Tên dự án đã tồn tại. Vui lòng chọn tên khác.")

    # Người có project.update:ALL được chỉ định PM; còn lại người tạo là PM.
    can_assign_manager = perm.max_scope(current_user, "project", "update") == ALL
    if can_assign_manager and data.manager_id is not None:
        manager_id = _load_assignable_user(db, data.manager_id).id
    else:
        manager_id = current_user.id

    project = Project(
        name=data.name,
        project_type=data.project_type,
        description=data.description,
        status="inactive",
        start_date=data.start_date,
        end_date=data.end_date,
        manager_id=manager_id,
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    project = project_repository.create_project(db, project)
    if manager_id is not None:
        _ensure_member(db, project.id, manager_id, "Project Manager")

    db.commit()
    db.refresh(project)
    return project


def get_project(db: Session, current_user: User, project_id: str) -> Project:
    numeric_id = parse_project_id(project_id)
    return require_project_access(db, numeric_id, current_user)


def _ensure_tasks_compatible_with_type(db: Session, project_id: int, new_type: str) -> None:
    """Không đổi loại dự án nếu task hiện có vi phạm quy tắc của loại mới."""
    if new_type == "agile":
        conflict = db.query(Task.id).filter(
            Task.project_id == project_id, Task.parent_task_id.isnot(None)
        )
        message = "Không thể chuyển sang Kanban khi dự án còn task cha/con."
    elif new_type == "waterfall":
        conflict = db.query(Task.id).filter(
            Task.project_id == project_id, Task.sprint_id.isnot(None)
        )
        message = "Không thể chuyển sang Waterfall khi dự án còn task thuộc sprint."
    else:
        return
    if conflict.first() is not None:
        raise HTTPException(status_code=400, detail=message)


def update_project(
    db: Session, current_user: User, project_id: str, data: ProjectUpdate
) -> Project:
    numeric_id = parse_project_id(project_id)
    project = require_project_access(db, numeric_id, current_user, require_manager=True)

    if data.name:
        existing_project = project_repository.get_project_by_name(db, data.name)
        if existing_project and existing_project.id != project.id:
            raise HTTPException(
                status_code=400, detail="Tên dự án đã tồn tại. Vui lòng chọn tên khác."
            )
        project.name = data.name.strip()
    if data.project_type is not None:
        new_type = data.project_type.strip().lower()
        if new_type != (project.project_type or "").lower():
            _ensure_tasks_compatible_with_type(db, project.id, new_type)
        project.project_type = new_type
    if data.description is not None:
        project.description = data.description.strip()
    if data.status is not None:
        project.status = to_db_status(data.status)
    if data.start_date is not None:
        project.start_date = data.start_date
    if data.end_date is not None:
        if data.start_date and data.end_date < data.start_date:
            raise HTTPException(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu.")
        if not data.start_date and project.start_date and data.end_date < project.start_date:
            raise HTTPException(status_code=400, detail="Ngày kết thúc phải sau ngày bắt đầu.")
        project.end_date = data.end_date
    if data.manager_id is not None and data.manager_id != project.manager_id:
        manager = _load_assignable_user(db, data.manager_id)
        _ensure_member(db, project.id, manager.id, "Project Manager")
        project.manager_id = manager.id
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, current_user: User, project_id: str) -> None:
    numeric_id = parse_project_id(project_id)
    project = require_project_access(db, numeric_id, current_user, permission="project.delete")

    task_ids = [tid for (tid,) in db.query(Task.id).filter(Task.project_id == numeric_id).all()]
    if task_ids:
        db.query(LogWork).filter(LogWork.task_id.in_(task_ids)).delete(synchronize_session=False)
        db.query(TaskAssignees).filter(TaskAssignees.task_id.in_(task_ids)).delete(
            synchronize_session=False
        )
        db.query(TaskAttachment).filter(TaskAttachment.task_id.in_(task_ids)).delete(
            synchronize_session=False
        )
        db.query(TaskComment).filter(TaskComment.task_id.in_(task_ids)).delete(
            synchronize_session=False
        )
        # Sub-task trỏ tới task cha: gỡ liên kết trước khi xóa.
        db.query(Task).filter(Task.id.in_(task_ids)).update(
            {Task.parent_task_id: None}, synchronize_session=False
        )
        db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
    db.query(Sprint).filter(Sprint.project_id == numeric_id).delete(synchronize_session=False)
    db.query(ProjectMember).filter(ProjectMember.project_id == numeric_id).delete(
        synchronize_session=False
    )
    db.delete(project)
    db.commit()


def list_project_members(
    db: Session, current_user: User, project_id: str, search: str | None = None
):
    numeric_id = parse_project_id(project_id)
    require_project_access(db, numeric_id, current_user)
    return project_repository.list_project_members(db, numeric_id, search, include_inactive=True)


def list_member_candidates(
    db: Session,
    current_user: User,
    project_id: str,
    *,
    department: str | None = None,
    role: str | None = None,
    search: str | None = None,
) -> list[User]:
    """Danh sách user có thể thêm vào dự án; có thể lọc tùy chọn theo phòng ban."""
    numeric_id = parse_project_id(project_id)
    require_project_access(db, numeric_id, current_user, permission="project.member_add")

    department_name = (department or "").strip() or None

    return user_repository.list_active_by_department_name(
        db,
        department_name,
        role=role,
        search=search,
        exclude_permission="admin.access:ALL",
    )


def add_project_member(db: Session, current_user: User, project_id: str, data: ProjectMemberCreate):
    numeric_id = parse_project_id(project_id)
    require_project_access(db, numeric_id, current_user, permission="project.member_add")
    user = _load_assignable_user(db, data.user_id)

    existing = project_repository.get_project_member(
        db, numeric_id, data.user_id, include_inactive=True
    )
    if existing and existing.is_active:
        raise HTTPException(status_code=400, detail="Người dùng đã là thành viên dự án.")
    member = _ensure_member(db, numeric_id, user.id, (data.position or "").strip() or None)
    db.commit()
    db.refresh(member)
    return member, user


def update_project_member(
    db: Session, current_user: User, project_id: str, member_id: int, data: ProjectMemberUpdate
):
    numeric_id = parse_project_id(project_id)
    require_project_access(db, numeric_id, current_user, permission="project.member_add")

    member = project_repository.get_project_member_by_id(db, member_id, numeric_id)
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên dự án.")

    member.position = (data.position or "").strip() or None
    db.commit()
    db.refresh(member)

    user = project_repository.get_user_by_id(db, member.user_id)
    return member, user


def remove_project_member(db: Session, current_user: User, project_id: str, member_id: int):
    numeric_id = parse_project_id(project_id)
    project = require_project_access(
        db, numeric_id, current_user, permission="project.member_remove"
    )

    member = project_repository.get_project_member_by_id(db, member_id, numeric_id)
    if not member:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên dự án.")
    if project.manager_id == member.user_id:
        raise HTTPException(
            status_code=400,
            detail="Không thể gỡ quản lý dự án. Hãy đổi Project Manager trước.",
        )

    member.is_active = False
    db.commit()
