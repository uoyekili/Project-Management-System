"""làm phẳng task dự án Kanban (agile), bỏ sprint khỏi task dự án Waterfall

Quy tắc: Kanban không có task cha/con; Waterfall không dùng sprint.
Task cha của dự án Kanban (nhóm WBS) bị xóa nếu không còn dữ liệu phụ thuộc
(logwork, người được giao, đính kèm, bình luận); task con trở thành task thường.

Revision ID: 0003_flatten_kanban_tasks
Revises: 0002_user_avatar_default
Create Date: 2026-10-08 17:00:00
"""
import logging
from typing import Sequence, Union

from alembic import op

revision: str = "0003_flatten_kanban_tasks"
down_revision: Union[str, Sequence[str], None] = "0002_user_avatar_default"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger("alembic.runtime.migration")

AGILE = "(SELECT id FROM projects WHERE LOWER(project_type) = 'agile')"
WATERFALL = "(SELECT id FROM projects WHERE LOWER(project_type) = 'waterfall')"


def upgrade() -> None:
    bind = op.get_bind()

    def run(label: str, sql: str) -> None:
        logger.info("%s: %s dòng", label, bind.exec_driver_sql(sql).rowcount)

    # 1. Task cha của dự án Kanban không còn dữ liệu phụ thuộc -> sẽ xóa.
    bind.exec_driver_sql("DROP TEMPORARY TABLE IF EXISTS _kanban_parents")
    bind.exec_driver_sql(
        f"""
        CREATE TEMPORARY TABLE _kanban_parents AS
        SELECT DISTINCT p.id
        FROM tasks p
        JOIN tasks c ON c.parent_task_id = p.id
        WHERE p.project_id IN {AGILE}
          AND NOT EXISTS (SELECT 1 FROM logworks x WHERE x.task_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM task_attachments x WHERE x.task_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM task_comments x WHERE x.task_id = p.id)
        """
    )

    # 2. Gỡ liên kết cha của mọi task thuộc dự án Kanban (trước khi xóa để không vướng FK).
    run(
        "Gỡ parent_task_id (Kanban)",
        f"UPDATE tasks SET parent_task_id = NULL "
        f"WHERE parent_task_id IS NOT NULL AND project_id IN {AGILE}",
    )

    # 3. Xóa các task cha đã xác định.
    run("Xóa task cha (Kanban)", "DELETE FROM tasks WHERE id IN (SELECT id FROM _kanban_parents)")
    bind.exec_driver_sql("DROP TEMPORARY TABLE _kanban_parents")

    # 4. Waterfall không dùng sprint.
    run(
        "Gỡ sprint_id (Waterfall)",
        f"UPDATE tasks SET sprint_id = NULL WHERE sprint_id IS NOT NULL AND project_id IN {WATERFALL}",
    )


def downgrade() -> None:
    # Task đã xóa / liên kết đã gỡ không khôi phục được.
    pass
