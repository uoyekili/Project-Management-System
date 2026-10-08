"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAuthSession } from "@/hooks/use-session";
import { LogworkApprovalsClient } from "./logwork-approvals-client";
import { WorkspaceShell } from "@/components/workspace-shell";
import { canApproveLogworkAnywhere } from "@/lib/permissions";
import styles from "./logwork-approvals.module.css";
import { t } from "@/lib/i18n";

export default function LogworkApprovalsPage() {
  const session = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.currentUser && !canApproveLogworkAnywhere(session.currentUser)) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (!session?.currentUser || !canApproveLogworkAnywhere(session.currentUser)) {
    return null;
  }

  return (
    <WorkspaceShell
      shellData={{
        currentUser: session.currentUser,
        activeProjects: 0,
        openTasks: 0,
        missingLogwork: 0,
        alertCount: 0,
      }}
      heading={t("Duyệt logwork")}
      subheading={t("Quản lý và xét duyệt báo cáo thời gian làm việc")}
      highlightLabel=""
      highlightValue=""
      noBottomPadding
      fillViewport
    >
      <div className={`${styles.pageWrap} filtered-list-page`}>
        <Suspense fallback={null}>
          <LogworkApprovalsClient />
        </Suspense>
      </div>
    </WorkspaceShell>
  );
}
