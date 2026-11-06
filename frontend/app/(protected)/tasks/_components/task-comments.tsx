import { Fragment, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { useConfirmDialog } from "@/components/confirm-dialog";
import { LoadingState } from "@/components/loading-state";
import { UserAvatar } from "@/components/user-avatar";
import { formatDateTime } from "@/lib/utils/format";
import { taskApi } from "@/services/api";
import type { TaskComment, UserProfile } from "@/types";
import styles from "./task-comments.module.css";
import { t } from "@/lib/i18n";

const MENTION_PATTERN = /@\[([^\]]{1,100})\]\((usr-\d+)\)/g;
const MAX_SUGGESTIONS = 6;
/** Số bình luận mới nhất hiển thị mặc định; phần cũ hơn mở bằng "Xem bình luận trước đó". */
const VISIBLE_COMMENTS = 10;

interface Mention {
  id: string;
  name: string;
}

interface TaskCommentsProps {
  taskId: string;
  /** Toàn bộ người dùng, dùng để tra tên/avatar. */
  users: UserProfile[];
  /** Những người có thể được tag (thành viên dự án). */
  mentionableUsers: UserProfile[];
  viewer: UserProfile;
  canManage: boolean;
  /** Báo số bình luận cho nơi hiển thị tiêu đề. */
  onCountChange?: (count: number) => void;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bản sao của nội dung đang gõ, trong đó phần `@Tên` được tô xanh (hiển thị phía sau ô nhập). */
function renderHighlighted(text: string, mentions: Mention[]): ReactNode {
  if (mentions.length === 0) return text;
  const pattern = new RegExp(
    `(${[...mentions]
      .sort((a, b) => b.name.length - a.name.length)
      .map((mention) => escapeRegExp(`@${mention.name}`))
      .join("|")})`,
    "g",
  );
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className={styles.typedMention}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Cũ nhất ở trên, mới nhất ở dưới (như khung chat). */
function sortOldestFirst(items: TaskComment[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

/** Chuyển `@Tên` trong ô nhập thành `@[Tên](usr-id)` để lưu. */
function serializeMentions(text: string, mentions: Mention[]) {
  let output = text;
  [...mentions]
    .sort((a, b) => b.name.length - a.name.length)
    .forEach((mention) => {
      output = output.split(`@${mention.name}`).join(`@[${mention.name}](${mention.id})`);
    });
  return output.trim();
}

export function TaskComments({
  taskId,
  users,
  mentionableUsers,
  viewer,
  canManage,
  onCountChange,
}: TaskCommentsProps) {
  const { confirm, alert } = useConfirmDialog();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    onCountChange?.(comments.length);
  }, [comments.length, onCountChange]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editMentions, setEditMentions] = useState<Mention[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Đóng menu "…" khi click ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (openMenuId === null) return;
    function handlePointerDown(event: MouseEvent) {
      if (!(event.target as Element).closest("[data-comment-menu]")) setOpenMenuId(null);
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);
  useEffect(() => {
    let isCancelled = false;

    function load(showSpinner: boolean) {
      if (showSpinner) setIsLoading(true);
      taskApi
        .listComments(taskId)
        .then((response) => {
          if (isCancelled) return;
          setComments(sortOldestFirst(response.data));
        })
        .catch(() => undefined)
        .finally(() => {
          if (!isCancelled && showSpinner) setIsLoading(false);
        });
    }

    load(true);
    // Có thông báo mới (có thể là bình luận mới của người khác) → tải lại danh sách.
    const handleNotification = () => load(false);
    window.addEventListener("new_notification", handleNotification);
    return () => {
      isCancelled = true;
      window.removeEventListener("new_notification", handleNotification);
    };
  }, [taskId]);

  const suggestions =
    query === null
      ? []
      : mentionableUsers
          .filter((user) => normalize(user.name).includes(normalize(query)))
          .slice(0, MAX_SUGGESTIONS);

  function updateQuery(value: string, caret: number) {
    const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
    setQuery(match ? match[2] : null);
    setActiveIndex(0);
  }

  function pickSuggestion(user: UserProfile) {
    const textarea = textareaRef.current;
    const caret = textarea?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@[^\s@]*$/, `@${user.name} `);
    const next = before + text.slice(caret);

    setText(next);
    setMentions((current) =>
      current.some((mention) => mention.id === user.id)
        ? current
        : [...current, { id: user.id, name: user.name }],
    );
    setQuery(null);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(before.length, before.length);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pickSuggestion(suggestions[activeIndex]);
        return;
      }
    }
    if (event.key === "Escape") {
      setQuery(null);
      return;
    }
    // Ctrl/Cmd + Enter để gửi nhanh.
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  }

