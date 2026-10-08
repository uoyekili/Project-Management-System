"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { FilterBar, FilterSearch } from "@/components/filter-bar";
import { TableBodySkeleton } from "@/components/loading-state";
import { Modal } from "@/components/modal";
import { EmptyState, Surface } from "@/components/ui";

import teamStyles from "../../../(protected)/team/styles/team.module.css";
import styles from "./admin.module.css";
import { errorMessage, useToast } from "./admin-ui";
import { DescriptionCell } from "./description-cell";

export type CatalogItem = {
  id: number;
  name: string;
  description: string | null;
  rank?: number;
  user_count?: number;
  member_count?: number;
};

export type CatalogPayload = { name: string; description: string | null; rank?: number };

type CatalogCrudProps = {
  noun: string; // "chức danh", "phòng ban"
  withRank?: boolean;
  countLabel: string;
  load: () => Promise<CatalogItem[]>;
  create: (payload: CatalogPayload) => Promise<unknown>;
  update: (id: number, payload: CatalogPayload) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  /** Hành động bổ sung trên mỗi dòng (vd. xem thành viên phòng ban). */
  renderRowAction?: (item: CatalogItem) => React.ReactNode;
  showFilterReset?: boolean;
  /** Nếu có, bấm vào dòng sẽ chuyển sang trang quản lý riêng của mục đó. */
  getItemHref?: (item: CatalogItem) => string;
  /** Nếu có, nút thêm mới chuyển sang trang riêng thay vì mở popup. */
  newHref?: string;
};

/** Trang CRUD danh mục dùng chung cho Phòng ban và Chức danh (bảng/bộ lọc giống trang vận hành). */
export function CatalogCrud({
  noun,
  withRank,
  countLabel,
  load,
  create,
  update,
  remove,
  renderRowAction,
  showFilterReset = true,
  getItemHref,
  newHref,
}: CatalogCrudProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CatalogItem | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rank, setRank] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await load());
    } catch (err) {
      toast.error(errorMessage(err));
      setItems((current) => current ?? []);
    }
  }, [load, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items ?? [];
    return (items ?? []).filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term),
    );
  }, [items, search]);

  function openForm(item: CatalogItem | "new") {
    setEditing(item);
    setName(item === "new" ? "" : item.name);
    setDescription(item === "new" ? "" : (item.description ?? ""));
    setRank(item === "new" ? String((items?.length ?? 0) + 1) : String(item.rank ?? 0));
    setFormError(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setFormError("Vui lòng nhập tên.");
      return;
    }
    const payload: CatalogPayload = {
      name: name.trim(),
      description: description.trim() || null,
      ...(withRank ? { rank: Number(rank) || 0 } : {}),
    };
    setSaving(true);
    try {
      if (editing === "new") {
        await create(payload);
        toast.success(`Đã tạo ${noun}.`);
      } else if (editing) {
        await update(editing.id, payload);
        // Hiển thị ngay, không chờ tải lại danh sách.
        const target = editing;
        setItems((current) =>
          current
            ? current.map((row) => (row.id === target.id ? { ...row, ...payload } : row))
            : current,
        );
        toast.success("Đã lưu thay đổi.");
      }
      setEditing(null);
      void reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: CatalogItem) {
    const ok = await confirm({
      title: `Xóa ${noun}`,
      message: `Xóa ${noun} "${item.name}"?`,
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(item.id);
      toast.success(`Đã xóa ${noun}.`);
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const columns = withRank ? 5 : 4;

  return (
    <div className="filtered-list-page">
      <FilterBar
        search={<FilterSearch value={search} onChange={setSearch} placeholder={`Tìm ${noun}...`} />}
        activeCount={search.trim() ? 1 : 0}
        onReset={() => setSearch("")}
        showReset={showFilterReset}
        action={
          <ActionButton
            kind="add"
            onClick={() => (newHref ? router.push(newHref) : openForm("new"))}
          >
            Thêm {noun}
          </ActionButton>
        }
      />

      <Surface className={`${teamStyles.tableSurface} filtered-list-table`}>
        {!items || visible.length > 0 ? (
          <div className={`${teamStyles.tableWrap} table-scroll`}>
            <table className={teamStyles.table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  {withRank ? <th>Thứ hạng</th> : null}
                  <th>Mô tả</th>
                  <th>{countLabel}</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {!items ? (
                  <TableBodySkeleton rows={8} columns={columns} />
                ) : (
                  visible.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      {withRank ? <td>{item.rank}</td> : null}
                      <td>
                        <DescriptionCell text={item.description} />
                      </td>
                      <td>{item.user_count ?? item.member_count ?? 0}</td>
                      <td>
                        <div className={styles.rowActions}>
                          {renderRowAction?.(item)}
                          {getItemHref ? (
                            <button
                              type="button"
                              className={`secondary-button ${teamStyles.detailButton}`}
                              onClick={() => {
                                router.push(getItemHref(item));
                              }}
                            >
                              Chi tiết
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`secondary-button ${teamStyles.detailButton}`}
                              onClick={() => openForm(item)}
                            >
                              Sửa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={search ? `Không tìm thấy ${noun} phù hợp` : `Chưa có ${noun} nào`}
            description={search ? "Thử đổi từ khóa tìm kiếm." : `Nhấn "Thêm ${noun}" để tạo mới.`}
          />
        )}
      </Surface>

      {editing ? (
        <Modal
          title={editing === "new" ? `Thêm ${noun}` : `Chỉnh sửa ${noun}`}
          titleId="catalog-title"
          size="md"
          onClose={() => setEditing(null)}
          dismissible={!saving}
        >
          <form
            className="app-modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div className="app-modal-body">
              <label className="app-field">
                <span className="app-label">Tên</span>
                <input
                  className={`app-input ${styles.plainInput}`}
                  value={name}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {withRank ? (
                <label className="app-field">
                  <span className="app-label">Thứ hạng</span>
                  <input
                    className="app-input"
                    type="number"
                    value={rank}
                    onChange={(event) => setRank(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="app-field">
                <span className="app-label">Mô tả</span>
                <textarea
                  className={`app-input ${styles.plainInput} ${styles.modalDescTextarea}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              {formError ? (
                <div className="form-error" role="alert">
                  {formError}
                </div>
              ) : null}
            </div>
            <footer className="app-modal-footer">
              {editing !== "new" ? (
                <ActionButton
                  kind="delete"
                  className={styles.footerDelete}
                  disabled={saving}
                  onClick={() => void handleDelete(editing)}
                >
                  Xóa
                </ActionButton>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
