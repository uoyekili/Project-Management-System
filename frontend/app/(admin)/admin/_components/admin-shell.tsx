"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { SoftwareLogo } from "@/components/software-logo";
import { UserAvatar } from "@/components/user-avatar";
import { PENDING_USER, useAuthSession } from "@/hooks/use-session";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { canCode, PERM } from "@/lib/permissions";
import { markIntentionalLogout, signOut } from "@/services/auth/session";

import styles from "./admin-shell.module.css";
import { AdminIcon, AdminTitleContext, cx, ToastProvider, type AdminIconName } from "./admin-ui";

type NavItem = { href: string; label: string; icon: AdminIconName; permission?: string };

/** Mỗi mục chỉ hiện khi role có đúng permission quản trị tương ứng. */
const NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "dashboard" },
  { href: "/admin/users", label: "Người dùng", icon: "users", permission: PERM.userManage },
  {
    href: "/admin/departments",
    label: "Phòng ban",
    icon: "building",
    permission: PERM.departmentManage,
  },
  {
    href: "/admin/job-titles",
    label: "Chức danh",
    icon: "briefcase",
    permission: PERM.catalogManage,
  },
  { href: "/admin/roles", label: "Phân quyền", icon: "shield", permission: PERM.roleManage },
];

const TITLES: Record<string, string> = {
  ...Object.fromEntries(NAV.map((item) => [item.href, item.label])),
  "/admin/settings": "Cài đặt",
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const session = useAuthSession();
  const user = session?.currentUser ?? PENDING_USER;
  const [menuOpen, setMenuOpen] = useState(false);
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // Ngăn kéo gắn với đường dẫn lúc mở: đổi trang thì tự đóng, không cần effect đặt lại state.
  const [drawerFor, setDrawerFor] = useState<string | null>(null);
  const drawerOpen = isMobile && drawerFor === pathname;
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  // Dưới 768px sidebar là ngăn kéo; trạng thái thu gọn không áp dụng.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerFor(null);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [closeDrawer, drawerOpen]);

  // Quyền thật do backend kiểm tra; đây chỉ chuyển hướng UX khi tài khoản không phải Admin.
  useEffect(() => {
    if (user.id && !canCode(user, PERM.adminAccess)) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    markIntentionalLogout();
    await signOut();
    window.location.assign("/login");
  };

  const currentTitle =
    TITLES[pathname] ??
    NAV.find((item) => item.href !== "/admin" && pathname.startsWith(item.href))?.label ??
    "Tổng quan";

  return (
    <ToastProvider>
      <AdminTitleContext.Provider value={setTitleOverride}>
        <div
          className={cx(
            "app-shell",
            "app-shell-fill",
            styles.shell,
            isSidebarCollapsed && !isMobile && "is-sidebar-collapsed",
          )}
        >
          <aside
            id="app-sidebar"
            ref={sidebarRef}
            className={cx("sidebar", drawerOpen && styles.drawerOpen)}
            aria-hidden={isMobile && !drawerOpen ? true : undefined}
          >
            <div className="sidebar-header">
              <div className="sidebar-logo-container">
                <Link href="/admin" className="sidebar-logo-link" aria-label="Trang chủ quản trị">
                  <SoftwareLogo subtitle="Project Management" />
                </Link>
              </div>
            </div>

            <nav className="sidebar-nav" aria-label="Quản trị">
              {NAV.filter((item) => !item.permission || canCode(user, item.permission)).map(
                (item) => {
                  const active =
                    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tooltip={item.label}
                      className={cx("nav-link", active && "nav-link-active")}
                      aria-current={active ? "page" : undefined}
                    >
                      <AdminIcon name={item.icon} solid />
                      <span>{item.label}</span>
                    </Link>
                  );
                },
              )}
            </nav>

            <div className="sidebar-footer">
              <button
                type="button"
                data-tooltip={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                className="nav-link sidebar-toggle"
                aria-label={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                aria-expanded={!isSidebarCollapsed}
                aria-controls="app-sidebar"
                onClick={toggleSidebar}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <path d="M9 4v16" />
                  {isSidebarCollapsed ? (
                    <path d="m13.5 10 2 2-2 2" />
                  ) : (
                    <path d="m15.5 10-2 2 2 2" />
                  )}
                </svg>
                <span>{isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}</span>
              </button>
            </div>
          </aside>

          <div
            className={cx(styles.overlay, drawerOpen && styles.overlayVisible)}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <div className={styles.main}>
            <header className={styles.topbar}>
              <div className={styles.topbarLead}>
                <button
                  ref={menuButtonRef}
                  type="button"
                  className={styles.menuButton}
                  aria-label="Mở menu điều hướng"
                  aria-expanded={drawerOpen}
                  aria-controls="app-sidebar"
                  onClick={() => setDrawerFor(pathname)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className={styles.topbarTitle}>{titleOverride ?? currentTitle}</h1>
              </div>

              <div className="profile-dropdown" ref={menuRef}>
                <button
                  type="button"
                  className="topbar-avatar-button"
                  aria-label="Tài khoản"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((current) => !current)}
                >
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    size={32}
                  />
                </button>

                {menuOpen ? (
                  <div className="profile-menu" role="menu" aria-label="Tài khoản">
                    <div className="profile-menu-head">
                      <strong>{user.name}</strong>
                      <span>{user.role}</span>
                    </div>
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/admin/settings");
                      }}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M17 9V7a5 5 0 0 0-10 0v2H5v11h14V9Zm-8 0V7a3 3 0 0 1 6 0v2Zm2 4h2v4h-2Z" />
                        </svg>
                      </span>
                      <span className="profile-menu-copy">
                        <strong>Cài đặt</strong>
                        <small>Giao diện, ngôn ngữ, bảo mật</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-button"
                      role="menuitem"
                      onClick={() => void handleSignOut()}
                    >
                      <span className="profile-menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M10 17v-2h4V9h-4V7h7v10Zm-1-3-3-3 3-3v2h5v2H9Z" />
                          <path d="M4 5h7v2H6v10h5v2H4Z" />
                        </svg>
                      </span>
                      <span className="profile-menu-copy">
                        <strong>Đăng xuất</strong>
                        <small>Thoát khỏi phiên hiện tại</small>
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </header>
            <main className={styles.content}>{children}</main>
          </div>
        </div>
      </AdminTitleContext.Provider>
    </ToastProvider>
  );
}
