"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { proxyStorageUrl } from "@/app/hooks/use-upload";
import { ImageViewer } from "./image-viewer";

const MARKER_RE = /\[screenshot:([a-zA-Z0-9_]{10,})\]/g;

/** Extract all screenshot upload IDs from content. */
export function extractScreenshotIds(content: string): string[] {
  return [...content.matchAll(MARKER_RE)].map((m) => m[1]);
}

/** Check whether content contains any screenshot markers. */
export function hasScreenshotMarkers(content: string): boolean {
  return /\[screenshot:[a-zA-Z0-9_]{10,}\]/.test(content);
}

/**
 * Renders a single screenshot image inline with click-to-zoom.
 */
function InlineScreenshot({ uploadId }: { uploadId: string }) {
  const uploads = useQuery(api.uploads.getMany, {
    uploadIds: [uploadId as Id<"uploads">],
  });
  const [viewing, setViewing] = useState(false);

  const upload = uploads?.[0];
  if (!upload?.url) {
    return <span className="loading loading-spinner loading-xs opacity-30" />;
  }

  return (
    <>
      <img
        src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
        alt={upload.filename}
        className="rounded-lg max-w-full my-2 cursor-pointer active:opacity-80 transition-opacity"
        onClick={() => setViewing(true)}
      />
      {viewing && (
        <ImageViewer
          src={proxyStorageUrl(upload.url) ?? ""}
          alt={upload.filename}
          uploadId={upload._id}
          meta={{
            filename: upload.filename,
            size: upload.size,
            mimeType: upload.mimeType,
            createdAt: upload.createdAt,
          }}
          onClose={() => setViewing(false)}
        />
      )}
    </>
  );
}

/**
 * Splits content at [screenshot:ID] markers and interleaves
 * rendered markdown with inline screenshot images.
 */
export function ScreenshotContent({
  content,
  renderMarkdown,
}: {
  content: string;
  renderMarkdown: (text: string) => React.ReactNode;
}) {
  const textParts = content.split(MARKER_RE);
  // matchAll indices: textParts[0], match[0], textParts[1], match[1], ...
  // split with capture group interleaves: [text, id, text, id, ...]
  // Even indices are text, odd indices are upload IDs

  return (
    <>
      {textParts.map((part, i) => {
        if (i % 2 === 0) {
          // Text segment — render as markdown
          const trimmed = part.trim();
          return trimmed ? <div key={i}>{renderMarkdown(trimmed)}</div> : null;
        }
        // Odd index = captured upload ID
        return <InlineScreenshot key={`ss-${i}-${part}`} uploadId={part} />;
      })}
    </>
  );
}
