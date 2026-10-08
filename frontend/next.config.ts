import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Host browser + Playwright inside the compose network both hit the dev server.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "frontend",
    "host.docker.internal",
  ],
  // "/" hiển thị nội dung dashboard nhưng giữ nguyên URL (không redirect).
  // Chưa đăng nhập: ProtectedLayout của (protected) sẽ đưa về /login.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/dashboard" }],
    };
  },
  async redirects() {
    return [
      {
        source: "/logwork-approvals",
        destination: "/logwork",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
