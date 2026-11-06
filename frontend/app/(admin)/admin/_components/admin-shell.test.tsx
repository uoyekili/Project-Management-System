import { fireEvent, render, screen } from "@testing-library/react";

import { AdminShell } from "./admin-shell";

const mockPathname = jest.fn(() => "/admin");

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/hooks/use-session", () => ({
  PENDING_USER: { id: "", name: "", permissions: [] },
  useAuthSession: () => ({
    currentUser: {
      id: "1",
      name: "Nguyễn Văn Dũng",
      role: "Admin",
      permissions: ["admin.access:ALL", "user.manage:ALL"],
    },
  }),
}));

jest.mock("@/services/auth/session", () => ({
  markIntentionalLogout: jest.fn(),
  signOut: jest.fn(),
}));

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
}

describe("AdminShell mobile drawer", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/admin");
  });

  it("labels the sidebar in Vietnamese", () => {
    mockMatchMedia(false);
    render(<AdminShell>nội dung</AdminShell>);
    expect(screen.getByRole("link", { name: "Người dùng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tổng quan" })).toBeInTheDocument();
  });

  it("opens from the menu button and closes with Escape", () => {
    mockMatchMedia(true);
    render(<AdminShell>nội dung</AdminShell>);
    const menuButton = screen.getByRole("button", { name: "Mở menu điều hướng" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes when the route changes", () => {
    mockMatchMedia(true);
    const { rerender } = render(<AdminShell>nội dung</AdminShell>);
    const menuButton = screen.getByRole("button", { name: "Mở menu điều hướng" });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    mockPathname.mockReturnValue("/admin/users");
    rerender(<AdminShell>nội dung</AdminShell>);
    expect(screen.getByRole("button", { name: "Mở menu điều hướng" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
