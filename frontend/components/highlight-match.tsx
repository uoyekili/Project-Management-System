import styles from "./highlight-match.module.css";

/** Tô đậm phần khớp với từ khóa tìm kiếm (không phân biệt hoa thường). */
export function HighlightMatch({ text, query }: { text: string; query?: string }) {
  const needle = query?.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle);
  if (index < 0) return <>{text}</>;
  const end = index + needle.length;
  return (
    <>
      {text.slice(0, index)}
      <mark className={styles.mark}>{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  );
}
