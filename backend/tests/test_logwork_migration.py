"""Task lá có logwork bị chia nhỏ: logwork phải chuyển sang task con, không mất giờ."""

from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.schemas.task_schema import LogWorkCreate
from app.utils.dashboard_helpers import build_task_spent_rollup


def _task(task_id, parent_id=None):
    return SimpleNamespace(id=task_id, parent_task_id=parent_id)


def _logwork(task_id, hours, status="APPROVED"):
    return SimpleNamespace(task_id=task_id, hours_spent=hours, status=status)


def test_rollup_parent_equals_sum_of_children_without_double_count():
    tasks = [_task(1), _task(2, 1), _task(3, 1)]
    logworks = [_logwork(2, 10), _logwork(3, 4), _logwork(3, 2, "PENDING"), _logwork(1, 99)]
    rollup = build_task_spent_rollup(tasks, logworks)
    assert rollup[2] == 10
    assert rollup[3] == 4
    assert rollup[1] == 14


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

needs_db = pytest.mark.skipif(not _seeded, reason="Cần database đã seed (database/backup.sql)")


@pytest.fixture()
def db():
    with SessionLocal() as session:
        yield session
        session.rollback()


def _leaf_with_logworks(db):
    """Tạo task lá + 1 logwork APPROVED (5h) + 1 PENDING (2h); không commit."""
    project = db.query(Project).filter(Project.project_type == "waterfall").first()
    member_id = db.query(ProjectMember.id).filter(ProjectMember.project_id == project.id).first()[0]
    leaf = task_repository.create_task(
        db,
        {
            "project_id": project.id,
            "title": "Leaf để test",
            "created_by_member_id": member_id,
            "status": "in_progress",
            "priority": "medium",
            "start_date": date(2026, 1, 1),
        },
    )
    for hours, status in ((5, "APPROVED"), (2, "PENDING")):
        task_repository.create_logwork(
            db,
            {
                "task_id": leaf.id,
                "project_member_id": member_id,
                "work_date": date(2026, 1, 2),
                "hours_spent": hours,
                "title": "x",
                "work_content": "x",
                "progress_percent": 10,
                "status": status,
            },
        )
    return leaf, member_id


@needs_db
def test_first_child_receives_all_logworks_and_parent_spent_is_kept(db):
    leaf, member_id = _leaf_with_logworks(db)

    moved = task_service.migrate_parent_logworks(db, leaf, member_id)

    assert moved is not None
    assert moved.parent_task_id == leaf.id
    assert moved.status == "done"
    assert float(moved.estimated_hours) == 5
    assert task_repository.count_task_logworks(db, leaf.id) == 0
    assert task_repository.count_task_logworks(db, moved.id) == 2
    db.refresh(leaf)
    assert leaf.spent_hours == 5


@needs_db
def test_second_child_does_not_migrate_again(db):
    leaf, member_id = _leaf_with_logworks(db)
    assert task_service.migrate_parent_logworks(db, leaf, member_id) is not None
    assert task_service.migrate_parent_logworks(db, leaf, member_id) is None


@needs_db
def test_parent_without_logworks_creates_nothing(db):
    leaf, member_id = _leaf_with_logworks(db)
    other = task_repository.create_task(
        db,
        {
            "project_id": leaf.project_id,
            "title": "Other",
            "created_by_member_id": member_id,
            "status": "todo",
            "priority": "medium",
            "start_date": date(2026, 1, 1),
        },
    )
    task_repository.reassign_logworks(db, leaf.id, other.id)
    assert task_service.migrate_parent_logworks(db, leaf, member_id) is None


@needs_db
def test_add_logwork_blocked_on_task_with_children(db):
    parent = db.query(Task).filter(Task.id.in_(db.query(Task.parent_task_id).filter(
        Task.parent_task_id.isnot(None)))).first()
    if parent is None:
        pytest.skip("Không có task cha trong dữ liệu seed")
    payload = LogWorkCreate(
        work_date=date(2026, 1, 2),
        hours_spent=1,
        title="x",
        work_content="x",
        progress_percent=10,
    )
    assignees = task_repository.get_task_assignees(db, parent.id)
    if not assignees:
        pytest.skip("Task cha không có assignee")
    member = db.query(ProjectMember).filter(ProjectMember.id == assignees[0].project_member_id).first()
    with pytest.raises(HTTPException) as exc:
        task_service.add_logwork(db, parent.id, member.user_id, payload)
    if exc.value.status_code == 403:
        pytest.skip("Assignee này không có quyền logwork.create")
    assert exc.value.status_code == 400
