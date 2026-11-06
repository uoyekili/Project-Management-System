#!/usr/bin/env python3
"""Sinh bộ dữ liệu demo gọn cho TaskFlow.

Đầu ra:
  database/backup.sql       dữ liệu nạp được vào DB đã chạy alembic upgrade head
  database/demo_users.json  ánh xạ nhân sự, ảnh và tên blob để upload avatar

Chạy: python3 database/generate_demo.py
Dữ liệu tất định, chạy lại cho kết quả giống nhau.
"""
import hashlib
import json
import math
import random
import re
from datetime import date, datetime, timedelta
from pathlib import Path

from demo_content import (
    DEPARTMENTS, JOB_TITLES, KANBAN_PROJECTS, LOG_TEMPLATES, POSITIONS, USERS, WATERFALL_PROJECT,
)

HERE = Path(__file__).resolve().parent
TODAY = date(2026, 11, 6)
NOW = datetime(2026, 11, 6, 9, 30, 0)
PASSWORD_HASH = "$2b$12$m.cd1XeY4DxDi.eei2ND4ecEbUO7tZBUcbp1EhQ85uqKOpp.8Y8zy"  # 123456
rng = random.Random(20261106)

MENTION = re.compile(r"@\[[^\]]{1,100}\]\(usr-\d+\)")


def d(s):
    return date.fromisoformat(s) if isinstance(s, str) else s


def ts(day, hh=9, mm=0):
    return datetime(day.year, day.month, day.day, hh, mm, 0)


def cap(dt):
    return min(dt, NOW)


def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (date, datetime)):
        return "'" + str(v) + "'"
    s = str(v)
    if "(" in MENTION.sub("", s) or ")" in MENTION.sub("", s):
        raise ValueError(f"Nội dung chứa dấu ngoặc đơn: {s}")
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


class Table:
    def __init__(self, name, cols):
        self.name, self.cols, self.rows = name, cols, []

    def add(self, **kw):
        assert set(kw) == set(self.cols), (self.name, set(self.cols) ^ set(kw))
        self.rows.append(kw)
        return kw

    def sql(self):
        if not self.rows:
            return ""
        head = f"INSERT INTO `{self.name}` (" + ", ".join(f"`{c}`" for c in self.cols) + ") VALUES\n"
        out = []
        for i in range(0, len(self.rows), 100):
            chunk = self.rows[i:i + 100]
            body = ",\n".join("(" + ",".join(sql_val(r[c]) for c in self.cols) + ")" for r in chunk)
            out.append(head + body + ";")
        return "\n".join(out)


T_dep = Table("departments", ["id", "name", "description", "created_at", "updated_at"])
T_job = Table("job_titles", ["id", "name", "description", "created_at", "updated_at"])
T_user = Table("users", ["id", "full_name", "email", "phone_number", "password_hash", "avatar_url", "department_id",
                         "job_title_id", "role_id", "is_active", "created_at", "updated_at"])
T_proj = Table("projects", ["id", "name", "project_type", "description", "status", "start_date", "end_date",
                            "manager_id", "created_by", "created_at", "updated_at"])
T_mem = Table("project_members", ["id", "project_id", "user_id", "position", "joined_at", "is_active"])
T_spr = Table("sprints", ["id", "project_id", "name", "goal", "start_date", "end_date", "status", "review_note",
                          "created_by_member_id", "created_at", "updated_at"])
T_task = Table("tasks", ["id", "project_id", "sprint_id", "parent_task_id", "title", "description",
                         "created_by_member_id", "status", "priority", "start_date", "deadline", "estimated_hours",
                         "completed_at", "created_at", "updated_at"])
T_asg = Table("task_assignees", ["id", "task_id", "project_member_id", "assigned_by_member_id", "assigned_at"])
T_att = Table("task_attachments", ["id", "task_id", "file_url", "file_name", "uploaded_by", "created_at"])
T_cmt = Table("task_comments", ["id", "task_id", "user_id", "content", "created_at"])
T_log = Table("logworks", ["id", "task_id", "project_member_id", "work_date", "hours_spent", "title", "work_content",
                           "progress_percent", "status", "approved_by", "approved_at", "review_note", "created_at",
                           "updated_at"])
