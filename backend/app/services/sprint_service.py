from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.repositories import project_repository, sprint_repository
from app.schemas.sprint_schema import SprintCreate, SprintUpdate
from app.services.task_service import _get_current_user, _require_actor_member
from app.utils.project_helpers import list_accessible_project_ids


def _require_project_view(db: Session, project_id: int, user_id: int):
    user = _get_current_user(db, user_id)
    if not project_repository.get_project_by_id(db, project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if perm.effective_scope(db, user, "project", "view", project_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập dự án này."
        )
    return user


def _normalize_sprint_status(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip().lower()
    if not normalized:
        return None

    if normalized == "planning":
        return "planned"

    return normalized


def list_sprints(db: Session, project_id: int, current_user_id: int):
    _require_project_view(db, project_id, current_user_id)
    return sprint_repository.list_sprints(db, project_id=project_id)


def list_accessible_sprints(db: Session, current_user_id: int, project_id: int | None = None):
    if project_id is not None:
        return list_sprints(db, project_id, current_user_id)

    user = _get_current_user(db, current_user_id)
    accessible_project_ids = list_accessible_project_ids(db, user)
    if not accessible_project_ids:
        return []
    return sprint_repository.list_sprints(db, project_ids_subquery=accessible_project_ids)


def create_sprint(db: Session, project_id: int, current_user_id: int, sprint_in: SprintCreate):
    current_user = _require_project_view(db, project_id, current_user_id)
    if not perm.can_in_project(db, current_user, "sprint", "manage", project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tạo sprint trong dự án này.",
        )
    actor_member = _require_actor_member(db, project_id, current_user_id)

    sprint_data = sprint_in.model_dump()
    sprint_data["status"] = _normalize_sprint_status(sprint_data.get("status")) or "planned"

    if sprint_data.get("status") == "active":
        active_sprint = sprint_repository.get_active_sprint_by_project(db, project_id)
        if active_sprint:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sprint '{active_sprint.name}' đang hoạt động. Không thể tạo và active ngay sprint khác.",
            )
            
    sprint_data["project_id"] = project_id
    sprint_data["created_by_member_id"] = actor_member.id

    sprint = sprint_repository.create_sprint(db, sprint_data)
    db.commit()
    db.refresh(sprint)
    return sprint


def update_sprint(db: Session, sprint_id: int, current_user_id: int, sprint_in: SprintUpdate):
    sprint = sprint_repository.get_sprint_by_id(db, sprint_id)
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found")

    current_user = _require_project_view(db, sprint.project_id, current_user_id)
    if not perm.can_in_project(db, current_user, "sprint", "manage", sprint.project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền cập nhật sprint trong dự án này.",
        )

    update_data = sprint_in.model_dump(exclude_unset=True)
    if "status" in update_data:
        normalized_status = _normalize_sprint_status(update_data.get("status"))
        if normalized_status is None:
            update_data.pop("status", None)
        else:
            update_data["status"] = normalized_status

    if update_data.get("status") == "active":
        active_sprint = sprint_repository.get_active_sprint_by_project(db, sprint.project_id)
        if active_sprint and active_sprint.id != sprint_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sprint '{active_sprint.name}' đang hoạt động. Không thể bắt đầu sprint khác.",
            )

    if update_data.get("status") == "closed":
        from sqlalchemy import func

        from app.models.task_model import Task

        # Move all unfinished tasks in this sprint back to the backlog
        db.query(Task).filter(
            Task.sprint_id == sprint_id,
            func.lower(Task.status) != "done",
        ).update({"sprint_id": None}, synchronize_session=False)

    sprint = sprint_repository.update_sprint(db, sprint, update_data)
    db.commit()
    db.refresh(sprint)
    return sprint
