from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.connection import Base
from app.models import department_model, job_title_model, role_model  # noqa: F401
from app.services.azure_blob_service import DEFAULT_AVATAR_BLOB


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, nullable=False, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone_number = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    # Tên blob trong Azure container (mặc định default.png); URL công khai dựng ở tầng schema.
    avatar_url = Column(
        String(255), nullable=False, default=DEFAULT_AVATAR_BLOB, server_default=DEFAULT_AVATAR_BLOB
    )
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    job_title_id = Column(Integer, ForeignKey("job_titles.id"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    department = relationship("Department")
    job_title = relationship("JobTitle")
    role_ref = relationship("Role")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def role(self) -> str:
        return self.role_ref.name if self.role_ref else ""

    @property
    def permissions(self) -> list[str]:
        return sorted(self.role_ref.permission_codes) if self.role_ref else []

    @property
    def is_admin(self) -> bool:
        return "admin.access:ALL" in self.permissions
