"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "@/components/back-button";
import { FilterSelect } from "@/components/filter-select";
import { Surface } from "@/components/ui";
import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";
import type {
  AdminDepartment,
  AdminJobTitle,
  AdminRole,
  AdminUserCreated,
  AdminUserForm,
} from "@/types";

import styles from "../../_components/admin.module.css";
import {
  errorMessage,
  RequirePermission,
  useAdminTitle,
  useToast,
} from "../../_components/admin-ui";

const ADMIN_CODE = "admin.access:ALL";
const NONE = { value: "", label: "Không chọn" };

const EMPTY_FORM: AdminUserForm = {
  full_name: "",
  email: "",
  phone_number: "",
  department_id: null,
  job_title_id: null,
  role_id: null,
};

function toId(value: string): number | null {
  return value === "" ? null : Number(value);
}

function idOptions(items: { id: number; name: string }[], withNone = false) {
  const options = items.map((item) => ({ value: String(item.id), label: item.name }));
  return withNone ? [NONE, ...options] : options;
}

function NewUser() {
  const router = useRouter();
  const toast = useToast();
  useAdminTitle("Thêm nhân viên");

  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [jobTitles, setJobTitles] = useState<AdminJobTitle[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState<AdminUserForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<AdminUserCreated | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.listDepartments(), adminApi.listJobTitles(), adminApi.listRoles()])
      .then(([deps, titles, roleList]) => {
        setDepartments(deps);
        setJobTitles(titles);
        setRoles(roleList);
        setForm((current) =>
          current.role_id == null
            ? { ...current, role_id: roleList.find((role) => role.name === "Employee")?.id ?? null }
            : current,
        );
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, [toast]);

  const selectedRole = roles.find((role) => role.id === form.role_id);
  const isAdminRole = Boolean(selectedRole?.permission_codes.includes(ADMIN_CODE));

  function setRole(value: string) {
    const roleId = toId(value);
    const role = roles.find((item) => item.id === roleId);
    const admin = Boolean(role?.permission_codes.includes(ADMIN_CODE));
    // Tài khoản quản trị không thuộc phòng ban / chức danh nào.
    setForm((current) => ({
      ...current,
      role_id: roleId,
      ...(admin ? { department_id: null, job_title_id: null } : {}),
    }));
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim() || form.role_id == null) {
      setError("Vui lòng nhập họ tên, email và chọn role.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.createUser({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number?.trim() || null,
      });
      setCreated(result);
      toast.success("Đã thêm nhân viên.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporary_password);
      setCopied(true);
    } catch {
      toast.error("Không thể sao chép.");
    }
  }

  if (created) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.detailTopbar}>
          <BackButton href="/admin/users" label="Danh sách" />
          <div className={styles.detailTopbarActions}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push(`/admin/users/${created.id}`)}
            >
              Xem chi tiết
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/admin/users")}
            >
              Xong
            </button>
          </div>
        </div>
        <Surface className={styles.successCard}>
          <div className={styles.successHead}>
            <span className={styles.successIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            <div>
              <h2>Đã thêm nhân viên</h2>
              <p>Gửi thông tin đăng nhập bên dưới cho nhân viên.</p>
            </div>
          </div>
          <dl className={styles.successRows}>
            <div className={styles.successRow}>
              <dt>Họ tên</dt>
              <dd>{created.full_name}</dd>
            </div>
            <div className={styles.successRow}>
              <dt>Email đăng nhập</dt>
              <dd>{created.email}</dd>
            </div>
            <div className={styles.successRow}>
              <dt>Mật khẩu tạm thời</dt>
              <dd>
                <code className={styles.successCode}>{created.temporary_password}</code>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCopy()}
                >
                  {copied ? "Đã sao chép" : "Sao chép"}
                </button>
              </dd>
            </div>
          </dl>
          <p className={styles.successNote}>
            Mật khẩu chỉ hiển thị một lần. Yêu cầu nhân viên đổi mật khẩu sau khi đăng nhập.
          </p>
        </Surface>
      </div>
    );
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopbar}>
        <BackButton href="/admin/users" />
        <div className={styles.detailTopbarActions}>
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={() => router.push("/admin/users")}
          >
            Hủy
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Đang lưu..." : "Thêm nhân viên"}
          </button>
        </div>
      </div>

      <Surface className={styles.infoCard}>
        <div className={styles.infoCardHead}>
          <h2>Thông tin</h2>
        </div>
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
            <input
              className="app-input"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="app-field">
            <span className="app-label">Số điện thoại</span>
            <input
              className="app-input"
              value={form.phone_number ?? ""}
              onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
            />
          </label>
          <div className="app-field">
            <span className="app-label">Role</span>
            <FilterSelect
              size="lg"
              searchable
              searchPlaceholder="Tìm role..."
              placeholder="Chọn role"
              value={form.role_id == null ? "" : String(form.role_id)}
              onChange={setRole}
              options={idOptions(roles)}
            />
          </div>
          <div className="app-field">
            <span className="app-label">Phòng ban</span>
            <FilterSelect
              size="lg"
              searchable
              searchPlaceholder="Tìm phòng ban..."
              placeholder={isAdminRole ? "Không áp dụng" : "Chọn phòng ban"}
              disabled={isAdminRole}
              value={form.department_id == null ? "" : String(form.department_id)}
              onChange={(value) => setForm({ ...form, department_id: toId(value) })}
              options={idOptions(departments, true)}
            />
          </div>
          <div className="app-field">
            <span className="app-label">Chức danh</span>
            <FilterSelect
              size="lg"
              searchable
              searchPlaceholder="Tìm chức danh..."
              placeholder={isAdminRole ? "Không áp dụng" : "Chọn chức danh"}
              disabled={isAdminRole}
              value={form.job_title_id == null ? "" : String(form.job_title_id)}
              onChange={(value) => setForm({ ...form, job_title_id: toId(value) })}
              options={idOptions(jobTitles, true)}
            />
          </div>
          {isAdminRole ? (
            <small className={`${styles.fieldHint} ${styles.infoItemFull}`}>
              Tài khoản quản trị không thuộc phòng ban hay chức danh nào.
            </small>
          ) : null}
          <small className={`${styles.fieldHint} ${styles.infoItemFull}`}>
            Mật khẩu được hệ thống tạo ngẫu nhiên sau khi thêm nhân viên.
          </small>
          {error ? (
            <div className={`form-error ${styles.infoItemFull}`} role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </Surface>
    </div>
  );
}

export default function AdminNewUserPage() {
  return (
    <RequirePermission code={PERM.userManage}>
      <NewUser />
    </RequirePermission>
  );
}
