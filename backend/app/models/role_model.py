from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.connection import Base
from app.models.permission_model import Permission, role_permissions


class Role(Base):
    """Role của user; mỗi user có đúng một role, quyền cấu hình qua role_permissions."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=True,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    permissions = relationship(Permission, secondary=role_permissions, lazy="selectin")

    @property
    def permission_codes(self) -> set[str]:
        return {permission.code for permission in self.permissions}