T_ntf = Table("notifications", ["id", "user_id", "type", "title", "content", "link", "is_read", "created_at"])

# ---------------------------------------------------------------- nhân sự
UID = {}      # key -> user id
UNAME = {}    # key -> họ tên
ROLE = {}
users_json = []
for i, (key, name, gender, fname, role, dep, job, email) in enumerate(USERS, start=1):
    UID[key], UNAME[key], ROLE[key] = i, name, role
    src = HERE / "avatars" / gender / f"{fname}.jpg"
    assert src.exists(), src
    blob = f"users/user_{i}_{hashlib.sha1(fname.encode()).hexdigest()[:12]}.jpg"
    T_user.add(id=i, full_name=name, email=email, phone_number=f"09010000{i:02d}", password_hash=PASSWORD_HASH,
               avatar_url=blob, department_id=dep, job_title_id=job, role_id=role, is_active=1,
               created_at=datetime(2026, 9, 1, 9, 0, 0), updated_at=datetime(2026, 9, 1, 9, 0, 0))
    users_json.append(dict(id=i, key=key, full_name=name, email=email, role_id=role, gender=gender,
                           file=f"avatars/{gender}/{fname}.jpg", blob=blob))

for did, name, desc in DEPARTMENTS:
    T_dep.add(id=did, name=name, description=desc, created_at=datetime(2026, 9, 1, 9, 0, 0), updated_at=datetime(2026, 9, 1, 9, 0, 0))
for jid, name, desc in JOB_TITLES:
    T_job.add(id=jid, name=name, description=desc, created_at=datetime(2026, 9, 1, 9, 0, 0), updated_at=datetime(2026, 9, 1, 9, 0, 0))


def mention(match):
    return f"@[{UNAME[match.group(1)]}](usr-{UID[match.group(1)]})"


def render(text):
    return re.sub(r"\{@(\w+)\}", mention, text)


# ---------------------------------------------------------------- tiện ích
counters = dict(task=0, member=0, sprint=0, project=0)
all_logs = []        # để sinh thông báo
all_assign_events = []  # (task, user_key, creator_key, created_at)


def weekdays(lo, hi):
    out, cur = [], lo
    while cur <= hi:
        if cur.weekday() < 5:
            out.append(cur)
        cur += timedelta(days=1)
    return out


