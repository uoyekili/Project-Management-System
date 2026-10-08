import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/app-providers";
import { THEME_INIT_SCRIPT } from "@/lib/preferences/theme-script";
import "@/styles/globals.css";
import "@/styles/components.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TaskFlow - Quản lý dự án",
    template: "%s | TaskFlow",
  },
  applicationName: "TaskFlow",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  description: "TaskFlow - Hệ thống quản lý dự án nội bộ: dự án, công việc, nhật ký công và đội ngũ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        {/* Chỉ server mới xuất script thực thi; client render type khác để React 19 không cảnh báo "script tag" (cùng cách next-themes dùng). */}
        <script
          suppressHydrationWarning
          type={typeof window === "undefined" ? undefined : "application/json"}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
