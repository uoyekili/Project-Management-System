"use client";

import { useEffect, type ReactNode } from "react";

import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { LocaleProvider } from "@/components/locale-provider";
import { ToastProvider } from "@/components/toast";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Dọn bộ nhớ avatar cũ trong trình duyệt (nay avatar luôn lấy từ API).
    try {
      window.localStorage.removeItem("taskflow-user-avatars");
    } catch {
      // Storage bị chặn: bỏ qua.
    }
  }, []);

  return (
    <LocaleProvider>
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
