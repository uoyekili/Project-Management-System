"""Lưu avatar trong Azure Blob Storage.

DB chỉ lưu *tên blob* (``default.png`` hoặc ``users/user_<id>_<uuid>.<ext>``); URL công khai
được dựng khi trả ra API qua :func:`avatar_public_url`. Container để private; ảnh được backend
đọc từ Azure và phục vụ qua ``GET /api/avatars/<tên blob>``.
"""

import logging
import uuid

from azure.core.exceptions import AzureError, ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContentSettings

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_AVATAR_BLOB = "default.png"
AVATAR_PREFIX = "users/"
MAX_AVATAR_BYTES = 2 * 1024 * 1024
# Ảnh đặt tên duy nhất theo uuid nên có thể cache vô thời hạn.
AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable"


class AvatarStorageError(Exception):
    """Azure Blob không sẵn sàng hoặc thao tác thất bại."""


def sniff_image(data: bytes) -> tuple[str, str] | None:
    """Nhận diện JPEG/PNG/WebP theo magic bytes; trả (mime, phần mở rộng) hoặc None."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", ".webp"
    return None


class AzureBlobService:
    def __init__(self) -> None:
        self._client: BlobServiceClient | None = None

    @property
    def container_name(self) -> str:
        return get_settings().azure_storage_container_name

    @property
    def client(self) -> BlobServiceClient:
        if self._client is None:
            try:
                self._client = BlobServiceClient.from_connection_string(
                    get_settings().azure_storage_connection_string
                )
            except Exception as exc:  # chuỗi kết nối sai định dạng
                logger.error("Không khởi tạo được Azure Blob client: %s", exc)
                raise AvatarStorageError("Dịch vụ lưu trữ ảnh chưa được cấu hình đúng.") from exc
        return self._client

    def read_avatar(self, blob_name: str) -> tuple[bytes, str] | None:
        """Đọc ảnh từ Azure: (nội dung, content-type) hoặc None nếu không tồn tại."""
        try:
            blob = self.client.get_blob_client(container=self.container_name, blob=blob_name)
            downloader = blob.download_blob()
            content_type = downloader.properties.content_settings.content_type
            return downloader.readall(), content_type or "application/octet-stream"
        except ResourceNotFoundError:
            return None
        except AzureError as exc:
            logger.error("Đọc avatar %s thất bại: %s", blob_name, exc)
            raise AvatarStorageError("Không thể tải ảnh đại diện lúc này.") from exc

    def upload_avatar(self, user_id: int, data: bytes, mime: str, extension: str) -> str:
        """Ghi ảnh mới và trả tên blob."""
        blob_name = f"{AVATAR_PREFIX}user_{user_id}_{uuid.uuid4().hex[:12]}{extension}"
        try:
            self.client.get_blob_client(container=self.container_name, blob=blob_name).upload_blob(
                data,
                overwrite=False,
                content_settings=ContentSettings(
                    content_type=mime, cache_control=AVATAR_CACHE_CONTROL
                ),
            )
        except AzureError as exc:
            logger.error("Upload avatar thất bại: %s", exc)
            raise AvatarStorageError("Không thể lưu ảnh đại diện lúc này. Vui lòng thử lại.") from exc
        return blob_name

    def delete_avatar(self, blob_name: str | None) -> None:
        """Xóa ảnh cũ của user. Không bao giờ đụng tới default.png hay blob ngoài ``users/``."""
        if not blob_name or not blob_name.startswith(AVATAR_PREFIX):
            return
        try:
            self.client.get_blob_client(container=self.container_name, blob=blob_name).delete_blob()
        except ResourceNotFoundError:
            pass
        except (AzureError, AvatarStorageError) as exc:
            # Ảnh mồ côi không ảnh hưởng người dùng; ghi log để dọn sau.
            logger.warning("Không xóa được avatar cũ %s: %s", blob_name, exc)


azure_blob_service = AzureBlobService()


AVATAR_ROUTE = "/api/avatars/"


def is_valid_avatar_blob(blob_name: str) -> bool:
    """Chỉ cho phép default.png và ảnh dưới users/ (không có đoạn '..')."""
    if blob_name == DEFAULT_AVATAR_BLOB:
        return True
    return blob_name.startswith(AVATAR_PREFIX) and ".." not in blob_name and "\\" not in blob_name


def avatar_public_url(value: str | None) -> str:
    """Tên blob (hoặc rỗng) -> đường dẫn API phục vụ ảnh. Rỗng rơi về default.png;
    URL đầy đủ giữ nguyên. Frontend ghép thêm địa chỉ API khi hiển thị."""
    if value and value.startswith(("http://", "https://")):
        return value
    return AVATAR_ROUTE + (value or DEFAULT_AVATAR_BLOB)
