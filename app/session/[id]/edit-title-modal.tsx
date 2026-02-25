"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkle } from "@phosphor-icons/react";

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
  const [summarizing, setSummarizing] = useState(false);
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

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.title) {
        setTitle(data.title);
      }
    } catch (err) {
      console.error("Failed to summarize:", err);
    } finally {
      setSummarizing(false);
    }
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
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="btn btn-ghost btn-sm w-full mb-4 gap-1"
        >
          {summarizing ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              Summarizing...
            </>
          ) : (
            <>
              <Sparkle size={16} weight="duotone" />
              Summarize with Claude
            </>
          )}
        </button>
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
