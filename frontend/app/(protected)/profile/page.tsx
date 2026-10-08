"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/loading-state";
import { useAuthSession } from "@/hooks/use-session";

/** Hồ sơ của chính mình dùng chung đường dẫn với hồ sơ người khác: /profile/[userId]. */
export default function ProfileRedirectPage() {
  const router = useRouter();
  const session = useAuthSession();
  const viewerId = session?.currentUser?.id;

  useEffect(() => {
    if (viewerId) router.replace(`/profile/${encodeURIComponent(viewerId)}`);
  }, [viewerId, router]);

  return <LoadingState variant="profile" />;
}
