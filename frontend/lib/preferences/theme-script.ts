// Không import React: file này được dùng trong server component (app/layout.tsx).
export const THEME_STORAGE_KEY = "taskflow:theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Script chạy trong <head> trước khi render để đặt data-theme, tránh nháy sáng khi tải lại.
 * Phải khớp với logic của resolveTheme trong theme.ts.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("${DARK_QUERY}").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
