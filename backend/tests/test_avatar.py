"""Avatar: validate upload, lưu tên blob, URL công khai, xóa ảnh cũ. Không gọi Azure thật."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.schemas.user_schema import UserProfile
from app.services import azure_blob_service as blob
from app.services import user_service

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPG = b"\xff\xd8\xff\xe0" + b"0" * 32
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 32


@pytest.fixture()
def fake_storage(monkeypatch):
    storage = MagicMock()
    storage.upload_avatar.return_value = "users/user_7_abc.png"
    monkeypatch.setattr(user_service, "azure_blob_service", storage)
    monkeypatch.setattr(blob, "azure_blob_service", storage)
    return storage


def make_user(avatar="default.png"):
    return SimpleNamespace(id=7, avatar_url=avatar, updated_at=None)


def test_sniff_image_by_magic_bytes():
    assert blob.sniff_image(PNG) == ("image/png", ".png")
    assert blob.sniff_image(JPG) == ("image/jpeg", ".jpg")
    assert blob.sniff_image(WEBP) == ("image/webp", ".webp")
    assert blob.sniff_image(b"GIF89a...") is None
    assert blob.sniff_image(b"<svg></svg>") is None


def test_public_url_defaults_and_passthrough(fake_storage):
    assert blob.avatar_public_url(None) == "/api/avatars/default.png"
    assert blob.avatar_public_url("") == "/api/avatars/default.png"
    assert blob.avatar_public_url("users/user_1_x.jpg") == "/api/avatars/users/user_1_x.jpg"
    assert blob.avatar_public_url("https://cdn.example/a.png") == "https://cdn.example/a.png"


def test_profile_schema_returns_avatar_route(fake_storage):
    profile = UserProfile.model_validate(
        SimpleNamespace(
            id=1, email="a@b.co", full_name="A", phone_number=None, avatar_url="default.png",
            department=None, department_id=None, job_title=None, role="Employee",
            permissions=[], is_active=True, is_admin=False,
            created_at="2026-01-01T00:00:00", updated_at="2026-01-01T00:00:00",
        )
    )
    assert profile.avatar_url == "/api/avatars/default.png"


@pytest.mark.parametrize(
    "payload,status",
    [(b"", 400), (b"%PDF-1.4", 400), (PNG + b"0" * (2 * 1024 * 1024), 413)],
    ids=["empty", "not-an-image", "too-large"],
)
def test_update_avatar_rejects_bad_files(fake_storage, payload, status):
    db = MagicMock()
    with pytest.raises(HTTPException) as err:
        user_service.update_avatar(db, make_user(), payload)
    assert err.value.status_code == status
    fake_storage.upload_avatar.assert_not_called()
    db.commit.assert_not_called()


def test_update_avatar_stores_blob_name_and_deletes_previous(fake_storage):
    db = MagicMock()
    user = make_user(avatar="users/user_7_old.jpg")
    user_service.update_avatar(db, user, PNG)
    fake_storage.upload_avatar.assert_called_once_with(7, PNG, "image/png", ".png")
    assert user.avatar_url == "users/user_7_abc.png"
    db.commit.assert_called_once()
    fake_storage.delete_avatar.assert_called_once_with("users/user_7_old.jpg")


def test_storage_failure_returns_503_and_keeps_db(fake_storage):
    fake_storage.upload_avatar.side_effect = blob.AvatarStorageError("Azure down")
    db = MagicMock()
    user = make_user("users/user_7_old.jpg")
    with pytest.raises(HTTPException) as err:
        user_service.update_avatar(db, user, JPG)
    assert err.value.status_code == 503
    assert user.avatar_url == "users/user_7_old.jpg"
    db.commit.assert_not_called()
    fake_storage.delete_avatar.assert_not_called()


def test_reset_avatar_back_to_default(fake_storage):
    db = MagicMock()
    user = make_user("users/user_7_old.jpg")
    user_service.reset_avatar(db, user)
    assert user.avatar_url == "default.png"
    fake_storage.delete_avatar.assert_called_once_with("users/user_7_old.jpg")


def test_delete_never_touches_default_or_foreign_blobs(monkeypatch):
    service = blob.AzureBlobService()
    client = MagicMock()
    monkeypatch.setattr(blob.AzureBlobService, "client", property(lambda self: client))
    for name in (None, "", "default.png", "other/file.png", "avatars/user_1_x.png"):
        service.delete_avatar(name)
    client.get_blob_client.assert_not_called()
    service.delete_avatar("users/user_7_x.png")
    client.get_blob_client.return_value.delete_blob.assert_called_once()


def test_avatar_blob_name_validation():
    assert blob.is_valid_avatar_blob("default.png")
    assert blob.is_valid_avatar_blob("users/user_1_abc.png")
    assert not blob.is_valid_avatar_blob("../secret")
    assert not blob.is_valid_avatar_blob("users/../x.png")
    assert not blob.is_valid_avatar_blob("other/file.png")
