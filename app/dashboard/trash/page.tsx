"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowCounterClockwise,
  TrashSimple,
  MagnifyingGlass,
  Trash,
} from "@phosphor-icons/react";
import { useRelativeTime } from "@/app/components/session-row";
import { SearchModal } from "@/app/components/search-modal";

function DeletedSessionRow({
  session,
  onRestore,
  onPermanentDelete,
}: {
  session: { _id: Id<"sessions">; title: string; deletedAt?: number };
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const timeAgo = useRelativeTime(session.deletedAt ?? 0);

  return (
    <li className="list-row">
      <div className="list-col-grow">
        <div className="text-sm line-clamp-1">{session.title}</div>
        <div className="text-xs opacity-50">Deleted {timeAgo}</div>
      </div>
      <button
        onClick={onRestore}
        className="btn btn-ghost btn-sm btn-square active:bg-base-300"
        aria-label="Restore session"
      >
        <ArrowCounterClockwise
          size={16}
          weight="duotone"
          className="opacity-60"
        />
      </button>
      <button
        onClick={onPermanentDelete}
        className="btn btn-ghost btn-sm btn-square active:bg-error/20"
        aria-label="Delete permanently"
      >
        <TrashSimple
          size={16}
          weight="duotone"
          className="opacity-60 text-error"
        />
      </button>
    </li>
  );
}

export default function TrashPage() {
  const deletedSessions = useQuery(api.sessions.listDeleted);
  const restoreSession = useMutation(api.sessions.restore);
  const permanentDeleteSession = useMutation(api.sessions.permanentDelete);
  const permanentDeleteAll = useMutation(api.sessions.permanentDeleteAll);
  const [showTrashSearch, setShowTrashSearch] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      await permanentDeleteAll();
    } finally {
      setIsEmptying(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {deletedSessions && deletedSessions.length > 0 && (
          <div className="flex items-center justify-between">
            <button
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              className="btn btn-ghost btn-sm gap-2 text-error/60 active:bg-error/20"
            >
              {isEmptying ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Trash size={14} weight="bold" />
              )}
              <span className="text-xs">{isEmptying ? "Emptying..." : "Empty trash"}</span>
            </button>
            <button
              onClick={() => setShowTrashSearch(true)}
              className="btn btn-ghost btn-sm gap-2 active:bg-base-300"
              aria-label="Search deleted messages"
            >
              <MagnifyingGlass size={14} weight="bold" />
              <span className="text-xs">Search trash</span>
            </button>
          </div>
        )}

        {deletedSessions && deletedSessions.length > 0 ? (
          <div className="card bg-base-200 card-sm">
            <div className="card-body py-3">
              <ul className="list">
                {deletedSessions.map((session) => (
                  <DeletedSessionRow
                    key={session._id}
                    session={session}
                    onRestore={() => restoreSession({ id: session._id })}
                    onPermanentDelete={() =>
                      permanentDeleteSession({ id: session._id })
                    }
                  />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-base-content/30">Trash is empty.</p>
          </div>
        )}
      </div>

      {showTrashSearch && (
        <SearchModal
          includeDeleted={true}
          onClose={() => setShowTrashSearch(false)}
        />
      )}
    </>
  );
}
