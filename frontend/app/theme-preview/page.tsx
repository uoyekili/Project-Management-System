"use client";
import { WorkspaceShell } from "@/components/workspace-shell";
import { NotificationProvider } from "@/contexts/notification-context";
import { PENDING_USER } from "@/hooks/use-session";

// TẠM THỜI — xoá sau khi kiểm tra.
export default function Preview() {
  const user = { ...PENDING_USER, id: "u1", name: "Trần Văn Nam", email: "namtv@gmail.com", role: "Manager", department: "Engineering" };
  return (
    <NotificationProvider>
      <WorkspaceShell shellData={{ currentUser: user, activeProjects: 1, openTasks: 1, missingLogwork: 0, alertCount: 0 }} heading="Tổng quan" subheading="" highlightLabel="" highlightValue="">
        <section className="surface"><div className="surface-header"><h2>Nội dung chính</h2></div><p>Nội dung trang.</p></section>
      </WorkspaceShell>
    </NotificationProvider>
  );
}
