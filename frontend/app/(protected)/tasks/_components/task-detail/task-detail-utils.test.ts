import type { Task, TaskLogworkEntry } from "@/types";
import { buildDraft, computeProgress, stripMarkdown } from "./task-detail-utils";

const entry = (hoursSpent: number, status: TaskLogworkEntry["status"]) =>
  ({ hoursSpent, status }) as TaskLogworkEntry;

describe("stripMarkdown", () => {
  it("removes common markdown syntax", () => {
    expect(stripMarkdown("# Title\n**bold** and `code` and [link](http://x)")).toBe(
      "Title\nbold and code and link",
    );
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });
});

describe("computeProgress", () => {
  it("ignores rejected logworks and caps percent at 100", () => {
    const result = computeProgress([entry(3, "APPROVED"), entry(5, "REJECTED"), entry(4, "PENDING")], 4);
    expect(result).toEqual({ loggedHours: 7, estimateHours: 4, percent: 100, isOver: true });
  });

  it("returns 0% when there is no estimate", () => {
    expect(computeProgress([entry(2, "APPROVED")], 0).percent).toBe(0);
  });
});

describe("buildDraft", () => {
  it("falls back to assigneeId when assigneeIds is empty", () => {
    const draft = buildDraft({
      title: "T",
      description: "**d**",
      status: "TODO",
      priority: "LOW",
      assigneeId: "usr-2",
      assigneeIds: [],
      estimateHours: 6,
    } as unknown as Task);
    expect(draft.assigneeIds).toEqual(["usr-2"]);
    expect(draft.description).toBe("d");
    expect(draft.estimateHours).toBe("6");
  });
});
