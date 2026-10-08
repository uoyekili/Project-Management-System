"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { BackButton } from "@/components/back-button";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { Tabs } from "@/components/tabs";
import { EmptyState, Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminPermission, AdminRole, AdminRoleMember, PermissionScope } from "@/types";

import teamStyles from "../../../../(protected)/team/styles/team.module.css";
import styles from "../../_components/admin.module.css";
import {
  EmptyDash,
  errorMessage,
  RequirePermission,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";
import {
  ADMIN_ROW_KEYS,
  buildMatrix,
  selectionFromCodes,
  selectionToIds,
  type MatrixGroup,
  type MatrixRow,
} from "../../_components/permission-meta";
import { PermissionGroup, type Selection } from "../../_components/permission-group";

type Tab = "permissions" | "members";

const LOCKED_FOR_ADMIN_ROLE = new Set(["admin.access", "role.manage"]);

/* ------------------------------------------------------------ detail page */
function RoleDetail({ roleId }: { roleId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [role, setRole] = useState<AdminRole | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [members, setMembers] = useState<AdminRoleMember[] | null>(null);
  const [tab, setTab] = useState<Tab>("permissions");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Selection>({});
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useAdminTitle(role?.name);

  const matrix = useMemo(() => buildMatrix(permissions), [permissions]);
  const permissionByCode = useMemo(
    () => new Map(permissions.map((item) => [item.code, item])),
    [permissions],
  );
  const saved = useMemo<Selection>(
    () => (role ? selectionFromCodes(role.permission_codes) : {}),
    [role],
  );
  const view: Selection = editing ? draft : saved;
  const isAdminRole = Boolean(saved["admin.access"]);

  const changedCount = useMemo(() => {
    if (!editing) return 0;
    const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
    return [...keys].filter((key) => (saved[key] ?? null) !== (draft[key] ?? null)).length;
  }, [editing, saved, draft]);
  const infoChanged =
    editing && role
      ? formName.trim() !== role.name || formDescription.trim() !== (role.description ?? "")
      : false;
  const dirty = editing && (changedCount > 0 || infoChanged);

  const visibleGroups = useMemo(
    () => matrix.filter((group) => (isAdminRole ? group.admin : !group.admin)),
    [matrix, isAdminRole],
  );

  const load = useCallback(async () => {
    try {
      const [roles, perms] = await Promise.all([adminApi.listRoles(), adminApi.listPermissions()]);
      const found = roles.find((item) => item.id === roleId) ?? null;
      setRole(found);
      setNotFound(!found);
      setPermissions(perms);
    } catch (err) {
      setNotFound(true);
      toast.error(errorMessage(err));
    }
  }, [roleId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu
    void load();
  }, [load]);

  const usageCount = role?.usage_count;
  useEffect(() => {
    let cancelled = false;
    adminApi
      .listRoleMembers(roleId)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [roleId, usageCount]);

  // Cảnh báo khi đóng tab / tải lại với thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function isLocked(row: MatrixRow) {
    return Boolean(role?.is_system && isAdminRole && LOCKED_FOR_ADMIN_ROLE.has(row.key));
  }

  function startEdit() {
    if (!role) return;
    setDraft(saved);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormError(null);
    setEditing(true);
    setTab("permissions");
  }

  async function cancelEdit() {
    if (dirty) {
      const ok = await confirm({
        title: "Bỏ thay đổi chưa lưu?",
        message: "Các thay đổi sẽ bị mất.",
        confirmLabel: "Bỏ thay đổi",
        tone: "danger",
      });
      if (!ok) return;
    }
    setEditing(false);
  }

  async function leave(event: React.MouseEvent) {
    if (!dirty) return;
    event.preventDefault();
    const ok = await confirm({
      title: "Bỏ thay đổi chưa lưu?",
      message: "Các thay đổi chưa lưu sẽ bị mất.",
      confirmLabel: "Rời trang",
      tone: "danger",
    });
    if (ok) router.push("/admin/roles");
  }

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
        if (isLocked(row)) continue;
        next[row.key] = mode === "none" ? null : row.scopes[row.scopes.length - 1];
      }
      return next;
    });
  }

  async function handleSave() {
    if (!role) return;
    if (!formName.trim()) {
      setFormError("Vui lòng nhập tên role.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let updated: AdminRole = role;
      if (infoChanged) {
        updated = await adminApi.updateRole(role.id, {
          name: formName.trim(),
          description: formDescription.trim() || null,
        });
      }
      if (changedCount > 0) {
        updated = await adminApi.setRolePermissions(role.id, selectionToIds(draft, permissions));
      }
      // Cập nhật giao diện ngay bằng dữ liệu server trả về, không chờ tải lại.
      setRole(updated);
      setEditing(false);
      toast.success("Đã lưu thay đổi.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!role) return;
    if (role.usage_count > 0) {
      const view = await confirm({
        title: "Chưa thể xóa role",
        message: `Role còn ${role.usage_count} người dùng. Hãy chuyển họ sang role khác trước.`,
        confirmLabel: "Xem người dùng",
      });
      if (view) setTab("members");
      return;
    }
    const ok = await confirm({
      title: "Xóa role",
      message: `Xóa role "${role.name}"? Thao tác không thể hoàn tác.`,
      confirmLabel: "Xóa role",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.deleteRole(role.id);
      toast.success("Đã xóa role.");
      router.push("/admin/roles");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const backLink = <BackButton href="/admin/roles" onClick={(event) => void leave(event)} />;

  if (notFound) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.detailTopbar}>{backLink}</div>
        <EmptyState title="Không tìm thấy role" description="Role có thể đã bị xóa." />
      </div>
    );
  }
  if (!role) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.detailTopbar}>{backLink}</div>
      </div>
    );
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopbar}>
        {backLink}
        <div className={styles.detailTopbarActions}>
          {editing ? (
            <>
              <button
                type="button"
                className="danger-button"
                disabled={saving}
                onClick={() => void cancelEdit()}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={saving || !dirty}
                onClick={() => void handleSave()}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          ) : (
            <>
              <ActionButton kind="delete" onClick={() => void handleDelete()}>
                Xóa
              </ActionButton>
              <ActionButton kind="edit" onClick={startEdit}>
                Chỉnh sửa
              </ActionButton>
            </>
          )}
        </div>
      </div>

      <div className={styles.roleTopGrid}>
        <Surface className={styles.infoCard}>
          <div className={styles.infoCardHead}>
            <h2>Thông tin</h2>
          </div>
          {editing ? (
            <label className="app-field">
              <span className="app-label">Tên role</span>
              <input
                className={`app-input ${styles.plainInput}`}
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
              />
            </label>
          ) : (
            <dl className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <dt>Tên role</dt>
                <dd>{role.name}</dd>
              </div>
              <div className={styles.infoItem}>
                <dt>Người dùng</dt>
                <dd>{role.usage_count}</dd>
              </div>
              <div className={styles.infoItem}>
                <dt>Số quyền</dt>
                <dd>{role.permission_codes.length}</dd>
              </div>
            </dl>
          )}
          {formError && editing ? (
            <div className="form-error" role="alert">
              {formError}
            </div>
          ) : null}
        </Surface>

        <Surface className={styles.infoCard}>
          <div className={styles.infoCardHead}>
            <h2>Mô tả</h2>
          </div>
          {editing ? (
            <textarea
              className={`app-input ${styles.plainInput} ${styles.descTextarea}`}
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
            />
          ) : role.description ? (
            <p className={styles.descText}>{role.description}</p>
          ) : (
            <EmptyDash />
          )}
        </Surface>
      </div>

      <Surface className={styles.roleSection}>
        <div className={styles.roleSectionBody}>
          <Tabs
            tabs={[
              { id: "permissions", label: "Quyền hạn" },
              { id: "members", label: "Người dùng" },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            ariaLabel="Chi tiết role"
          />

          {tab === "permissions" ? (
            <>
              {visibleGroups.map((group) => (
                <PermissionGroup
                  key={group.key}
                  group={group}
                  draft={view}
                  saved={saved}
                  permissionByCode={permissionByCode}
                  editable={editing}
                  isLocked={isLocked}
                  onChange={setRowScope}
                  onBulk={bulkSet}
                />
              ))}
            </>
          ) : (
            <div className={styles.roleMembers}>
              {members && members.length === 0 ? (
                <EmptyState
                  title="Chưa có người dùng nào"
                  description="Gán role này khi cấp hoặc sửa tài khoản."
                />
              ) : (
                <div className={`${teamStyles.tableWrap} table-scroll`}>
                  <table className={teamStyles.table}>
                    <thead>
                      <tr>
                        <th>Người dùng</th>
                        <th>Chức danh</th>
                        <th>Phòng ban</th>
                        <th aria-label="Thao tác" />
                      </tr>
                    </thead>
                    <tbody>
                      {(members ?? []).map((member) => (
                        <tr key={member.id}>
                          <td>
                            <span className={styles.roleNameCell}>
                              <strong>{member.full_name}</strong>
                              <small>{member.email}</small>
                            </span>
                          </td>
                          <td>{member.job_title ?? <EmptyDash />}</td>
                          <td>{member.department ?? <EmptyDash />}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <Link
                                href={`/admin/users/${member.id}`}
                                className={`secondary-button ${teamStyles.detailButton}`}
                              >
                                Chi tiết
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}

export default function AdminRoleDetailPage() {
  const params = useParams<{ id: string }>();
  const roleId = Number(params?.id);

  return (
    <RequirePermission code={PERM.roleManage}>
      {Number.isFinite(roleId) ? <RoleDetail roleId={roleId} /> : null}
    </RequirePermission>
  );
}
