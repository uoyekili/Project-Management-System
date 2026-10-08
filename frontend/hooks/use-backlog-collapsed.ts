import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "taskflow:backlog-collapsed";
const CHANGE_EVENT = "taskflow:backlog-collapsed-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Server luôn render Backlog mở; client đồng bộ lại ngay sau hydrate.
function getServerSnapshot() {
  return false;
}

/** Trạng thái thu gọn của cột Backlog trên Kanban, ghi nhớ giữa các lần tải trang và đồng bộ giữa các tab. */
export function useBacklogCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Bỏ qua khi storage bị chặn: trạng thái vẫn đổi cho lần render này.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggle = useCallback(() => setCollapsed(!getSnapshot()), [setCollapsed]);

  return { collapsed, setCollapsed, toggle };
}
