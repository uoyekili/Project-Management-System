import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Trang không tồn tại",
};

export default function NotFound() {
  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <div className={styles.iconWrapper}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.icon}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <h1 className={styles.title}>Trang không tồn tại</h1>
        <p className={styles.description}>
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.
        </p>

        <div className={styles.actions}>
          <Link href="/" className="primary-button">
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
