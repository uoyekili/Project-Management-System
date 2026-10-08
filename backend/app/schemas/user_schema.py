from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.services.azure_blob_service import avatar_public_url


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class DepartmentResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    department: str | None = None
    department_id: int | None = None
    job_title: str | None = None
    role: str
    permissions: List[str] = []
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator("avatar_url", mode="before")
    @classmethod
    def to_public_avatar_url(cls, v):
        return avatar_public_url(v)

    @field_validator("department", "job_title", mode="before")
    @classmethod
    def extract_name(cls, v):
        if v and hasattr(v, "name"):
            return v.name
        return v


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class UpdatePhone(BaseModel):
    phone_number: str


class UpdateProfile(BaseModel):
    name: Optional[str] = None


class PaginatedUsersResponse(BaseModel):
    items: List[UserProfile]
    total: int
    page: int
    pageSize: int
    totalPages: int
