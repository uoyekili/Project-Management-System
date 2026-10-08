from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.core.permission_catalog import ALL, OWN, PROJECT
from app.models.project_model import Project
from app.models.sprint_model import Sprint
from app.models.user_model import User
from app.repositories import project_repository, sprint_repository, task_repository
from app.schemas.dashboard_schema import (
    DashboardOverviewResponse,
    DashboardPriorityBreakdownResponse,
    DashboardRecentLogworkResponse,
    DashboardSprintSummaryResponse,
    DashboardTaskPreviewResponse,
    DashboardTaskSummaryResponse,
    DashboardTrendPointResponse,
    DashboardWorkloadMemberResponse,
    GlobalDashboardOverviewResponse,
    ProjectHealthPreviewResponse,
)
from app.services import project_service
from app.utils.dashboard_helpers import (
    build_task_progress_map,
    calculate_elapsed_progress,
    calculate_logwork_coverage,
    calculate_progress_percent,
    count_overdue_tasks,
    count_task_statuses,
    decimal_to_float,
    list_leaf_tasks,
    list_overdue_tasks,
    normalize_task_status,
    resolve_health_tone,
    sum_estimated_hours,
    sum_logged_hours,
)
from app.utils.project_helpers import (
    build_project_response,
    list_accessible_project_ids,
    resolve_project_scopes,
    split_scoped_project_ids,
    to_frontend_status,
)


def resolve_data_scope(user: User) -> str:
    """Phạm vi dữ liệu dashboard: theo task.view, nếu không có thì theo project.view."""
    return (
        perm.max_scope(user, "task", "view") or perm.max_scope(user, "project", "view") or "NONE"
    )


def _load_scoped_tasks(db: Session, user: User, project_ids: list[int]):
    """Task user được xem (task.view) trong tập dự án cho trước."""
    scopes = {
        pid: sc
        for pid, sc in resolve_project_scopes(db, user, "task", "view").items()
        if pid in set(project_ids)
    }
    full_ids, own_ids = split_scoped_project_ids(scopes)
    tasks = []
    if full_ids:
        tasks.extend(task_repository.list_tasks(db, project_ids=full_ids))
    if own_ids:
        tasks.extend(task_repository.list_tasks(db, project_ids=own_ids, involved_user_id=user.id))
    return tasks


def _filter_logwork_rows(db: Session, user: User, rows):
    """Giữ logwork theo logwork.view: PROJECT/ALL xem hết, OWN chỉ của mình."""
    scopes = resolve_project_scopes(db, user, "logwork", "view")
    kept = []
    for row in rows:
        logwork, task, member, _row_user = row
        scope = scopes.get(task.project_id)
        if scope in (ALL, PROJECT) or (scope == OWN and member.user_id == user.id):
            kept.append(row)
    return kept


def _normalize_sprint_status(status: str | None) -> str:
    normalized = (status or "planning").strip().lower()

    if normalized in {"active", "in_progress"}:
        return "ACTIVE"
    if normalized == "review":
        return "REVIEW"
    if normalized in {"closed", "completed", "done"}:
        return "CLOSED"
    return "PLANNED"


def _load_accessible_projects(db: Session, current_user: User):
    accessible_ids = list_accessible_project_ids(db, current_user)
    if not accessible_ids:
        return []

    return (
        db.query(Project)
        .filter(Project.id.in_(accessible_ids))
        .order_by(desc(Project.updated_at), desc(Project.id))
        .all()
    )


def _resolve_selected_project(db: Session, current_user: User, project_id: int | None):
    accessible_projects = _load_accessible_projects(db, current_user)
    if not accessible_projects:
        return None, []

    if project_id is not None:
        project = project_service.require_project_access(db, project_id, current_user)
        return project, accessible_projects

    return accessible_projects[0], accessible_projects


