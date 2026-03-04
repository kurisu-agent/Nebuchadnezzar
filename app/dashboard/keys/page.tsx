"use client";

import { useState } from "react";
import {
  Key,
  GithubLogo,
  Plus,
  Upload,
  TrashSimple,
  Copy,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { ImportKeyModal, type SSHKey } from "./import-key-modal";
import { GenerateKeyModal } from "./generate-key-modal";
import { AddTokenModal, type GitHubToken } from "./add-token-modal";

function maskToken(token: string) {
  const prefix = token.slice(0, 4);
  const suffix = token.slice(-4);
  return `${prefix}${"*".repeat(8)}${suffix}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function KeysPage() {
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [tokens, setTokens] = useState<GitHubToken[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());

  const addSSHKey = (key: SSHKey) => {
    setSSHKeys((prev) => [key, ...prev]);
  };

  const removeSSHKey = (id: string) => {
    setSSHKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const addToken = (token: GitHubToken) => {
    setTokens((prev) => [token, ...prev]);
  };

  const removeToken = (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    setRevealedTokens((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleRevealToken = (id: string) => {
    setRevealedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {/* SSH Keys */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <Key size={16} weight="duotone" />
              SSH Keys
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setShowImport(true)}
                className="btn btn-ghost btn-xs gap-1 active:bg-base-300"
                aria-label="Import key"
              >
                <Upload size={14} weight="bold" />
                <span className="text-xs">Import</span>
              </button>
              <button
                onClick={() => setShowGenerate(true)}
                className="btn btn-ghost btn-xs gap-1 active:bg-base-300"
                aria-label="Generate key"
              >
                <Plus size={14} weight="bold" />
                <span className="text-xs">Generate</span>
              </button>
            </div>
          </div>

          {sshKeys.length === 0 ? (
            <p className="text-sm text-base-content/30 py-1">
              No SSH keys. Import an existing key or generate a new one.
            </p>
          ) : (
            <ul className="list">
              {sshKeys.map((key) => (
                <li key={key.id} className="list-row">
                  <div className="flex items-center gap-3 list-col-grow min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {key.name}
                        </span>
                        <span className="badge badge-xs badge-ghost font-mono">
                          {key.type}
                        </span>
                      </div>
                      <div className="text-xs opacity-40 font-mono truncate">
                        {key.fingerprint}
                      </div>
                      <div className="text-xs opacity-30">
                        {formatDate(key.createdAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(key.fingerprint)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label="Copy fingerprint"
                  >
                    <Copy size={14} weight="bold" className="opacity-60" />
                  </button>
                  <button
                    onClick={() => removeSSHKey(key.id)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label="Delete key"
                  >
                    <TrashSimple
                      size={14}
                      weight="bold"
                      className="opacity-60 text-error"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* GitHub PATs */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <GithubLogo size={16} weight="duotone" />
              GitHub PATs
            </h2>
            <button
              onClick={() => setShowAddToken(true)}
              className="btn btn-ghost btn-xs btn-square active:bg-base-300"
              aria-label="Add token"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>

          {tokens.length === 0 ? (
            <p className="text-sm text-base-content/30 py-1">
              No tokens. Tap + to add a GitHub Personal Access Token.
            </p>
          ) : (
            <ul className="list">
              {tokens.map((t) => (
                <li key={t.id} className="list-row">
                  <div className="flex items-center gap-3 list-col-grow min-w-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {t.label}
                      </div>
                      <div className="text-xs opacity-40 font-mono truncate">
                        {revealedTokens.has(t.id)
                          ? t.token
                          : maskToken(t.token)}
                      </div>
                      <div className="text-xs opacity-30">
                        {formatDate(t.createdAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRevealToken(t.id)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label={
                      revealedTokens.has(t.id) ? "Hide token" : "Reveal token"
                    }
                  >
                    {revealedTokens.has(t.id) ? (
                      <EyeSlash
                        size={14}
                        weight="bold"
                        className="opacity-60"
                      />
                    ) : (
                      <Eye size={14} weight="bold" className="opacity-60" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(t.token)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label="Copy token"
                  >
                    <Copy size={14} weight="bold" className="opacity-60" />
                  </button>
                  <button
                    onClick={() => removeToken(t.id)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label="Delete token"
                  >
                    <TrashSimple
                      size={14}
                      weight="bold"
                      className="opacity-60 text-error"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showImport && (
        <ImportKeyModal
          onClose={() => setShowImport(false)}
          onImport={addSSHKey}
        />
      )}
      {showGenerate && (
        <GenerateKeyModal
          onClose={() => setShowGenerate(false)}
          onGenerate={addSSHKey}
        />
      )}
      {showAddToken && (
        <AddTokenModal
          onClose={() => setShowAddToken(false)}
          onAdd={addToken}
        />
      )}
    </div>
  );
}
