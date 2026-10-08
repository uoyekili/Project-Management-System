"use client";

import { useEffect, useState } from "react";

import { adminApi } from "@/services/api";
import type { AdminCountItem, AdminDashboard } from "@/types";

import styles from "./_components/admin.module.css";
import { cx, errorMessage, SkeletonRows, StatTile } from "./_components/admin-ui";

function BarList({ items }: { items: AdminCountItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (items.length === 0) {
    return <p className={styles.muted}>Chưa có dữ liệu.</p>;
  }
  return (
    <div>
      {items.map((item) => (
        <div key={item.label} className={styles.barRow}>
          <span>{item.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className={styles.barCount}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      {error ? <p className={styles.formError}>{error}</p> : null}

      <div className={styles.statGrid}>
        {data ? (
          <>
            <StatTile
              icon="users"
              label="Tổng người dùng"
              value={data.total_users}
              hint={`${data.active_users} đang hoạt động`}
            />
            <StatTile
              icon="lock"
              label="Tài khoản bị khóa"
              value={data.locked_users}
              hint="Không thể đăng nhập"
              tone={data.locked_users ? "danger" : undefined}
            />
            <StatTile
              icon="userMinus"
              label="Chưa có phòng ban"
              value={data.unassigned_users}
              hint="Cần được phân bổ"
              tone={data.unassigned_users ? "warning" : "success"}
            />
            <StatTile
              icon="building"
              label="Phòng ban"
              value={data.total_departments}
              hint={`${data.total_roles} role đang cấu hình`}
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={cx(styles.card, styles.stat)}>
              <span className={styles.skeleton} style={{ width: "100%", height: 52 }} />
            </div>
          ))
        )}
      </div>

      <div className={styles.twoCol}>
        <section className={cx(styles.card, styles.cardPad)}>
          <h3 className={styles.cardTitle}>Người dùng theo phòng ban</h3>
          {data ? (
            <BarList items={data.users_by_department} />
          ) : (
            <table className={styles.table}>
              <tbody>
                <SkeletonRows rows={4} columns={1} />
              </tbody>
            </table>
          )}
        </section>
        <section className={cx(styles.card, styles.cardPad)}>
          <h3 className={styles.cardTitle}>Người dùng theo role</h3>
          {data ? (
            <BarList items={data.users_by_role} />
          ) : (
            <table className={styles.table}>
              <tbody>
                <SkeletonRows rows={4} columns={1} />
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
