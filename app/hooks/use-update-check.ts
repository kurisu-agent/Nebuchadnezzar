"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

export function useUpdateAvailable() {
  const updateInfo = useQuery(api.updates.getLatest);
  const [localSha, setLocalSha] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sha) setLocalSha(data.sha);
      })
      .catch(() => {});
  }, []);

  return !!(updateInfo && localSha && updateInfo.remoteSha !== localSha);
}
