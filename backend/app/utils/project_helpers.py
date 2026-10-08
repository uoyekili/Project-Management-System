import math

from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.core.permission_catalog import ALL, PROJECT
from app.models.project_model import Project, ProjectMember
from app.models.user_model import User
from app.repositories import project_repository, task_repository
from app.schemas.project_schema import (
    ProjectDetailResponse,
    ProjectMemberResponse,
    ProjectMetricsResponse,
    ProjectResponse,
)
from app.utils.dashboard_helpers import (
    build_task_progress_map,
    calculate_logwork_coverage,
    calculate_progress_percent,
    count_overdue_tasks,
    count_task_statuses,
    list_leaf_tasks,
)


def build_project_code(project_id: int | None = None, *, name: str | None = None) -> str:
    """Stable display code for a project, e.g. PRJ-001.

    Prefer numeric id so codes stay unique and professional regardless of
    Vietnamese project titles. ``name`` is accepted for backward-compatible
    call sites but is no longer used to derive the code.
    """
    if project_id is not None and project_id > 0:
        return f"PRJ-{int(project_id):03d}"
    _ = name
    return "PRJ-NEW"


def to_frontend_status(db_status: str) -> str:
    mapping = {
        "active": "ACTIVE",
        "inactive": "PLANNING",
        "completed": "COMPLETED",
        "at_risk": "AT_RISK",
        "on_hold": "ON_HOLD",
    }
    return mapping.get((db_status or "").lower(), "ACTIVE")


def to_db_status(frontend_status: str) -> str:
    mapping = {
        "ACTIVE": "active",
        "PLANNING": "inactive",
        "COMPLETED": "completed",
        "AT_RISK": "at_risk",
        "ON_HOLD": "on_hold",
    }
    return mapping.get((frontend_status or "").upper(), "active")


def is_admin_user(user: User | None) -> bool:
    return perm.is_admin(user)


def has_companywide_project_access(user: User | None) -> bool:
    """User xem được mọi dự án (project.view:ALL) mà không cần là thành viên."""
    return perm.max_scope(user, "project", "view") == ALL


def compute_project_metrics(db: Session, project_id: int) -> ProjectMetricsResponse:
    tasks = project_repository.get_project_tasks(db, project_id)
    if not tasks:
        return ProjectMetricsResponse()

    project_logworks = task_repository.list_project_logworks(db, project_id)
    progress_by_task = build_task_progress_map(project_logworks)

    leaf_tasks = list_leaf_tasks(tasks)
    counts = count_task_statuses(tasks)
    overdue = count_overdue_tasks(tasks, include_parent_tasks=True)
    progress = calculate_progress_percent(tasks, progress_by_task)
    members = project_repository.list_project_members(db, project_id, include_inactive=False)
    member_user_ids = [user.id for _, user in members]
    member_user_ids_by_member_id = {member.id: user.id for member, user in members}

    coverage_logworks = [
        type(
            "CoverageLogwork",
            (),
            {
                "user_id": member_user_ids_by_member_id.get(logwork.project_member_id),
                "work_date": logwork.work_date,
            },
        )
        for logwork in project_logworks
        if member_user_ids_by_member_id.get(logwork.project_member_id) is not None
    ]
    logwork_coverage = calculate_logwork_coverage(member_user_ids, coverage_logworks)

    return ProjectMetricsResponse(
        completedTasks=counts["done"],
        overdueTasks=overdue,
        logworkCoverage=logwork_coverage,
        velocity=progress,
        totalTasks=len(leaf_tasks),
    )


def build_member_response(member: ProjectMember, user: User) -> ProjectMemberResponse:
    return ProjectMemberResponse(
        id=member.id,
        userId=user.id,
        userName=user.full_name,
        userEmail=user.email,
        position=member.position,
        systemRole=user.role,
        departmentName=user.department.name if user.department else None,
        joinedAt=member.joined_at,
        isActive=getattr(member, "is_active", True) and getattr(user, "is_active", True),
    )


