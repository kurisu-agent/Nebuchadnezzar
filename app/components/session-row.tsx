"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { TrashSimple, Columns } from "@phosphor-icons/react";
// Columns is still used for swipe-right reveal action

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
  isPlanning: boolean;
  hasUnseen: boolean;
};

const SWIPE_THRESHOLD = 80;

export function SessionRow({
  session,
  active,
  inWorkspace,
  onNavigate,
  onDelete,
  onAddToWorkspace,
}: {
  session: SessionInfo;
  active?: boolean;
  inWorkspace?: boolean;
  onNavigate: () => void;
  onDelete?: () => void;
  onAddToWorkspace?: () => void;
}) {
  const timeAgo = useRelativeTime(session.lastActivity);
  const [offsetX, setOffsetX] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const rowRef = useRef<HTMLLIElement>(null);

  const canSwipe = !!onDelete || !!onAddToWorkspace;

  const bg = session.isPlanning
    ? "bg-warning/10"
    : session.isStreaming
      ? "bg-primary/10"
      : active
        ? "bg-base-100/60"
        : "";

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Only start swiping if horizontal movement dominates
    if (!isSwiping.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        isSwiping.current = true;
      } else if (Math.abs(dy) > 10) {
        return;
      } else {
        return;
      }
    }

    // Bidirectional: left for delete, right for workspace
    let clamped = dx;
    if (dx < 0 && onDelete) {
      clamped = Math.max(dx, -SWIPE_THRESHOLD);
    } else if (dx > 0 && onAddToWorkspace && !inWorkspace) {
      clamped = Math.min(dx, SWIPE_THRESHOLD);
    } else {
      clamped = 0;
    }
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (offsetX <= -SWIPE_THRESHOLD && onDelete) {
      setDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 300);
    } else if (offsetX >= SWIPE_THRESHOLD && onAddToWorkspace && !inWorkspace) {
      onAddToWorkspace();
    }
    setOffsetX(0);
    isSwiping.current = false;
  };

  const handleClick = () => {
    if (!isSwiping.current) {
      onNavigate();
    }
  };

  const progress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const isSwipingRight = offsetX > 0;

  return (
    <li
      ref={rowRef}
      className={`relative overflow-hidden transition-all duration-300 ease-out ${bg}`}
      style={
        deleting
          ? { maxHeight: 0, opacity: 0, marginTop: 0, marginBottom: 0 }
          : { maxHeight: 200 }
      }
      onTouchStart={canSwipe ? handleTouchStart : undefined}
      onTouchMove={canSwipe ? handleTouchMove : undefined}
      onTouchEnd={canSwipe ? handleTouchEnd : undefined}
    >
      {/* Unseen indicator */}
      {session.hasUnseen && !active && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary z-10" />
      )}
      {/* Workspace action behind — slides in from left on right swipe */}
      {isSwipingRight && onAddToWorkspace && (
        <div
          className="absolute inset-y-0 left-0 bg-primary flex items-center justify-center"
          style={{
            width: Math.abs(offsetX),
            opacity: 0.4 + progress * 0.6,
          }}
        >
          <Columns
            size={20}
            weight="bold"
            className="text-primary-content"
            style={{
              opacity: Math.min(progress * 1.5, 1),
              transform: `scale(${0.6 + progress * 0.4})`,
            }}
          />
        </div>
      )}
      {/* Delete action behind — slides in from right on left swipe */}
      {!isSwipingRight && onDelete && offsetX < 0 && (
        <div
          className="absolute inset-y-0 right-0 bg-error flex items-center justify-center"
          style={{
            width: Math.abs(offsetX),
            opacity: 0.4 + progress * 0.6,
          }}
        >
          <TrashSimple
            size={20}
            weight="bold"
            className="text-error-content"
            style={{
              opacity: Math.min(progress * 1.5, 1),
              transform: `scale(${0.6 + progress * 0.4})`,
            }}
          />
        </div>
      )}
      {/* Swipeable content */}
      <div
        className={`list-row cursor-pointer active:bg-base-300 relative ${offsetX === 0 ? "transition-transform duration-200" : ""}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onClick={handleClick}
      >
        <div className="list-col-grow col-span-full flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm line-clamp-2">{session.title}</span>
          </div>
          <div className="text-xs opacity-50">{timeAgo}</div>
        </div>
      </div>
    </li>
  );
}
