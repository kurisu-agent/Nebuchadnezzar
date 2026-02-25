"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface EditTitleModalProps {
  sessionId: Id<"sessions">;
  currentTitle: string;
  onClose: () => void;
}

export function EditTitleModal({
  sessionId,
  currentTitle,
  onClose,
}: EditTitleModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(currentTitle);
  const updateTitle = useMutation(api.sessions.updateTitle);

  useEffect(() => {
    modalRef.current?.showModal();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== currentTitle) {
      await updateTitle({ id: sessionId, title: trimmed });
    }
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
        <h3 className="font-bold text-lg mb-4">Edit Session Name</h3>
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
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
