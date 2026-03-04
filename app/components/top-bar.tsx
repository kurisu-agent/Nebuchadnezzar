"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { List } from "@phosphor-icons/react";
import { ReactNode } from "react";
import { NotificationDot } from "./notification-dot";

export function TopBar({
  children,
  trailing,
  className,
  bg = "bg-base-200",
  style,
}: {
  children?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  bg?: string;
  style?: React.CSSProperties;
}) {
  const hasUnseen = useQuery(api.sessions.hasUnseen, {});

  return (
    <div
      className={`navbar shrink-0 gap-0 p-0 border-b border-base-300 ${bg} ${className ?? ""}`}
      style={style}
    >
      <label
        htmlFor="session-drawer"
        className="shrink-0 aspect-square self-stretch flex items-center justify-center bg-base-300 active:bg-base-300/80 cursor-pointer"
      >
        <span className="relative text-base-content/50">
          {hasUnseen && <NotificationDot />}
          <List size={24} weight="bold" />
        </span>
      </label>
      <div className="flex-1 min-w-0 px-2 flex items-center">{children}</div>
      {trailing && <div className="shrink-0 pr-2">{trailing}</div>}
    </div>
  );
}