def _select_active_sprint(sprints: list[Sprint]) -> Sprint | None:
    if not sprints:
        return None

    normalized_map = {sprint.id: _normalize_sprint_status(sprint.status) for sprint in sprints}
    for preferred_status in ("ACTIVE", "REVIEW", "PLANNED", "CLOSED"):
        for sprint in sprints:
            if normalized_map[sprint.id] == preferred_status:
                return sprint

    return sprints[0]


def _build_task_preview(
    task, assignee_name: str | None, sprint_name: str | None = None, project=None
):
    return DashboardTaskPreviewResponse(
        id=task.id,
        key=f"TASK-{task.id}",
        title=task.title,
        status=normalize_task_status(task.status),
        priority=(task.priority or "medium").upper(),
        startDate=task.start_date,
        dueDate=task.deadline,
        assigneeName=assignee_name,
        sprintName=sprint_name,
        projectId=project.id if project else None,
        projectName=project.name if project else None,
        projectType=(getattr(project, "project_type", None) or "agile") if project else None,
    )


def get_dashboard_overview(
    db: Session,
    current_user: User,
    project_id: int | None = None,
) -> DashboardOverviewResponse:
    selected_project, accessible_projects = _resolve_selected_project(db, current_user, project_id)
    if not selected_project:
        return DashboardOverviewResponse(dataScope=resolve_data_scope(current_user))

    accessible_project_responses = [
        build_project_response(db, project, viewer=current_user) for project in accessible_projects
    ]
    selected_project_response = next(
        (project for project in accessible_project_responses if project.id == selected_project.id),
        build_project_response(db, selected_project, viewer=current_user),
    )

    portfolio_progress = (
        round(
            sum(project.progress for project in accessible_project_responses)
            / len(accessible_project_responses)
        )
        if accessible_project_responses
        else 0
    )
    open_tasks_in_scope = sum(
        max(0, project.metrics.totalTasks - project.metrics.completedTasks)
        for project in accessible_project_responses
    )

    project_tasks = _load_scoped_tasks(db, current_user, [selected_project.id])
    project_logwork_rows = _filter_logwork_rows(
        db,
        current_user,
        task_repository.list_project_logworks_with_context(db, selected_project.id),
    )
    project_logworks = [row[0] for row in project_logwork_rows]
    task_progress_map = build_task_progress_map(project_logworks)
    leaf_tasks = list_leaf_tasks(project_tasks)
    task_counts = count_task_statuses(project_tasks)
    overdue_tasks_all = list_overdue_tasks(project_tasks, include_parent_tasks=True)
    overdue_count = len(overdue_tasks_all)
    estimated_hours_total = sum_estimated_hours(project_tasks)
    estimated_hours_done = sum_estimated_hours(
        [task for task in leaf_tasks if normalize_task_status(task.status) == "done"]
    )
    estimated_hours_remaining = max(0.0, round(estimated_hours_total - estimated_hours_done, 1))

    assignee_rows = task_repository.list_task_assignee_users(
        db, [task.id for task in project_tasks]
    )
    assignee_by_task_id = {
        task_id: {
            "user_id": user_id,
            "name": full_name,
            "email": email,
        }
        for task_id, user_id, full_name, email, _ in assignee_rows
    }

    sprint_rows = sprint_repository.list_sprints(db, selected_project.id)
    sprint_by_id = {sprint.id: sprint for sprint in sprint_rows}
    sprint_summaries: list[DashboardSprintSummaryResponse] = []

    for sprint in sprint_rows:
        sprint_tasks = [task for task in project_tasks if task.sprint_id == sprint.id]
        sprint_task_ids = {task.id for task in sprint_tasks}
        sprint_logworks = [entry for entry in project_logworks if entry.task_id in sprint_task_ids]
        sprint_counts = count_task_statuses(sprint_tasks)
        actual_progress = calculate_progress_percent(sprint_tasks, task_progress_map)
        planned_progress = calculate_elapsed_progress(sprint.start_date, sprint.end_date)
        sprint_summaries.append(
            DashboardSprintSummaryResponse(
                id=sprint.id,
                name=sprint.name,
                status=_normalize_sprint_status(sprint.status),
                goal=sprint.goal,
                startDate=sprint.start_date,
                endDate=sprint.end_date,
                plannedProgress=planned_progress,
                actualProgress=actual_progress,
                totalTasks=len(list_leaf_tasks(sprint_tasks)),
                todoCount=sprint_counts["todo"],
                inProgressCount=sprint_counts["in_progress"],
                doneCount=sprint_counts["done"],
                estimatedHours=sum_estimated_hours(sprint_tasks),
                loggedHours=sum_logged_hours(sprint_logworks),
                health=resolve_health_tone(actual_progress, planned_progress, sprint.status),
            )
        )

    active_sprint_model = _select_active_sprint(sprint_rows)
    active_sprint = next(
        (
            summary
            for summary in sprint_summaries
            if active_sprint_model and summary.id == active_sprint_model.id
        ),
        None,
    )

    members = project_repository.list_project_members(
        db, selected_project.id, include_inactive=False
    )
    if perm.effective_scope(db, current_user, "task", "view", selected_project.id) == OWN:
        members = [(m, u) for m, u in members if u.id == current_user.id]
    member_user_ids = [user.id for _, user in members]
    current_day = datetime.now(timezone.utc).date()
    members_logged_today = len(
        {
            user.id
            for logwork, _, _, user in project_logwork_rows
            if logwork.work_date == current_day and user.id in member_user_ids
        }
    )
    logwork_coverage_rows = [
        type("CoverageLogwork", (), {"user_id": user.id, "work_date": logwork.work_date})
        for logwork, _, project_member, user in project_logwork_rows
    ]
    logwork_coverage = calculate_logwork_coverage(member_user_ids, logwork_coverage_rows)

    project_progress = calculate_progress_percent(project_tasks, task_progress_map)

    overdue_tasks = sorted(overdue_tasks_all, key=lambda task: (task.deadline, task.id))[:6]
    active_tasks = sorted(
        [task for task in leaf_tasks if normalize_task_status(task.status) != "done"],
        key=lambda task: (task.deadline or datetime.max.date(), task.id),
    )[:8]

    workload_board: list[DashboardWorkloadMemberResponse] = []
    tasks_by_assignee_id: dict[int, list] = defaultdict(list)
    for task in leaf_tasks:
        assignee = assignee_by_task_id.get(task.id)
        if assignee:
            tasks_by_assignee_id[assignee["user_id"]].append(task)

    member_logworks: dict[int, list] = defaultdict(list)
    for logwork, _, _, user in project_logwork_rows:
        member_logworks[user.id].append(logwork)

    for member, user in members:
        assigned_tasks = tasks_by_assignee_id.get(user.id, [])
        assigned_counts = count_task_statuses(assigned_tasks)
        workload_board.append(
            DashboardWorkloadMemberResponse(
                userId=user.id,
                memberId=member.id,
                name=user.full_name,
                email=user.email,
                roleName=member.position or user.role or "",
                assignedTasks=len(assigned_tasks),
                todoTasks=assigned_counts["todo"],
                inProgressTasks=assigned_counts["in_progress"],
                doneTasks=assigned_counts["done"],
                overdueTasks=count_overdue_tasks(assigned_tasks, include_parent_tasks=True),
                estimatedHours=sum_estimated_hours(assigned_tasks),
                loggedHours=sum_logged_hours(member_logworks.get(user.id, [])),
                progress=calculate_progress_percent(assigned_tasks, task_progress_map),
                avatarUrl=user.avatar_url,
            )
        )

    workload_board.sort(key=lambda item: (-item.loggedHours, -item.estimatedHours, item.name))

    recent_logwork = [
        DashboardRecentLogworkResponse(
            id=logwork.id,
            taskId=task.id,
            taskKey=f"TASK-{task.id}",
            taskTitle=task.title,
            userId=user.id,
            userName=user.full_name,
            userAvatarUrl=user.avatar_url,
            workDate=logwork.work_date,
            hours=decimal_to_float(logwork.hours_spent),
            title=logwork.title or "",
            note=logwork.work_content,
            progressPercent=decimal_to_float(logwork.progress_percent),
            status=(logwork.status or "PENDING").upper(),
            projectId=task.project_id,
            projectName=selected_project_response.name if selected_project_response else None,
            canApprove=(
                (logwork.status or "PENDING").upper() == "PENDING"
                and user.id != current_user.id
                and perm.can_in_project(db, current_user, "logwork", "approve", task.project_id)
            ),
        )
        for logwork, task, _, user in project_logwork_rows[:6]
    ]

    critical_sprint_count = sum(
        1
        for sprint in sprint_summaries
        if sprint.health == "critical" and sprint.status in {"ACTIVE", "REVIEW"}
    )

    return DashboardOverviewResponse(
        dataScope=resolve_data_scope(current_user),
        project=selected_project_response,
        portfolioProgress=portfolio_progress,
        projectProgress=project_progress,
        activeSprintProgress=active_sprint.actualProgress if active_sprint else 0,
        estimatedHoursTotal=estimated_hours_total,
        estimatedHoursDone=estimated_hours_done,
        estimatedHoursRemaining=estimated_hours_remaining,
        logworkCoverage=logwork_coverage,
        memberCount=len(member_user_ids),
        membersLoggedToday=members_logged_today,
        criticalAlerts=overdue_count + critical_sprint_count,
        projectsInScope=len(accessible_project_responses),
        openTasksInScope=open_tasks_in_scope,
        taskSummary=DashboardTaskSummaryResponse(
            todo=task_counts["todo"],
            inProgress=task_counts["in_progress"],
            done=task_counts["done"],
            total=len(leaf_tasks),
            overdue=overdue_count,
        ),
        activeSprint=active_sprint,
        sprintSummaries=sprint_summaries,
        overdueTasks=[
            _build_task_preview(
                task,
                assignee_by_task_id.get(task.id, {}).get("name"),
                sprint_by_id[task.sprint_id].name if task.sprint_id in sprint_by_id else None,
            )
            for task in overdue_tasks
        ],
        activeTasks=[
            _build_task_preview(
                task,
                assignee_by_task_id.get(task.id, {}).get("name"),
                sprint_by_id[task.sprint_id].name if task.sprint_id in sprint_by_id else None,
            )
            for task in active_tasks
        ],
        workloadBoard=workload_board,
        recentLogwork=recent_logwork,
    )


