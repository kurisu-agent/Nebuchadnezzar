"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X, UserCircle, Robot } from "@phosphor-icons/react";

function HighlightedSnippet({
  snippet,
  matchStart,
  matchLength,
}: {
  snippet: string;
  matchStart: number;
  matchLength: number;
}) {
  const before = snippet.slice(0, matchStart);
  const match = snippet.slice(matchStart, matchStart + matchLength);
  const after = snippet.slice(matchStart + matchLength);

  return (
    <p className="text-xs opacity-70 line-clamp-2 break-words">
      {before}
      <mark className="bg-warning/30 text-warning-content rounded-sm px-0.5">
        {match}
      </mark>
      {after}
    </p>
  );
}

function SearchResultsList({
  results,
  onTap,
}: {
  results: Array<{
    sessionId: string;
    sessionTitle: string;
    messageId: string;
    role: "user" | "assistant";
    snippet: string;
    matchStart: number;
    matchLength: number;
    createdAt: number;
  }>;
  onTap: (sessionId: Id<"sessions">) => void;
}) {
  const grouped = new Map<string, typeof results>();
  for (const r of results) {
    const existing = grouped.get(r.sessionId) ?? [];
    existing.push(r);
    grouped.set(r.sessionId, existing);
  }

  return (
    <div className="flex flex-col">
      {Array.from(grouped.entries()).map(([sessionId, items]) => (
        <div key={sessionId}>
          <div className="px-3 pt-3 pb-1 text-xs font-semibold opacity-50 uppercase tracking-wide sticky top-0 bg-base-100/90 backdrop-blur-sm">
            {items[0].sessionTitle}
          </div>
          <ul className="list">
            {items.map((item) => (
              <li
                key={item.messageId}
                className="list-row cursor-pointer active:bg-base-300 transition-colors"
                onClick={() => onTap(sessionId as Id<"sessions">)}
              >
                <div className="list-col-grow">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.role === "user" ? (
                      <UserCircle
                        size={14}
                        weight="duotone"
                        className="opacity-50 shrink-0"
                      />
                    ) : (
                      <Robot
                        size={14}
                        weight="duotone"
                        className="opacity-50 shrink-0"
                      />
                    )}
                    <span className="badge badge-xs badge-ghost">
                      {item.role}
                    </span>
                  </div>
                  <HighlightedSnippet
                    snippet={item.snippet}
                    matchStart={item.matchStart}
                    matchLength={item.matchLength}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface SearchModalProps {
  includeDeleted: boolean;
  onClose: () => void;
  onNavigate?: (sessionId: Id<"sessions">) => void;
}

export function SearchModal({
  includeDeleted,
  onClose,
  onNavigate,
}: SearchModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    modalRef.current?.showModal();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const results = useQuery(
    api.search.searchMessages,
    debouncedTerm.trim().length >= 2
      ? { searchTerm: debouncedTerm, includeDeleted }
      : "skip",
  );

  const handleResultTap = useCallback(
    (sessionId: Id<"sessions">) => {
      modalRef.current?.close();
      if (onNavigate) {
        onNavigate(sessionId);
      } else {
        router.push(`/session/${sessionId}`);
      }
      onClose();
    },
    [onNavigate, onClose, router],
  );

  const handleClose = () => {
    modalRef.current?.close();
    onClose();
  };

  return (
    <dialog ref={modalRef} className="modal" onClose={onClose}>
      <div className="modal-box w-full h-full max-w-full max-h-full rounded-none p-0 flex flex-col">
        {/* Search header */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-base-300 bg-base-200">
          <MagnifyingGlass
            size={20}
            weight="duotone"
            className="opacity-50 shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="input input-sm bg-transparent border-none flex-1 focus:outline-none"
          />
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-square active:bg-base-300"
            aria-label="Close search"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          {debouncedTerm.trim().length < 2 && (
            <p className="text-center text-base-content/30 text-sm pt-12">
              Type at least 2 characters to search.
            </p>
          )}

          {debouncedTerm.trim().length >= 2 && results === undefined && (
            <div className="flex justify-center pt-12">
              <span className="loading loading-dots loading-md opacity-50" />
            </div>
          )}

          {results && results.length === 0 && (
            <p className="text-center text-base-content/30 text-sm pt-12">
              No messages found.
            </p>
          )}

          {results && results.length > 0 && (
            <SearchResultsList results={results} onTap={handleResultTap} />
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
