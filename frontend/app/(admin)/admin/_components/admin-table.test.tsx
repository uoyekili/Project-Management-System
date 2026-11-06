import { render, screen } from "@testing-library/react";

import { AdminListSurface, AdminTable, AdminUserCell } from "./admin-table";

// admin-ui kéo theo hook phiên đăng nhập (BroadcastChannel) không có trong jsdom.
jest.mock("@/hooks/use-session", () => ({ PENDING_USER: {}, useAuthSession: () => null }));

describe("AdminListSurface", () => {
  it("shows the empty state when there is no content", () => {
    render(
      <AdminListSurface hasContent={false} emptyTitle="Không có dữ liệu" emptyDescription="Thử lại sau.">
        <p>bảng</p>
      </AdminListSurface>,
    );
    expect(screen.getByText("Không có dữ liệu")).toBeInTheDocument();
    expect(screen.queryByText("bảng")).not.toBeInTheDocument();
  });

  it("renders children and the footer when there is content", () => {
    render(
      <AdminListSurface hasContent emptyTitle="Rỗng" footer={<span>chân trang</span>}>
        <p>bảng</p>
      </AdminListSurface>,
    );
    expect(screen.getByText("bảng")).toBeInTheDocument();
    expect(screen.getByText("chân trang")).toBeInTheDocument();
    expect(screen.queryByText("Rỗng")).not.toBeInTheDocument();
  });
});

describe("AdminTable", () => {
  it("keeps the column label on each cell so rows can collapse into cards", () => {
    render(
      <AdminTable>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-primary data-label="Tên">
              <AdminUserCell name="Nguyễn Văn Dũng" subtitle="USR-001" />
            </td>
            <td data-label="Email">dungnv@gmail.com</td>
          </tr>
        </tbody>
      </AdminTable>,
    );
    expect(screen.getByText("dungnv@gmail.com")).toHaveAttribute("data-label", "Email");
    expect(screen.getByText("USR-001")).toBeInTheDocument();
  });
});
