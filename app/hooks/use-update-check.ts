"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";

export function useUpdateAvailable() {
  const updateInfo = useQuery(api.updates.getLatest);
  const [localSha, setLocalSha] = useState<string | null>(null);

  const fetchLocal = useCallback(() => {
    fetch("/api/version")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sha) setLocalSha(data.sha);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLocal();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchLocal();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchLocal]);

  return !!(updateInfo && localSha && updateInfo.remoteSha !== localSha);
}
