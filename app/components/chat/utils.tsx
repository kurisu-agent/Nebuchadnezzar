import React from "react";

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
