import type { ReactNode } from "react";

import { requireServerPermission } from "@/services/auth/server";
import { PERM } from "@/lib/permissions";

import { ProtectedRoute } from "@/components/protected-route";

import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireServerPermission(PERM.adminAccess);

  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