TREND_DAYS = 30


def _build_trend(leaf_tasks, approved_logworks, today) -> list[DashboardTrendPointResponse]:
    """Daily created/completed/open leaf tasks and approved logwork hours for the last TREND_DAYS."""
    days = [today - timedelta(days=offset) for offset in range(TREND_DAYS - 1, -1, -1)]
    created_by_day: dict = defaultdict(int)
    completed_by_day: dict = defaultdict(int)
    hours_by_day: dict = defaultdict(float)

    created_dates = []
    completed_dates = []
    for task in leaf_tasks:
        created_on = (task.created_at or task.start_date)
        created_on = created_on.date() if isinstance(created_on, datetime) else created_on
        created_dates.append(created_on)
        completed_on = None
        if normalize_task_status(task.status) == "done":
            completed_on = task.completed_at or task.updated_at
            completed_on = completed_on.date() if isinstance(completed_on, datetime) else completed_on
        completed_dates.append(completed_on)
        if created_on:
            created_by_day[created_on] += 1
        if completed_on:
            completed_by_day[completed_on] += 1

    for logwork, _, _, _ in approved_logworks:
        hours_by_day[logwork.work_date] += decimal_to_float(logwork.hours_spent)

    points = []
    for day in days:
        open_tasks = sum(
            1
            for created_on, completed_on in zip(created_dates, completed_dates)
            if created_on and created_on <= day and not (completed_on and completed_on <= day)
        )
        points.append(
            DashboardTrendPointResponse(
                date=day,
                created=created_by_day.get(day, 0),
                completed=completed_by_day.get(day, 0),
                openTasks=open_tasks,
                loggedHours=round(hours_by_day.get(day, 0.0), 1),
            )
        )
    return points


