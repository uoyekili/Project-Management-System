from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.connection import get_db
from app.core.dependencies import get_current_user
from app.models.user_model import User
from app.schemas.user_schema import (
    DepartmentResponse,
    PaginatedUsersResponse,
    UpdatePhone,
    UpdateProfile,
    UserProfile,
)
from app.services import department_service, user_service
from app.services import azure_blob_service as blob
from app.services.azure_blob_service import MAX_AVATAR_BYTES, AvatarStorageError

router = APIRouter(tags=["User"])


@router.get("/me", response_model=UserProfile)
def profile(current_user: User = Depends(get_current_user)):
    return UserProfile.model_validate(current_user)


@router.put("/me/phone", response_model=UserProfile)
def update_phone(
    data: UpdatePhone,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.update_phone(db, current_user, data)


@router.put("/me/profile", response_model=UserProfile)
def update_profile(
    data: UpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.update_profile(db, current_user, data)


@router.put("/me/avatar", response_model=UserProfile)
async def update_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Đọc tối đa MAX+1 byte để từ chối file quá lớn mà không nạp cả file vào bộ nhớ.
    data = await file.read(MAX_AVATAR_BYTES + 1)
    return user_service.update_avatar(db, current_user, data)


@router.delete("/me/avatar", response_model=UserProfile)
def reset_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.reset_avatar(db, current_user)


@router.get("/api/avatars/{blob_name:path}", include_in_schema=False)
def get_avatar(blob_name: str):
    """Phục vụ ảnh đại diện từ Azure (container private). Không cần đăng nhập vì <img> không gửi
    token; tên ảnh của user chứa uuid ngẫu nhiên."""
    if not blob.is_valid_avatar_blob(blob_name):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ảnh.")
    try:
        found = blob.azure_blob_service.read_avatar(blob_name)
    except AvatarStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy ảnh.")
    data, content_type = found
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": blob.AVATAR_CACHE_CONTROL if blob_name != blob.DEFAULT_AVATAR_BLOB else "public, max-age=3600"},
    )


@router.get("/api/departments", response_model=list[DepartmentResponse])
def get_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return department_service.get_departments(db)


@router.get("/api/users", response_model=PaginatedUsersResponse)
def get_users(
    search: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    role: str = Query(None),
    department: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    users, total, total_pages = user_service.get_users(
        db=db,
        current_user=current_user,
        search=search,
        status_filter=status_filter,
        role=role,
        department=department,
        page=page,
        page_size=page_size,
    )
    return {
        "items": users,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }
