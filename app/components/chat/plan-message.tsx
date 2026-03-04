"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Notepad, CaretDown, CaretUp } from "@phosphor-icons/react";
import { ScreenshotContent, hasScreenshotMarkers } from "./inline-screenshot";

/**
 * Renders a plan message as a collapsed card with warning styling.
 * Shows the plan file content (planContent) when available, otherwise falls back to message content.
 * Collapsed by default — shows "Plan" header + text preview. Expands to full markdown.
 */
export function PlanMessage({
  content,
  planContent,
}: {
  content: string;
  planContent?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const displayContent = planContent || content;
  const preview = displayContent
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 120);

  const containsScreenshots = hasScreenshotMarkers(displayContent);
  const renderMarkdown = useCallback(
    (text: string) => (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    ),
    [],
  );

  return (
    <div className="flex flex-col w-full -mx-1 -my-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 active:bg-warning/15 transition-colors ${
          expanded ? "rounded-t-xl" : "rounded-xl"
        }`}
      >
        <Notepad size={16} weight="duotone" className="text-warning shrink-0" />
        <span className="text-xs text-warning/80 uppercase tracking-wider font-medium">
          Plan
        </span>
        <span className="flex-1 min-w-0 text-xs opacity-40 text-left truncate">
          {!expanded && preview}
        </span>
        {expanded ? (
          <CaretUp size={12} weight="bold" className="opacity-40 shrink-0" />
        ) : (
          <CaretDown size={12} weight="bold" className="opacity-40 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 py-2 bg-warning/5 border border-t-0 border-warning/20 rounded-b-xl overflow-y-auto max-h-[60vh]">
          <div className="prose prose-sm prose-invert max-w-none">
            {containsScreenshots ? (
              <ScreenshotContent
                content={displayContent}
                renderMarkdown={renderMarkdown}
              />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
