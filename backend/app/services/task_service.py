from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.core.permission_catalog import OWN, PROJECT, SCOPE_RANK
from app.models.project_model import ProjectMember
from app.models.task_model import Task
from app.repositories import project_repository, task_repository
from app.schemas.task_schema import LogWorkCreate, TaskAttachmentCreate, TaskCreate, TaskUpdate
from app.utils.dashboard_helpers import normalize_task_status
from app.utils.project_helpers import resolve_project_scopes, split_scoped_project_ids


@dataclass(frozen=True)
class TaskAssigneeChange:
    previous_user_ids: tuple[int, ...]
    current_user_ids: tuple[int, ...]

    @property
    def changed(self) -> bool:
        return set(self.previous_user_ids) != set(self.current_user_ids)


def _get_current_user(db: Session, user_id: int):
    user = project_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _normalize_task(task: Task) -> Task:
    task.status = normalize_task_status(task.status)
    return task


def _normalize_tasks(tasks: Iterable[Task]) -> list[Task]:
    return [_normalize_task(task) for task in tasks]


def _sort_tasks(tasks: Iterable[Task]) -> list[Task]:
    return sorted(
        tasks,
        key=lambda task: (
            (
                getattr(task, "created_at", None).timestamp()
                if getattr(task, "created_at", None)
                else 0
            ),
            task.id,
        ),
        reverse=True,
    )


def _denied(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _task_owner_user_ids(db: Session, task: Task) -> set[int]:
    """Chủ sở hữu task (scope OWN): người được giao và người tạo."""
    owners = {
        int(row[1]) for row in task_repository.list_task_assignee_users(db, [task.id])
    }
    creator = db.get(ProjectMember, task.created_by_member_id)
    if creator:
        owners.add(creator.user_id)
    return owners


def _can_on_task(db: Session, user, action: str, task: Task) -> bool:
    return perm.can_on_record(
        db,
        user,
        "task",
        action,
        task.project_id,
        owner_user_ids=_task_owner_user_ids(db, task),
    )


def _project_scope(db: Session, user, action: str, project_id: int) -> str | None:
    return perm.effective_scope(db, user, "task", action, project_id)


def _require_task_view_project(db: Session, project_id: int, user_id: int):
    """Phải có task.view trên dự án (OWN/PROJECT/ALL)."""
    user = _get_current_user(db, user_id)
    if _project_scope(db, user, "view", project_id) is None:
        raise _denied("Bạn không có quyền xem task trong dự án này.")
    return user


def _require_actor_member(db: Session, project_id: int, user_id: int) -> ProjectMember:
    """Người thực hiện phải là thành viên đang hoạt động của dự án; không tự thêm thành viên."""
    member = project_repository.get_project_member(db, project_id, user_id)
    if not member:
        raise _denied("Bạn cần là thành viên dự án để thực hiện thao tác này.")
    return member


def _validate_parent_task(db: Session, project_id: int, parent_task_id: Optional[int]):
    if parent_task_id is None:
        return

    parent = task_repository.get_task_by_id(db, parent_task_id)
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found")
    if parent.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent task must belong to the same project",
        )


def _assignee_user_ids(db: Session, task_id: int) -> set[int]:
    return {int(row[1]) for row in task_repository.list_task_assignee_users(db, [task_id])}


def _validate_assignees_within_parent(
    db: Session, parent_task_id: Optional[int], assignee_ids: Iterable[int]
) -> None:
    """Task con chỉ được giao cho người thuộc task cha; task cha chưa có người thì task con cũng không có."""
    assignee_ids = set(assignee_ids)
    if parent_task_id is None or not assignee_ids:
        return
    parent_ids = _assignee_user_ids(db, parent_task_id)
    if not parent_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task cha chưa có người thực hiện nên task con không thể giao cho ai.",
        )
    if not assignee_ids <= parent_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người thực hiện task con phải nằm trong danh sách người thực hiện của task cha.",
        )


def _prune_descendant_assignees(db: Session, task_id: int, allowed_user_ids: set[int]) -> None:
    """Gỡ khỏi các task con (đệ quy) những người không còn thuộc task cha."""
    for child in task_repository.get_tasks_by_parent_id(db, task_id):
        child_ids = _assignee_user_ids(db, child.id)
        keep = child_ids & allowed_user_ids
        for user_id in child_ids - keep:
            member = project_repository.get_project_member(db, child.project_id, user_id)
            if member:
                task_repository.remove_task_assignee(db, child.id, member.id)
        _prune_descendant_assignees(db, child.id, keep)


