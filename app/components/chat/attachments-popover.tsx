"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Paperclip } from "@phosphor-icons/react";
import { proxyStorageUrl } from "@/app/hooks/use-upload";

/**
 * Navbar dropdown showing all image attachments in the session.
 * Tapping a thumbnail scrolls to the message that contains it.
 */
export function AttachmentsPopover({
  messages,
  scrollContainer,
}: {
  messages: { _id: string; attachments?: string[] }[];
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const attachmentMap = useMemo(() => {
    const map: { uploadId: string; messageId: string }[] = [];
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        for (const a of m.attachments) {
          map.push({ uploadId: a, messageId: m._id });
        }
      }
    }
    return map;
  }, [messages]);

  const allUploadIds = useMemo(
    () => attachmentMap.map((a) => a.uploadId) as Id<"uploads">[],
    [attachmentMap],
  );

  const uploads = useQuery(
    api.uploads.getMany,
    allUploadIds.length > 0 ? { uploadIds: allUploadIds } : "skip",
  );

  if (attachmentMap.length === 0) return null;

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el && scrollContainer.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 1000);
    }
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Attachments"
      >
        <Paperclip size={18} weight="bold" />
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-10 bg-base-200 rounded-box shadow-lg p-2 mt-1 w-56 max-h-64 overflow-y-auto"
      >
        <span className="text-[10px] opacity-40 uppercase tracking-wide px-1">
          Attachments
        </span>
        <div className="flex flex-col gap-1 mt-1">
          {attachmentMap.map((a, i) => {
            const upload = uploads?.[i];
            return (
              <button
                key={`${a.uploadId}-${i}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 active:bg-base-300 transition-colors text-left w-full"
                onClick={() => scrollToMessage(a.messageId)}
              >
                {upload ? (
                  <img
                    src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                    alt={upload.filename}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded skeleton shrink-0" />
                )}
                <span className="text-xs truncate opacity-70">
                  {upload?.filename ?? "Loading..."}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
