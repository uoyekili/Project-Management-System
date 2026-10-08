"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BackButton } from "@/components/back-button";
import { Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminPermission, PermissionScope } from "@/types";

import styles from "../../_components/admin.module.css";
import {
  errorMessage,
  RequirePermission,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";
import { PermissionGroup, type Selection } from "../../_components/permission-group";
import {
  ADMIN_ROW_KEYS,
  buildMatrix,
  selectionToIds,
  type MatrixGroup,
  type MatrixRow,
} from "../../_components/permission-meta";

function NewRole() {
  const router = useRouter();
  const toast = useToast();
  useAdminTitle("Thêm role");

  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<Selection>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .listPermissions()
      .then(setPermissions)
      .catch((err) => toast.error(errorMessage(err)));
  }, [toast]);

  const matrix = useMemo(() => buildMatrix(permissions), [permissions]);
  const permissionByCode = useMemo(
    () => new Map(permissions.map((item) => [item.code, item])),
    [permissions],
  );
  const isAdminRole = Boolean(draft["admin.access"]);
  const visibleGroups = useMemo(
    () => matrix.filter((group) => (isAdminRole ? group.admin : !group.admin)),
    [matrix, isAdminRole],
  );

  function setRowScope(row: MatrixRow, scope: PermissionScope | null) {
    setDraft((current) => {
      const next = { ...current, [row.key]: scope };
      // Role quản trị không giữ quyền nghiệp vụ.
      if (row.key === "admin.access" && scope) {
        for (const key of Object.keys(next)) {
          if (!ADMIN_ROW_KEYS.has(key)) next[key] = null;
        }
      }
      return next;
    });
  }

  function bulkSet(group: MatrixGroup, mode: "max" | "none") {
    setDraft((current) => {
      const next = { ...current };
      for (const row of group.rows) {
        next[row.key] = mode === "none" ? null : row.scopes[row.scopes.length - 1];
      }
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên role.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await adminApi.createRole({
        name: name.trim(),
        description: description.trim() || null,
        permission_ids: selectionToIds(draft, permissions),
      });
      toast.success("Đã tạo role.");
      router.push(`/admin/roles/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopbar}>
        <BackButton href="/admin/roles" />
        <div className={styles.detailTopbarActions}>
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() => router.push("/admin/roles")}
          >
            Hủy
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Đang tạo..." : "Tạo role"}
          </button>
        </div>
      </div>

      <div className={styles.roleTopGrid}>
        <Surface className={styles.infoCard}>
          <div className={styles.infoCardHead}>
            <h2>Thông tin</h2>
          </div>
          <label className="app-field">
            <span className="app-label">Tên role</span>
            <input
              className={`app-input ${styles.plainInput}`}
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
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
      </div>

      <Surface className={styles.roleSection}>
        <div className={styles.roleSectionBody}>
          {visibleGroups.map((group) => (
            <PermissionGroup
              key={group.key}
              group={group}
              draft={draft}
              saved={{}}
              permissionByCode={permissionByCode}
              editable
              isLocked={() => false}
              onChange={setRowScope}
              onBulk={bulkSet}
            />
          ))}
        </div>
      </Surface>
    </div>
  );
}

export default function AdminNewRolePage() {
  return (
    <RequirePermission code={PERM.roleManage}>
      <NewRole />
    </RequirePermission>
  );
}
