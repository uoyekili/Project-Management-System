"""users.avatar_url: lưu tên blob Azure, mặc định default.png

Revision ID: 0002_user_avatar_default
Revises: 0001_initial
Create Date: 2026-10-08 16:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import mysql

revision: str = "0002_user_avatar_default"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill: user chưa có avatar (hoặc còn base64 cũ) dùng ảnh mặc định.
    op.execute(
        "UPDATE users SET avatar_url = 'default.png' "
        "WHERE avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE 'data:%'"
    )
    op.alter_column(
        "users",
        "avatar_url",
        existing_type=mysql.LONGTEXT(),
        type_=sa.String(255),
        nullable=False,
        server_default="default.png",
    )


def downgrade() -> None:
    # Dữ liệu avatar đã chuẩn hóa không khôi phục được; chỉ nới lại kiểu cột.
    op.alter_column(
        "users",
        "avatar_url",
        existing_type=sa.String(255),
        type_=mysql.LONGTEXT(),
        nullable=True,
        server_default=None,
    )
