"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import {
  ChatCircleDots,
  Trash,
  CircleNotch,
} from "@phosphor-icons/react";

export function useRelativeTime(timestamp: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export type SessionInfo = {
  _id: Id<"sessions">;
  title: string;
  lastActivity: number;
  isStreaming: boolean;
};

export function SessionRow({
  session,
  active,
  onNavigate,
  onDelete,
}: {
  session: SessionInfo;
  active?: boolean;
  onNavigate: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const timeAgo = useRelativeTime(session.lastActivity);

  return (
    <li
      className={`list-row cursor-pointer transition-colors active:bg-base-300 ${
        session.isStreaming
          ? "bg-primary/10"
          : active
            ? "bg-base-300/60"
            : ""
      }`}
      onClick={onNavigate}
    >
      <div className="flex items-center justify-center w-8">
        {session.isStreaming ? (
          <CircleNotch
            size={18}
            weight="bold"
            className="text-primary animate-spin"
          />
        ) : (
          <ChatCircleDots size={18} weight="duotone" className="opacity-40" />
        )}
      </div>
      <div className="list-col-grow">
        <div className="text-sm">{session.title}</div>
        <div className="text-xs opacity-50">
          {session.isStreaming ? (
            <span className="text-primary">Streaming...</span>
          ) : (
            timeAgo
          )}
        </div>
      </div>
      <button
        className="btn btn-square btn-ghost btn-sm"
        onClick={onDelete}
        aria-label="Delete session"
      >
        <Trash size={16} weight="duotone" className="opacity-50" />
      </button>
    </li>
  );
}
