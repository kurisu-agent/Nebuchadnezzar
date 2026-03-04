"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

export interface SSHKey {
  id: string;
  name: string;
  type: string;
  fingerprint: string;
  createdAt: number;
}

export function ImportKeyModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (key: SSHKey) => void;
}) {
  const [name, setName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!privateKey.trim()) {
      setError("Private key is required");
      return;
    }

    // Detect key type from the header
    const header = privateKey.trim().split("\n")[0] ?? "";
    let type = "unknown";
    if (header.includes("ED25519")) type = "ed25519";
    else if (header.includes("RSA")) type = "rsa";
    else if (header.includes("ECDSA")) type = "ecdsa";
    else if (header.includes("OPENSSH")) type = "openssh";

    // Generate a mock fingerprint
    const fp =
      "SHA256:" +
      btoa(privateKey.slice(0, 32))
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 43);

    onImport({
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      fingerprint: fp,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Import SSH Key</h3>
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
              placeholder="e.g. personal-laptop"
              className="input input-bordered input-sm w-full"
              autoFocus
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Private Key</span>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
              className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
              rows={6}
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
              Import
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
