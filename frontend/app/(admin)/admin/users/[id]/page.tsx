"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { BackButton } from "@/components/back-button";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { FilterSelect } from "@/components/filter-select";
import { Badge, EmptyState, StatusPill, Surface } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthSession } from "@/hooks/use-session";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type { AdminDepartment, AdminJobTitle, AdminRole, AdminUser } from "@/types";

import styles from "../../_components/admin.module.css";
import {
  EmptyDash,
  errorMessage,
  RequirePermission,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";

const ADMIN_CODE = "admin.access:ALL";

type Form = {
  full_name: string;
  phone_number: string;
  role_id: number | null;
  department_id: number | null;
  job_title_id: number | null;
};

function toId(value: string): number | null {
  return value === "" ? null : Number(value);
}

function idOptions(items: { id: number; name: string }[], withNone = false) {
  const options = items.map((item) => ({ value: String(item.id), label: item.name }));
  return withNone ? [{ value: "", label: "Không chọn" }, ...options] : options;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}

function UserDetail({ userId }: { userId: number }) {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const session = useAuthSession();
  const selfEmail = session?.currentUser?.email ?? "";

  const [user, setUser] = useState<AdminUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [jobTitles, setJobTitles] = useState<AdminJobTitle[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Mật khẩu tạm do hệ thống sinh; chỉ hiển thị một lần ngay sau khi đặt lại.
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useAdminTitle(user?.full_name);

  const load = useCallback(async () => {
    try {
      const [found, deps, titles, roleList] = await Promise.all([
        adminApi.getUser(userId),
        adminApi.listDepartments(),
        adminApi.listJobTitles(),
        adminApi.listRoles(),
      ]);
      setUser(found);
      setDepartments(deps);
      setJobTitles(titles);
      setRoles(roleList);
    } catch (err) {
      setNotFound(true);
      toast.error(errorMessage(err));
    }
  }, [userId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu
    void load();
  }, [load]);

  const isSelf = user?.email === selfEmail;
  const formRole = roles.find((role) => role.id === form?.role_id);
  const formIsAdminRole = Boolean(formRole?.permission_codes.includes(ADMIN_CODE));

  function startEdit() {
    if (!user) return;
    setForm({
      full_name: user.full_name,
      phone_number: user.phone_number ?? "",
      role_id: user.role?.id ?? null,
      department_id: user.department?.id ?? null,
      job_title_id: user.job_title?.id ?? null,
    });
    setFormError(null);
    setEditing(true);
  }

  function setRole(value: string) {
    const roleId = toId(value);
    const role = roles.find((item) => item.id === roleId);
    const admin = Boolean(role?.permission_codes.includes(ADMIN_CODE));
    // Tài khoản quản trị không thuộc phòng ban / chức danh nào.
    setForm((current) =>
      current
        ? {
            ...current,
            role_id: roleId,
            ...(admin ? { department_id: null, job_title_id: null } : {}),
          }
        : current,
    );
  }

  async function handleSave() {
    if (!user || !form) return;
    if (!form.full_name.trim() || form.role_id == null) {
      setFormError("Vui lòng nhập họ tên và chọn role.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await adminApi.updateUser(user.id, {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || null,
        department_id: form.department_id,
        job_title_id: form.job_title_id,
        role_id: form.role_id,
      });
      setUser(updated);
      setEditing(false);
      toast.success("Đã lưu thay đổi.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;
    const ok = await confirm({
      title: "Đặt lại mật khẩu",
      message: (
        <>
          Hệ thống sẽ tạo mật khẩu ngẫu nhiên mới cho <strong>{user.full_name}</strong> và thu hồi
          mọi phiên đăng nhập hiện tại.
        </>
      ),
      confirmLabel: "Tạo mật khẩu mới",
      tone: "primary",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const result = await adminApi.resetPassword(user.id);
      setIssuedPassword(result.temporary_password);
      setCopied(false);
      toast.success("Đã đặt lại mật khẩu.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!issuedPassword) return;
    try {
      await navigator.clipboard.writeText(issuedPassword);
      setCopied(true);
    } catch {
      toast.error("Không thể sao chép.");
    }
  }

  async function handleToggleStatus() {
    if (!user) return;
    const lock = user.is_active;
    const ok = await confirm({
      title: lock ? "Khóa tài khoản" : "Mở khóa tài khoản",
      message: lock ? (
        <>
          <strong>{user.full_name}</strong> sẽ không thể đăng nhập và phiên hiện tại bị thu hồi.
        </>
      ) : (
        <>
          <strong>{user.full_name}</strong> sẽ có thể đăng nhập trở lại.
        </>
      ),
      confirmLabel: lock ? "Khóa tài khoản" : "Mở khóa",
      tone: lock ? "danger" : "primary",
    });
    if (!ok) return;
    setSaving(true);
    try {
      setUser(await adminApi.setUserStatus(user.id, !lock));
      toast.success(lock ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const backLink = <BackButton href="/admin/users" />;

  if (notFound) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.detailTopbar}>{backLink}</div>
        <EmptyState
          title="Không tìm thấy người dùng"
          description="Tài khoản có thể không tồn tại."
        />
      </div>
    );
  }

  if (!user) {
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
                className="secondary-button"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          ) : (
            <ActionButton kind="edit" onClick={startEdit}>
              Chỉnh sửa
            </ActionButton>
          )}
        </div>
      </div>

      <div className={styles.userDetailGrid}>
        <Surface className={styles.profileCard}>
          <UserAvatar
            name={user.full_name}
            avatarUrl={user.avatar_url ?? undefined}
            size={120}
          />
          <strong>{user.full_name}</strong>
          <span>{user.email}</span>
          <div className={styles.profileBadges}>
            {user.role ? <Badge tone="accent">{user.role.name}</Badge> : null}
            <StatusPill
              label={user.is_active ? "Hoạt động" : "Đã khóa"}
              tone={user.is_active ? "on-track" : "critical"}
            />
          </div>
        </Surface>

        <div className={styles.stack}>
          <Surface className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <h2>Thông tin</h2>
            </div>
            {editing && form ? (
              <form
                className={`${styles.infoGrid} ${styles.infoGridForm}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSave();
                }}
              >
                <label className="app-field">
                  <span className="app-label">Họ tên</span>
                  <input
                    className="app-input"
                    value={form.full_name}
                    autoFocus
                    onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  />
                </label>
                <label className="app-field">
                  <span className="app-label">Email</span>
                  <input className="app-input" value={user.email} disabled readOnly />
                </label>
                <label className="app-field">
                  <span className="app-label">Số điện thoại</span>
                  <input
                    className="app-input"
                    value={form.phone_number}
                    onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
                  />
                </label>
                <div className="app-field">
                  <span className="app-label">Role</span>
                  <FilterSelect
                    size="lg"
                    searchable
                    value={form.role_id == null ? "" : String(form.role_id)}
                    onChange={setRole}
                    options={idOptions(roles)}
                    placeholder="Chọn role"
                  />
                </div>
                <div className="app-field">
                  <span className="app-label">Phòng ban</span>
                  <FilterSelect
                    size="lg"
                    searchable
                    value={form.department_id == null ? "" : String(form.department_id)}
                    onChange={(value) => setForm({ ...form, department_id: toId(value) })}
                    options={idOptions(departments, true)}
                    placeholder={formIsAdminRole ? "Không áp dụng" : "Chọn phòng ban"}
                    disabled={formIsAdminRole}
                  />
                </div>
                <div className="app-field">
                  <span className="app-label">Chức danh</span>
                  <FilterSelect
                    size="lg"
                    searchable
                    value={form.job_title_id == null ? "" : String(form.job_title_id)}
                    onChange={(value) => setForm({ ...form, job_title_id: toId(value) })}
                    options={idOptions(jobTitles, true)}
                    placeholder={formIsAdminRole ? "Không áp dụng" : "Chọn chức danh"}
                    disabled={formIsAdminRole}
                  />
                </div>
                {formIsAdminRole ? (
                  <small className={`${styles.fieldHint} ${styles.infoItemFull}`}>
                    Tài khoản quản trị không thuộc phòng ban hay chức danh nào.
                  </small>
                ) : null}
                {formError ? (
                  <div className={`form-error ${styles.infoItemFull}`} role="alert">
                    {formError}
                  </div>
                ) : null}
              </form>
            ) : (
              <dl className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <dt>Họ tên</dt>
                  <dd>{user.full_name}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Số điện thoại</dt>
                  <dd>{user.phone_number || <EmptyDash />}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Role</dt>
                  <dd>{user.role?.name ?? <EmptyDash />}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Phòng ban</dt>
                  <dd>{user.is_admin ? null : user.department?.name}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Chức danh</dt>
                  <dd>{user.job_title?.name ?? <EmptyDash />}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Ngày tạo</dt>
                  <dd>{formatDate(user.created_at)}</dd>
                </div>
              </dl>
            )}
          </Surface>

          <Surface className={styles.infoCard}>
            <div className={styles.infoCardHead}>
              <h2>Bảo mật</h2>
            </div>
            <section className={styles.sectionCard} aria-labelledby="reset-password-title">
              <div className={styles.sectionHead}>
                <div>
                  <h3 id="reset-password-title">Đặt lại mật khẩu</h3>
                  <p>
                    Hệ thống tạo mật khẩu ngẫu nhiên, có hiệu lực ngay; mọi phiên đăng nhập hiện tại
                    bị thu hồi.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={saving}
                  onClick={() => void handleResetPassword()}
                >
                  {issuedPassword ? "Tạo mật khẩu khác" : "Tạo mật khẩu"}
                </button>
              </div>
              {issuedPassword ? (
                <div className={styles.credentialBox}>
                  <span className={styles.credentialLabel}>Mật khẩu tạm thời</span>
                  <div className={styles.credentialRow}>
                    <code>{issuedPassword}</code>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleCopy()}
                    >
                      {copied ? "Đã sao chép" : "Sao chép"}
                    </button>
                  </div>
                  <small className={styles.fieldHint}>
                    Chỉ hiển thị một lần. Hãy gửi cho người dùng và yêu cầu đổi mật khẩu sau khi
                    đăng nhập.
                  </small>
                </div>
              ) : null}
            </section>
            <section
              className={`${styles.sectionCard} ${user.is_active ? styles.sectionCardDanger : ""}`}
              aria-labelledby="account-status-title"
            >
              <div className={styles.sectionHead}>
                <div>
                  <h3 id="account-status-title">
                    {user.is_active ? "Khóa tài khoản" : "Tài khoản đang bị khóa"}
                  </h3>
                  <p>
                    {isSelf
                      ? "Bạn không thể tự khóa tài khoản của chính mình."
                      : user.is_active
                        ? "Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa."
                        : "Mở khóa để người dùng có thể đăng nhập trở lại."}
                  </p>
                </div>
                <button
                  type="button"
                  className={user.is_active ? "danger-button" : "primary-button"}
                  disabled={saving || isSelf}
                  onClick={() => void handleToggleStatus()}
                >
                  {user.is_active ? "Khóa tài khoản" : "Mở khóa"}
                </button>
              </div>
            </section>
          </Surface>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params?.id);

  return (
    <RequirePermission code={PERM.userManage}>
      {Number.isFinite(userId) ? <UserDetail userId={userId} /> : null}
    </RequirePermission>
  );
}
