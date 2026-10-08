import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, dashboard, logworks, notifications, projects, sprints, tasks, users
from app.core.config import get_settings
from app.core.connection import SessionLocal
from app.core.permission_sync import sync_catalog

logger = logging.getLogger(__name__)

settings = get_settings()
cors_origin_regex = (
    r"^https?://[^/]+(?::\d+)?$"
    if settings.environment.strip().lower() == "development"
    else (settings.cors_origin_regex.strip() or None)
)



@asynccontextmanager
async def lifespan(_: FastAPI):
    # Đồng bộ catalog permission (resource.action:scope) vào DB; Admin vẫn toàn quyền cấu hình role.
    try:
        with SessionLocal() as db:
            sync_catalog(db)
    except Exception:  # DB chưa migrate: không chặn khởi động
        logger.exception("Không đồng bộ được catalog permission")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(projects.router)
app.include_router(dashboard.router)
app.include_router(tasks.router)
app.include_router(tasks.router_root)
app.include_router(sprints.router)
app.include_router(sprints.router_root)
app.include_router(logworks.router)
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
