"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./toast.module.css";

type ToastTone = "info" | "warning" | "danger";

type ToastItem = { id: number; message: string; tone: ToastTone };

type ShowToast = (message: string, options?: { tone?: ToastTone; duration?: number }) => void;

const ToastContext = createContext<ShowToast>(() => undefined);

/** Hiển thị thông báo ngắn: nổi ở góc trên bên phải, tự biến mất, không chiếm chỗ trong bố cục. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (message, options) => {
      setItems((current) => {
        // Cùng nội dung đang hiển thị thì không chồng thêm.
        if (current.some((item) => item.message === message)) return current;
        const id = nextId.current++;
        window.setTimeout(() => dismiss(id), options?.duration ?? 4000);
        return [...current, { id, message, tone: options?.tone ?? "info" }].slice(-3);
      });
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div className={styles.region} role="status" aria-live="polite">
              {items.map((item) => (
                <div key={item.id} className={`${styles.toast} ${styles[item.tone]}`}>
                  <span>{item.message}</span>
                  <button type="button" className={styles.close} onClick={() => dismiss(item.id)} aria-label="×">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