KANBAN_PROJECT_TYPE = "agile"
WATERFALL_PROJECT_TYPE = "waterfall"


def enforce_project_type_rules(
    project_type: Optional[str],
    parent_task_id: Optional[int],
    sprint_id: Optional[int],
):
    """Kanban: task phẳng (không cha/con), được xếp vào sprint.
    Waterfall: task dạng cây WBS (cha/con), không dùng sprint."""
    kind = (project_type or KANBAN_PROJECT_TYPE).strip().lower()
    if kind == KANBAN_PROJECT_TYPE and parent_task_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dự án Kanban không hỗ trợ task cha/con.",
        )
    if kind == WATERFALL_PROJECT_TYPE and sprint_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dự án Waterfall không sử dụng sprint.",
        )


def _ensure_no_parent_cycle(db: Session, task_id: int, parent_task_id: Optional[int]):
    current_parent_id = parent_task_id
    visited = {task_id}

    while current_parent_id is not None:
        if current_parent_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo vòng lặp trong cây task.",
            )

        visited.add(current_parent_id)
        parent = task_repository.get_task_by_id(db, current_parent_id)
        if not parent:
            return

        current_parent_id = parent.parent_task_id


def list_tasks(db: Session, project_id: int, current_user_id: int, sprint_id: Optional[int] = None):
    user = _get_current_user(db, current_user_id)
    if not project_repository.get_project_by_id(db, project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    scope = _project_scope(db, user, "view", project_id)
    if scope is None:
        raise _denied("Bạn không có quyền xem task trong dự án này.")
    tasks = task_repository.list_tasks(
        db,
        project_id=project_id,
        sprint_id=sprint_id,
        involved_user_id=user.id if scope == OWN else None,
    )
    return _normalize_tasks(tasks)


def list_accessible_tasks(
    db: Session,
    current_user_id: int,
    project_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
):
    if project_id is not None:
        return list_tasks(db, project_id, current_user_id, sprint_id)

    user = _get_current_user(db, current_user_id)
    scopes = resolve_project_scopes(db, user, "task", "view")
    full_ids, own_ids = split_scoped_project_ids(scopes)
    merged_tasks: dict[int, Task] = {}
    if full_ids:
        for task in task_repository.list_tasks(db, project_ids=full_ids, sprint_id=sprint_id):
            merged_tasks[task.id] = task
    if own_ids:
        for task in task_repository.list_tasks(
            db, project_ids=own_ids, sprint_id=sprint_id, involved_user_id=user.id
        ):
            merged_tasks[task.id] = task
    return _normalize_tasks(_sort_tasks(merged_tasks.values()))


def _parse_user_ids(raw_ids) -> list[int]:
    result: list[int] = []
    for raw_id in raw_ids or []:
        cleaned = str(raw_id).replace("usr-", "").strip()
        if not cleaned:
            continue
        try:
            user_id = int(cleaned)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id")
        if user_id not in result:
            result.append(user_id)
    return result


def create_task(db: Session, project_id: int, current_user_id: int, task_in: TaskCreate):
    project = project_repository.get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    actor_user = _get_current_user(db, current_user_id)
    scope = _project_scope(db, actor_user, "create", project_id)
    if scope is None:
        raise _denied("Bạn không có quyền tạo task trong dự án này.")
    assignee_ids = _parse_user_ids(task_in.assignee_user_ids)
    for_others = any(uid != actor_user.id for uid in assignee_ids)
    if for_others and SCOPE_RANK[scope] < SCOPE_RANK[PROJECT]:
        raise _denied("Bạn chỉ được tạo task cho chính mình.")
    actor_member = _require_actor_member(db, project_id, actor_user.id)
    enforce_project_type_rules(project.project_type, task_in.parent_task_id, task_in.sprint_id)
    _validate_parent_task(db, project_id, task_in.parent_task_id)
    _validate_assignees_within_parent(db, task_in.parent_task_id, assignee_ids)

    task_data = task_in.model_dump(exclude={"assignee_user_ids"})
    task_data["project_id"] = project_id
    task_data["created_by_member_id"] = actor_member.id
    task_data["status"] = normalize_task_status(task_data.get("status"))

    task = task_repository.create_task(db, task_data)

    for assignee_user_id in assignee_ids:
        assignee_member = project_repository.get_project_member(db, project_id, assignee_user_id)
        if not assignee_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Người được giao phải là thành viên dự án.",
            )
        task_repository.add_task_assignee(db, task.id, assignee_member.id, actor_member.id)

    db.commit()
    db.refresh(task)
    return _normalize_task(task)


