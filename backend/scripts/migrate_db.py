"""One-shot Alembic migration for the Docker Compose db-migrate service.

Chuỗi migration đã được gom thành một revision initial duy nhất, nên mọi database
(trống hoặc đã ở head) chỉ cần `alembic upgrade head`.

Database cũ (còn bảng của schema trước khi làm lại RBAC) cần được tạo lại:
`docker compose -f docker-compose.dev.yml down -v`.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect

# Ensure /app wins over any site-packages stub package.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402


def _run_alembic(*args: str) -> None:
    subprocess.run(["alembic", *args], cwd=BACKEND_ROOT, check=True)


def _has_legacy_schema(engine) -> bool:
    tables = set(inspect(engine).get_table_names())
    return "users" in tables and "alembic_version" not in tables


def main() -> int:
    engine = create_engine(get_settings().database_url)

    if _has_legacy_schema(engine):
        print(
            "[db-migrate] Phát hiện schema cũ (không có alembic_version). "
            "Hãy tạo lại database: docker compose -f docker-compose.dev.yml down -v",
            file=sys.stderr,
        )
        return 1

    print("[db-migrate] Running alembic upgrade head...")
    _run_alembic("upgrade", "head")
    print("[db-migrate] Migrations complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
