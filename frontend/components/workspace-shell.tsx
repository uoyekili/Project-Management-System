"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { markIntentionalLogout, signOut } from "@/services/auth/session";
import { primeTasksPageData } from "@/services/page-cache/tasks-page";
import { UserAvatar } from "@/components/user-avatar";
import { LoadingState } from "@/components/loading-state";
import { useAuthSession, PENDING_USER } from "@/hooks/use-session";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { NavIcon } from "@/components/nav-icon";
import { SoftwareLogo } from "@/components/software-logo";
import { useNotifications } from "@/contexts/notification-context";
import { canApproveLogworkAnywhere, isAdmin } from "@/lib/permissions";
import { resolveNotificationLink } from "@/lib/utils/notification-link";
import type { WorkspaceShellData } from "@/types";
import { t } from "@/lib/i18n";

const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: "grid" },
  { href: "/projects", label: "Dự án", icon: "layers" },
  { href: "/tasks", label: "Nhiệm vụ", icon: "kanban" },
  { href: "/logwork", label: "Logwork", icon: "check-circle" },
  { href: "/team", label: "Nhân sự", icon: "users" },
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function WorkspaceShell({
  shellData,
  heading,
  highlightLabel,
  highlightValue = "",
  headerAction,
  noBottomPadding,
  fillViewport,
  stickyTopbar,
  children,
}: {
  shellData: WorkspaceShellData;
  heading: string;
  subheading: string;
  highlightLabel: string;
  highlightValue: string;
  headerAction?: ReactNode;
  noBottomPadding?: boolean;
  fillViewport?: boolean;
  stickyTopbar?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthSession();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeShellData = session
    ? {
      ...shellData,
      currentUser: session.currentUser,
    }
    : shellData;
  const currentUser = activeShellData.currentUser ?? PENDING_USER;
  const currentUserId = currentUser.id;
  const canViewLogworkApprovals = canApproveLogworkAnywhere(currentUser);
  const isAdminAccount = isAdmin(currentUser);

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === "/logwork") return canViewLogworkApprovals;
    return true;
  });

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    // Admin tách biệt với vận hành: không có dự án/task, chỉ dùng khu /admin.
    if (isAdminAccount) {
      router.replace("/admin");
    } else if (pathname?.startsWith("/logwork") && !canViewLogworkApprovals) {
      router.replace("/dashboard");
    }
  }, [canViewLogworkApprovals, currentUserId, isAdminAccount, pathname, router]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    filteredNavigation.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [filteredNavigation, router]);

  useEffect(() => {
    const warmupTimer = window.setTimeout(() => {
      void primeTasksPageData(currentUser);
    }, 250);

    return () => {
      window.clearTimeout(warmupTimer);
    };
  }, [currentUser, currentUserId]);

  const warmTasksPage = () => {
    void primeTasksPageData(currentUser);
  };

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    markIntentionalLogout();
    await signOut();
    window.location.assign("/login");
  };

  const handleOpenSettings = () => {
    setIsProfileMenuOpen(false);
    router.push("/settings");
  };

  const handleOpenProfile = () => {
    setIsProfileMenuOpen(false);
    router.push(currentUserId ? `/profile/${encodeURIComponent(currentUserId)}` : "/profile");
  };

  return (
    <div
      className={classNames(
        "app-shell",
        fillViewport && "app-shell-fill",
        isSidebarCollapsed && "is-sidebar-collapsed",
      )}
    >
      <aside id="app-sidebar" className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <Link href="/" className="sidebar-logo-link" aria-label={t("Về trang chủ")}>
              <SoftwareLogo subtitle="Project Management" />
            </Link>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.href.slice(1)}`}
              data-tooltip={t(item.label)}
              className={classNames(
                "nav-link",
                (pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  (item.href === "/dashboard" && pathname === "/")) &&
                  "nav-link-active",
              )}
              onPointerEnter={item.href === "/tasks" ? warmTasksPage : undefined}
              onFocus={item.href === "/tasks" ? warmTasksPage : undefined}
              onPointerDown={item.href === "/tasks" ? warmTasksPage : undefined}
            >
              <NavIcon icon={item.icon} />
              <span>{t(item.label)}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            data-testid="sidebar-toggle"
            data-tooltip={isSidebarCollapsed ? t("Mở rộng thanh bên") : t("Thu gọn thanh bên")}
            className="nav-link sidebar-toggle"
            aria-label={isSidebarCollapsed ? t("Mở rộng thanh bên") : t("Thu gọn thanh bên")}
            aria-expanded={!isSidebarCollapsed}
            aria-controls="app-sidebar"
            onClick={toggleSidebar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
              {isSidebarCollapsed ? <path d="m13.5 10 2 2-2 2" /> : <path d="m15.5 10-2 2 2 2" />}
            </svg>
            <span>{isSidebarCollapsed ? t("Mở rộng") : t("Thu gọn")}</span>
          </button>
        </div>
      </aside>

      <main
        className={classNames(
          "workspace-main",
          fillViewport && "workspace-main-fill",
          stickyTopbar && "workspace-main-sticky-topbar",
        )}
        style={!fillViewport && noBottomPadding ? { paddingBottom: 0 } : undefined}
      >
        <header className="topbar">
          <div className="topbar-title">
            <h1>{heading}</h1>
          </div>
          <div className="topbar-actions">
            {headerAction}
            <div ref={notifRef} className="profile-dropdown">
              <button
                type="button"
                data-testid="notifications-toggle"
                className="topbar-icon-button"
                title={t("Thông báo")}
                aria-label={t("Thông báo")}
                aria-haspopup="true"
                aria-expanded={isNotifOpen}
                onClick={() => setIsNotifOpen(!isNotifOpen)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="topbar-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>

              {isNotifOpen && (
                <div className="popover popover-notifications">
                  <div className="popover-header">
                    <h3>{t("Thông báo")}</h3>
                    {unreadCount > 0 && (
                      <button type="button" className="text-button btn-sm" onClick={markAllAsRead}>
                        {t("Đánh dấu đã đọc")}</button>
                    )}
                  </div>
                  <div className="popover-body">
                    {notifications.length === 0 ? (
                      <div className="popover-empty">{t("Bạn không có thông báo nào.")}</div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          type="button"
                          key={notif.id}
                          className={classNames("notification-item", !notif.is_read && "is-unread")}
                          onClick={() => {
                            markAsRead(notif.id);
                            router.push(resolveNotificationLink(notif.link));
                            setIsNotifOpen(false);
                          }}
                        >
                          <div className="notification-title">{notif.title}</div>
                          <div className="notification-content">{notif.content}</div>
                          <div className="notification-time">
                            {new Date(notif.created_at + (!notif.created_at.endsWith("Z") ? "Z" : "")).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="profile-dropdown" ref={profileMenuRef}>
              <button
                type="button"
                data-testid="profile-menu-toggle"
                className="topbar-avatar-button"
                aria-label={t("Tài khoản")}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((current) => !current)}
              >
                <UserAvatar
                  name={activeShellData.currentUser.name}
                  avatarUrl={activeShellData.currentUser.avatarUrl}
                  size={32}
                />
              </button>

              {isProfileMenuOpen ? (
                <div className="profile-menu" role="menu" aria-label="Profile actions">
                  <div className="profile-menu-head">
                    <UserAvatar
                      name={activeShellData.currentUser.name}
                      avatarUrl={activeShellData.currentUser.avatarUrl}
                      size={44}
                    />
                    <div className="profile-menu-identity">
                      <strong>{activeShellData.currentUser.name}</strong>
                      <span>{currentUser.title}</span>
                    </div>
                  </div>
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-button"
                      role="menuitem"
                      onClick={handleOpenProfile}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4Z" />
                        </svg>
                      </span>
                      <span className="profile-menu-copy">
                        <strong>{t("Hồ sơ")}</strong>
                        <small>{t("Xem thông tin cá nhân")}</small>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="profile-menu-item profile-menu-button"
                      role="menuitem"
                      onClick={handleOpenSettings}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="profile-menu-copy">
                        <strong>{t("Cài đặt")}</strong>
                        <small>{t("Giao diện, ngôn ngữ, bảo mật")}</small>
                      </span>
                    </button>

                    <button
                      type="button"
                      data-testid="logout-button"
                      className="profile-menu-item profile-menu-button"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M10 17v-2h4V9h-4V7h7v10Zm-1-3-3-3 3-3v2h5v2H9Z" />
                          <path d="M4 5h7v2H6v10h5v2H4Z" />
                        </svg>
                      </span>
                      <span className="profile-menu-copy">
                        <strong>{t("Đăng xuất")}</strong>
                        <small>{t("Thoát khỏi phiên hiện tại")}</small>
                      </span>
                    </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="page-stack">{isAdminAccount ? <LoadingState /> : children}</div>
      </main>

    </div>
  );
}
