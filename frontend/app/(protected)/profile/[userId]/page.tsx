"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import { userApi, workspaceApi } from "@/services/api";
import { updateSessionCurrentUser } from "@/services/auth/session";
import type { UserProfile, WorkspaceShellData } from "@/types";

import { ProfileHeader } from "../_components/profile-header";
import { ProfileContact, ProfileWork } from "../_components/profile-info";
import styles from "../styles/profile.module.css";
import { t } from "@/lib/i18n";
import { formatEmployeeCode } from "@/lib/utils/employee";

/** Một trang hồ sơ cho mọi người; chỉ chủ tài khoản mới có thao tác chỉnh sửa. */
export default function ProfilePage() {
  const params = useParams();
  const userId = typeof params?.userId === "string" ? decodeURIComponent(params.userId) : "";
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;
  const isSelf = Boolean(viewer.id) && viewer.id === userId;

  const [shellData, setShellData] = useState<WorkspaceShellData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer.id) return;
    let isCancelled = false;

    Promise.all([
      workspaceApi.getShellData(viewer),
      userApi.list(viewer),
    ])
      .then(([{ data: nextShell }, { data: users }]) => {
        if (isCancelled) return;
        setShellData(nextShell);
        setUser(users.find((item) => item.id === userId) ?? null);
      })
      .catch(() => {
        if (!isCancelled) setError(t("Không thể tải hồ sơ."));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer, userId]);

  function handleUpdate(next: UserProfile) {
    setUser(next);
    if (isSelf) updateSessionCurrentUser({ ...viewer, ...next });
  }

  return (
    <WorkspaceShell
      shellData={
        shellData ?? { currentUser: viewer, activeProjects: 0, openTasks: 0, missingLogwork: 0, alertCount: 0 }
      }
      heading={isSelf ? t("Hồ sơ cá nhân") : t("Hồ sơ nhân sự")}
      subheading=""
      highlightLabel={t("Mã")}
      highlightValue={(user ? formatEmployeeCode(user.id, user.employeeCode) : "—")}
    >
      <div className={styles.page}>
        {!isSelf ? <BackButton label={t("Danh sách nhân sự")} href="/team" className={styles.backButton} /> : null}

        {isLoading ? (
          <LoadingState variant="profile" />
        ) : error || !user ? (
          <EmptyState
            title={error ?? t("Không tìm thấy nhân sự")}
            description={t("Nhân sự không tồn tại hoặc đã bị xóa.")}
          />
        ) : (
          <div className={styles.layout}>
            <ProfileHeader user={user} isSelf={isSelf} onUpdate={handleUpdate} />
            <div className={styles.content}>
              <ProfileWork user={user} />
              <ProfileContact user={user} isSelf={isSelf} onUpdate={handleUpdate} />
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
