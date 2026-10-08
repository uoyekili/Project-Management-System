"use client";

import type { AdminPermission, PermissionScope } from "@/types";

import styles from "./admin.module.css";
import { cx, ScopeBadge, SCOPE_NAME } from "./admin-ui";
import { SCOPE_ORDER, type MatrixGroup, type MatrixRow } from "./permission-meta";

export type Selection = Record<string, PermissionScope | null>;

export const SCOPE_HINT: Record<PermissionScope, string> = {
  OWN: "Chỉ bản ghi của chính mình (được giao hoặc do mình tạo)",
  PROJECT: "Mọi bản ghi trong các dự án mình là thành viên",
  ALL: "Toàn công ty, không cần là thành viên dự án",
};

export function PermissionGroup({
  group,
  draft,
  saved,
  permissionByCode,
  editable,
  isLocked,
  onChange,
  onBulk,
}: {
  group: MatrixGroup;
  draft: Selection;
  saved: Selection;
  permissionByCode: Map<string, AdminPermission>;
  editable: boolean;
  isLocked: (row: MatrixRow) => boolean;
  onChange: (row: MatrixRow, scope: PermissionScope | null) => void;
  onBulk: (group: MatrixGroup, mode: "max" | "none") => void;
}) {
  return (
    <section className={styles.permGroup} data-group={group.key}>
      <header className={styles.permGroupHead}>
        <div>
          <h3>{group.label}</h3>
        </div>
        {editable && !group.admin ? (
          <div className={styles.permBulk}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => onBulk(group, "max")}
            >
              Cấp tối đa
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => onBulk(group, "none")}
            >
              Bỏ hết
            </button>
          </div>
        ) : null}
      </header>

      <div className={styles.permScroll}>
        <table className={styles.permTable}>
          <thead>
            <tr>
              <th scope="col">Hành động</th>
              {!editable ? (
                <th scope="col" className={styles.permCol}>
                  Phạm vi
                </th>
              ) : group.admin ? (
                <th scope="col" className={styles.permCol}>
                  Cho phép
                </th>
              ) : (
                <>
                  <th scope="col" className={styles.permCol}>
                    Không
                  </th>
                  {SCOPE_ORDER.map((scope) => (
                    <th
                      key={scope}
                      scope="col"
                      className={styles.permCol}
                      title={SCOPE_HINT[scope]}
                    >
                      <ScopeBadge scope={scope} />
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => {
              const value = draft[row.key] ?? null;
              const changed = value !== (saved[row.key] ?? null);
              const disabled = !editable || isLocked(row);
              return (
                <tr
                  key={row.key}
                  className={cx(changed && styles.permRowChanged, !value && styles.permRowOff)}
                >
                  <th scope="row">
                    <span className={styles.permLabel}>{row.label}</span>
                    {isLocked(row) ? <small>Bắt buộc với role quản trị</small> : null}
                  </th>
                  {!editable ? (
                    <td className={styles.permCol}>
                      {value ? <ScopeBadge scope={value} /> : null}
                    </td>
                  ) : group.admin ? (
                    <td className={styles.permCol}>
                      <input
                        type="checkbox"
                        className={styles.permInput}
                        aria-label={row.label}
                        checked={value === "ALL"}
                        disabled={disabled}
                        onChange={(event) => onChange(row, event.target.checked ? "ALL" : null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td className={styles.permCol}>
                        <input
                          type="radio"
                          className={styles.permInput}
                          name={row.key}
                          aria-label={`${row.label}: không`}
                          checked={value === null}
                          disabled={disabled}
                          onChange={() => onChange(row, null)}
                        />
                      </td>
                      {SCOPE_ORDER.map((scope) => (
                        <td key={scope} className={styles.permCol}>
                          {row.scopes.includes(scope) ? (
                            <input
                              type="radio"
                              className={styles.permInput}
                              name={row.key}
                              aria-label={`${row.label}: ${SCOPE_NAME[scope]}`}
                              title={
                                permissionByCode.get(`${row.key}:${scope}`)?.name ??
                                SCOPE_HINT[scope]
                              }
                              checked={value === scope}
                              disabled={disabled}
                              onChange={() => onChange(row, scope)}
                            />
                          ) : (
                            <span aria-hidden="true" />
                          )}
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
