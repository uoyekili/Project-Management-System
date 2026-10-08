"use client";

import { SettingsView } from "@/components/settings-view";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PENDING_USER, useAuthSession } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const session = useAuthSession();
  const viewer = session?.currentUser ?? PENDING_USER;

  return (
    <WorkspaceShell
      shellData={{ currentUser: viewer, activeProjects: 0, openTasks: 0, missingLogwork: 0, alertCount: 0 }}
      heading={t("Cài đặt")}
      subheading=""
      highlightLabel=""
      highlightValue=""
    >
      <SettingsView />
    </WorkspaceShell>
  );
}
