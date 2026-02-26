"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Plus,
  GearSix,
  MagnifyingGlass,
  CaretDown,
  ClockCounterClockwise,
  RocketLaunch,
  Broom,
} from "@phosphor-icons/react";
import { SessionRow, SessionInfo } from "./session-row";
import { SearchModal } from "./search-modal";

const ONE_HOUR = 60 * 60 * 1000;

export function SessionDrawer({
  activeSessionId,
  children,
}: {
  activeSessionId?: Id<"sessions">;
  children: React.ReactNode;
}) {
  const sessions = useQuery(api.sessions.list);
  const removeSession = useMutation(api.sessions.remove);
  const removeMany = useMutation(api.sessions.removeMany);
  const router = useRouter();
  const toggleRef = useRef<HTMLInputElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showOld, setShowOld] = useState(false);

  const now = Date.now();
  const recentSessions: SessionInfo[] = [];
  const oldSessions: SessionInfo[] = [];

  if (sessions) {
    for (const s of sessions) {
      if (now - s.lastActivity > ONE_HOUR && !s.isStreaming) {
        oldSessions.push(s);
      } else {
        recentSessions.push(s);
      }
    }
  }

  const close = () => {
    if (toggleRef.current) toggleRef.current.checked = false;
  };

  const handleNavigate = (id: Id<"sessions">) => {
    close();
    router.push(`/session/${id}`);
  };

  const handleNewSession = () => {
    close();
    router.push("/session/new");
  };

  return (
    <div className="drawer">
      <input
        id="session-drawer"
        type="checkbox"
        className="drawer-toggle"
        ref={toggleRef}
      />
      <div className="drawer-content flex flex-col">{children}</div>
      <div className="drawer-side z-50">
        <label
          htmlFor="session-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        />
        <div className="bg-base-200 h-full w-72 flex flex-col">
          <div className="p-4 pb-3 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold opacity-70 flex items-center gap-1.5">
              <RocketLaunch size={16} weight="duotone" />
              Nebuchadnezzar
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(true)}
                className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                aria-label="Search messages"
              >
                <MagnifyingGlass size={16} weight="bold" />
              </button>
              <button
                onClick={handleNewSession}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus size={16} weight="bold" />
                New
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-base-300/40">
            {recentSessions.length > 0 && (
              <ul className="list">
                {recentSessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    active={session._id === activeSessionId}
                    onNavigate={() => handleNavigate(session._id)}
                    onDelete={() => removeSession({ id: session._id })}
                  />
                ))}
              </ul>
            )}
            {sessions && recentSessions.length === 0 && oldSessions.length === 0 && (
              <p className="text-center text-base-content/30 text-sm pt-8">
                No sessions yet.
              </p>
            )}
            {oldSessions.length > 0 && (
              <div className="border-t border-base-300">
                <button
                  onClick={() => setShowOld(!showOld)}
                  className="btn btn-ghost btn-sm w-full justify-between text-base-content/50 rounded-none"
                >
                  <span className="flex items-center gap-1.5">
                    <ClockCounterClockwise size={14} weight="duotone" />
                    {oldSessions.length} older session{oldSessions.length !== 1 ? "s" : ""}
                  </span>
                  <CaretDown
                    size={12}
                    weight="bold"
                    className={`transition-transform ${showOld ? "rotate-180" : ""}`}
                  />
                </button>
                {showOld && (
                  <ul className="list">
                    <li
                      className="list-row cursor-pointer transition-colors active:bg-base-300 text-error/60"
                      onClick={() => {
                        removeMany({ ids: oldSessions.map((s) => s._id) });
                        setShowOld(false);
                      }}
                    >
                      <div className="col-span-full flex items-center gap-2 text-xs">
                        <Broom size={14} weight="bold" />
                        Clean up all
                      </div>
                    </li>
                    {oldSessions.map((session) => (
                      <SessionRow
                        key={session._id}
                        session={session}
                        active={session._id === activeSessionId}
                        onNavigate={() => handleNavigate(session._id)}
                        onDelete={() => removeSession({ id: session._id })}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="p-3 shrink-0 border-t border-base-300">
            <Link
              href="/dashboard"
              onClick={close}
              prefetch={true}
              className="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/60"
            >
              <GearSix size={18} weight="duotone" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
      {showSearch && (
        <SearchModal
          includeDeleted={false}
          onClose={() => setShowSearch(false)}
          onNavigate={(sessionId) => handleNavigate(sessionId)}
        />
      )}
    </div>
  );
}
