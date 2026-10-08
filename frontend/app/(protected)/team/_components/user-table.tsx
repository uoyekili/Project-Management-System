import { UserAvatar } from "@/components/user-avatar";
import { EmptyState, Surface, StatusPill } from "@/components/ui";
import { RoleTags } from "@/components/role-tags";
import { TableBodySkeleton } from "@/components/loading-state";
import { userStatusLabel } from "@/lib/utils/format";
import type { PaginatedUsers, UserStatus, UserProfile } from "@/types";
import styles from "../styles/team.module.css";
import { t } from "@/lib/i18n";
import { formatEmployeeCode } from "@/lib/utils/employee";

interface UserTableProps {
  directory: PaginatedUsers;
  isLoading: boolean;
  onUserSelect: (user: UserProfile) => void;
}

function getStatusTone(status: UserStatus) {
  if (status === "ACTIVE") {
    return "on-track" as const;
  }
  return "critical" as const;
}

export function UserTable({
  directory,
  isLoading,
  onUserSelect,
}: UserTableProps) {
  return (
    <Surface
      className={`${styles.tableSurface} filtered-list-table`}
    >
      {isLoading || directory.items.length > 0 ? (
        <>
          <div className={`${styles.tableWrap} table-scroll`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("Người dùng")}</th>
                  <th>{t("Mã")}</th>
                  <th>Email</th>
                  <th>{t("Chức danh")}</th>
                  <th className={styles.roleCell}>{t("Vai trò")}</th>
                  <th>{t("Trạng thái")}</th>
                  <th>{t("Phòng ban")}</th>
                  <th>{t("Số điện thoại")}</th>
                  <th className={styles.actionCol} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableBodySkeleton rows={8} columns={9} />
                ) : (
                  directory.items.map((user) => {
                  return (
                    <tr key={user.id}>
                      <td>
                        <button
                          type="button"
                          className={styles.userCellButton}
                          onClick={() => onUserSelect(user)}
                        >
                          <UserAvatar
                            name={user.name}
                            avatarUrl={user.avatarUrl}
                            size={24}
                            className={styles.avatarToken}
                          />
                          <span className={styles.userCellCopy}>
                            <strong>{user.name}</strong>
                            <small>{user.jobTitle ?? user.title}</small>
                          </span>
                        </button>
                      </td>
                      <td>{formatEmployeeCode(user.id, user.employeeCode)}</td>
                      <td>
                        <div className={styles.contactCell}>
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td>{user.jobTitle ?? t("Chưa có")}</td>
                      <td className={styles.roleCell}>
                        <RoleTags
                          className={styles.roleStack}
                          roles={user.roles?.length ? user.roles : user.role}
                        />
                      </td>
                      <td>
                        <StatusPill
                          label={userStatusLabel(user.status ?? "ACTIVE")}
                          tone={getStatusTone(user.status ?? "ACTIVE")}
                        />
                      </td>
                      <td>
                        <div className={styles.contactCell}>
                          <span>{user.department || t("Chưa có")}</span>
                        </div>
                      </td>
                      <td>{user.phoneNumber || t("Chưa có")}</td>
                      <td className={styles.actionCol}>
                        <button
                          type="button"
                          className={`secondary-button ${styles.detailButton}`}
                          onClick={() => onUserSelect(user)}
                        >
                          {t("Chi tiết")}</button>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <EmptyState
          title={t("Không tìm thấy người dùng phù hợp")}
          description={t("Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc để xem nhiều kết quả hơn.")}
        />
      )}
    </Surface>
  );
}
