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

  function renderView() {
    return render(
      <ConfirmDialogProvider>
        <TaskDetailView taskId={task.id} users={[]} viewer={viewer} />
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
});
