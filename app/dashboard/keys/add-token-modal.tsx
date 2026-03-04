"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

export interface GitHubToken {
  id: string;
  label: string;
  token: string;
  createdAt: number;
}

export function AddTokenModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (token: GitHubToken) => void;
}) {
  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    if (!token.trim()) {
      setError("Token is required");
      return;
    }
    if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
      setError("Token should start with ghp_ or github_pat_");
      return;
    }

    onAdd({
      id: crypto.randomUUID(),
      label: label.trim(),
      token: token.trim(),
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Add GitHub PAT</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X size={16} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="fieldset">
            <span className="fieldset-legend text-xs">Label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. CI deploy token"
              className="input input-bordered input-sm w-full"
              autoFocus
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="input input-bordered input-sm w-full font-mono"
            />
          </label>

          {error && (
            <div className="alert alert-error text-xs py-2">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action mt-1">
            <button onClick={onClose} type="button" className="btn btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Add
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </div>
  );
}
