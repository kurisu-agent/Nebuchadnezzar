"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Plus,
  GearSix,
  MagnifyingGlass,
  CaretDown,
  ClockCounterClockwise,
  RocketLaunch,
  Broom,
  CornersOut,
  CornersIn,
} from "@phosphor-icons/react";
import { SessionRow, SessionInfo } from "./session-row";
import { SearchModal } from "./search-modal";
import { useUpdateAvailable } from "@/app/hooks/use-update-check";
import { extractSessionIds } from "@/app/workspace/url-encoding";
import { NotificationDot } from "./notification-dot";

const ONE_HOUR = 60 * 60 * 1000;

/** A workspace with its DB id and the session IDs it contains */
type WorkspaceGroup = {
  workspaceId: Id<"workspaces">;
  name: string;
  sessionIds: Set<Id<"sessions">>;
  sessions: SessionInfo[];
  /** Most recent activity across all sessions in this workspace */
  lastActivity: number;
};

export function SessionDrawer({
  activeSessionId,
  onAddToWorkspace,
  workspaceSessionIds,
  children,
}: {
  activeSessionId?: Id<"sessions">;
  onAddToWorkspace?: (id: Id<"sessions">) => void;
  /** Live workspace session IDs from the current WorkspaceProvider (more current than DB) */
  workspaceSessionIds?: Id<"sessions">[];
  children: React.ReactNode;
}) {
  const sessions = useQuery(api.sessions.list);
  const workspaces = useQuery(api.workspaces.list);
  const removeSession = useMutation(api.sessions.remove);
  const removeMany = useMutation(api.sessions.removeMany);
  const router = useRouter();
  const toggleRef = useRef<HTMLInputElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const hasUpdate = useUpdateAvailable();

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  // Build the full drawer list: standalone sessions + workspace groups,
  // all sorted by most recent activity
  type ListItem =
    | { type: "session"; session: SessionInfo; lastActivity: number }
    | { type: "workspace"; group: WorkspaceGroup; lastActivity: number };

  const { recentItems, oldSessions, allWsSessionIds } = useMemo(() => {
    // Collect all workspace session IDs and build group skeletons
    const allIds = new Set<Id<"sessions">>();
    const groupMap = new Map<
      Id<"workspaces">,
      { workspaceId: Id<"workspaces">; name: string; sessionIds: Set<Id<"sessions">> }
    >();

    if (workspaces) {
      for (const ws of workspaces) {
        const ids = extractSessionIds(ws.layout);
        const idSet = new Set(ids);
        for (const id of ids) allIds.add(id);
        groupMap.set(ws._id, { workspaceId: ws._id, name: ws.name, sessionIds: idSet });
      }
    }
    if (workspaceSessionIds) {
      for (const id of workspaceSessionIds) allIds.add(id);
    }

    // Classify sessions and populate groups
    const standalone: SessionInfo[] = [];
    const old: SessionInfo[] = [];
    const sessionLookup = new Map<Id<"sessions">, SessionInfo>();

    if (sessions) {
      for (const s of sessions) {
        sessionLookup.set(s._id, s);
        const inWs = allIds.has(s._id);
        if (now - s.lastActivity > ONE_HOUR && !s.isStreaming && !inWs) {
          old.push(s);
        } else if (!inWs) {
          standalone.push(s);
        }
      }
    }

    // Build workspace groups with sessions and computed lastActivity
    const groups: WorkspaceGroup[] = [];
    for (const [, g] of groupMap) {
      const groupSessions: SessionInfo[] = [];
      let maxActivity = 0;
      for (const id of g.sessionIds) {
        const s = sessionLookup.get(id);
        if (s) {
          groupSessions.push(s);
          if (s.lastActivity > maxActivity) maxActivity = s.lastActivity;
        }
      }
      if (groupSessions.length > 0) {
        groups.push({
          workspaceId: g.workspaceId,
          name: g.name,
          sessionIds: g.sessionIds,
          sessions: groupSessions,
          lastActivity: maxActivity,
        });
      }
    }

    // Interleave standalone sessions and workspace groups by recency
    const items: ListItem[] = [];
    for (const s of standalone) {
      items.push({
        type: "session",
        session: s,
        lastActivity: s.lastActivity,
      });
    }
    for (const g of groups) {
      items.push({ type: "workspace", group: g, lastActivity: g.lastActivity });
    }
    items.sort((a, b) => b.lastActivity - a.lastActivity);

    // Always show at least 3 items in the main list — promote the most
    // recent old sessions when there aren't enough recent items.
    const MIN_VISIBLE = 3;
    if (items.length < MIN_VISIBLE && old.length > 0) {
      const needed = MIN_VISIBLE - items.length;
      const promoted = old.splice(0, needed); // old is already sorted by recency (from sessions.list)
      for (const s of promoted) {
        items.push({ type: "session", session: s, lastActivity: s.lastActivity });
      }
    }

    return { recentItems: items, oldSessions: old, allWsSessionIds: allIds };
  }, [workspaces, workspaceSessionIds, sessions, now]);

  const close = () => {
    if (toggleRef.current) toggleRef.current.checked = false;
  };

  const handleNavigate = (id: Id<"sessions">) => {
    close();
    router.push(`/session/${id}`);
  };

  const handleNavigateWorkspace = (wsId: Id<"workspaces">) => {
    close();
    router.push(`/workspace/${wsId}`);
  };

  const handleNewSession = () => {
    close();
    router.push("/session/new");
  };

  const handleAddToWorkspace = (id: Id<"sessions">) => {
    close();
    onAddToWorkspace?.(id);
  };

  const renderRow = (session: SessionInfo) => (
    <SessionRow
      key={session._id}
      session={session}
      active={session._id === activeSessionId}
      inWorkspace={allWsSessionIds.has(session._id)}
      onNavigate={() => handleNavigate(session._id)}
      onDelete={() => removeSession({ id: session._id })}
      onAddToWorkspace={
        onAddToWorkspace
          ? () => handleAddToWorkspace(session._id)
          : undefined
      }
    />
  );

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
          <div className="p-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between shrink-0">
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
            {recentItems.length > 0 && (
              <ul className="list">
                {recentItems.map((item) => {
                  if (item.type === "session") {
                    return renderRow(item.session);
                  }
                  // Workspace group
                  return (
                    <li
                      key={item.group.workspaceId}
                      className="mx-2 my-1 rounded-lg border border-primary/20 overflow-hidden cursor-pointer active:bg-base-300/50"
                      onClick={() =>
                        handleNavigateWorkspace(item.group.workspaceId)
                      }
                    >
                      <div className="px-3 pt-2 pb-1 text-xs font-medium text-primary/60 truncate">
                        {item.group.name}
                      </div>
                      <ul className="list">
                        {item.group.sessions.map((s) => (
                          <SessionRow
                            key={s._id}
                            session={s}
                            active={s._id === activeSessionId}
                            inWorkspace
                            onNavigate={() =>
                              handleNavigateWorkspace(item.group.workspaceId)
                            }
                            onDelete={() =>
                              removeSession({ id: s._id })
                            }
                          />
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
            {sessions &&
              recentItems.length === 0 &&
              oldSessions.length === 0 && (
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
                    {oldSessions.length} older session
                    {oldSessions.length !== 1 ? "s" : ""}
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
                        inWorkspace={false}
                        onNavigate={() => handleNavigate(session._id)}
                        onDelete={() => removeSession({ id: session._id })}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-16px))] shrink-0 border-t border-base-300 flex items-center gap-1">
            <Link
              href="/dashboard"
              onClick={close}
              prefetch={true}
              className="btn btn-ghost btn-sm flex-1 justify-start gap-2 text-base-content/60"
            >
              <span className="relative">
                {hasUpdate && <NotificationDot />}
                <GearSix size={18} weight="duotone" />
              </span>
              Dashboard
            </Link>
            <button
              onClick={toggleFullscreen}
              className="btn btn-ghost btn-sm btn-square text-base-content/60"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <CornersIn size={18} weight="bold" />
              ) : (
                <CornersOut size={18} weight="bold" />
              )}
            </button>
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
