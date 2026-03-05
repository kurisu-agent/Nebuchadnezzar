import React, { useState, useEffect } from "react";

/** Format bytes into a human-readable string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a timestamp into a WhatsApp-style date label.
 * "Today", "Yesterday", day name for this week, or "Mon, Feb 20" for older.
 */
export function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.floor((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return "";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Formats a timestamp as a short local time like "2:34 PM". */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a relative time string from a timestamp. */
function formatRelativeTime(
  timestamp: number,
  now: number,
  precise: boolean,
): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) {
    if (precise) {
      const remainSec = diffSec % 60;
      return remainSec > 0
        ? `${diffMin}m ${remainSec}s ago`
        : `${diffMin}m ago`;
    }
    return `${diffMin}m ago`;
  }
  if (precise && diffSec > 0) return `${diffSec}s ago`;
  return precise ? "now" : "just now";
}

/**
 * Displays a live-updating relative time (e.g. "2m 30s ago").
 * When `streaming` is true, updates every second. Otherwise every 30s.
 */
export function RelativeTime({
  timestamp,
  streaming = false,
}: {
  timestamp: number;
  streaming?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = streaming ? 1000 : 60000;
    const id = setInterval(() => {
      setNow(Date.now());
    }, interval);
    return () => clearInterval(id);
  }, [streaming]);

  return <>{formatRelativeTime(timestamp, now, streaming)}</>;
}

/**
 * Recursively wraps string children in animated spans so new words fade in.
 * Index-based keys mean existing tokens keep their key across re-renders
 * and only newly appended tokens mount with the CSS animation.
 */
export function animateText(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return child.split(/(\s+)/).map((token, i) => (
        <span key={i} className="streaming-token">
          {token}
        </span>
      ));
    }
    if (React.isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      if (props.children) {
        return React.cloneElement(
          child as React.ReactElement<Record<string, unknown>>,
          {
            children: animateText(props.children as React.ReactNode),
          },
        );
      }
    }
    return child;
  });
}
