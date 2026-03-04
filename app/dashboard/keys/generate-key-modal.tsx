"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { SSHKey } from "./import-key-modal";

export function GenerateKeyModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (key: SSHKey) => void;
}) {
  const [name, setName] = useState("");
  const [keyType, setKeyType] = useState<"ed25519" | "rsa">("ed25519");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // Mock fingerprint
    const fp =
      "SHA256:" +
      btoa(name + keyType + Date.now())
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 43);

    onGenerate({
      id: crypto.randomUUID(),
      name: name.trim(),
      type: keyType,
      fingerprint: fp,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Generate SSH Key</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X size={16} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="fieldset">
            <span className="fieldset-legend text-xs">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. deploy-key"
              className="input input-bordered input-sm w-full"
              autoFocus
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Key Type</span>
            <div className="flex gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="keyType"
                  className="radio radio-sm radio-primary"
                  checked={keyType === "ed25519"}
                  onChange={() => setKeyType("ed25519")}
                />
                <span className="text-sm">Ed25519</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="keyType"
                  className="radio radio-sm radio-primary"
                  checked={keyType === "rsa"}
                  onChange={() => setKeyType("rsa")}
                />
                <span className="text-sm">RSA 4096</span>
              </label>
            </div>
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
              Generate
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
