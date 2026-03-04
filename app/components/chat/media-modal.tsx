"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { proxyStorageUrl } from "@/app/hooks/use-upload";
import { ImageViewer } from "./image-viewer";
import { extractScreenshotIds } from "./inline-screenshot";

interface MediaItem {
  uploadId: string;
  messageId: string;
  source: "upload" | "screenshot";
}

/**
 * Full-screen modal showing all media (uploads + screenshots) in a session.
 * Rendered via portal to avoid DOM nesting issues.
 */
export function MediaModal({
  open,
  onClose,
  messages,
  scrollContainer,
}: {
  open: boolean;
  onClose: () => void;
  messages: { _id: string; content: string; attachments?: string[] }[];
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const [viewing, setViewing] = useState<{
    src: string;
    alt: string;
    uploadId: string;
    meta: {
      filename: string;
      size: number;
      mimeType: string;
      createdAt: number;
    };
  } | null>(null);

  const mediaItems = useMemo(() => {
    const items: MediaItem[] = [];
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        for (const a of m.attachments) {
          items.push({ uploadId: a, messageId: m._id, source: "upload" });
        }
      }
      const screenshotIds = extractScreenshotIds(m.content);
      for (const id of screenshotIds) {
        items.push({ uploadId: id, messageId: m._id, source: "screenshot" });
      }
    }
    return items;
  }, [messages]);

  const allUploadIds = useMemo(
    () => mediaItems.map((a) => a.uploadId) as Id<"uploads">[],
    [mediaItems],
  );

  const uploads = useQuery(
    api.uploads.getMany,
    open && allUploadIds.length > 0 ? { uploadIds: allUploadIds } : "skip",
  );

  if (!open) return null;

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el && scrollContainer.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 1000);
    }
    onClose();
  };

  return createPortal(
    <>
      <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
        <div className="modal-box max-w-sm px-0 pb-0">
          <h3 className="font-bold text-base px-4 pb-3">Media</h3>
          {mediaItems.length === 0 ? (
            <div className="px-4 pb-4">
              <span className="text-sm opacity-40">
                No images in this session yet.
              </span>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60dvh] px-2 pb-2">
              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.map((item, i) => {
                  const upload = uploads?.[i];
                  return (
                    <div
                      key={`${item.uploadId}-${i}`}
                      className="relative aspect-square rounded-lg overflow-hidden bg-base-300"
                    >
                      <div
                        className="w-full h-full cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => {
                          if (upload?.url) {
                            setViewing({
                              src: proxyStorageUrl(upload.url) ?? "",
                              alt: upload.filename,
                              uploadId: upload._id,
                              meta: {
                                filename: upload.filename,
                                size: upload.size,
                                mimeType: upload.mimeType,
                                createdAt: upload.createdAt,
                              },
                            });
                          }
                        }}
                      >
                        {upload ? (
                          <img
                            src={proxyStorageUrl(
                              upload.thumbnailUrl ?? upload.url,
                            )}
                            alt={upload.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full skeleton" />
                        )}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1 pointer-events-none">
                        <span className="text-[9px] text-white/80 truncate block">
                          {upload?.filename ?? "..."}
                        </span>
                      </div>
                      <button
                        className="absolute top-1 right-1 text-[9px] opacity-60 active:opacity-100 bg-base-300/80 rounded px-1 py-0.5"
                        onClick={() => scrollToMessage(item.messageId)}
                      >
                        jump
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </div>
      {viewing && (
        <ImageViewer
          src={viewing.src}
          alt={viewing.alt}
          uploadId={viewing.uploadId as Id<"uploads">}
          meta={viewing.meta}
          onClose={() => setViewing(null)}
        />
      )}
    </>,
    document.body,
  );
}
