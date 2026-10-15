import { fireEvent, render, screen } from "@testing-library/react";

import type { EnrichedTask } from "@/types";
import { GanttChart } from "./gantt-chart";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    measureText: () => ({ width: 50 }),
    font: "",
  })) as never;
});

const task = {
  id: "1",
  key: "TASK-1",
  projectId: "10",
  sprintId: null,
  parentTaskId: null,
  title: "Khảo sát nghiệp vụ",
  description: "",
  status: "IN_PROGRESS",
  priority: "HIGH",
  assigneeId: "usr-2",
  assigneeIds: ["usr-2"],
  reporterId: "usr-1",
  startDate: "2026-07-01",
  dueDate: "2026-07-20",
  estimateHours: 10,
  spentHours: 4,
  tags: [],
  blockers: [],
  commentsCount: 0,
  lastActivity: "2026-07-01T00:00:00Z",
  assignee: { id: "usr-2", name: "A", employeeCode: "E1" },
  reporter: { id: "usr-1", name: "B" },
  project: { id: "10" },
  sprint: null,
} as unknown as EnrichedTask;

function hiddenPanes(container: HTMLElement) {
  return container.querySelectorAll('[class*="ganttPaneHidden"]').length;
}

describe("GanttChart collapse", () => {
  it("shows both panes and the collapse buttons by default", () => {
    const { container } = render(<GanttChart tasks={[task]} />);

    expect(hiddenPanes(container)).toBe(0);
    expect(screen.getByRole("button", { name: "Thu gọn danh sách" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thu gọn lịch" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Thu gọn / mở rộng" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
  });

  it("collapses the list into a rail and expands it again", () => {
    const { container } = render(<GanttChart tasks={[task]} />);
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn danh sách" }));

    expect(hiddenPanes(container)).toBe(1);
    expect(screen.getByRole("group", { name: /Chế độ xem thời gian/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thu gọn lịch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Thu gọn / mở rộng" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mở rộng danh sách" }));
    expect(hiddenPanes(container)).toBe(0);
  });

  it("collapses the timeline and hides the time controls", () => {
    const { container } = render(<GanttChart tasks={[task]} />);
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn lịch" }));

    expect(hiddenPanes(container)).toBe(1);
    expect(screen.queryByRole("group", { name: /Chế độ xem thời gian/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mở rộng lịch" }));
    expect(hiddenPanes(container)).toBe(0);
    expect(screen.getByRole("group", { name: /Chế độ xem thời gian/ })).toBeInTheDocument();
  });
});
