"""Kiểm thử tích hợp: phạm vi OWN / PROJECT / ALL trên dữ liệu seed.

Cần MySQL đã `alembic upgrade head` và nạp `database/backup.sql`;
tự bỏ qua nếu không kết nối được hoặc chưa seed.
"""

import pytest
from fastapi.testclient import TestClient

try:
    from sqlalchemy import text

    from app.core.connection import SessionLocal
    from app.main import app
    from app.models.project_model import Project, ProjectMember
    from app.models.task_model import Task
    from app.models.user_model import User

    with SessionLocal() as _db:
        _seeded = _db.query(User).filter(User.email == "quantm@gmail.com").first() is not None
except Exception:  # pragma: no cover - DB không sẵn sàng
    _seeded = False

pytestmark = pytest.mark.skipif(not _seeded, reason="Cần database đã seed (seed_demo.py)")

# Khóa nội bộ của test -> email trong database/backup.sql
EMAILS = {
    "admin": "dungnv@gmail.com",
    "ceo": "quantm@gmail.com",
    "dung.nv2": "dungnv2@gmail.com",
    "hai.lv": "hailv@gmail.com",
    "thang.nd": "thangnd@gmail.com",
    "pm.anh": "anhvp@gmail.com",
    "pm.nam": "nampt@gmail.com",
}

PASSWORD = "123456"


_clients: dict[str, TestClient] = {}


def client_for(key: str) -> TestClient:
    # Cache theo user: đăng nhập lặp trong cùng một giây sinh trùng refresh token.
    if key not in _clients:
        client = TestClient(app, base_url="http://localhost")
        response = client.post(
            "/login", json={"email": EMAILS[key], "password": PASSWORD}
        )
        assert response.status_code == 200, response.text
        _clients[key] = client
    return _clients[key]


@pytest.fixture(scope="module")
def db():
    with SessionLocal() as session:
        yield session


def member_project_ids(db, key):
    user = db.query(User).filter(User.email == EMAILS[key]).one()
    rows = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == user.id, ProjectMember.is_active.is_(True)
    )
    return {pid for (pid,) in rows}


def test_ceo_sees_all_projects_without_membership(db):
    client = client_for("ceo")
    total = db.query(Project).count()
    body = client.get("/api/projects", params={"page_size": 100}).json()
    assert body["total"] == total
    assert member_project_ids(db, "ceo") == set()
    assert len(client.get("/api/tasks").json()) == db.query(Task).count()
    assert client.get("/api/dashboard/global-overview").json()["dataScope"] == "ALL"


def test_employee_only_sees_member_projects(db):
    client = client_for("thang.nd")
    expected = member_project_ids(db, "thang.nd")
    got = {item["id"] for item in client.get("/api/projects", params={"page_size": 100}).json()["items"]}
    assert got == expected
    tasks = client.get("/api/tasks").json()
    assert tasks and {t["project_id"] for t in tasks} <= expected
    outside = db.query(Task).filter(Task.project_id.notin_(expected)).first()
    assert client.get(f"/api/tasks/{outside.id}").status_code == 403
    assert client.get("/api/dashboard/global-overview").json()["dataScope"] == "PROJECT"


def test_intern_sees_only_own_tasks(db):
    client = client_for("dung.nv2")
    tasks = client.get("/api/tasks").json()
    assert tasks
    assert all(
        "usr-%s" % me in [a["user_id"] for a in t["assignees"]] or t["created_by_user_id"] == me
        for me in [db.query(User).filter(User.email == EMAILS["dung.nv2"]).one().id]
        for t in tasks
    )
    assert client.get("/api/dashboard/global-overview").json()["dataScope"] == "OWN"


def test_admin_has_no_operational_access(db):
    client = client_for("admin")
    assert client.get("/api/admin/dashboard").status_code == 200
    assert client.get("/api/tasks").json() == []
    assert client.get("/api/projects").json()["total"] == 0
    admin = db.query(User).filter(User.email == EMAILS["admin"]).one()
    assert admin.department_id is None and not member_project_ids(db, "admin")
    project_id = db.query(Project.id).first()[0]
    response = client.post(
        f"/api/projects/{project_id}/tasks",
        json={"title": "x", "start_date": "2026-01-01"},
    )
    assert response.status_code == 403


def test_non_admin_cannot_open_admin_api():
    for key in ("ceo", "pm.nam", "thang.nd"):
        assert client_for(key).get("/api/admin/users").status_code == 403


def test_logwork_approval_scope(db):
    employee = client_for("thang.nd")
    assert employee.get("/api/v1/logworks/pending").json() == []

    pm = client_for("pm.anh")
    pending = pm.get("/api/v1/logworks/pending").json()
    allowed = member_project_ids(db, "pm.anh")
    assert pending
    assert {lw["project_id"] for lw in pending} <= allowed

    ceo_pending = client_for("ceo").get("/api/v1/logworks/pending").json()
    assert len(ceo_pending) >= len(pending)

    outside = next(lw for lw in ceo_pending if lw["project_id"] not in allowed)
    assert pm.patch(f"/api/v1/logworks/{outside['id']}/approve").status_code == 403


def test_task_create_scopes(db):
    project_id = next(iter(member_project_ids(db, "thang.nd") & member_project_ids(db, "pm.nam")))
    other_user = (
        db.query(User).filter(User.email == EMAILS["hai.lv"]).one().id
    )
    payload = {"title": "Task test scope", "start_date": "2026-10-10", "deadline": "2026-10-20"}

    employee = client_for("thang.nd")
    mine = employee.post(f"/api/projects/{project_id}/tasks", json=payload)
    assert mine.status_code == 201, mine.text
    for_other = employee.post(
        f"/api/projects/{project_id}/tasks",
        json={**payload, "assignee_user_ids": [other_user]},
    )
    assert for_other.status_code == 403

    assert client_for("dung.nv2").post(f"/api/projects/{project_id}/tasks", json=payload).status_code == 403
    assert client_for("ceo").post(f"/api/projects/{project_id}/tasks", json=payload).status_code == 403

    pm = client_for("pm.nam")
    assigned = pm.post(
        f"/api/projects/{project_id}/tasks",
        json={**payload, "title": "Task PM giao", "assignee_user_ids": [other_user]},
    )
    assert assigned.status_code == 201, assigned.text

    # xóa: chủ sở hữu được xóa task của mình, không xóa được task người khác
    assert employee.delete(f"/api/tasks/{assigned.json()['id']}").status_code == 403
    assert employee.delete(f"/api/tasks/{mine.json()['id']}").status_code == 204
    assert pm.delete(f"/api/tasks/{assigned.json()['id']}").status_code == 204


def test_admin_changes_role_permission_takes_effect(db):
    admin = client_for("admin")
    roles = {r["name"]: r for r in admin.get("/api/admin/roles").json()}
    perms = {p["code"]: p["id"] for p in admin.get("/api/admin/permissions").json()}
    intern = roles["Intern"]
    original = intern["permission_ids"]
    try:
        reduced = [i for i in original if i != perms["logwork.create:OWN"]]
        assert admin.put(
            f"/api/admin/roles/{intern['id']}/permissions", json={"permission_ids": reduced}
        ).status_code == 200
        me = client_for("dung.nv2").get("/me").json()
        assert "logwork.create:OWN" not in me["permissions"]
    finally:
        admin.put(f"/api/admin/roles/{intern['id']}/permissions", json={"permission_ids": original})
    assert "logwork.create:OWN" in client_for("dung.nv2").get("/me").json()["permissions"]