def build_project_response(
    db: Session,
    project: Project,
    include_members: bool = False,
    viewer: User | None = None,
) -> ProjectDetailResponse | ProjectResponse:
    members = project_repository.list_project_members(db, project.id, include_inactive=False)

    manager_id = project.manager_id
    manager_name = project.manager.full_name if project.manager else None
    member_ids = [entry[1].id for entry in members]
    metrics = compute_project_metrics(db, project.id)
    progress = metrics.velocity if metrics.totalTasks else 0

    base = ProjectResponse(
        id=project.id,
        code=build_project_code(project.id),
        name=project.name,
        projectType=getattr(project, "project_type", "agile"),
        description=project.description,
        status=to_frontend_status(project.status),
        progress=progress,
        managerId=manager_id,
        managerName=manager_name,
        managerAvatarUrl=project.manager.avatar_url if project.manager else None,
        memberIds=member_ids,
        startDate=project.start_date,
        endDate=project.end_date,
        createdBy=project.created_by,
        createdAt=project.created_at,
        updatedAt=project.updated_at,
        metrics=metrics,
        myPermissions=perm.project_permission_codes(db, viewer, project.id),
    )

    if not include_members:
        return base

    member_responses = [build_member_response(member, user) for member, user in members]

    return ProjectDetailResponse(**base.model_dump(), members=member_responses)


def user_is_project_manager(db: Session, project_id: int, user_id: int) -> bool:
    project = project_repository.get_project_by_id(db, project_id)
    return bool(project and project.manager_id == user_id)


def user_is_project_member(db: Session, project_id: int, user_id: int) -> bool:
    return project_repository.get_project_member(db, project_id, user_id) is not None


def list_accessible_project_ids(db: Session, user: User | None) -> list[int]:
    """Dự án user được xem theo project.view: ALL → mọi dự án, PROJECT → dự án đang tham gia."""
    scope = perm.max_scope(user, "project", "view")
    if scope == ALL:
        return sorted(project_repository.list_all_project_ids(db))
    if scope == PROJECT:
        return sorted(perm.member_project_ids(db, user))
    return []


def list_project_ids_by_scope(db: Session, user: User | None, resource: str, action: str) -> list[int]:
    """Dự án mà user có (resource, action) ở mức PROJECT trở lên."""
    scope = perm.max_scope(user, resource, action)
    if scope == ALL:
        return sorted(project_repository.list_all_project_ids(db))
    if scope == PROJECT:
        return sorted(perm.member_project_ids(db, user))
    return []


def resolve_project_scopes(
    db: Session, user: User | None, resource: str, action: str
) -> dict[int, str]:
    """Map project_id → scope hiệu lực của user cho (resource, action).

    ALL → mọi dự án; PROJECT/OWN → các dự án user là thành viên.
    """
    scope = perm.max_scope(user, resource, action)
    if scope is None:
        return {}
    if scope == ALL:
        return {pid: ALL for pid in project_repository.list_all_project_ids(db)}
    return {pid: scope for pid in perm.member_project_ids(db, user)}


def split_scoped_project_ids(scopes: dict[int, str]) -> tuple[list[int], list[int]]:
    """Tách (project thấy toàn bộ bản ghi, project chỉ thấy bản ghi của mình)."""
    full = sorted(pid for pid, sc in scopes.items() if sc in (ALL, PROJECT))
    own = sorted(pid for pid, sc in scopes.items() if sc not in (ALL, PROJECT))
    return full, own


def list_managed_project_ids(db: Session, user: User | None) -> list[int]:
    """Dự án user được sửa (project.update)."""
    return list_project_ids_by_scope(db, user, "project", "update")


def user_can_access_team_directory(db: Session, user: User | None) -> bool:
    return perm.has_scope(user, "user", "view") or perm.has_permission(user, "user.manage:ALL")


def list_team_directory_visible_user_ids(db: Session, user: User | None) -> list[int] | None:
    """
    Tab Nhân sự công khai trong công ty: mọi user đã đăng nhập thấy toàn bộ nhân sự
    (None = không giới hạn). Chưa đăng nhập thì không thấy ai.
    """
    if not user:
        return []
    return None


def user_can_access_project(db: Session, project_id: int, user: User | None) -> bool:
    return perm.effective_scope(db, user, "project", "view", project_id) is not None


def user_can_manage_project(db: Session, project_id: int, user: User | None) -> bool:
    return perm.can_in_project(db, user, "project", "update", project_id)


def paginate(total: int, page: int, page_size: int) -> int:
    return math.ceil(total / page_size) if total > 0 else 1
