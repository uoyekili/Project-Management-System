"""Task con chỉ được giao cho người thuộc task cha (dữ liệu seed, dự án Waterfall)."""

import pytest
from fastapi import HTTPException

try:
    from app.core.connection import SessionLocal
    from app.main import app  # noqa: F401  (nạp đủ model)
    from app.models.project_model import Project, ProjectMember
    from app.models.task_model import Task
    from app.repositories import task_repository
    from app.services import task_service

    with SessionLocal() as _db:
        _seeded = _db.query(Task).count() > 0
except Exception:  # pragma: no cover - DB không sẵn sàng
    _seeded = False

pytestmark = pytest.mark.skipif(not _seeded, reason="Cần database đã seed (database/backup.sql)")


@pytest.fixture()
def db():
    with SessionLocal() as session:
        yield session


def _parent_with_assignees(db):
    parents = (
        db.query(Task)
        .join(Project, Project.id == Task.project_id)
        .filter(Project.project_type == "waterfall", Task.parent_task_id.is_(None))
        .all()
    )
    for parent in parents:
        ids = task_service._assignee_user_ids(db, parent.id)
        if len(ids) >= 2:
            return parent, ids
    pytest.skip("Không có task cha nhiều người thực hiện")


def test_children_may_only_use_parent_assignees(db):
    parent, parent_ids = _parent_with_assignees(db)
    task_service._validate_assignees_within_parent(db, parent.id, parent_ids)
    task_service._validate_assignees_within_parent(db, parent.id, [next(iter(parent_ids))])

    outsider = (
        db.query(ProjectMember.user_id)
        .filter(ProjectMember.project_id == parent.project_id)
        .filter(ProjectMember.user_id.notin_(parent_ids))
        .first()
    )
    if outsider:
        with pytest.raises(HTTPException) as exc:
            task_service._validate_assignees_within_parent(db, parent.id, parent_ids | {outsider[0]})
        assert exc.value.status_code == 400


def test_parent_without_assignee_blocks_child_assignment(db):
    parent = (
        db.query(Task)
        .filter(Task.parent_task_id.is_(None))
        .filter(~Task.id.in_(db.query(task_repository.TaskAssignees.task_id)))
        .first()
    )
    if parent is None:
        pytest.skip("Mọi task cha đều đã có người thực hiện")
    with pytest.raises(HTTPException):
        task_service._validate_assignees_within_parent(db, parent.id, [1])
    task_service._validate_assignees_within_parent(db, parent.id, [])
