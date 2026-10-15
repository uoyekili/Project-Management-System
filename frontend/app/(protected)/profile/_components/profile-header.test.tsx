import { render, screen } from "@testing-library/react";

import type { UserProfile } from "@/types";
import { ProfileHeader } from "./profile-header";

jest.mock("@/services/api", () => ({
  userApi: { uploadAvatar: jest.fn(), resetAvatar: jest.fn() },
}));

jest.mock("./avatar-cropper", () => ({ AvatarCropper: () => null }));

const user = {
  id: "usr-7",
  name: "Nguyễn Văn A",
  email: "a@example.com",
  role: "Employee",
  roles: ["Employee"],
  jobTitle: "Backend Developer",
  department: "Engineering",
} as unknown as UserProfile;

describe("ProfileHeader", () => {
  it("shows name and employee code", () => {
    render(<ProfileHeader user={user} isSelf={false} onUpdate={jest.fn()} />);

    expect(screen.getByRole("heading", { name: "Nguyễn Văn A" })).toBeInTheDocument();
    expect(screen.getByText("USR-007")).toBeInTheDocument();
  });

  it("offers avatar actions only to the account owner", () => {
    const { rerender } = render(<ProfileHeader user={user} isSelf={false} onUpdate={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /Đổi ảnh đại diện/ })).not.toBeInTheDocument();

    rerender(<ProfileHeader user={user} isSelf onUpdate={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Đổi ảnh đại diện/ })).toBeInTheDocument();
  });
});
