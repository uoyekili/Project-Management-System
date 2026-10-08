from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.connection import get_db
from app.core.permissions import require_permission
from app.models.user_model import User
from app.schemas import admin_schema as s
from app.services import admin_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])



@router.get("/dashboard", response_model=s.AdminDashboard)
def dashboard(
    _: User = Depends(require_permission("admin.access:ALL")), db: Session = Depends(get_db)
):
    return admin_service.get_dashboard(db)


# ------------------------------------------------------------------ users
@router.get("/users", response_model=s.AdminUserList)
def list_users(
    search: str | None = Query(None),
    department_ids: str | None = Query(None, description="id phòng ban, phân tách bởi dấu phẩy; 'none' = chưa phân bổ"),
    role_ids: str | None = Query(None, description="id role, phân tách bởi dấu phẩy"),
    status_filter: str | None = Query(None, alias="status", description="ACTIVE và/hoặc INACTIVE, phân tách bởi dấu phẩy"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    _: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.list_users(
        db, search, department_ids, role_ids, status_filter, page, page_size
    )


@router.get("/users/{user_id}", response_model=s.AdminUserItem)
def get_user(
    user_id: int,
    _: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.get_user(db, user_id)


@router.post("/users", response_model=s.AdminUserCreated, status_code=status.HTTP_201_CREATED)
def create_user(
    data: s.AdminUserCreate,
    _: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.create_user(db, data)


@router.patch("/users/{user_id}", response_model=s.AdminUserItem)
def update_user(
    user_id: int,
    data: s.AdminUserUpdate,
    actor: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.update_user(db, actor, user_id, data)


@router.patch("/users/{user_id}/status", response_model=s.AdminUserItem)
def set_user_status(
    user_id: int,
    data: s.AdminUserStatus,
    actor: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.set_user_status(db, actor, user_id, data.is_active)


@router.post("/users/{user_id}/reset-password", response_model=s.AdminPasswordReset)
def reset_password(
    user_id: int,
    _: User = Depends(require_permission("user.manage:ALL")),
    db: Session = Depends(get_db),
):
    return s.AdminPasswordReset(temporary_password=admin_service.reset_user_password(db, user_id))


# ------------------------------------------------------------ departments
@router.get("/departments", response_model=list[s.DepartmentItem])
def list_departments(
    _: User = Depends(require_permission("department.manage:ALL")), db: Session = Depends(get_db)
):
    return admin_service.list_departments(db)


@router.post("/departments", response_model=s.DepartmentItem, status_code=status.HTTP_201_CREATED)
def create_department(
    data: s.DepartmentCreate,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.create_department(db, data)


@router.patch("/departments/{department_id}", response_model=s.DepartmentItem)
def update_department(
    department_id: int,
    data: s.DepartmentUpdate,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.update_department(db, department_id, data)


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    admin_service.delete_department(db, department_id)


@router.get("/departments/{department_id}/members", response_model=list[s.AdminUserItem])
def list_department_members(
    department_id: int,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.list_department_members(db, department_id)


@router.post("/departments/{department_id}/members", response_model=list[s.AdminUserItem])
def add_department_members(
    department_id: int,
    data: s.DepartmentMembersAdd,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.add_department_members(db, department_id, data.user_ids)


@router.delete(
    "/departments/{department_id}/members/{user_id}", response_model=list[s.AdminUserItem]
)
def remove_department_member(
    department_id: int,
    user_id: int,
    _: User = Depends(require_permission("department.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.remove_department_member(db, department_id, user_id)


# ------------------------------------------------------------- job titles
@router.get("/job-titles", response_model=list[s.JobTitleItem])
def list_job_titles(
    _: User = Depends(require_permission("admin.access:ALL")), db: Session = Depends(get_db)
):
    return admin_service.list_job_titles(db)


@router.post("/job-titles", response_model=s.JobTitleItem, status_code=status.HTTP_201_CREATED)
def create_job_title(
    data: s.NamedItemCreate,
    _: User = Depends(require_permission("catalog.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.create_job_title(db, data)


@router.patch("/job-titles/{item_id}", response_model=s.JobTitleItem)
def update_job_title(
    item_id: int,
    data: s.NamedItemUpdate,
    _: User = Depends(require_permission("catalog.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.update_job_title(db, item_id, data)


@router.delete("/job-titles/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_title(
    item_id: int,
    _: User = Depends(require_permission("catalog.manage:ALL")),
    db: Session = Depends(get_db),
):
    admin_service.delete_job_title(db, item_id)



# ------------------------------------------------------ roles & permissions
@router.get("/permissions", response_model=list[s.PermissionItem])
def list_permissions(
    _: User = Depends(require_permission("role.manage:ALL")), db: Session = Depends(get_db)
):
    return admin_service.list_permissions(db)


@router.get("/roles", response_model=list[s.RoleItem])
def list_roles(
    _: User = Depends(require_permission("admin.access:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.list_roles(db)


@router.get("/roles/{role_id}/members", response_model=list[s.RoleMember])
def list_role_members(
    role_id: int,
    _: User = Depends(require_permission("admin.access:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.list_role_members(db, role_id)


@router.post("/roles", response_model=s.RoleItem, status_code=status.HTTP_201_CREATED)
def create_role(
    data: s.RoleCreate,
    _: User = Depends(require_permission("role.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.create_role(db, data)


@router.patch("/roles/{role_id}", response_model=s.RoleItem)
def update_role(
    role_id: int,
    data: s.RoleUpdate,
    _: User = Depends(require_permission("role.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.update_role(db, role_id, data)


@router.put("/roles/{role_id}/permissions", response_model=s.RoleItem)
def set_role_permissions(
    role_id: int,
    data: s.RolePermissionsUpdate,
    actor: User = Depends(require_permission("role.manage:ALL")),
    db: Session = Depends(get_db),
):
    return admin_service.set_role_permissions(db, actor, role_id, data.permission_ids)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    _: User = Depends(require_permission("role.manage:ALL")),
    db: Session = Depends(get_db),
):
    admin_service.delete_role(db, role_id)
