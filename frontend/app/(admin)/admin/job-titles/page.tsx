"use client";

import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";

import { RequirePermission } from "../_components/admin-ui";
import { CatalogCrud } from "../_components/catalog-crud";

export default function AdminJobTitlesPage() {
  return (
    <RequirePermission code={PERM.catalogManage}>
      <CatalogCrud
        noun="chức danh"
        countLabel="Số người dùng"
        showFilterReset={false}
        load={adminApi.listJobTitles}
        create={adminApi.createJobTitle}
        update={adminApi.updateJobTitle}
        remove={adminApi.deleteJobTitle}
      />
    </RequirePermission>
  );
}
