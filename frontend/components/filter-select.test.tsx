import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  FilterSelect,
  formatMultiSelectLabel,
  toggleMultiSelectValue,
  toggleSelectAll,
} from "./filter-select";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang triển khai" },
  { value: "PLANNING", label: "Đang lập kế hoạch" },
  { value: "AT_RISK", label: "Rủi ro trễ hạn" },
];

describe("formatMultiSelectLabel", () => {
  it("shows the all-label when nothing is selected", () => {
    expect(formatMultiSelectLabel([], "Tất cả trạng thái")).toBe("Tất cả trạng thái");
  });

  it("shows the selected name when one item is chosen", () => {
    expect(formatMultiSelectLabel(["Đang triển khai"], "Tất cả trạng thái")).toBe("Đang triển khai");
  });

  it("shows the first name plus remaining count when many items are chosen", () => {
    expect(formatMultiSelectLabel(["Đang triển khai", "Rủi ro trễ hạn"], "Tất cả trạng thái")).toBe(
      "Đang triển khai +1",
    );
  });
});

describe("toggleSelectAll", () => {
  const allValues = ["ACTIVE", "PLANNING", "AT_RISK"];

  it("selects every option when none or some are chosen", () => {
    expect(toggleSelectAll([], allValues)).toEqual(allValues);
    expect(toggleSelectAll(["ACTIVE"], allValues)).toEqual(allValues);
  });

  it("clears the selection when every option is already chosen", () => {
    expect(toggleSelectAll(allValues, allValues)).toEqual([]);
  });
});

describe("toggleMultiSelectValue", () => {
  const allValues = ["ACTIVE", "PLANNING", "AT_RISK"];

  it("turns an empty selection into a single value immediately", () => {
    expect(toggleMultiSelectValue([], "ACTIVE", allValues)).toEqual(["ACTIVE"]);
  });

  it("accumulates values with OR semantics", () => {
    expect(toggleMultiSelectValue(["ACTIVE"], "AT_RISK", allValues)).toEqual(["ACTIVE", "AT_RISK"]);
  });

  it("keeps every option when all are ticked instead of collapsing to empty", () => {
    expect(toggleMultiSelectValue(["ACTIVE", "PLANNING"], "AT_RISK", allValues)).toEqual(allValues);
  });

  it("clears the selection when ALL is chosen", () => {
    expect(toggleMultiSelectValue(["ACTIVE", "AT_RISK"], "ALL", allValues)).toEqual([]);
  });
});

function MultipleFilterHarness({ onChange }: { onChange: (value: string[]) => void }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ overflow: "hidden" }}>
      <FilterSelect
        multiple
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        allLabel="Tất cả trạng thái"
        options={STATUS_OPTIONS}
      />
    </div>
  );
}

const rect = {
  top: 80,
  bottom: 118,
  left: 20,
  right: 220,
  width: 200,
  height: 38,
  x: 20,
  y: 80,
  toJSON: () => ({}),
};

function mockLayout() {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
}

