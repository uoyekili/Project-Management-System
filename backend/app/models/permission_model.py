from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text

from app.core.connection import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "permission_id",
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    code = Column(String(100), nullable=False, unique=True)  # resource.action:SCOPE
    resource = Column(String(50), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    scope = Column(String(20), nullable=False)  # OWN | PROJECT | ALL
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
