import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { taskApi } from "@/services/api";
import type { Task, UserProfile } from "@/types";
import { TaskDetailView } from "./task-detail-view";

jest.mock("@/services/api", () => ({
  taskApi: {
    getEnrichedTask: jest.fn(),
    listLogworks: jest.fn(),
    listComments: jest.fn(),
    update: jest.fn(),
    updateAssignee: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const viewer = { id: "usr-1", role: "Manager", permissions: [] } as unknown as UserProfile;

const task: Task = {
  id: "42",
  key: "TASK-42",
  projectId: "10",
  sprintId: null,
  parentTaskId: null,
  title: "Kiểm tra debounce ET",
  description: "",
  status: "TODO",
  priority: "HIGH",
  assigneeId: "usr-2",
  assigneeName: "Người thực hiện",
  assigneeEmail: "assignee@example.com",
  reporterId: "usr-1",
  startDate: "2026-08-19",
  dueDate: "2026-08-19",
  estimateHours: 4,
  spentHours: 0,
  tags: [],
  blockers: [],
  commentsCount: 0,
  lastActivity: "2026-08-11T00:00:00Z",
};

describe("TaskDetailView edit mode", () => {
  beforeEach(() => {
    jest.mocked(taskApi.getEnrichedTask).mockResolvedValue({
      data: { ...task, project: {
          id: "10",
          managerId: "usr-1",
          memberIds: ["usr-1"],
          myPermissions: [
            "task.update:PROJECT",
            "task.assign:PROJECT",
            "task.create:PROJECT",
            "task.delete:PROJECT",
          ],
        },
      },
    } as never);
    jest.mocked(taskApi.listLogworks).mockResolvedValue({ data: [] } as never);
    jest.mocked(taskApi.listComments).mockResolvedValue({ data: [] } as never);
    jest.mocked(taskApi.update).mockResolvedValue({ data: task } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderView(fromProject = false) {
    return render(
      <ConfirmDialogProvider>
        <TaskDetailView taskId={task.id} users={[]} viewer={viewer} fromProject={fromProject} />
      </ConfirmDialogProvider>,
    );
  }

  it("keeps fields locked until edit mode is entered", async () => {
    renderView();

    const estimate = await screen.findByLabelText("Thời gian ước tính");
    await waitFor(() => expect(estimate).toHaveValue(4));
    expect(estimate).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Chỉnh sửa/ }));
    expect(estimate).toBeEnabled();
  });

  it("saves all changes in one request when clicking save", async () => {
    renderView();

    const estimate = await screen.findByLabelText("Thời gian ước tính");
    await waitFor(() => expect(estimate).toHaveValue(4));

    fireEvent.click(screen.getByRole("button", { name: /Chỉnh sửa/ }));
    fireEvent.change(estimate, { target: { value: "7" } });
    expect(taskApi.update).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(taskApi.update).toHaveBeenCalledTimes(1));
    expect(taskApi.update).toHaveBeenCalledWith(task.id, {
      estimateHours: 7,
    });
  });

  it("shows logwork and comments together without tabs", async () => {
    renderView();

    expect(await screen.findByRole("heading", { name: /Logwork/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bình luận/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("explains that hours roll up and hides the logwork button on a parent task", async () => {
    jest.mocked(taskApi.getEnrichedTask).mockResolvedValue({
      data: {
        ...task,
        hasChildren: true,
        project: {
          id: "10",
          managerId: "usr-1",
          memberIds: ["usr-1"],
          myPermissions: ["task.update:PROJECT", "logwork.create:OWN"],
        },
      },
    } as never);
    renderView();

    expect(await screen.findByText(/Task này đã được chia nhỏ/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ Logwork/ })).not.toBeInTheDocument();
  });

  it("shows the project shortcut only when not opened from a project", async () => {
    const { unmount } = renderView();
    expect(await screen.findByRole("button", { name: /Đi tới dự án/ })).toBeInTheDocument();
    unmount();

    renderView(true);
    await screen.findByText("Kiểm tra debounce ET");
    expect(screen.queryByRole("button", { name: /Đi tới dự án/ })).not.toBeInTheDocument();
  });

  it("collapses long logwork and comment lists behind a show-more control", async () => {
    const logworks = Array.from({ length: 10 }, (_, index) => ({
      id: `lw-${index}`,
      taskId: task.id,
      userId: "usr-1",
      userName: "Nhân sự",
      title: `Logwork ${index}`,
      workContent: "",
      hoursSpent: 1,
      status: "APPROVED",
      createdAt: "2026-08-11T00:00:00Z",
    }));
    const comments = Array.from({ length: 12 }, (_, index) => ({
      id: `c-${index}`,
      taskId: task.id,
      userId: "usr-1",
      userName: "Nhân sự",
      content: `Bình luận ${index}`,
      createdAt: `2026-08-11T00:${String(index).padStart(2, "0")}:00Z`,
    }));
    jest.mocked(taskApi.listLogworks).mockResolvedValue({ data: logworks } as never);
    jest.mocked(taskApi.listComments).mockResolvedValue({ data: comments } as never);
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: /Xem tất cả \(10\)/ }));
    expect(await screen.findByText("Logwork 9")).toBeInTheDocument();

    expect(await screen.findByRole("button", { name: /2 bình luận trước đó/ })).toBeInTheDocument();
    expect(screen.queryByText("Bình luận 0")).not.toBeInTheDocument();
    expect(screen.getByText("Bình luận 11")).toBeInTheDocument();
  });
});
