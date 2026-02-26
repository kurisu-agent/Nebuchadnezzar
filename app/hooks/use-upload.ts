"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useState, useCallback } from "react";

/**
 * Rewrites localhost Convex storage URLs to use the public proxy URL.
 * In proxied environments (e.g. Coder), the browser can't reach localhost
 * directly, so we replace the origin with NEXT_PUBLIC_CONVEX_URL.
 */
export function proxyStorageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    const publicUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (publicUrl) {
      return url.replace(
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
        publicUrl.replace(/\/$/, ""),
      );
    }
  }
  return url;
}

export interface PendingUpload {
  id: Id<"uploads">;
  filename: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

export function useUpload(sessionId?: Id<"sessions">) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<PendingUpload> => {
      setIsUploading(true);
      try {
        // Proxy upload through Next.js API route so the server
        // (which can reach localhost:3210) talks to Convex storage.
        const formData = new FormData();
        formData.append("file", file);
        if (sessionId) formData.append("sessionId", sessionId);

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload failed: ${res.statusText}`);
        }

        const { uploadId } = await res.json();

        const previewUrl = URL.createObjectURL(file);
        const pending: PendingUpload = {
          id: uploadId as Id<"uploads">,
          filename: file.name || "screenshot.png",
          mimeType: file.type,
          size: file.size,
          previewUrl,
        };
        setPendingUploads((prev) => [...prev, pending]);
        return pending;
      } finally {
        setIsUploading(false);
      }
    },
    [sessionId],
  );

  const removePending = useCallback((uploadId: Id<"uploads">) => {
    setPendingUploads((prev) => {
      const item = prev.find((p) => p.id === uploadId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== uploadId);
    });
  }, []);

  const clearPending = useCallback(() => {
    setPendingUploads((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, []);

  return { upload, pendingUploads, isUploading, removePending, clearPending };
}
