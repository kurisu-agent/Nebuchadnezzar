"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TrashSimple, ImageSquare, Camera } from "@phosphor-icons/react";
import { proxyStorageUrl } from "@/app/hooks/use-upload";
import { ImageViewer } from "@/app/components/chat/image-viewer";

type SourceFilter = "all" | "screenshot" | "user";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export default function UploadsPage() {
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [viewingUpload, setViewingUpload] = useState<{
    url: string;
    filename: string;
    id: string;
    size: number;
    mimeType: string;
    createdAt: number;
  } | null>(null);

  const allUploads = useQuery(api.uploads.list);
  const screenshots = useQuery(
    api.uploads.listBySource,
    filter === "screenshot" ? { source: "screenshot" } : "skip",
  );
  const userUploads = useQuery(
    api.uploads.listBySource,
    filter === "user" ? { source: "user" } : "skip",
  );
  const removeUpload = useMutation(api.uploads.remove);

  const uploads =
    filter === "all"
      ? allUploads
      : filter === "screenshot"
        ? screenshots
        : userUploads;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* daisyUI filter radio group */}
      <div className="filter mb-3">
        <input
          className="btn btn-xs filter-reset"
          type="radio"
          name="source-filter"
          aria-label="All"
          checked={filter === "all"}
          onChange={() => setFilter("all")}
        />
        <input
          className="btn btn-xs"
          type="radio"
          name="source-filter"
          aria-label="Screenshots"
          checked={filter === "screenshot"}
          onChange={() => setFilter("screenshot")}
        />
        <input
          className="btn btn-xs"
          type="radio"
          name="source-filter"
          aria-label="Uploads"
          checked={filter === "user"}
          onChange={() => setFilter("user")}
        />
      </div>

      {uploads === undefined ? (
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-sm opacity-30" />
        </div>
      ) : uploads.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {uploads.map((upload) => (
            <div
              key={upload._id}
              className="card card-sm bg-base-200 overflow-hidden"
            >
              {upload.url ? (
                <figure
                  className="h-32 relative cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() =>
                    setViewingUpload({
                      url: upload.url!,
                      filename: upload.filename,
                      id: upload._id,
                      size: upload.size,
                      mimeType: upload.mimeType,
                      createdAt: upload.createdAt,
                    })
                  }
                >
                  <img
                    src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                    alt={upload.filename}
                    className="w-full h-full object-cover"
                  />
                  {upload.source === "screenshot" && (
                    <div className="absolute top-1 left-1">
                      <span className="badge badge-xs badge-primary gap-1">
                        <Camera size={10} weight="bold" />
                        Screenshot
                      </span>
                    </div>
                  )}
                </figure>
              ) : (
                <div className="h-32 flex items-center justify-center bg-base-300">
                  <ImageSquare
                    size={32}
                    weight="duotone"
                    className="opacity-30"
                  />
                </div>
              )}
              <div className="card-body p-2">
                <p className="text-xs truncate">
                  {upload.metadata?.url
                    ? (tryHostname(upload.metadata.url) ?? upload.filename)
                    : upload.filename}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] opacity-40">
                    {upload.metadata?.device
                      ? upload.metadata.device
                      : formatFileSize(upload.size)}
                  </span>
                  <button
                    onClick={() => removeUpload({ uploadId: upload._id })}
                    className="btn btn-ghost btn-xs btn-square active:bg-error/20"
                    aria-label="Delete upload"
                  >
                    <TrashSimple
                      size={14}
                      weight="duotone"
                      className="text-error opacity-60"
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-base-content/30">
            {filter === "screenshot"
              ? "No screenshots yet."
              : filter === "user"
                ? "No uploads yet."
                : "No uploads yet."}
          </p>
        </div>
      )}

      {/* Full-screen image viewer with pinch-to-zoom + download */}
      {viewingUpload && (
        <ImageViewer
          src={proxyStorageUrl(viewingUpload.url) ?? ""}
          alt={viewingUpload.filename}
          uploadId={viewingUpload.id}
          meta={{
            filename: viewingUpload.filename,
            size: viewingUpload.size,
            mimeType: viewingUpload.mimeType,
            createdAt: viewingUpload.createdAt,
          }}
          onClose={() => setViewingUpload(null)}
        />
      )}
    </div>
  );
}
