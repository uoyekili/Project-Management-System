import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, hasAuthCookies } from "@/services/auth/cookies";

const DEFAULT_SERVER_API_BASE_URL =
  process.env.API_BASE_URL_INTERNAL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `http://backend:${process.env.NEXT_PUBLIC_API_PORT ?? "8000"}`;

function getServerAuthCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  const cookieParts = [
    accessToken ? `${ACCESS_COOKIE_NAME}=${accessToken}` : null,
    refreshToken ? `${REFRESH_COOKIE_NAME}=${refreshToken}` : null,
  ].filter(Boolean);

  return cookieParts.join("; ");
}

async function checkEndpoint(path: "/me" | "/refresh", cookieHeader: string) {
  const response = await fetch(`${DEFAULT_SERVER_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  }).catch(() => null);

  return Boolean(response?.ok);
}

export async function hasValidServerSession() {
  const cookieStore = await cookies();
  if (!hasAuthCookies(cookieStore)) {
    return false;
  }

  const cookieHeader = getServerAuthCookieHeader(cookieStore);

  if (!cookieHeader) {
    return false;
  }

  if (await checkEndpoint("/me", cookieHeader)) {
    return true;
  }

  return checkEndpoint("/refresh", cookieHeader);
}

export async function requireServerSession() {
  if (!(await hasValidServerSession())) {
    redirect("/login");
  }
}

/** Kiểm tra permission phía server (quyền thật vẫn do backend enforce ở từng API). */
export async function requireServerPermission(code: string) {
  await requireServerSession();

  const cookieStore = await cookies();
  const cookieHeader = getServerAuthCookieHeader(cookieStore);
  const response = await fetch(`${DEFAULT_SERVER_API_BASE_URL}/me`, {
    method: "GET",
    headers: { cookie: cookieHeader },
    cache: "no-store",
  }).catch(() => null);

  // /me có thể hết hạn trong khi refresh còn hiệu lực: để client guard (ProtectedRoute) xử lý tiếp.
  if (!response?.ok) {
    return;
  }

  const profile = (await response.json().catch(() => null)) as { permissions?: string[] } | null;
  if (!profile?.permissions?.includes(code)) {
    notFound();
  }
}