describe("FilterSelect", () => {
  beforeEach(mockLayout);
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("holds ticks as a draft and only applies on Áp dụng", () => {
    const onChange = jest.fn();
    render(<MultipleFilterHarness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả trạng thái" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Đang triển khai" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Rủi ro trễ hạn" }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(["ACTIVE", "AT_RISK"]);
    expect(screen.queryByRole("checkbox", { name: "Đang triển khai" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đang triển khai +1" })).toBeInTheDocument();
  });

  it("discards the draft on outside click and keeps the applied value", () => {
    const onChange = jest.fn();
    render(<MultipleFilterHarness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả trạng thái" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Đang triển khai" }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("checkbox", { name: "Đang triển khai" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tất cả trạng thái" }));
    expect(screen.getByRole("checkbox", { name: "Đang triển khai" })).not.toBeChecked();
  });

  it("clears the draft with Xóa lọc and applies the empty selection", () => {
    const onChange = jest.fn();
    render(<MultipleFilterHarness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả trạng thái" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Đang triển khai" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    fireEvent.click(screen.getByRole("button", { name: "Đang triển khai" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("toggles every option from Chọn tất cả with the indeterminate state", () => {
    const onChange = jest.fn();
    render(<MultipleFilterHarness onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả trạng thái" }));
    const selectAll = screen.getByRole("checkbox", { name: "Chọn tất cả" });
    fireEvent.click(selectAll);
    expect(selectAll).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Rủi ro trễ hạn" }));
    expect(selectAll).not.toBeChecked();

    fireEvent.click(selectAll);
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(onChange).toHaveBeenLastCalledWith(["ACTIVE", "PLANNING", "AT_RISK"]);
  });

  it("keeps single-select behavior: pick applies and closes", () => {
    const onChange = jest.fn();
    render(
      <FilterSelect
        value="ACTIVE"
        onChange={onChange}
        options={STATUS_OPTIONS}
        placeholder="Tất cả trạng thái"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Đang triển khai" }));
    fireEvent.click(screen.getByRole("option", { name: "Rủi ro trễ hạn" }));
    expect(onChange).toHaveBeenCalledWith("AT_RISK");
    expect(screen.queryByRole("option", { name: "Rủi ro trễ hạn" })).not.toBeInTheDocument();
  });

  it("searches people by name or employee code and shows the code under the name", () => {
    const onChange = jest.fn();
    render(
      <FilterSelect
        multiple
        value={[]}
        onChange={onChange}
        placeholder="Chọn nhân sự"
        options={[
          { value: "1", label: "Nguyễn Văn A", person: { userId: "usr-1", name: "Nguyễn Văn A", employeeCode: "NV00123" } },
          { value: "2", label: "Trần Thị B", person: { userId: "usr-2", name: "Trần Thị B", employeeCode: "NV00456" } },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Chọn nhân sự" }));
    expect(screen.getByText("NV00123")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nv00456" } });
    expect(screen.queryByRole("checkbox", { name: "Nguyễn Văn A" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Trần Thị B" })).toBeInTheDocument();
    expect(screen.getByText("NV00456").tagName).toBe("MARK");

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nguyễn" } });
    expect(screen.getByRole("checkbox", { name: "Nguyễn Văn A" })).toBeInTheDocument();
  });
});

const ROLE_OPTIONS = [
  { value: "dev", label: "Lập trình viên" },
  { value: "qc", label: "QC" },
  { value: "manager", label: "Manager" },
];

const DEPT_OPTIONS = [
  { value: "engineering", label: "Kỹ thuật" },
  { value: "qa", label: "QA" },
];

function ExclusiveFiltersHarness({
  onRolesChange,
  onDeptsChange,
}: {
  onRolesChange: (value: string[]) => void;
  onDeptsChange: (value: string[]) => void;
}) {
  const [roles, setRoles] = useState<string[]>([]);
  const [depts, setDepts] = useState<string[]>([]);
  return (
    <div>
      <FilterSelect
        multiple
        value={roles}
        onChange={(next) => {
          setRoles(next);
          onRolesChange(next);
        }}
        allLabel="Tất cả vai trò"
        options={ROLE_OPTIONS}
      />
      <FilterSelect
        multiple
        value={depts}
        onChange={(next) => {
          setDepts(next);
          onDeptsChange(next);
        }}
        allLabel="Tất cả phòng ban"
        options={DEPT_OPTIONS}
      />
    </div>
  );
}

describe("FilterSelect exclusive menus", () => {
  beforeEach(mockLayout);
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens one filter at a time and discards the unapplied draft of the previous one", () => {
    const onRolesChange = jest.fn();
    const onDeptsChange = jest.fn();
    render(<ExclusiveFiltersHarness onRolesChange={onRolesChange} onDeptsChange={onDeptsChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả vai trò" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lập trình viên" }));

    fireEvent.mouseDown(screen.getByRole("button", { name: "Tất cả phòng ban" }));
    fireEvent.click(screen.getByRole("button", { name: "Tất cả phòng ban" }));

    expect(screen.queryByRole("checkbox", { name: "Lập trình viên" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Kỹ thuật" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onRolesChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Kỹ thuật" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(onDeptsChange).toHaveBeenLastCalledWith(["engineering"]);
    expect(onRolesChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Tất cả vai trò" })).toBeInTheDocument();
  });

  it("keeps previously applied filters when switching", () => {
    const onRolesChange = jest.fn();
    render(<ExclusiveFiltersHarness onRolesChange={onRolesChange} onDeptsChange={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tất cả vai trò" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "QC" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    fireEvent.mouseDown(screen.getByRole("button", { name: "Tất cả phòng ban" }));
    fireEvent.click(screen.getByRole("button", { name: "Tất cả phòng ban" }));
    expect(screen.getByRole("button", { name: "QC" })).toBeInTheDocument();
  });
});
