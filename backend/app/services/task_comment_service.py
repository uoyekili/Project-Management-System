import re

from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core import permissions as perm
from app.models.notification_model import Notification
from app.models.task_comment_model import TaskComment
from app.models.task_model import Task
from app.models.user_model import User
from app.utils.project_helpers import user_can_access_project

# Thành viên được tag: `@[Tên hiển thị](usr-12)`
MENTION_PATTERN = re.compile(r"@\[([^\]]{1,100})\]\(usr-(\d+)\)")
MAX_COMMENT_LENGTH = 5000


def list_comments(db: Session, task_id: int) -> list[TaskComment]:
    return (
        db.query(TaskComment)
        .filter(TaskComment.task_id == task_id)
        .order_by(desc(TaskComment.created_at), desc(TaskComment.id))
        .all()
    )


def extract_mentioned_user_ids(content: str) -> set[int]:
    return {int(user_id) for _name, user_id in MENTION_PATTERN.findall(content)}


def _validate_content(content: str) -> str:
    text = content.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Nội dung bình luận không được trống."
        )
    if len(text) > MAX_COMMENT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bình luận tối đa {MAX_COMMENT_LENGTH} ký tự.",
        )
    return text


def create_comment(db: Session, task: Task, author: User, content: str) -> TaskComment:
    text = _validate_content(content)

    comment = TaskComment(task_id=task.id, user_id=author.id, content=text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def update_comment(
    db: Session, task: Task, comment_id: int, actor: User, content: str
) -> tuple[TaskComment, set[int]]:
    """Chỉ tác giả được sửa. Trả về bình luận và tập user mới được tag (chưa có trong nội dung cũ)."""
    comment = (
        db.query(TaskComment)
        .filter(TaskComment.id == comment_id, TaskComment.task_id == task.id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bình luận.")
    if comment.user_id != actor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chỉ có thể sửa bình luận của mình."
        )
    text = _validate_content(content)
    newly_mentioned = extract_mentioned_user_ids(text) - extract_mentioned_user_ids(comment.content)
    comment.content = text
    db.commit()
    db.refresh(comment)
    return comment, newly_mentioned


def notify_mentioned_users(
    db: Session,
    *,
    task: Task,
    comment: TaskComment,
    author: User,
    only_user_ids: set[int] | None = None,
) -> list[Notification]:
    """Tạo thông báo TASK_MENTIONED cho người được tag (bỏ qua chính tác giả
    và những người không có quyền truy cập dự án của task). `only_user_ids` giới hạn
    danh sách người nhận (dùng khi sửa: chỉ báo người mới được tag)."""
    notifications: list[Notification] = []
    snippet = MENTION_PATTERN.sub(lambda match: f"@{match.group(1)}", comment.content)
    snippet = snippet if len(snippet) <= 120 else f"{snippet[:117]}..."

    for user_id in extract_mentioned_user_ids(comment.content):
        if only_user_ids is not None and user_id not in only_user_ids:
            continue
        if user_id == author.id:
            continue
        mentioned = db.query(User).filter(User.id == user_id).first()
        if not mentioned or not user_can_access_project(db, task.project_id, mentioned):
            continue

        notification = Notification(
            user_id=user_id,
            type="TASK_MENTIONED",
            title=f"{author.full_name} đã nhắc đến bạn",
            content=f'Trong bình luận ở công việc "{task.title}": {snippet}',
            link=f"/tasks/{task.id}",
        )
        db.add(notification)
        notifications.append(notification)

    if notifications:
        db.commit()
        for notification in notifications:
            db.refresh(notification)
    return notifications


def delete_comment(db: Session, task: Task, comment_id: int, actor: User) -> None:
    comment = (
        db.query(TaskComment)
        .filter(TaskComment.id == comment_id, TaskComment.task_id == task.id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bình luận.")
    if comment.user_id != actor.id and not perm.can_in_project(db, actor, "task", "update", task.project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xoá bình luận này."
        )
    db.delete(comment)
    db.commit()
