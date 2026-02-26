"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, X, Globe } from "@phosphor-icons/react";
import { useWorkspace } from "./workspace-context";

export function SessionPicker({ paneId }: { paneId: string }) {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const { actions } = useWorkspace();
  const [urlInput, setUrlInput] = useState("");

  const handleCreate = async () => {
    const id = await createSession({ title: "New Session" });
    actions.setSessionForPane(paneId, id);
  };

  const handleOpenUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    actions.setIframeForPane(paneId, url);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOpenUrl();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-base-100">
      <div className="shrink-0 px-3 py-2 border-b border-base-300/50 flex items-center justify-between">
        <span className="text-xs opacity-40 uppercase tracking-wide">
          Pick a session
        </span>
        <button
          onClick={() => actions.closePane(paneId)}
          className="btn btn-ghost btn-xs btn-square opacity-40"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={handleCreate}
          className="btn btn-ghost w-full justify-start gap-2 text-sm rounded-none border-b border-base-300/30"
        >
          <Plus size={16} weight="bold" />
          New Session
        </button>
        {sessions?.map((s) => (
          <button
            key={s._id}
            onClick={() => actions.setSessionForPane(paneId, s._id)}
            className="btn btn-ghost w-full justify-start text-sm rounded-none border-b border-base-300/30 text-left"
          >
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>
      <div className="shrink-0 border-t border-base-300/50 p-3">
        <label className="text-xs opacity-40 uppercase tracking-wide flex items-center gap-1 mb-2">
          <Globe size={12} weight="duotone" />
          Embed URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://example.com"
            className="input input-bordered input-sm flex-1 min-w-0"
          />
          <button
            onClick={handleOpenUrl}
            disabled={!urlInput.trim()}
            className="btn btn-primary btn-sm"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
