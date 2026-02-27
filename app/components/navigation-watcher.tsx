"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";

export function NavigationWatcher() {
  const pending = useQuery(api.pendingNavigations.latest);
  const consume = useMutation(api.pendingNavigations.consume);
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pending) return;

    // Avoid processing the same navigation twice
    if (processedRef.current === pending._id) return;
    processedRef.current = pending._id;

    // Ignore stale navigations (older than 30 seconds)
    if (Date.now() - pending.createdAt > 30_000) {
      consume({ id: pending._id });
      return;
    }

    // Consume first, then navigate with a full page load to ensure
    // the workspace page mounts fresh with the correct layout
    consume({ id: pending._id });
    window.location.assign(pending.targetUrl);
  }, [pending, consume]);

  return null;
}
