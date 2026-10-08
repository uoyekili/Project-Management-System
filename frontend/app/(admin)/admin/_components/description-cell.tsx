import styles from "./admin.module.css";

/** Mô tả trong bảng: một dòng, dài quá thì cắt bằng "..." (rê chuột để xem đầy đủ). */
export function DescriptionCell({ text }: { text: string | null | undefined }) {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return null;
  return (
    <span className={styles.descCell} title={value}>
      {value}
    </span>
  );
}
