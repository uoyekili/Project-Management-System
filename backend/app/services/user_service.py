from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_model import User
from app.repositories import user_repository
from app.schemas.user_schema import UpdatePhone, UpdateProfile
from app.services.azure_blob_service import (
    DEFAULT_AVATAR_BLOB,
    MAX_AVATAR_BYTES,
    AvatarStorageError,
    azure_blob_service,
    sniff_image,
)
from app.utils.project_helpers import list_team_directory_visible_user_ids


def update_phone(db: Session, current_user: User, data: UpdatePhone) -> User:
    phone = data.phone_number.strip() if data.phone_number else None

    if phone and (len(phone) < 10 or len(phone) > 11):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại không hợp lệ",
        )

    current_user.phone_number = phone
    current_user.updated_at = datetime.now(timezone.utc)
    return user_repository.commit_and_refresh(db, current_user)


def update_profile(db: Session, current_user: User, data: UpdateProfile) -> User:
    if data.name is not None:
        current_user.full_name = data.name

    current_user.updated_at = datetime.now(timezone.utc)
    return user_repository.commit_and_refresh(db, current_user)


def _set_avatar(db: Session, user: User, blob_name: str) -> User:
    previous = user.avatar_url
    user.avatar_url = blob_name
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    # Chỉ xóa ảnh cũ sau khi DB đã trỏ sang ảnh mới.
    azure_blob_service.delete_avatar(previous)
    return user


def update_avatar(db: Session, current_user: User, data: bytes) -> User:
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chưa chọn ảnh.")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Ảnh đại diện tối đa 2 MB.",
        )
    image = sniff_image(data)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.",
        )
    mime, extension = image
    try:
        blob_name = azure_blob_service.upload_avatar(current_user.id, data, mime, extension)
    except AvatarStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return _set_avatar(db, current_user, blob_name)


def reset_avatar(db: Session, current_user: User) -> User:
    return _set_avatar(db, current_user, DEFAULT_AVATAR_BLOB)


def get_users(
    db: Session,
    current_user: User,
    search: str | None = None,
    status_filter: str | None = None,
    role: str | None = None,
    department: str | None = None,
    page: int = 1,
    page_size: int = 10,
):
    visible_user_ids = list_team_directory_visible_user_ids(db, current_user)

    return user_repository.get_users(
        db=db,
        search=search,
        status=status_filter,
        role=role,
        department=department,
        user_ids=visible_user_ids,
        page=page,
        page_size=page_size,
    )
