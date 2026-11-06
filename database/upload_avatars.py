#!/usr/bin/env python3
"""Upload ảnh avatar demo lên Azure Blob Storage.

Đọc demo_users.json do generate_demo.py sinh ra, upload mỗi ảnh với đúng tên blob đã ghi trong backup.sql.
Chạy trong container backend, nơi đã có azure-storage-blob và biến môi trường Azure:

  docker cp database/avatars  taskflow-prod-backend-1:/tmp/demo/avatars
  docker cp database/demo_users.json database/upload_avatars.py taskflow-prod-backend-1:/tmp/demo/
  docker exec taskflow-prod-backend-1 python /tmp/demo/upload_avatars.py /tmp/demo
"""
import json
import os
import sys
from pathlib import Path

from azure.core.exceptions import ResourceExistsError
from azure.storage.blob import BlobServiceClient, ContentSettings

root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent)
conn = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
container = os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "avatars")

client = BlobServiceClient.from_connection_string(conn).get_container_client(container)
try:
    client.create_container()
except ResourceExistsError:
    pass

cache = ContentSettings(content_type="image/jpeg", cache_control="public, max-age=31536000, immutable")
users = json.loads((root / "demo_users.json").read_text(encoding="utf-8"))
for u in users:
    data = (root / u["file"]).read_bytes()
    client.upload_blob(u["blob"], data, overwrite=True, content_settings=cache)
    print(f"uploaded {u['blob']}  {u['full_name']}")

# Blob mặc định cho tài khoản chưa có ảnh: dùng ảnh đầu tiên nếu chưa tồn tại
default = client.get_blob_client("default.png")
if not default.exists():
    first = (root / users[0]["file"]).read_bytes()
    default.upload_blob(first, overwrite=False, content_settings=ContentSettings(content_type="image/jpeg"))
    print("created default.png")
print(f"done: {len(users)} avatars")
