"use client";

import { MODAL_EXIT_MS } from "@/components/modal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { logworkApi, type PendingLogWork } from "@/services/api/logworks";
import { TableBodySkeleton } from "@/components/loading-state";
import { useAuthSession } from "@/hooks/use-session";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { Surface } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import type { FilterOption } from "@/components/filter-select";
import { formatDateNumeric, formatHours } from "@/lib/utils/format";
import { resolveLogworkTitle } from "@/lib/utils/logwork";
import { LogworkDetailModal } from "./_components/logwork-detail-modal";
import { LogworkApprovalsFilter, type LogworkDatePeriod } from "./_components/logwork-approvals-filter";
import styles from "./logwork-approvals.module.css";
import { t } from "@/lib/i18n";

const LOGWORKS_BATCH_SIZE = 20;

function staffKey(logwork: PendingLogWork) {
  return logwork.user_id != null ? String(logwork.user_id) : logwork.user_name || "";
}

function projectKey(logwork: PendingLogWork) {
  return logwork.project_id != null ? String(logwork.project_id) : logwork.project_name || "";
}

function toDateKey(value: string | undefined) {
  return (value || "").slice(0, 10);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfCurrentWeek(today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = start.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}

function matchesDatePeriod(workDate: string, period: LogworkDatePeriod) {
  if (!period) return true;
  if (!workDate) return false;

  const today = new Date();
  const todayKey = toLocalDateKey(today);

  if (period === "day") {
    return workDate === todayKey;
  }

  if (period === "week") {
    const weekStart = startOfCurrentWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return workDate >= toLocalDateKey(weekStart) && workDate <= toLocalDateKey(weekEnd);
  }

  const monthStart = toLocalDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = toLocalDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  return workDate >= monthStart && workDate <= monthEnd;
}


export function LogworkApprovalsClient() {
  const session = useAuthSession();
  const { confirm, alert } = useConfirmDialog();
  const searchParams = useSearchParams();
  const highlightLogworkId = searchParams.get("highlightLogworkId");
  const [logworks, setLogworks] = useState<PendingLogWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [staffFilter, setStaffFilter] = useState<string[]>([]);
  const [datePeriod, setDatePeriod] = useState<LogworkDatePeriod>("");
  const [flashLogworkId, setFlashLogworkId] = useState<string | null>(null);
  const [selectedLogwork, setSelectedLogwork] = useState<PendingLogWork | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(LOGWORKS_BATCH_SIZE);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null);
  const highlightHandledRef = useRef<string | null>(null);

  const hasActiveFilters =
    search.trim().length > 0 || projectFilter.length > 0 || staffFilter.length > 0 || Boolean(datePeriod);

  const resetFilters = useCallback(() => {
    setSearch("");
    setProjectFilter([]);
    setStaffFilter([]);
    setDatePeriod("");
  }, []);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const logwork of logworks) {
      const key = projectKey(logwork);
      if (key && !map.has(key)) {
        map.set(key, logwork.project_name || t("Không xác định"));
      }
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label, "vi"),
    );
  }, [logworks]);

  const staffOptions = useMemo(() => {
    const map = new Map<string, FilterOption>();
    for (const logwork of logworks) {
      const key = staffKey(logwork);
      if (key && !map.has(key)) {
        const name = logwork.user_name || "Unknown";
        map.set(key, {
          value: key,
          label: name,
          person: {
            userId: logwork.user_id != null ? `usr-${logwork.user_id}` : null,
            name,
            avatarUrl: logwork.user_avatar_url,
          },
        });
      }
    }
    return Array.from(map.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "vi"),
    );
  }, [logworks]);

  // Bỏ các lựa chọn lọc không còn tồn tại (vd. sau khi duyệt hết logwork của một nhân sự/dự án)
  // để bộ lọc không bị "trống" ngầm: đang lọc nhưng dropdown không hiển thị lựa chọn nào.
  useEffect(() => {
    if (loading) return;
    const projectValues = new Set(projectOptions.map((option) => option.value));
    const staffValues = new Set(staffOptions.map((option) => option.value));
    setProjectFilter((prev) => {
      const next = prev.filter((value) => projectValues.has(value));
      return next.length === prev.length ? prev : next;
    });
    setStaffFilter((prev) => {
      const next = prev.filter((value) => staffValues.has(value));
      return next.length === prev.length ? prev : next;
    });
  }, [loading, projectOptions, staffOptions]);

  const filteredLogworks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logworks.filter((logwork) => {
      if (query && !resolveLogworkTitle(logwork.title, logwork.work_content).toLowerCase().includes(query)) {
        return false;
      }

      if (projectFilter.length > 0 && !projectFilter.includes(projectKey(logwork))) {
        return false;
      }

      if (staffFilter.length > 0 && !staffFilter.includes(staffKey(logwork))) {
        return false;
      }

      if (!matchesDatePeriod(toDateKey(logwork.work_date), datePeriod)) {
        return false;
      }

      return true;
    });
  }, [datePeriod, logworks, projectFilter, search, staffFilter]);

  const visibleLogworks = useMemo(
    () => filteredLogworks.slice(0, visibleCount),
    [filteredLogworks, visibleCount],
  );
  const hasMore = visibleCount < filteredLogworks.length;

  // Đổi bộ lọc thì quay về lô đầu tiên.
  useEffect(() => {
    setVisibleCount(LOGWORKS_BATCH_SIZE);
  }, [datePeriod, projectFilter, search, staffFilter]);

  // Cuộn gần cuối bảng thì render thêm một lô.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => current + LOGWORKS_BATCH_SIZE);
        }
      },
      { root: tableWrapRef.current, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  const fetchLogworks = async () => {
    try {
      const data = await logworkApi.getPending();
      setLogworks(data);
    } catch (err) {
      console.error("Failed to fetch pending logworks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogworks();

    const handleNewNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "LOGWORK_SUBMITTED") {
        fetchLogworks();
      }
    };

    window.addEventListener("new_notification", handleNewNotification);
    return () => window.removeEventListener("new_notification", handleNewNotification);
  }, [session]);

  useEffect(() => {
    if (!highlightLogworkId) return;
    resetFilters();
    highlightHandledRef.current = null;
  }, [highlightLogworkId, resetFilters]);

  const openDetail = useCallback((logwork: PendingLogWork) => {
    setIsModalClosing(false);
    setSelectedLogwork(logwork);
  }, []);

  useEffect(() => {
    if (!highlightLogworkId || loading) return;
    if (highlightHandledRef.current === highlightLogworkId) return;
    if (hasActiveFilters) return;

    const index = filteredLogworks.findIndex((lw) => String(lw.id) === String(highlightLogworkId));
    if (index < 0) return;

    highlightHandledRef.current = highlightLogworkId;
    setVisibleCount((current) => Math.max(current, index + 1));
    setFlashLogworkId(String(highlightLogworkId));
    openDetail(filteredLogworks[index]);

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`logwork-row-${highlightLogworkId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 350);

    const clearTimer = window.setTimeout(() => {
      setFlashLogworkId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("highlightLogworkId");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }, 5000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [filteredLogworks, hasActiveFilters, highlightLogworkId, loading, openDetail]);

  // Đóng chủ động (sau khi duyệt/từ chối): phát animation đóng rồi gỡ modal.
  const closeDetail = () => {
    setIsModalClosing(true);
  };

  // Modal tự phát animation khi đóng bằng Esc / click nền / nút X rồi mới gọi hàm này.
  const handleModalClosed = useCallback(() => {
    setSelectedLogwork(null);
    setIsModalClosing(false);
  }, []);

  useEffect(() => {
    if (!isModalClosing || !selectedLogwork) return;
    const timer = window.setTimeout(handleModalClosed, MODAL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [handleModalClosed, isModalClosing, selectedLogwork]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await logworkApi.approve(id);
      setLogworks((prev) => prev.filter((lw) => lw.id !== id));
      closeDetail();
    } catch (err: unknown) {
      await alert({
        title: t("Không thể duyệt"),
        message: err instanceof Error ? err.message : t("Lỗi khi duyệt logwork"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    const confirmed = await confirm({
      title: t("Từ chối logwork"),
      message: t("Bạn có chắc muốn từ chối bản ghi logwork này?"),
      confirmLabel: t("Từ chối"),
      tone: "danger",
    });
    if (!confirmed) return;

    setActionLoading(id);
    try {
      await logworkApi.reject(id);
      setLogworks((prev) => prev.filter((lw) => lw.id !== id));
      closeDetail();
    } catch (err: unknown) {
      await alert({
        title: t("Không thể từ chối"),
        message: err instanceof Error ? err.message : t("Lỗi khi từ chối logwork"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const selectedTitle = selectedLogwork
    ? resolveLogworkTitle(selectedLogwork.title, selectedLogwork.work_content)
    : "";

  return (
    <>
      <div className={`${styles.pageStack} filtered-list-page`}>
        <LogworkApprovalsFilter
          search={search}
          onSearchChange={setSearch}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          projectOptions={projectOptions}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
          staffOptions={staffOptions}
          datePeriod={datePeriod}
          onDatePeriodChange={setDatePeriod}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        <Surface className={`${styles.tableSurface} filtered-list-table`}>
          <div ref={tableWrapRef} className={`${styles.tableWrap} table-scroll`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colTitle}>{t("Tên logwork")}</th>
                  <th className={styles.colStaff}>{t("Nhân sự")}</th>
                  <th className={styles.colProject}>{t("Dự án")}</th>
                  <th className={styles.colTask}>Task</th>
                  <th className={styles.colHours}>{t("Số giờ")}</th>
                  <th className={styles.colDate}>{t("Ngày tạo")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableBodySkeleton rows={8} columns={6} />
                ) : filteredLogworks.length > 0 ? (
                  <>
                  {visibleLogworks.map((lw) => (
                    <tr
                      key={lw.id}
                      id={`logwork-row-${lw.id}`}
                      className={`${styles.clickableRow} ${flashLogworkId === String(lw.id) ? styles.rowHighlight : ""}`}
                      onClick={() => openDetail(lw)}
                    >
                      <td className={styles.titleCell}>
                        {resolveLogworkTitle(lw.title, lw.work_content)}
                      </td>
                      <td>
                        <div className={styles.staffCell}>
                          <UserAvatar
                            name={lw.user_name || "Unknown"}
                            avatarUrl={lw.user_avatar_url}
                            size={24}
                            className={styles.avatarToken}
                          />
                          <span className={styles.staffName}>{lw.user_name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className={styles.projectCell}>
                        {lw.project_id ? (
                          <Link
                            href={`/projects/${lw.project_id}?tab=overview`}
                            className={styles.projectName}
                            title={lw.project_name || t("Không xác định")}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {lw.project_name || t("Không xác định")}
                          </Link>
                        ) : (
                          <span className={styles.projectText} title={lw.project_name || t("Không xác định")}>
                            {lw.project_name || t("Không xác định")}
                          </span>
                        )}
                      </td>
                      <td className={styles.taskCell}>
                        {lw.task_id && lw.project_id ? (
                          <Link
                            href={`/projects/${lw.project_id}?highlightTaskId=${lw.task_id}&highlightColor=green`}
                            className={styles.taskTitle}
                            title={lw.task_title || "---"}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {lw.task_title || "---"}
                          </Link>
                        ) : (
                          <span className={styles.taskText} title={lw.task_title || "---"}>
                            {lw.task_title || "---"}
                          </span>
                        )}
                      </td>
                      <td className={styles.hoursText}>{formatHours(Number(lw.hours_spent))}</td>
                      <td className={styles.dateText}>{formatDateNumeric(lw.work_date)}</td>
                    </tr>
                  ))}
                  {hasMore ? (
                    <tr ref={loadMoreRef} aria-hidden="true">
                      <td colSpan={6} />
                    </tr>
                  ) : null}
                  </>
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.emptyFilter}>
                      {logworks.length === 0 ? (
                        <>
                          <strong>{t("Không có yêu cầu duyệt log work nào")}</strong>
                          <p>{t("Tất cả các báo cáo thời gian đã được xem xét.")}</p>
                        </>
                      ) : (
                        t("Không tìm thấy logwork nào phù hợp với bộ lọc.")
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      {selectedLogwork ? (
        <LogworkDetailModal
          logwork={{
            id: selectedLogwork.id,
            title: selectedTitle,
            userName: selectedLogwork.user_name,
            userAvatarUrl: selectedLogwork.user_avatar_url,
            status: "PENDING",
            projectId: selectedLogwork.project_id,
            projectName: selectedLogwork.project_name,
            taskId: selectedLogwork.task_id,
            taskTitle: selectedLogwork.task_title,
            hours: Number(selectedLogwork.hours_spent),
            workDate: selectedLogwork.work_date,
            content: selectedLogwork.work_content,
          }}
          onClose={handleModalClosed}
          closing={isModalClosing}
          busy={actionLoading != null}
          onApprove={() => void handleApprove(selectedLogwork.id)}
          onReject={() => void handleReject(selectedLogwork.id)}
        />
      ) : null}
    </>
  );
}
