"use client";

import { useState } from "react";
import {
  Warning,
  ArrowClockwise,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";

/**
 * Renders an error message with collapsible raw details and optional retry.
 */
export function ErrorMessage({
  content,
  showRetry,
  onRetry,
}: {
  content: string;
  showRetry: boolean;
  onRetry: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const errorText = content.replace(/^Error: /, "");

  let summary = errorText;
  let rawJson = errorText;
  try {
    const parsed = JSON.parse(errorText);
    summary = parsed.message || errorText;
    rawJson = JSON.stringify(parsed, null, 2);
  } catch {
    const firstLine = errorText.split("\n")[0];
    summary =
      firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="alert alert-error gap-2 text-sm py-2 px-3">
        <Warning size={18} weight="bold" className="shrink-0" />
        <span className="flex-1 min-w-0 text-sm select-text break-words">
          {summary}
        </span>
        {showRetry && (
          <button
            onClick={onRetry}
            className="btn btn-ghost btn-xs btn-circle shrink-0 active:bg-error/20"
            aria-label="Retry"
          >
            <ArrowClockwise size={14} weight="bold" />
          </button>
        )}
      </div>
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-1 text-[10px] opacity-50 active:opacity-80 transition-opacity pl-1"
      >
        {detailsOpen ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        )}
        Details
      </button>
      {detailsOpen && (
        <pre className="text-[11px] opacity-60 bg-black/20 rounded p-2 w-full whitespace-pre-wrap break-all select-text max-h-48 overflow-y-auto">
          {rawJson}
        </pre>
      )}
    </div>
  );
}
