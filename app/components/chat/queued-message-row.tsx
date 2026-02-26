"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PencilSimple, X } from "@phosphor-icons/react";
import { proxyStorageUrl } from "@/app/hooks/use-upload";

function QueuedMessageThumbs({
  attachmentIds,
}: {
  attachmentIds: Id<"uploads">[];
}) {
  const uploads = useQuery(api.uploads.getMany, { uploadIds: attachmentIds });
  if (!uploads) return null;
  return (
    <div className="flex gap-1 mt-1">
      {uploads
        .filter(Boolean)
        .map(
          (u) =>
            u && (
              <img
                key={u._id}
                src={proxyStorageUrl(u.thumbnailUrl ?? u.url)}
                alt={u.filename}
                className="w-8 h-8 rounded object-cover opacity-70"
              />
            ),
        )}
    </div>
  );
}

/**
 * Inline-editable queued message row.
 */
export function QueuedMessageRow({
  content,
  index,
  attachments,
  onRemove,
  onUpdate,
}: {
  content: string;
  index: number;
  attachments?: Id<"uploads">[];
  onRemove: () => void;
  onUpdate: (newContent: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== content) {
      onUpdate(trimmed);
    } else {
      setDraft(content);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-base-300/50 rounded-lg">
      <span className="badge badge-sm badge-ghost mt-0.5 shrink-0">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                setDraft(content);
                setEditing(false);
              }
            }}
            rows={1}
            className="textarea textarea-bordered textarea-xs w-full text-xs resize-none"
          />
        ) : (
          <span
            className="text-xs truncate block cursor-pointer opacity-70"
            onClick={() => setEditing(true)}
          >
            {content === "(image)" ? "" : content}
          </span>
        )}
        {attachments && attachments.length > 0 && (
          <QueuedMessageThumbs attachmentIds={attachments} />
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="btn btn-ghost btn-xs px-1 opacity-40"
        aria-label="Edit"
      >
        <PencilSimple size={12} weight="duotone" />
      </button>
      <button
        onClick={onRemove}
        className="btn btn-ghost btn-xs px-1 opacity-40"
        aria-label="Remove"
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  );
}