def get_task(db: Session, task_id: int, current_user_id: int):
    task = task_repository.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    user = _get_current_user(db, current_user_id)
    scope = _project_scope(db, user, "view", task.project_id)
    if scope is None:
        raise _denied("Bạn không có quyền xem task này.")
    if scope == OWN and user.id not in _task_owner_user_ids(db, task):
        raise _denied("Bạn chỉ xem được task được giao hoặc do mình tạo.")
    return _normalize_task(task)


def _auto_complete_parent_recursive(db: Session, parent_task_id: int):
    siblings = task_repository.get_tasks_by_parent_id(db, parent_task_id)
    if siblings and all(normalize_task_status(s.status) == "done" for s in siblings):
        parent_task = task_repository.get_task_by_id(db, parent_task_id)
        if parent_task and normalize_task_status(parent_task.status) != "done":
            task_repository.update_task(db, parent_task, {"status": "done"})
            if parent_task.parent_task_id:
                _auto_complete_parent_recursive(db, parent_task.parent_task_id)


def update_task(db: Session, task_id: int, current_user_id: int, task_in: TaskUpdate):
    task = get_task(db, task_id, current_user_id)
    update_data = task_in.model_dump(exclude_unset=True)
    if "status" in update_data:
        update_data["status"] = normalize_task_status(update_data["status"])

    actor = _get_current_user(db, current_user_id)
    if not _can_on_task(db, actor, "update", task):
        raise _denied("Bạn không có quyền sửa task này.")

    parent_task_id = update_data.get("parent_task_id")
    if parent_task_id == task.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task cannot be its own parent",
        )

    project = project_repository.get_project_by_id(db, task.project_id)
    enforce_project_type_rules(
        project.project_type if project else None,
        parent_task_id,
        update_data.get("sprint_id"),
    )
    _validate_parent_task(db, task.project_id, parent_task_id)
    _ensure_no_parent_cycle(db, task.id, parent_task_id)
    if "parent_task_id" in update_data:
        _validate_assignees_within_parent(db, parent_task_id, _assignee_user_ids(db, task.id))

    # Auto-update deadline based on estimated_hours change
    if "estimated_hours" in update_data and "deadline" not in update_data:
        old_estimate = float(task.estimated_hours or 0)
        new_estimate = float(update_data["estimated_hours"] or 0)
        diff_hours = new_estimate - old_estimate
        diff_days = round(diff_hours / 8.0)

        if diff_days != 0 and task.deadline:
            update_data["deadline"] = task.deadline + timedelta(days=diff_days)

    start_date = update_data.get("start_date", task.start_date)
    deadline = update_data.get("deadline", task.deadline)
    if start_date and deadline and deadline < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deadline must be after or equal to start date",
        )

    # Track changes for logging
    changes_to_log = []
    for key, new_val in update_data.items():
        if hasattr(task, key):
            old_val = getattr(task, key)
            if old_val != new_val:
                # Convert date/datetime to string for logging if necessary
                old_val_str = str(old_val) if old_val is not None else None
                new_val_str = str(new_val) if new_val is not None else None
                changes_to_log.append((key, old_val_str, new_val_str))

    task = task_repository.update_task(db, task, update_data)

    if "status" in update_data and update_data["status"] == "done" and task.parent_task_id:
        _auto_complete_parent_recursive(db, task.parent_task_id)

    db.commit()
    db.refresh(task)
    return _normalize_task(task), changes_to_log