  async function submit() {
    const content = serializeMentions(text, mentions);
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const response = await taskApi.addComment(taskId, content);
      setComments((current) => [...current, response.data]);
      setText("");
      setMentions([]);
      setQuery(null);
    } catch (error: unknown) {
      await alert({
        title: t("Không thể gửi bình luận"),
        message: error instanceof Error ? error.message : t("Đã có lỗi xảy ra."),
      });
    } finally {
      setIsSending(false);
    }
  }

  async function remove(comment: TaskComment) {
    const confirmed = await confirm({
      title: t("Xoá bình luận"),
      message: t("Bạn có chắc chắn muốn xoá bình luận này không?"),
      confirmLabel: t("Xoá"),
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await taskApi.removeComment(taskId, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
    } catch (error: unknown) {
      await alert({
        title: t("Không thể xoá bình luận"),
        message: error instanceof Error ? error.message : t("Đã có lỗi xảy ra."),
      });
    }
  }

  const hiddenCount = Math.max(0, comments.length - VISIBLE_COMMENTS);
  const visibleComments =
    showAll || hiddenCount === 0 ? comments : comments.slice(-VISIBLE_COMMENTS);

  function startEdit(comment: TaskComment) {
    const found: Mention[] = [];
    const plain = comment.content.replace(
      MENTION_PATTERN,
      (_raw, fallbackName: string, id: string) => {
        const name = users.find((user) => user.id === id)?.name ?? fallbackName;
        if (!found.some((mention) => mention.id === id)) found.push({ id, name });
        return `@${name}`;
      },
    );
    setEditMentions(found);
    setEditText(plain);
    setEditingId(comment.id);
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditMentions([]);
  }

  async function saveEdit(comment: TaskComment) {
    const content = serializeMentions(editText, editMentions);
    if (!content || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const response = await taskApi.updateComment(taskId, comment.id, content);
      setComments((current) =>
        current.map((item) => (item.id === comment.id ? response.data : item)),
      );
      cancelEdit();
    } catch (error: unknown) {
      await alert({
        title: t("Không thể sửa bình luận"),
        message: error instanceof Error ? error.message : t("Đã có lỗi xảy ra."),
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  function renderContent(content: string): ReactNode {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    for (const match of content.matchAll(MENTION_PATTERN)) {
      const [raw, fallbackName, id] = match;
      const index = match.index ?? 0;
      if (index > lastIndex) parts.push(content.slice(lastIndex, index));
      const name = users.find((user) => user.id === id)?.name ?? fallbackName;
      parts.push(
        <span
          key={`${index}-${id}`}
          className={`${styles.mention}${id === viewer.id ? ` ${styles.mentionSelf}` : ""}`}
        >
          @{name}
        </span>,
      );
      lastIndex = index + raw.length;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));
    return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
  }

  return (
    <div className={styles.root}>
      {isLoading ? (
        <LoadingState variant="cards" />
      ) : comments.length === 0 ? null : (
        <>
          {hiddenCount > 0 ? (
            <button
              type="button"
              className={styles.showPrevious}
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll
                ? t("Thu gọn bình luận cũ")
                : t("Xem {v0} bình luận trước đó", { v0: hiddenCount })}
            </button>
          ) : null}
          <ul className={styles.list}>
            {visibleComments.map((comment) => {
              const author = users.find((user) => user.id === comment.userId);
              const canEdit = comment.userId === viewer.id;
              const canDelete = comment.userId === viewer.id || canManage;
              const isEditing = editingId === comment.id;
              return (
                <li key={comment.id} className={styles.item}>
                  <UserAvatar name={comment.userName} avatarUrl={author?.avatarUrl} size={32} />
                  <div className={styles.itemBody}>
                    <div className={styles.itemHead}>
                      <strong>{author?.name ?? comment.userName}</strong>
                      <span className={styles.time}>{formatDateTime(comment.createdAt)}</span>
                      {(canEdit || canDelete) && !isEditing ? (
                        <div className={styles.menuWrap} data-comment-menu>
                          <button
                            type="button"
                            className={styles.menuButton}
                            aria-label={t("Tuỳ chọn")}
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === comment.id}
                            onClick={() =>
                              setOpenMenuId((current) =>
                                current === comment.id ? null : comment.id,
                              )
                            }
                          >
                            …
                          </button>
                          {openMenuId === comment.id ? (
                            <div className={styles.menu} role="menu">
                              {canEdit ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={styles.menuItem}
                                  onClick={() => startEdit(comment)}
                                >
                                  {t("Chỉnh sửa")}
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void remove(comment);
                                  }}
                                >
                                  {t("Xoá")}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className={styles.editBox}>
                        <textarea
                          className={`app-input ${styles.editTextarea}`}
                          aria-label={t("Chỉnh sửa bình luận")}
                          value={editText}
                          rows={3}
                          autoFocus
                          disabled={isSavingEdit}
                          onChange={(event) => setEditText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") cancelEdit();
                          }}
                        />
                        <div className={styles.editActions}>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={cancelEdit}
                            disabled={isSavingEdit}
                          >
                            {t("Huỷ")}
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void saveEdit(comment)}
                            disabled={isSavingEdit || !editText.trim()}
                          >
                            {isSavingEdit ? t("Đang lưu") : t("Lưu")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.content}>{renderContent(comment.content)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className={styles.composer}>
        <UserAvatar name={viewer.name} avatarUrl={viewer.avatarUrl} size={32} />
        <div className={styles.composerBody}>
          <div className={styles.editor}>
            <div className={styles.highlight} aria-hidden="true">
              {renderHighlighted(text, mentions)}
              {"\n"}
            </div>
            <textarea
              ref={textareaRef}
              className={`app-input ${styles.textarea}`}
              aria-label={t("Viết bình luận")}
              placeholder={t("Viết bình luận")}
              value={text}
              rows={3}
              disabled={isSending}
              onChange={(event) => {
                setText(event.target.value);
                updateQuery(event.target.value, event.target.selectionStart);
              }}
              onKeyDown={handleKeyDown}
              onClick={(event) => updateQuery(text, event.currentTarget.selectionStart)}
              onBlur={() => setTimeout(() => setQuery(null), 120)}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={() => void submit()}
              disabled={isSending || !text.trim()}
              aria-label={t("Gửi bình luận")}
              title={`${t("Gửi bình luận")} (Ctrl+Enter)`}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
            {query !== null ? (
              <ul className={styles.suggestions} role="listbox" aria-label={t("Gợi ý thành viên")}>
                {suggestions.length > 0 ? (
                  suggestions.map((user, index) => (
                    <li
                      key={user.id}
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`${styles.suggestion}${index === activeIndex ? ` ${styles.suggestionActive}` : ""}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        pickSuggestion(user);
                      }}
                    >
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={24} />
                      <span>{user.name}</span>
                    </li>
                  ))
                ) : (
                  <li className={styles.suggestionEmpty}>{t("Không tìm thấy thành viên")}</li>
                )}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
