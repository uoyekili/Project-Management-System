"use client";

import { PERM } from "@/lib/permissions";
import { adminApi } from "@/services/api";

import { RequirePermission } from "../_components/admin-ui";
import { CatalogCrud } from "../_components/catalog-crud";

export default function AdminDepartmentsPage() {
  return (
    <RequirePermission code={PERM.departmentManage}>
      <CatalogCrud
        noun="phòng ban"
        countLabel="Thành viên"
        load={adminApi.listDepartments}
        create={adminApi.createDepartment}
        update={adminApi.updateDepartment}
        remove={adminApi.deleteDepartment}
        newHref="/admin/departments/new"
        getItemHref={(item) => `/admin/departments/${item.id}`}
        showFilterReset={false}
      />
    </RequirePermission>
  );
}