def split_hours(total, n):
    total = max(total, n)
    parts = [total // n] * n
    for i in range(total % n):
        parts[i] += 1
    # mỗi bản ghi tối đa 6 giờ
    out = []
    for p in parts:
        while p > 6:
            out.append(6)
            p -= 6
        out.append(p)
    return [p for p in out if p > 0]


def approver_for(proj, owner_key):
    for k in proj["approvers"]:
        if k != owner_key:
            return k
    raise RuntimeError("không có người duyệt")


def make_logs(proj, task, spec, completed_on):
    """Sinh logwork cho task lá. spec chứa kind, who, est, status, opt."""
    if spec["status"] == "todo" or not spec["who"]:
        return
    kind = spec["kind"]
    est = spec["est"]
    start = task["start_date"]
    if spec["status"] == "done":
        total = max(2, round(est * rng.uniform(0.85, 1.1)))
        hi = completed_on
        final = 100
    else:
        total = max(2, round(est * rng.uniform(0.35, 0.65)))
        hi = TODAY
        final = rng.choice([40, 50, 60, 70])
    days = weekdays(start, hi)
    if not days:
        return
    n = 1 if total <= 4 else (2 if total <= 12 else 3)
    n = min(n, len(days))
    hours = split_hours(total, n)
    n = len(hours)
    n = min(n, len(days))
    hours = hours[:n]
    # chọn ngày phân bố đều trong khoảng
    idx = sorted({int(round(i * (len(days) - 1) / max(n - 1, 1))) for i in range(n)}) if n > 1 else [len(days) - 1]
    chosen = [days[i] for i in idx]
    hours = hours[:len(chosen)]
    cum, total_h = 0, sum(hours)
    used = set()
    first_rejected = False
    tpls = rng.sample(LOG_TEMPLATES[kind], len(LOG_TEMPLATES[kind]))
    for i, (day, h) in enumerate(zip(chosen, hours)):
        owner = spec["who"][i % len(spec["who"])]
        if (task["id"], owner, day) in used:
            continue
        used.add((task["id"], owner, day))
        cum += h
        prog = final if i == len(hours) - 1 else min(final - 10, max(10, round(cum / total_h * final / 5) * 5))
        age = (TODAY - day).days
        if age <= 3:
            status = "PENDING" if rng.random() < 0.85 else "APPROVED"
        elif age <= 7:
            status = "PENDING" if rng.random() < 0.3 else "APPROVED"
        else:
            status = "APPROVED"
        note = None
        if spec["opt"].get("rej") and i == 0 and age >= 1:
            status, first_rejected = "REJECTED", True
            note = "Nội dung chưa nêu rõ kết quả đạt được. Vui lòng bổ sung bằng chứng và gửi lại."
        title, content = tpls[i % len(tpls)]
        ap = approver_for(proj, owner) if status != "PENDING" else None
        approved_at = cap(ts(day + timedelta(days=1), 10, 15)) if ap else None
        created = cap(ts(day, 17, 30))
        lg = T_log.add(id=len(T_log.rows) + 1, task_id=task["id"], project_member_id=proj["mid"][owner],
                       work_date=day, hours_spent=h, title=title, work_content=content, progress_percent=prog,
                       status=status, approved_by=UID[ap] if ap else None, approved_at=approved_at,
                       review_note=note, created_at=created, updated_at=approved_at or created)
        all_logs.append((lg, owner, ap, spec["title"], proj))
    if first_rejected:
        nxt = [x for x in weekdays(chosen[0] + timedelta(days=1), TODAY) if (task["id"], spec["who"][0], x) not in used]
        if nxt:
            day = nxt[0]
            owner = spec["who"][0]
            lg = T_log.add(id=len(T_log.rows) + 1, task_id=task["id"], project_member_id=proj["mid"][owner],
                           work_date=day, hours_spent=1, title="Bổ sung kết quả theo góp ý",
                           work_content="Bổ sung bằng chứng và mô tả cụ thể kết quả đã làm theo góp ý của người duyệt.",
                           progress_percent=min(final, 60), status="PENDING", approved_by=None, approved_at=None,
                           review_note=None, created_at=cap(ts(day, 17, 30)), updated_at=cap(ts(day, 17, 30)))
            all_logs.append((lg, owner, None, spec["title"], proj))


def add_comments(task, spec, anchor):
    cms = spec["opt"].get("cm")
    if not cms:
        return
    base = anchor + timedelta(days=1)
    if base > TODAY - timedelta(days=1):
        base = TODAY - timedelta(days=1)
    for i, (who, text) in enumerate(cms):
        T_cmt.add(id=len(T_cmt.rows) + 1, task_id=task["id"], user_id=UID[who], content=render(text),
                  created_at=cap(ts(base, 10, 15) + timedelta(hours=2.5 * i)))


def add_attachment(task, spec, proj, anchor):
    att = spec["opt"].get("att")
    if not att:
        return
    fname, who = att
    T_att.add(id=len(T_att.rows) + 1, task_id=task["id"], file_url=f"https://files.taskflow.vn/documents/{fname}",
              file_name=fname, uploaded_by=proj["mid"][who], created_at=cap(ts(anchor + timedelta(days=1), 14, 0)))


def new_project(p, ptype):
    counters["project"] += 1
    pid = counters["project"]
    proj = dict(id=pid, mid={}, pm=p["pm"])
    start = d(p["start"])
    T_proj.add(id=pid, name=p["name"], project_type=ptype, description=p["desc"], status=p["status"],
               start_date=start, end_date=d(p["end"]), manager_id=UID[p["pm"]], created_by=UID[p["pm"]],
               created_at=ts(start - timedelta(days=5), 9, 0), updated_at=ts(start - timedelta(days=5), 9, 0))
    for key in p["members"]:
        counters["member"] += 1
        proj["mid"][key] = counters["member"]
        T_mem.add(id=counters["member"], project_id=pid, user_id=UID[key], position=POSITIONS[key],
                  joined_at=ts(start - timedelta(days=3), 9, 0), is_active=1)
    proj["approvers"] = [p["pm"]] + [k for k in p["members"] if ROLE[k] == 4]
    proj["start"] = start
    return proj


def new_task(proj, sprint_id, parent_id, spec, status, start, deadline, completed, created):
    counters["task"] += 1
    tid = counters["task"]
    creator = proj["pm"] if parent_id is None else proj["pm"]
    cm = proj["mid"][creator]
    row = T_task.add(id=tid, project_id=proj["id"], sprint_id=sprint_id, parent_task_id=parent_id, title=spec["title"],
                     description=spec["desc"], created_by_member_id=cm, status=status, priority=spec["prio"],
                     start_date=start, deadline=deadline, estimated_hours=spec["est"], completed_at=completed,
                     created_at=created, updated_at=completed or created)
    return row, cm


def assign(row, cm, spec_who, proj, created):
    for key in spec_who:
        T_asg.add(id=len(T_asg.rows) + 1, task_id=row["id"], project_member_id=proj["mid"][key],
                  assigned_by_member_id=cm, assigned_at=created + timedelta(minutes=30))
        all_assign_events.append((row, key, proj["pm"], created + timedelta(minutes=30), proj))


# ---------------------------------------------------------------- dự án Kanban
for p in KANBAN_PROJECTS:
    proj = new_project(p, "agile")
    sprints = {}
    for num, name, goal, s, e, st, note in p["sprints"]:
        counters["sprint"] += 1
        sprints[num] = dict(id=counters["sprint"], start=d(s), end=d(e), status=st)
        T_spr.add(id=counters["sprint"], project_id=proj["id"], name=name, goal=goal, start_date=d(s), end_date=d(e),
                  status=st, review_note=note, created_by_member_id=proj["mid"][p["pm"]],
                  created_at=ts(d(s) - timedelta(days=3), 9, 0), updated_at=ts(d(e), 17, 0) if st == "closed" else ts(d(s) - timedelta(days=3), 9, 0))
    for snum, specs in p["tasks"].items():
        for spec in specs:
            sp = sprints.get(snum)
            opt = spec["opt"]
            if sp is None:
                status = "todo"
                start = TODAY + timedelta(days=3)
                deadline = None
                created = ts(TODAY - timedelta(days=rng.randint(8, 14)), 10, 0)
            else:
                status = "done" if sp["status"] == "closed" else (spec["status"] if sp["status"] == "active" else "todo")
                if sp["status"] == "active" and status == "todo":
                    start = sp["start"] + timedelta(days=rng.randint(2, 4))
                else:
                    start = sp["start"] + timedelta(days=rng.randint(0, 3))
                deadline = sp["end"] - timedelta(days=rng.randint(0, 2))
                created = ts(sp["start"] - timedelta(days=1), 9, 30) if sp["status"] != "planned" else ts(TODAY - timedelta(days=3), 10, 0)
            if "st" in opt:
                start = d(opt["st"])
            if "dl" in opt:
                deadline = d(opt["dl"])
            if deadline is not None:
                need = start + timedelta(days=math.ceil(spec["est"] / 8) - 1)
                if deadline < need:
                    deadline = need
            completed = None
            if status == "done":
                completed_day = min(deadline - timedelta(days=rng.randint(0, 2)), TODAY - timedelta(days=1))
                completed_day = max(completed_day, start)
                while completed_day.weekday() >= 5:
                    completed_day -= timedelta(days=1)
                completed_day = max(completed_day, start)
                completed = ts(completed_day, 16, 30)
            row, cm = new_task(proj, sp["id"] if sp else None, None, spec, status, start, deadline, completed, created)
            spec = dict(spec, status=status)
            assign(row, cm, spec["who"], proj, created)
            make_logs(proj, row, spec, completed.date() if completed else TODAY)
            add_comments(row, spec, start)
            add_attachment(row, spec, proj, start)

# ---------------------------------------------------------------- dự án Waterfall
wf = WATERFALL_PROJECT
proj = new_project(wf, "waterfall")
for phase in wf["phases"]:
    kids = phase["kids"]
    union = []
    for k in kids:
        for w in k["who"]:
            if w not in union:
                union.append(w)
    pstart = min(d(k["st"]) for k in kids)
    pend = max(d(k["dl"]) for k in kids)
    statuses = {k["status"] for k in kids}
    pstatus = "done" if statuses == {"done"} else ("todo" if statuses == {"todo"} else "in_progress")
    pest = sum(k["est"] for k in kids)
    pcompleted = None
    if pstatus == "done":
        pcompleted = ts(min(pend, TODAY - timedelta(days=1)), 16, 30)
    pspec = dict(title=phase["title"], desc=phase["desc"], prio="high", est=pest)
    prow, pcm = new_task(proj, None, None, pspec, pstatus, pstart, pend, pcompleted, ts(pstart - timedelta(days=7), 9, 30))
    assign(prow, pcm, union, proj, ts(pstart - timedelta(days=7), 9, 30))
    for k in kids:
        start, dl = d(k["st"]), d(k["dl"])
        need = start + timedelta(days=math.ceil(k["est"] / 8) - 1)
        assert dl >= need, (k["title"], dl, need)
        completed = None
        if k["status"] == "done":
            day = min(dl, TODAY - timedelta(days=1))
            while day.weekday() >= 5:
                day -= timedelta(days=1)
            completed = ts(max(day, start), 16, 30)
        created = ts(max(start - timedelta(days=7), d(wf["start"])), 9, 30)
        row, cm = new_task(proj, None, prow["id"], k, k["status"], start, dl, completed, created)
        assign(row, cm, k["who"], proj, created)
        make_logs(proj, row, k, completed.date() if completed else TODAY)
        add_comments(row, k, start)
        add_attachment(row, k, proj, start)

# ---------------------------------------------------------------- thông báo
ntf = []
link = lambda pid, tid: f"/projects/{pid}?highlightTaskId={tid}"
for row, key, creator, when, pr in all_assign_events:
    if row["status"] == "done" or key == creator or when < NOW - timedelta(days=21) or row["parent_task_id"] is None and pr["id"] == 4:
        continue
    pname = T_proj.rows[pr["id"] - 1]["name"]
    ntf.append((UID[key], "TASK_ASSIGNED", "Bạn được giao một công việc mới",
                f"{UNAME[creator]} đã giao cho bạn \"{row['title']}\" trong dự án \"{pname}\"",
                link(pr["id"], row["id"]), 0 if when > NOW - timedelta(days=6) else 1, cap(when)))
for lg, owner, ap, ttitle, pr in all_logs:
    tid = lg["task_id"]
    if lg["status"] == "PENDING":
        for a in pr["approvers"]:
            if a != owner:
                ntf.append((UID[a], "LOGWORK_SUBMITTED", "Có logwork cần duyệt",
                            f"{UNAME[owner]} đã gửi logwork {lg['hours_spent']} giờ cho \"{ttitle}\"",
                            link(pr["id"], tid), 0, lg["created_at"]))
                break
    elif lg["status"] == "REJECTED":
        ntf.append((UID[owner], "LOGWORK_REJECTED", "Logwork của bạn bị từ chối",
                    f"{UNAME[ap]} đã từ chối logwork cho \"{ttitle}\": {lg['review_note']}",
                    link(pr["id"], tid), 0, lg["approved_at"]))
recent_ok = [x for x in all_logs if x[0]["status"] == "APPROVED" and x[0]["work_date"] >= TODAY - timedelta(days=7)]
for lg, owner, ap, ttitle, pr in recent_ok[:6]:
    ntf.append((UID[owner], "LOGWORK_APPROVED", "Logwork của bạn đã được duyệt",
                f"{UNAME[ap]} đã duyệt logwork {lg['hours_spent']} giờ cho \"{ttitle}\"",
                link(pr["id"], lg["task_id"]), 1, lg["approved_at"]))
ntf.sort(key=lambda x: x[6])
for i, (uid, typ, title, content, lk, rd, at) in enumerate(ntf, start=1):
    T_ntf.add(id=i, user_id=uid, type=typ, title=title, content=content, link=lk, is_read=rd, created_at=at)

# ---------------------------------------------------------------- kiểm tra
tasks = {r["id"]: r for r in T_task.rows}
children = {}
for r in T_task.rows:
    if r["parent_task_id"]:
        children.setdefault(r["parent_task_id"], []).append(r["id"])
assignees = {}
for a in T_asg.rows:
    assignees.setdefault(a["task_id"], set()).add(a["project_member_id"])
member_proj = {m["id"]: m["project_id"] for m in T_mem.rows}
for r in T_task.rows:
    assert r["deadline"] is None or r["deadline"] >= r["start_date"], r["title"]
    if r["deadline"]:
        assert r["deadline"] >= r["start_date"] + timedelta(days=math.ceil(r["estimated_hours"] / 8) - 1), r["title"]
    if r["status"] == "done":
        assert r["completed_at"], r["title"]
    for m in assignees.get(r["id"], ()):
        assert member_proj[m] == r["project_id"], r["title"]
    if r["parent_task_id"]:
        assert assignees[r["id"]] <= assignees[r["parent_task_id"]], r["title"]
        assert r["sprint_id"] is None
    if r["id"] in children:
        assert r["estimated_hours"] == sum(tasks[c]["estimated_hours"] for c in children[r["id"]]), r["title"]
for lg in T_log.rows:
    assert lg["task_id"] not in children, "logwork trên task cha"
    assert lg["project_member_id"] in assignees[lg["task_id"]]
    assert lg["work_date"] <= TODAY and lg["created_at"] <= NOW
    assert lg["status"] == "PENDING" or lg["approved_by"] != T_mem.rows[lg["project_member_id"] - 1]["user_id"]
assert len({r["name"] for r in T_proj.rows}) == len(T_proj.rows)
assert len({r["email"] for r in T_user.rows}) == len(T_user.rows)
assert len({u["blob"] for u in users_json}) == len(users_json)

# ---------------------------------------------------------------- ghi file
rbac = (HERE / "seed_rbac.sql").read_text(encoding="utf-8").rstrip("\n")
roster = "\n".join(f"-- USR-{u['id']:03d}  {u['email']:<34} {u['full_name']}" for u in users_json)
counts = ", ".join(f"{t.name} {len(t.rows)}" for t in (T_user, T_proj, T_mem, T_spr, T_task, T_asg, T_cmt, T_log, T_ntf, T_att))
parts = [
    "-- =============================================================================",
    "-- TaskFlow - dữ liệu demo (nạp vào database đã chạy `alembic upgrade head`, không có DDL).",
    "-- File được sinh bởi database/generate_demo.py, không sửa tay.",
    f"-- Quy mô: {counts}.",
    "-- Mật khẩu mọi tài khoản: 123456. Mốc thời gian quanh ngày 2026-11-06.",
    roster,
    "-- =============================================================================",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "SET UNIQUE_CHECKS = 0;",
    "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';",
    "",
    T_dep.sql(), T_job.sql(), "", rbac, "",
    T_user.sql(), T_proj.sql(), T_mem.sql(), T_spr.sql(), T_task.sql(), T_asg.sql(), T_att.sql(), T_cmt.sql(),
    T_log.sql(), T_ntf.sql(), "",
    "SET UNIQUE_CHECKS = 1;",
    "SET FOREIGN_KEY_CHECKS = 1;",
    "",
]
(HERE / "backup.sql").write_text("\n".join(parts), encoding="utf-8")
(HERE / "demo_users.json").write_text(json.dumps(users_json, ensure_ascii=False, indent=2), encoding="utf-8")
print("OK:", counts)
from collections import Counter
print("task:", Counter(r["status"] for r in T_task.rows), "log:", Counter(r["status"] for r in T_log.rows))
print("ntf:", Counter(r["type"] for r in T_ntf.rows))
