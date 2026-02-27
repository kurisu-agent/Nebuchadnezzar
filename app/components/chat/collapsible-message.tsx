"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import {
  ScreenshotContent,
  hasScreenshotMarkers,
} from "./inline-screenshot";

/**
 * Detects long assistant messages and renders them in a collapsible container.
 * Short messages render inline. Long ones get a max-height with a "Show more" toggle.
 */
export function CollapsibleMessage({
  content,
  skipCollapse,
}: {
  content: string;
  skipCollapse?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > 500);
    }
  }, [content]);

  const shouldCollapse = isOverflowing && !skipCollapse;
  const containsScreenshots = hasScreenshotMarkers(content);

  const renderMarkdown = useCallback(
    (text: string) => (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    ),
    [],
  );

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`prose prose-sm prose-invert max-w-none overflow-hidden transition-[max-height] duration-300 ${
          !expanded && shouldCollapse ? "max-h-[300px]" : ""
        }`}
        style={
          !expanded && shouldCollapse
            ? {
                maskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
              }
            : undefined
        }
      >
        {containsScreenshots ? (
          <ScreenshotContent
            content={content}
            renderMarkdown={renderMarkdown}
          />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )}
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-xs btn-block rounded-full gap-1 opacity-50 active:opacity-100 transition-opacity mt-1"
          style={{
            backgroundColor: "oklch(from oklch(var(--n)) calc(l - 0.05) c h)",
          }}
        >
          {expanded ? (
            <>
              <CaretUp size={12} weight="bold" />
              Less
            </>
          ) : (
            <>
              <CaretDown size={12} weight="bold" />
              More
            </>
          )}
        </button>
      )}
    </div>
  );
}