def get_global_overview(db: Session, current_user: User) -> GlobalDashboardOverviewResponse:

    accessible_projects = _load_accessible_projects(db, current_user)
    project_ids = [p.id for p in accessible_projects]

    if not project_ids:
        return GlobalDashboardOverviewResponse(dataScope=resolve_data_scope(current_user))

    # Pre-fetch all tasks
    all_tasks = _load_scoped_tasks(db, current_user, project_ids)
    tasks_by_project = defaultdict(list)
    for t in all_tasks:
        tasks_by_project[t.project_id].append(t)

    global_todo = 0
    global_in_progress = 0
    global_done = 0
    global_total = 0
    global_overdue = 0

    project_healths = []
    upcoming_deadlines = []
    global_overdue_tasks_list = []
    global_completed_tasks_list = []
    today = datetime.now(timezone.utc).date()
    upcoming_until = today + timedelta(days=7)
    priority_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    estimated_total = 0.0
    estimated_done = 0.0
    all_leaf_tasks = []

    for project in accessible_projects:
        project_tasks = tasks_by_project[project.id]
        leaf_tasks = list_leaf_tasks(project_tasks)
        counts = count_task_statuses(leaf_tasks)

        global_todo += counts["todo"]
        global_in_progress += counts["in_progress"]
        global_done += counts["done"]
        global_total += len(leaf_tasks)
        all_leaf_tasks.extend(leaf_tasks)

        overdue_list = list_overdue_tasks(leaf_tasks)
        global_overdue += len(overdue_list)
        for ot in overdue_list:
            global_overdue_tasks_list.append((ot, project))

        project_logworks = task_repository.list_project_logworks(db, project.id)
        progress = calculate_progress_percent(
            project_tasks, build_task_progress_map(project_logworks)
        )

        health = "on-track"
        if progress < 20 and len(overdue_list) > 0:
            health = "critical"
        elif len(overdue_list) > 0:
            health = "watch"

        project_healths.append(
            ProjectHealthPreviewResponse(
                id=project.id,
                name=project.name,
                code=f"PRJ-{project.id:03d}",
                status=to_frontend_status(project.status or "active"),
                progress=progress,
                totalTasks=len(leaf_tasks),
                doneCount=counts["done"],
                inProgressCount=counts["in_progress"],
                todoCount=counts["todo"],
                overdueCount=len(overdue_list),
                health=health,
            )
        )

        for task in leaf_tasks:
            status_norm = normalize_task_status(task.status)
            estimate = decimal_to_float(task.estimated_hours)
            if estimate > 0:
                estimated_total += estimate
                if status_norm == "done":
                    estimated_done += estimate
            if status_norm == "done":
                global_completed_tasks_list.append((task, project))
                continue
            priority_key = (task.priority or "medium").strip().lower()
            priority_counts[priority_key if priority_key in priority_counts else "medium"] += 1
            if not task.deadline:
                continue
            # Upcoming window: due today..+7 days (exclude overdue)
            if today <= task.deadline <= upcoming_until:
                upcoming_deadlines.append((task, project))

    global_logwork_rows = _filter_logwork_rows(
        db,
        current_user,
        task_repository.list_project_logworks_with_context(db, project_ids=project_ids),
    )
    project_name_by_id = {p.id: p.name for p in accessible_projects}
    can_approve_by_project: dict[int, bool] = {}

    def can_manage(project_id: int) -> bool:
        if project_id not in can_approve_by_project:
            can_approve_by_project[project_id] = perm.can_in_project(
                db, current_user, "logwork", "approve", project_id
            )
        return can_approve_by_project[project_id]

    pending_count = 0
    pending_hours = 0.0
    for logwork, task, _, row_user in global_logwork_rows:
        if (
            (logwork.status or "PENDING").upper() == "PENDING"
            and row_user.id != current_user.id
            and can_manage(task.project_id)
        ):
            pending_count += 1
            pending_hours += decimal_to_float(logwork.hours_spent)

    recent_logworks = []
    for logwork, task, _, user in global_logwork_rows[:10]:
        status = (logwork.status or "PENDING").upper()
        can_approve = (
            status == "PENDING" and user.id != current_user.id and can_manage(task.project_id)
        )
        recent_logworks.append(
            DashboardRecentLogworkResponse(
                id=logwork.id,
                taskId=task.id,
                taskKey=f"TASK-{task.id}",
                taskTitle=task.title,
                userId=user.id,
                userName=user.full_name,
                userAvatarUrl=user.avatar_url,
                workDate=logwork.work_date,
                hours=decimal_to_float(logwork.hours_spent),
                title=logwork.title or "",
                note=logwork.work_content,
                progressPercent=decimal_to_float(logwork.progress_percent),
                status=status,
                projectId=task.project_id,
                projectName=project_name_by_id.get(task.project_id),
                canApprove=can_approve,
            )
        )

    approved_logworks = [
        row for row in global_logwork_rows if (row[0].status or "").upper() == "APPROVED"
    ]

    # Assignees for every leaf task (used by task previews and the workload panel)
    assignee_rows = task_repository.list_task_assignee_users(
        db, [task.id for task in all_leaf_tasks]
    )
    assignee_by_task_id = {
        task_id: {"user_id": user_id, "name": full_name}
        for task_id, user_id, full_name, _, _ in assignee_rows
    }

    # Active sprints across accessible projects (approved hours only)
    task_ids_by_sprint: dict[int, list] = defaultdict(list)
    for task in all_tasks:
        if task.sprint_id is not None:
            task_ids_by_sprint[task.sprint_id].append(task)
    hours_by_task_id: dict[int, float] = defaultdict(float)
    for logwork, task, _, _ in approved_logworks:
        hours_by_task_id[task.id] += decimal_to_float(logwork.hours_spent)

    active_sprints: list[DashboardSprintSummaryResponse] = []
    for sprint in sprint_repository.list_sprints(db, project_ids_subquery=project_ids):
        sprint_status = _normalize_sprint_status(sprint.status)
        if sprint_status not in {"ACTIVE", "REVIEW"}:
            continue
        sprint_tasks = task_ids_by_sprint.get(sprint.id, [])
        sprint_counts = count_task_statuses(sprint_tasks)
        actual_progress = calculate_progress_percent(sprint_tasks)
        planned_progress = calculate_elapsed_progress(sprint.start_date, sprint.end_date)
        active_sprints.append(
            DashboardSprintSummaryResponse(
                id=sprint.id,
                name=sprint.name,
                status=sprint_status,
                goal=sprint.goal,
                startDate=sprint.start_date,
                endDate=sprint.end_date,
                plannedProgress=planned_progress,
                actualProgress=actual_progress,
                totalTasks=len(list_leaf_tasks(sprint_tasks)),
                todoCount=sprint_counts["todo"],
                inProgressCount=sprint_counts["in_progress"],
                doneCount=sprint_counts["done"],
                estimatedHours=sum_estimated_hours(sprint_tasks),
                loggedHours=round(sum(hours_by_task_id.get(t.id, 0.0) for t in sprint_tasks), 1),
                health=resolve_health_tone(actual_progress, planned_progress, sprint.status),
                projectId=sprint.project_id,
                projectName=project_name_by_id.get(sprint.project_id),
            )
        )
    active_sprints.sort(key=lambda item: item.endDate)

    # Workload per assignee across the whole scope (approved hours only)
    tasks_by_user: dict[int, list] = defaultdict(list)
    for task in all_leaf_tasks:
        assignee = assignee_by_task_id.get(task.id)
        if assignee:
            tasks_by_user[assignee["user_id"]].append(task)
    logged_by_user: dict[int, float] = defaultdict(float)
    for logwork, _, _, user in approved_logworks:
        logged_by_user[user.id] += decimal_to_float(logwork.hours_spent)
    workload_users = {
        user.id: user
        for user in db.query(User).filter(User.id.in_(list(tasks_by_user.keys()))).all()
    } if tasks_by_user else {}

    global_workload: list[DashboardWorkloadMemberResponse] = []
    for user_id, user_tasks in tasks_by_user.items():
        user = workload_users.get(user_id)
        if not user:
            continue
        counts = count_task_statuses(user_tasks)
        global_workload.append(
            DashboardWorkloadMemberResponse(
                userId=user.id,
                name=user.full_name,
                email=user.email,
                roleName=user.role or "",
                assignedTasks=len(user_tasks),
                todoTasks=counts["todo"],
                inProgressTasks=counts["in_progress"],
                doneTasks=counts["done"],
                overdueTasks=count_overdue_tasks(user_tasks),
                estimatedHours=sum_estimated_hours(user_tasks),
                loggedHours=round(logged_by_user.get(user.id, 0.0), 1),
                progress=calculate_progress_percent(user_tasks),
                avatarUrl=user.avatar_url,
            )
        )
    global_workload.sort(
        key=lambda item: (-(item.todoTasks + item.inProgressTasks), -item.overdueTasks, item.name)
    )

    def preview(task, project):
        assignee = assignee_by_task_id.get(task.id)
        return _build_task_preview(task, assignee["name"] if assignee else None, None, project)

    upcoming_deadlines.sort(key=lambda item: item[0].deadline)
    top_upcoming = upcoming_deadlines[:10]

    global_overdue_tasks_list.sort(key=lambda item: item[0].deadline)
    top_overdue = global_overdue_tasks_list[:50]

    global_completed_tasks_list.sort(key=lambda item: item[0].id, reverse=True)
    top_completed = global_completed_tasks_list[:50]

    task_summary = DashboardTaskSummaryResponse(
        todo=global_todo,
        inProgress=global_in_progress,
        done=global_done,
        total=global_total,
        overdue=global_overdue,
    )

    return GlobalDashboardOverviewResponse(
        dataScope=resolve_data_scope(current_user),
        totalProjects=len(accessible_projects),
        activeProjects=sum(
            1
            for p in accessible_projects
            if to_frontend_status(p.status or "active") not in {"ON_HOLD", "COMPLETED"}
        ),
        completedProjects=sum(
            1
            for p in accessible_projects
            if to_frontend_status(p.status or "") == "COMPLETED"
        ),
        taskSummary=task_summary,
        projectHealths=project_healths,
        globalWorkload=global_workload,
        activeSprints=active_sprints,
        upcomingDeadlines=[preview(t, p) for t, p in top_upcoming],
        overdueTasks=[preview(t, p) for t, p in top_overdue],
        completedTasks=[preview(t, p) for t, p in top_completed],
        recentLogworks=recent_logworks,
        overallProgress=round(estimated_done / estimated_total * 100) if estimated_total else 0,
        projectStatusCounts=dict(
            Counter(to_frontend_status(p.status or "active") for p in accessible_projects)
        ),
        priorityBreakdown=DashboardPriorityBreakdownResponse(**priority_counts),
        dueSoonCount=len(upcoming_deadlines),
        pendingLogworkCount=pending_count,
        pendingLogworkHours=round(pending_hours, 1),
        trend=_build_trend(all_leaf_tasks, approved_logworks, today),
    )
