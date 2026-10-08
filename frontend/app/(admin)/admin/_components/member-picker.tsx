"use client";

import { useMemo, useState } from "react";

import { FilterSearch } from "@/components/filter-bar";
import type { AdminUser } from "@/types";

import styles from "./admin.module.css";
import { UserCell } from "./admin-ui";

/** Chọn nhiều nhân viên: tìm kiếm, chọn tất cả kết quả, hiển thị phòng ban hiện tại. */
export function MemberPicker({
  users,
  selected,
  onChange,
  loading,
  maxHeight = 360,
  showCount = true,
}: {
  users: AdminUser[] | null;
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  loading?: boolean;
  maxHeight?: number;
  /** false khi trang chủ đã hiển thị số đã chọn ở tiêu đề. */
  showCount?: boolean;
}) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = users ?? [];
    if (!term) return list;
    return list.filter(
      (user) =>
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.department?.name ?? "").toLowerCase().includes(term),
    );
  }, [users, search]);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className={styles.picker}>
      <FilterSearch
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo tên, email hoặc phòng ban..."
      />
      {showCount ? (
        <div className={styles.pickerBar}>
          <span className={styles.pickMeta}>Đã chọn {selected.size}</span>
        </div>
      ) : null}
      <div
        className={styles.pickList}
        style={{ maxHeight }}
        role="group"
        aria-label="Danh sách nhân viên"
      >
        {loading || users === null ? (
          <div className={styles.pickEmpty}>Đang tải...</div>
        ) : visible.length === 0 ? (
          <div className={styles.pickEmpty}>
            {search.trim() ? "Không tìm thấy nhân viên phù hợp" : "Không còn nhân viên để thêm"}
          </div>
        ) : (
          visible.map((user) => (
            <label key={user.id} className={styles.pickRow}>
              <input
                type="checkbox"
                className={styles.permInput}
                checked={selected.has(user.id)}
                onChange={() => toggle(user.id)}
              />
              <UserCell
                id={user.id}
                name={user.full_name}
                email={user.email}
                avatarUrl={user.avatar_url}
              />
              <span className={styles.pickMeta}>{user.department?.name ?? ""}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
