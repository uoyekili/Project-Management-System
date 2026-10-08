"use client";

import { UserAvatar } from "@/components/user-avatar";
import type { DashboardWorkloadMember } from "@/types";

import styles from "../styles/dashboard.module.css";
import { Legend, Tip } from "./charts";
import { DashCard } from "./dashboard-card";
import { STATUS_COLORS } from "./dashboard-utils";
import { t } from "@/lib/i18n";

const MAX_ROWS = 8;

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function WorkloadPanel({ members }: { members: DashboardWorkloadMember[] }) {
  const rows = members.slice(0, MAX_ROWS);
  const maxTasks = Math.max(1, ...rows.map((member) => member.assignedTasks));

  return (
    <DashCard
      title={t("Khối lượng công việc")}
      subtitle={
        members.length > rows.length
          ? t("{v0}/{v1} thành viên nhiều việc nhất", { v0: rows.length, v1: members.length })
          : t("Task đang được giao cho từng thành viên")
      }
    >
      <div className={`${styles.legendBar} ${styles.legendInline}`}>
        <Legend
          items={[
            { key: "done", label: t("Hoàn thành"), color: STATUS_COLORS.done },
            { key: "progress", label: t("Đang làm"), color: STATUS_COLORS.progress },
            { key: "todo", label: t("Chưa bắt đầu"), color: STATUS_COLORS.todo },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>{t("Chưa có task nào được giao.")}</div>
      ) : (
        <div className={styles.workloadList}>
          {rows.map((member) => {
            const scale = (member.assignedTasks / maxTasks) * 100;
            const parts = [
              { label: t("Hoàn thành"), value: member.doneTasks, color: STATUS_COLORS.done },
              { label: t("Đang làm"), value: member.inProgressTasks, color: STATUS_COLORS.progress },
              { label: t("Chưa bắt đầu"), value: member.todoTasks, color: STATUS_COLORS.todo },
            ];
            return (
              <div key={member.userId} className={styles.workloadRow}>
                <div className={styles.person}>
                  <UserAvatar name={member.name}
                  avatarUrl={member.avatarUrl} size={32} />
                  <div className={styles.personText}>
                    <span className={styles.personName}>{member.name}</span>
                    <span className={styles.personSub}>{member.roleName}</span>
                  </div>
                </div>
                <div className={styles.stack} role="img" aria-label={`${member.name}: ${member.assignedTasks} task`}>
                  <div className={styles.stackInner} style={{ width: `${scale}%` }}>
                    {parts
                      .filter((part) => part.value > 0)
                      .map((part) => (
                        <span key={part.label} className={styles.stackedCell} style={{ flexGrow: part.value }}>
                          <Tip className={styles.stackedPart} text={`${member.name}\n${part.label}: ${part.value}`}>
                            <span style={{ background: part.color }} />
                          </Tip>
                        </span>
                      ))}
                  </div>
                </div>
                <div className={styles.workloadNums}>
                  {member.overdueTasks > 0 ? (
                    <Tip text={t("{v0} task quá hạn", { v0: member.overdueTasks })} className={`${styles.chip} ${styles.chipDanger}`}>
                      {member.overdueTasks}  {t("trễ")}</Tip>
                  ) : null}
                  <Tip text={t("{v0} task được giao", { v0: member.assignedTasks })} className={styles.chip}>
                    {member.assignedTasks} task
                  </Tip>
                  <Tip text={t("Giờ làm đã được duyệt")} className={`${styles.chip} ${styles.chipHours}`}>
                    <ClockIcon />
                    {member.loggedHours}h
                  </Tip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashCard>
  );
}
