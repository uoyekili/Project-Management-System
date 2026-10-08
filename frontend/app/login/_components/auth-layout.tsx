import type { ReactNode } from "react";

import { SoftwareLogo } from "@/components/software-logo";

import { BrandPanel } from "./brand-panel";
import styles from "../styles/login-page.module.css";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Khung hai cột dùng chung cho các trang xác thực (đăng nhập). */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <BrandPanel />

      <main className={styles.side}>
        <div className={styles.top}>
          <SoftwareLogo className={styles.mobileLogo} />
        </div>

        <div className={styles.formWrap}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>

        <footer className={styles.footer}>© {new Date().getFullYear()} TaskFlow</footer>
      </main>
    </div>
  );
}
