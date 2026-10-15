"""Backfill một lần: chuyển logwork trực tiếp của task cha sang task con "Phần đã thực hiện".

Nghiệp vụ mới: task cha chỉ là node tổng hợp, logwork phải nằm ở task lá. Dữ liệu cũ có thể
còn logwork gắn thẳng vào task đã có con (giờ này bị rollup bỏ qua). Script tìm các task đó
và áp dụng cùng logic với `task_service.migrate_parent_logworks`.

Dùng: python -m scripts.migrate_parent_logworks [--dry-run]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func  # noqa: E402

from app.core.connection import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402,F401  (nạp đủ model)
from app.models.logworks import LogWork  # noqa: E402
from app.models.task_model import Task  # noqa: E402
from app.services import task_service  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Chỉ liệt kê, không ghi DB")
    args = parser.parse_args()

    with SessionLocal() as db:
        child_parent_ids = db.query(Task.parent_task_id).filter(Task.parent_task_id.isnot(None))
        rows = (
            db.query(Task, func.count(LogWork.id), func.coalesce(func.sum(LogWork.hours_spent), 0))
            .join(LogWork, LogWork.task_id == Task.id)
            .filter(Task.id.in_(child_parent_ids))
            .group_by(Task.id)
            .all()
        )

        if not rows:
            print("[migrate-parent-logworks] Không có task cha nào giữ logwork trực tiếp.")
            return 0

        for task, count, hours in rows:
            print(f"- TASK-{task.id} '{task.title}': {count} logwork, {float(hours):g}h")
            if not args.dry_run:
                task_service.migrate_parent_logworks(
                    db, task, task.created_by_member_id, already_parent=True
                )

        if args.dry_run:
            print(f"[migrate-parent-logworks] Dry-run: {len(rows)} task sẽ được xử lý.")
            return 0

        db.commit()
        print(f"[migrate-parent-logworks] Đã xử lý {len(rows)} task.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
