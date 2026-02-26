"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PencilSimple, X } from "@phosphor-icons/react";

interface EditTitleModalProps {
  sessionId: Id<"sessions">;
  currentTitle: string;
  isCustomTitle: boolean;
  onClose: () => void;
}

export function EditTitleModal({
  sessionId,
  currentTitle,
  isCustomTitle,
  onClose,
}: EditTitleModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(isCustomTitle);
  const [title, setTitle] = useState(currentTitle);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const clearCustomTitle = useMutation(api.sessions.clearCustomTitle);

  useEffect(() => {
    modalRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== currentTitle) {
      await updateTitle({ id: sessionId, title: trimmed });
    }
    modalRef.current?.close();
    onClose();
  };

  const handleReset = async () => {
    await clearCustomTitle({ id: sessionId });
    // Trigger an auto-generated title immediately
    fetch("/api/chat/retitle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    modalRef.current?.close();
    onClose();
  };

  const handleClose = () => {
    modalRef.current?.close();
    onClose();
  };

  return (
    <dialog ref={modalRef} className="modal modal-bottom" onClose={onClose}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Session Name</h3>

        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleClose();
              }}
              className="input input-bordered w-full mb-3"
              placeholder="Session name..."
              maxLength={100}
            />
            {isCustomTitle && (
              <button
                onClick={handleReset}
                className="btn btn-ghost btn-sm gap-1 text-base-content/50 active:text-base-content mb-1"
              >
                <X size={14} weight="bold" />
                Reset to auto-generated
              </button>
            )}
            <div className="modal-action">
              <button onClick={handleClose} className="btn btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-base-content/50 mb-2">
              Using auto-generated titles
            </p>
            <p className="text-sm mb-4 truncate">{currentTitle}</p>
            <div className="modal-action">
              <button onClick={handleClose} className="btn btn-ghost">
                Close
              </button>
              <button
                onClick={() => setEditing(true)}
                className="btn btn-primary gap-1"
              >
                <PencilSimple size={16} weight="bold" />
                Set custom title
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
