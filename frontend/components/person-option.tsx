import { HighlightMatch } from "@/components/highlight-match";
import { UserAvatar } from "@/components/user-avatar";
import { formatEmployeeCode } from "@/lib/utils/employee";

import styles from "./person-option.module.css";

export type PersonOptionData = {
  userId?: string | number | null;
  email?: string | null;
  name: string;
  avatarUrl?: string | null;
  employeeCode?: string | null;
};

/** Dòng nhân viên chuẩn trong filter: avatar, tên (chính), mã nhân viên nhỏ + muted bên dưới. */
export function PersonOption({
  person,
  query,
  avatarSize = 28,
}: {
  person: PersonOptionData;
  query?: string;
  avatarSize?: number;
}) {
  const code = formatEmployeeCode(person.userId, person.employeeCode);
  return (
    <span className={styles.person}>
      <UserAvatar
        name={person.name}
        avatarUrl={person.avatarUrl}
        size={avatarSize}
        style={{ flexShrink: 0 }}
      />
      <span className={styles.copy}>
        <span className={styles.name}>
          <HighlightMatch text={person.name} query={query} />
        </span>
        {code ? (
          <span className={styles.code}>
            <HighlightMatch text={code} query={query} />
          </span>
        ) : null}
      </span>
    </span>
  );
}
