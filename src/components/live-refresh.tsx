"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches server data periodically while the tab is visible.
// Realtime on user_books is RLS-limited to your own rows, so polling keeps the group view fresh.
export function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
