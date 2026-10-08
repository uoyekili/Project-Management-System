from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.services.azure_blob_service import avatar_public_url


class IdName(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class NamedItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tên không được để trống.")
        return v


class NamedItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None


class DepartmentCreate(NamedItemCreate):
    name: str = Field(min_length=1, max_length=255)


class DepartmentUpdate(NamedItemUpdate):
    name: Optional[str] = Field(default=None, max_length=255)


class DepartmentItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    member_count: int = 0


class JobTitleItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    user_count: int = 0


class PermissionItem(BaseModel):
    id: int
    code: str
    resource: str
    action: str
    scope: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleCreate(NamedItemCreate):
    permission_ids: List[int] = []


class RoleUpdate(NamedItemUpdate):
    pass


class RolePermissionsUpdate(BaseModel):
    permission_ids: List[int]


class RoleItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_system: bool
    permission_ids: List[int] = []
    permission_codes: List[str] = []
    usage_count: int = 0


class AdminUserItem(BaseModel):
    id: int
    full_name: str
    email: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("avatar_url", mode="before")
    @classmethod
    def to_public_avatar_url(cls, v):
        return avatar_public_url(v)

    is_active: bool
    is_admin: bool = False
    department: Optional[IdName] = None
    job_title: Optional[IdName] = None
    role: Optional[IdName] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserList(BaseModel):
    items: List[AdminUserItem]
    total: int
    page: int
    pageSize: int
    totalPages: int


class AdminUserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone_number: Optional[str] = None
    department_id: Optional[int] = None
    job_title_id: Optional[int] = None
    role_id: int


class AdminUserUpdate(BaseModel):
    """Chỉ field có trong body mới được cập nhật (dùng exclude_unset)."""

    full_name: Optional[str] = Field(default=None, max_length=255)
    phone_number: Optional[str] = None
    department_id: Optional[int] = None
    job_title_id: Optional[int] = None
    role_id: Optional[int] = None


class AdminUserStatus(BaseModel):
    is_active: bool


class AdminUserCreated(AdminUserItem):
    """Kết quả cấp tài khoản: kèm mật khẩu tạm sinh ngẫu nhiên (chỉ hiển thị một lần)."""

    temporary_password: str


class AdminPasswordReset(BaseModel):
    temporary_password: str


class DepartmentMembersAdd(BaseModel):
    user_ids: List[int]


class CountItem(BaseModel):
    label: str
    count: int


class AdminDashboard(BaseModel):
    total_users: int
    active_users: int
    locked_users: int
    total_departments: int
    total_roles: int
    unassigned_users: int
    users_by_department: List[CountItem]
    users_by_role: List[CountItem]


class RoleMember(BaseModel):
    id: int
    full_name: str
    email: str
    is_active: bool
    department: Optional[str] = None
    job_title: Optional[str] = None
