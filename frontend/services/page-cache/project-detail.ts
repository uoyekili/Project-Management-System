/**
 * Bộ nhớ đệm trong phiên cho trang chi tiết dự án: mở task rồi quay lại thì hiển thị ngay
 * dữ liệu đã có (không skeleton), đồng thời làm mới ngầm ở nền.
 */
const projectDetailCache = new Map<string, unknown>();

function cacheKey(viewerId: string, projectId: string) {
  return `${viewerId}:${projectId}`;
}

export function getProjectDetailCache<T>(viewerId: string, projectId: string): T | null {
  if (!viewerId || !projectId) return null;
  return (projectDetailCache.get(cacheKey(viewerId, projectId)) as T | undefined) ?? null;
}

export function setProjectDetailCache<T>(viewerId: string, projectId: string, data: T) {
  if (!viewerId || !projectId) return;
  projectDetailCache.set(cacheKey(viewerId, projectId), data);
}

export function clearProjectDetailCache() {
  projectDetailCache.clear();
}
