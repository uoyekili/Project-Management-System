"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { BackButton } from "@/components/back-button";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { FilterBar, FilterSearch } from "@/components/filter-bar";
import { TableBodySkeleton } from "@/components/loading-state";
import { Modal } from "@/components/modal";
import { EmptyState, Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminDepartment, AdminUser } from "@/types";

import styles from "../../_components/admin.module.css";
import {
  EmptyDash,
  errorMessage,
  RequirePermission,
  UserCell,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";
import {
  AdminListPage,
  AdminListSurface,
  AdminTable,
  adminTableStyles,
} from "../../_components/admin-table";
import { AdminDetailActions, AdminDetailTopbar } from "../../_components/admin-detail-header";
import { MemberPicker } from "../../_components/member-picker";
import { useUnsavedChanges } from "../../_components/use-unsaved-changes";

function DepartmentDetail({ departmentId }: { departmentId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [department, setDepartment] = useState<AdminDepartment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [members, setMembers] = useState<AdminUser[] | null>(null);
  const [candidates, setCandidates] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  useAdminTitle(department?.name);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty =
    editing && department
      ? name.trim() !== department.name || description.trim() !== (department.description ?? "")
      : false;
  const { discardChanges } = useUnsavedChanges(dirty);

  const load = useCallback(async () => {
    try {
      const [departments, current, all] = await Promise.all([
        adminApi.listDepartments(),
        adminApi.listDepartmentMembers(departmentId),
        adminApi.listUsers({ page_size: 1000 }),
      ]);
      const found = departments.find((item) => item.id === departmentId) ?? null;
      setDepartment(found);
      setNotFound(!found);
      setMembers(current);
      setCandidates(
        all.items.filter((user) => !user.is_admin && user.department?.id !== departmentId),
      );
    } catch (err) {
      toast.error(errorMessage(err));
      setMembers((current) => current ?? []);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu
    void load();
  }, [load]);

  function startEdit() {
    if (!department) return;
    setName(department.name);
    setDescription(department.description ?? "");
    setFormError(null);
    setEditing(true);
  }

  async function cancelEdit() {
    if (!(await discardChanges())) return;
    setEditing(false);
    setFormError(null);
  }

  async function leave(event: React.MouseEvent) {
    if (!dirty) return;
    event.preventDefault();
    if (await discardChanges()) router.push("/admin/departments");
  }

  async function handleSave() {
    if (!department) return;
    if (!name.trim()) {
      setFormError("Vui lòng nhập tên phòng ban.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await adminApi.updateDepartment(department.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setDepartment(updated);
      setEditing(false);
      toast.success("Đã lưu thay đổi.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!department) return;
    const ok = await confirm({
      title: "Xóa phòng ban",
      message: `Xóa phòng ban "${department.name}"?`,
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.deleteDepartment(department.id);
      toast.success("Đã xóa phòng ban.");
      router.push("/admin/departments");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const visibleMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members ?? [];
    return (members ?? []).filter(
      (user) =>
        user.full_name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
    );
  }, [members, search]);

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await adminApi.addDepartmentMembers(departmentId, [...selected]);
      toast.success(`Đã thêm ${selected.size} thành viên.`);
      setSelected(new Set());
      setAddOpen(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(user: AdminUser) {
    const ok = await confirm({
      title: "Gỡ khỏi phòng ban",
      message: `Gỡ ${user.full_name} khỏi phòng ban?`,
      confirmLabel: "Gỡ",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.removeDepartmentMember(departmentId, user.id);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (notFound) {
    return (
      <div className={styles.detailPage}>
        <BackButton href="/admin/departments" />
        <EmptyState title="Không tìm thấy phòng ban" description="Phòng ban có thể đã bị xóa." />
      </div>
    );
  }

  return (
    <AdminListPage
      filters={
        <>
      <AdminDetailTopbar
        back={<BackButton href="/admin/departments" onClick={(event) => void leave(event)} />}
      >
        <AdminDetailActions
          editing={editing}
          saving={saving}
          canSave={dirty}
          disabled={!department}
          onEdit={startEdit}
          onCancel={() => void cancelEdit()}
          onSave={() => void handleSave()}
          onDelete={() => void handleDelete()}
        />
      </AdminDetailTopbar>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Thông tin</h2>
        </div>
        {editing ? (
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
            {formError ? (
              <div className={`form-error ${styles.infoItemFull}`} role="alert">
                {formError}
              </div>
            ) : null}
          </form>
        ) : (
          <dl className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <dt>Tên phòng ban</dt>
              <dd>{department?.name ?? ""}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Số thành viên</dt>
              <dd>{members?.length ?? 0}</dd>
            </div>
          </dl>
        )}
      </Surface>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Mô tả</h2>
        </div>
        {editing ? (
          <textarea
            className={`app-input ${styles.plainInput} ${styles.descTextarea}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        ) : department?.description ? (
          <p className={styles.descText}>{department.description}</p>
        ) : null}
      </Surface>

      <FilterBar
        search={
          <FilterSearch value={search} onChange={setSearch} placeholder="Tìm thành viên..." />
        }
        activeCount={search.trim() ? 1 : 0}
        onReset={() => setSearch("")}
        showReset={false}
        action={
          <ActionButton
            kind="add"
            disabled={!editing}
            title={editing ? undefined : "Bấm Chỉnh sửa để thêm thành viên"}
            onClick={() => setAddOpen(true)}
          >
            Thêm thành viên
          </ActionButton>
        }
      />

        </>
      }
    >
      <AdminListSurface
        hasContent={!members || visibleMembers.length > 0}
        emptyTitle={search ? "Không tìm thấy thành viên phù hợp" : "Phòng ban chưa có thành viên"}
        emptyDescription={
          search ? "Thử đổi từ khóa tìm kiếm." : "Bấm Chỉnh sửa rồi chọn Thêm thành viên."
        }
      >
        <AdminTable>
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Chức danh</th>
              <th>Vai trò</th>
              {editing ? <th data-actions aria-label="Thao tác" /> : null}
            </tr>
          </thead>
          <tbody>
            {!members ? (
              <TableBodySkeleton rows={6} columns={editing ? 4 : 3} />
            ) : (
              visibleMembers.map((user) => (
                <tr key={user.id}>
                  <td data-primary data-label="Thành viên">
                    <UserCell
                      id={user.id}
                      name={user.full_name}
                      email={user.email}
                      avatarUrl={user.avatar_url}
                    />
                  </td>
                  <td data-label="Chức danh">{user.job_title?.name ?? <EmptyDash />}</td>
                  <td data-label="Vai trò">{user.role?.name ?? <EmptyDash />}</td>
                  {editing ? (
                    <td data-actions>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`secondary-button ${styles.dangerOutline} ${adminTableStyles.actionButton}`}
                          onClick={() => {
                            void handleRemove(user);
                          }}
                        >
                          Gỡ
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminListSurface>

      {addOpen ? (
        <Modal
          title={`Thêm thành viên vào ${department?.name ?? "phòng ban"}`}
          titleId="department-add-member"
          size="lg"
          onClose={() => setAddOpen(false)}
          dismissible={!adding}
        >
          <div className="app-modal-form">
            <div className="app-modal-body">
              <MemberPicker users={candidates} selected={selected} onChange={setSelected} />
              <small className={styles.fieldHint}>
                Nhân viên đang ở phòng ban khác sẽ được chuyển sang phòng ban này.
              </small>
            </div>
            <footer className="app-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={selected.size === 0 || adding}
                onClick={() => void handleAdd()}
              >
                {adding ? "Đang thêm" : `Thêm${selected.size ? ` (${selected.size})` : ""}`}
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
    </AdminListPage>
  );
}

export default function AdminDepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const departmentId = Number(params?.id);

  return (
    <RequirePermission code={PERM.departmentManage}>
      {Number.isFinite(departmentId) ? <DepartmentDetail departmentId={departmentId} /> : null}
    </RequirePermission>
  );
}
