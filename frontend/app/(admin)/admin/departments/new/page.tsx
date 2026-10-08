"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "@/components/back-button";
import { Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminUser } from "@/types";

import styles from "../../_components/admin.module.css";
import {
  errorMessage,
  RequirePermission,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";
import { MemberPicker } from "../../_components/member-picker";

function NewDepartment() {
  const router = useRouter();
  const toast = useToast();
  useAdminTitle("Thêm phòng ban");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<AdminUser[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    adminApi
      .listUsers({ page_size: 1000 })
      .then((result) =>
        setCandidates(result.items.filter((user) => !user.is_admin && user.is_active)),
      )
      .catch((err) => {
        toast.error(errorMessage(err));
        setCandidates([]);
      });
  }, [toast]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên phòng ban.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await adminApi.createDepartment({
        name: name.trim(),
        description: description.trim() || null,
      });
      if (selected.size > 0) {
        try {
          await adminApi.addDepartmentMembers(created.id, [...selected]);
        } catch (err) {
          toast.error(`Đã tạo phòng ban, chưa thêm được thành viên. ${errorMessage(err)}`);
          router.push(`/admin/departments/${created.id}`);
          return;
        }
      }
      toast.success("Đã tạo phòng ban.");
      router.push(`/admin/departments/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopbar}>
        <BackButton href="/admin/departments" />
        <div className={styles.detailTopbarActions}>
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() => router.push("/admin/departments")}
          >
            Hủy
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Đang tạo..." : "Tạo phòng ban"}
          </button>
        </div>
      </div>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Thông tin</h2>
        </div>
        <form
          className={styles.infoGrid}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label className="app-field">
            <span className="app-label">Tên phòng ban</span>
            <input
              className={`app-input ${styles.plainInput}`}
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error ? (
            <div className={`form-error ${styles.infoItemFull}`} role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </Surface>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Mô tả</h2>
        </div>
        <textarea
          className={`app-input ${styles.plainInput} ${styles.descTextarea}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Surface>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Thành viên</h2>
          <span className={styles.pickMeta}>Đã chọn {selected.size}</span>
        </div>
        <MemberPicker
          users={candidates}
          selected={selected}
          onChange={setSelected}
          showCount={false}
        />
        <small className={styles.fieldHint}>
          Nhân viên đang ở phòng ban khác sẽ được chuyển sang phòng ban mới.
        </small>
      </Surface>
    </div>
  );
}

export default function AdminNewDepartmentPage() {
  return (
    <RequirePermission code={PERM.departmentManage}>
      <NewDepartment />
    </RequirePermission>
  );
}
