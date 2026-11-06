"use client";

import { useCallback, useEffect } from "react";

import { useConfirmDialog } from "@/components/confirm-dialog";

/**
 * Bảo vệ thay đổi chưa lưu ở trang chi tiết: cảnh báo khi đóng tab hoặc tải lại,
 * và trả về `discardChanges` để hỏi xác nhận trước khi hủy sửa hoặc rời trang.
 */
export function useUnsavedChanges(dirty: boolean) {
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const discardChanges = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    return confirm({
      title: "Bỏ thay đổi chưa lưu?",
      message: "Các thay đổi sẽ bị mất.",
      confirmLabel: "Bỏ thay đổi",
      tone: "danger",
    });
  }, [confirm, dirty]);

  return { discardChanges };
}
