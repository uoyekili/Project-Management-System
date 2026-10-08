import { redirect } from "next/navigation";

import LoginForm from "@/app/login/form";
import { hasValidServerSession } from "@/services/auth/server";

import { AuthLayout } from "./_components/auth-layout";

export default async function LoginPage() {
  if (await hasValidServerSession()) {
    redirect("/dashboard");
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Truy cập không gian làm việc của bạn trên TaskFlow."
    >
      <LoginForm />
    </AuthLayout>
  );
}