def add_assignee(
    db: Session,
    task_id: int,
    user_ids_to_assign: list[str] | str | None,
    current_user_id: int,
) -> TaskAssigneeChange:
    task = get_task(db, task_id, current_user_id)
    actor_user = _get_current_user(db, current_user_id)

    previous_user_ids = tuple(
        int(row[1]) for row in task_repository.list_task_assignee_users(db, [task.id])
    )

    if isinstance(user_ids_to_assign, (str, int)):
        user_ids_to_assign = [user_ids_to_assign]
    next_user_ids = _parse_user_ids(user_ids_to_assign)

    can_assign = perm.can_in_project(db, actor_user, "task", "assign", task.project_id)
    if not can_assign:
        # Không có quyền giao: chỉ được tự nhận task (không gỡ/đổi người khác).
        allowed = (
            perm.effective_scope(db, actor_user, "task", "update", task.project_id) is not None
            or perm.effective_scope(db, actor_user, "task", "create", task.project_id) is not None
        )
        added = set(next_user_ids) - set(previous_user_ids)
        removed = set(previous_user_ids) - set(next_user_ids)
        if not allowed or removed or any(uid != actor_user.id for uid in added):
            raise _denied(
                "Bạn chỉ có thể tự nhận task cho chính mình. Cần quyền giao task để giao việc cho người khác."
            )

    change = TaskAssigneeChange(
        previous_user_ids=previous_user_ids,
        current_user_ids=tuple(next_user_ids),
    )
    if not change.changed:
        return change

    _validate_assignees_within_parent(db, task.parent_task_id, next_user_ids)

    assignee_members = []
    for user_id in next_user_ids:
        assignee_member = project_repository.get_project_member(db, task.project_id, user_id)
        if not assignee_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a member of this project",
            )
        assignee_members.append(assignee_member)

    task_repository.clear_task_assignees(db, task.id)
    if assignee_members:
        actor_member = _require_actor_member(db, task.project_id, actor_user.id)
        for assignee_member in assignee_members:
            task_repository.add_task_assignee(db, task.id, assignee_member.id, actor_member.id)
    _prune_descendant_assignees(db, task.id, set(next_user_ids))
    db.commit()
    return change


def get_attachments(db: Session, task_id: int, current_user_id: int):
    task = get_task(db, task_id, current_user_id)
    return task_repository.list_task_attachments(db, task.id)


def add_attachment(
    db: Session, task_id: int, current_user_id: int, attachment_in: TaskAttachmentCreate
):
    task = get_task(db, task_id, current_user_id)
    actor_member = _require_actor_member(db, task.project_id, current_user_id)

    attachment_data = attachment_in.model_dump()
    attachment_data["task_id"] = task_id
    attachment_data["uploaded_by"] = actor_member.id

    attachment = task_repository.create_task_attachment(db, attachment_data)
    db.commit()
    db.refresh(attachment)
    return attachment


def get_logworks(db: Session, task_id: int, current_user_id: int):
    task = get_task(db, task_id, current_user_id)
    user = _get_current_user(db, current_user_id)
    scope = perm.effective_scope(db, user, "logwork", "view", task.project_id)
    if scope is None:
        return []
    logworks = task_repository.list_task_logworks(db, task.id)
    if SCOPE_RANK[scope] >= SCOPE_RANK[PROJECT]:
        return logworks
    own_member = project_repository.get_project_member(db, task.project_id, user.id)
    return [lw for lw in logworks if own_member and lw.project_member_id == own_member.id]


def add_logwork(db: Session, task_id: int, current_user_id: int, logwork_in: LogWorkCreate):
    task = get_task(db, task_id, current_user_id)
    actor = _get_current_user(db, current_user_id)
    if perm.effective_scope(db, actor, "logwork", "create", task.project_id) is None:
        raise _denied("Bạn không có quyền tạo logwork.")
    if not task_repository.is_task_assignee(db, task.id, current_user_id):
        raise _denied("Bạn chỉ có thể ghi logwork cho task được giao cho mình.")

    actor_member = _require_actor_member(db, task.project_id, current_user_id)
    logwork_data = logwork_in.model_dump()
    logwork_data["task_id"] = task_id
    logwork_data["project_member_id"] = actor_member.id

    logwork = task_repository.create_logwork(db, logwork_data)
    db.commit()
    db.refresh(logwork)
    return logwork


def delete_task(db: Session, task_id: int, current_user_id: int):
    task = get_task(db, task_id, current_user_id)
    actor = _get_current_user(db, current_user_id)
    if not _can_on_task(db, actor, "delete", task):
        raise _denied("Bạn không có quyền xóa task này.")
    task_repository.delete_task(db, task)
    db.commit()
