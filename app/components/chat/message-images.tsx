"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { proxyStorageUrl } from "@/app/hooks/use-upload";
import { ImageViewer } from "./image-viewer";

/**
 * Renders inline thumbnail images for a message with attachments.
 * Tapping a thumbnail opens a full-size viewer with zoom + metadata.
 */
export function MessageImages({
  attachmentIds,
}: {
  attachmentIds: Id<"uploads">[];
}) {
  const uploads = useQuery(api.uploads.getMany, { uploadIds: attachmentIds });
  const [viewingId, setViewingId] = useState<string | null>(null);

  if (!uploads) return null;

  const viewingUpload = viewingId
    ? uploads.find((u) => u?._id === viewingId)
    : null;

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {uploads
          .filter(Boolean)
          .map(
            (upload) =>
              upload && (
                <img
                  key={upload._id}
                  src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                  alt={upload.filename}
                  className="rounded-lg max-w-[200px] max-h-[150px] object-cover cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => setViewingId(upload._id)}
                />
              ),
          )}
      </div>
      {viewingUpload && (
        <ImageViewer
          src={proxyStorageUrl(viewingUpload.url) ?? ""}
          alt={viewingUpload.filename}
          uploadId={viewingUpload._id}
          meta={{
            filename: viewingUpload.filename,
            size: viewingUpload.size,
            mimeType: viewingUpload.mimeType,
            createdAt: viewingUpload.createdAt,
          }}
          onClose={() => setViewingId(null)}
        />
      )}
    </>
  );
}
