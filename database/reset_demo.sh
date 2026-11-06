#!/usr/bin/env bash
# Xóa dữ liệu nghiệp vụ và nạp lại bộ dữ liệu demo vào MySQL của stack đang chạy.
# Giữ nguyên roles, permissions, role_permissions và alembic_version.
#
# Dùng: bash database/reset_demo.sh [tên-container-mysql]
#   mặc định taskflow-prod-mysql-1
set -euo pipefail

CONTAINER="${1:-taskflow-prod-mysql-1}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL="$DIR/backup.sql"

[ -f "$SQL" ] || { echo "Không thấy $SQL, hãy chạy generate_demo.py trước" >&2; exit 1; }

run_mysql() {
  docker exec -i "$CONTAINER" sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"'
}

echo "Xóa dữ liệu nghiệp vụ trong $CONTAINER"
run_mysql <<'SQL'
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE logworks;
TRUNCATE TABLE task_comments;
TRUNCATE TABLE task_attachments;
TRUNCATE TABLE task_assignees;
TRUNCATE TABLE tasks;
TRUNCATE TABLE sprints;
TRUNCATE TABLE project_members;
TRUNCATE TABLE projects;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE users;
TRUNCATE TABLE job_titles;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;
SQL

echo "Nạp dữ liệu demo, bỏ qua khối RBAC"
sed '/^-- RBAC-BEGIN/,/^-- RBAC-END/d' "$SQL" | run_mysql

echo "Xóa cache Redis"
REDIS="${CONTAINER%mysql-1}redis-1"
docker exec "$REDIS" redis-cli FLUSHALL >/dev/null 2>&1 || echo "Bỏ qua Redis, không truy cập được $REDIS"

echo "Xong."
