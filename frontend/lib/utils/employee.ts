/** Mã nhân viên hiển thị: ưu tiên employeeCode, mặc định dạng `USR-001` suy ra từ id. */
export function formatEmployeeCode(
  userId: string | number | null | undefined,
  employeeCode?: string | null,
): string {
  const code = employeeCode?.trim();
  if (code) return code;
  if (userId === null || userId === undefined || userId === "") return "";
  const digits = String(userId).replace(/^usr-/i, "");
  return /^\d+$/.test(digits) ? `USR-${digits.padStart(3, "0")}` : digits.toUpperCase();
}

/** Khớp tìm kiếm theo tên hoặc mã nhân viên (không phân biệt hoa thường). */
export function matchesNameOrCode(
  query: string,
  name: string,
  code: string,
  extra: string[] = [],
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [name, code, ...extra].some((value) => value.toLowerCase().includes(needle));
}
