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


def create_comment(db: Session, task: Task, author: User, content: str) -> TaskComment:
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

    comment = TaskComment(task_id=task.id, user_id=author.id, content=text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def notify_mentioned_users(
    db: Session, *, task: Task, comment: TaskComment, author: User
) -> list[Notification]:
    """Tạo thông báo TASK_MENTIONED cho người được tag (bỏ qua chính tác giả
    và những người không có quyền truy cập dự án của task)."""
    notifications: list[Notification] = []
    snippet = MENTION_PATTERN.sub(lambda match: f"@{match.group(1)}", comment.content)
    snippet = snippet if len(snippet) <= 120 else f"{snippet[:117]}..."

    for user_id in extract_mentioned_user_ids(comment.content):
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
