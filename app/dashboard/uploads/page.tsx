"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TrashSimple, ImageSquare } from "@phosphor-icons/react";
import { proxyStorageUrl } from "@/app/hooks/use-upload";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadsPage() {
  const uploads = useQuery(api.uploads.list);
  const removeUpload = useMutation(api.uploads.remove);

  return (
    <div className="flex-1 overflow-y-auto p-3">
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
                <figure className="h-32">
                  <img
                    src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                    alt={upload.filename}
                    className="w-full h-full object-cover"
                  />
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
                <p className="text-xs truncate">{upload.filename}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] opacity-40">
                    {formatFileSize(upload.size)}
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
          <p className="text-sm text-base-content/30">No uploads yet.</p>
        </div>
      )}
    </div>
  );
}
