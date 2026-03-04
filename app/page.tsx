"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Plus,
  CaretDown,
  ClockCounterClockwise,
  Broom,
  FolderSimple,
  ChatsCircle,
} from "@phosphor-icons/react";
import { SessionRow, SessionInfo } from "./components/session-row";
import { extractSessionIds } from "@/app/workspace/url-encoding";

const ONE_HOUR = 60 * 60 * 1000;

export default function Home() {
  const sessions = useQuery(api.sessions.list);
  const projects = useQuery(api.projects.list);
  const workspaces = useQuery(api.workspaces.list);
  const removeSession = useMutation(api.sessions.remove);
  const removeMany = useMutation(api.sessions.removeMany);
  const router = useRouter();
  const [showOld, setShowOld] = useState(false);
  const [now] = useState(() => Date.now());

  type WorkspaceGroup = {
    workspaceId: Id<"workspaces">;
    name: string;
    sessionIds: Set<Id<"sessions">>;
    sessions: SessionInfo[];
    lastActivity: number;
  };

  type ListItem =
    | { type: "session"; session: SessionInfo; lastActivity: number }
    | { type: "workspace"; group: WorkspaceGroup; lastActivity: number };

  const { recentItems, oldSessions } = useMemo(() => {
    const allIds = new Set<Id<"sessions">>();
    const groupMap = new Map<
      Id<"workspaces">,
      {
        workspaceId: Id<"workspaces">;
        name: string;
        sessionIds: Set<Id<"sessions">>;
      }
    >();

    if (workspaces) {
      for (const ws of workspaces) {
        const ids = extractSessionIds(ws.layout);
        const idSet = new Set(ids);
        for (const id of ids) allIds.add(id);
        groupMap.set(ws._id, {
          workspaceId: ws._id,
          name: ws.name,
          sessionIds: idSet,
        });
      }
    }

    const projectColorMap = new Map<string, string>();
    const projectNameMap = new Map<string, string>();
    if (projects) {
      for (const p of projects) {
        projectColorMap.set(p._id, p.color);
        projectNameMap.set(p._id, p.name);
      }
    }

    const standalone: SessionInfo[] = [];
    const old: SessionInfo[] = [];
    const sessionLookup = new Map<Id<"sessions">, SessionInfo>();

    if (sessions) {
      for (const s of sessions) {
        const enriched: SessionInfo = {
          ...s,
          projectColor: s.projectId
            ? projectColorMap.get(s.projectId)
            : undefined,
          projectName: s.projectId
            ? projectNameMap.get(s.projectId)
            : undefined,
        };
        sessionLookup.set(s._id, enriched);
        const inWs = allIds.has(s._id);
        if (now - s.lastActivity > ONE_HOUR && !s.isStreaming && !inWs) {
          old.push(enriched);
        } else if (!inWs) {
          standalone.push(enriched);
        }
      }
    }

    const groups: WorkspaceGroup[] = [];
    for (const [, g] of groupMap) {
      const groupSessions: SessionInfo[] = [];
      let maxActivity = 0;
      let anyStreaming = false;
      for (const id of g.sessionIds) {
        const s = sessionLookup.get(id);
        if (s) {
          groupSessions.push(s);
          if (s.lastActivity > maxActivity) maxActivity = s.lastActivity;
          if (s.isStreaming) anyStreaming = true;
        }
      }
      if (groupSessions.length > 0) {
        if (now - maxActivity > ONE_HOUR && !anyStreaming) {
          old.push(...groupSessions);
        } else {
          groups.push({
            workspaceId: g.workspaceId,
            name: g.name,
            sessionIds: g.sessionIds,
            sessions: groupSessions,
            lastActivity: maxActivity,
          });
        }
      }
    }

    const items: ListItem[] = [];
    for (const s of standalone) {
      items.push({ type: "session", session: s, lastActivity: s.lastActivity });
    }
    for (const g of groups) {
      items.push({ type: "workspace", group: g, lastActivity: g.lastActivity });
    }
    items.sort((a, b) => b.lastActivity - a.lastActivity);

    const MIN_VISIBLE = 3;
    if (items.length < MIN_VISIBLE && old.length > 0) {
      const needed = MIN_VISIBLE - items.length;
      const promoted = old.splice(0, needed);
      for (const s of promoted) {
        items.push({ type: "session", session: s, lastActivity: s.lastActivity });
      }
    }

    return { recentItems: items, oldSessions: old };
  }, [workspaces, sessions, projects, now]);

  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="shrink-0 flex flex-col items-center pt-16 pb-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight brand-glow mb-1">
          Nebuchadnezzar
        </h1>
        <p className="text-base-content/40 text-sm mb-8">Claude Code UI</p>
        <button
          onClick={() => router.push("/session/new")}
          className="btn btn-primary gap-2"
        >
          <Plus size={18} weight="bold" />
          New Session
        </button>
      </div>

      {projects && projects.length > 0 && (
        <div className="shrink-0 px-4 pb-4">
          <div className="max-w-md mx-auto">
            <SectionHeader
              icon={<FolderSimple size={14} weight="duotone" />}
              label="Projects"
            />
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <button
                  key={project._id}
                  onClick={() => router.push(`/project/${project._id}`)}
                  className="btn btn-sm bg-base-200 border-none gap-1.5 active:bg-base-300"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm">{project.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {recentItems.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="max-w-md mx-auto">
            <SectionHeader
              icon={<ChatsCircle size={14} weight="duotone" />}
              label="Recent Sessions"
            />
            <ul className="list bg-base-200 rounded-box">
              {recentItems.map((item) => {
                if (item.type === "session") {
                  return (
                    <SessionRow
                      key={item.session._id}
                      session={item.session}
                      onNavigate={() =>
                        router.push(`/session/${item.session._id}`)
                      }
                      onDelete={() =>
                        removeSession({ id: item.session._id })
                      }
                    />
                  );
                }
                return (
                  <li
                    key={item.group.workspaceId}
                    className="mx-2 my-1 rounded-lg border border-primary/20 overflow-hidden cursor-pointer active:bg-base-300/50"
                    onClick={() =>
                      router.push(`/workspace/${item.group.workspaceId}`)
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
                          inWorkspace
                          onNavigate={() =>
                            router.push(
                              `/workspace/${item.group.workspaceId}`,
                            )
                          }
                          onDelete={() => removeSession({ id: s._id })}
                        />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
          {oldSessions.length > 0 && (
            <div className="mt-3 max-w-md mx-auto">
              <button
                onClick={() => setShowOld(!showOld)}
                className="btn btn-ghost btn-sm w-full justify-between text-base-content/50"
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
                <ul className="list bg-base-200 rounded-box">
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
                      onNavigate={() =>
                        router.push(`/session/${session._id}`)
                      }
                      onDelete={() => removeSession({ id: session._id })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {sessions &&
        recentItems.length === 0 &&
        oldSessions.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="max-w-md mx-auto">
              <button
                onClick={() => setShowOld(!showOld)}
                className="btn btn-ghost btn-sm w-full justify-between text-base-content/50"
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
                <ul className="list bg-base-200 rounded-box mt-2">
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
                      onNavigate={() =>
                        router.push(`/session/${session._id}`)
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      {sessions && sessions.length === 0 && (
        <div className="flex-1 flex items-start justify-center pt-12">
          <p className="text-base-content/30 text-sm">
            No sessions yet. Start one above.
          </p>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 pb-2">
      <span className="opacity-40">{icon}</span>
      <span className="text-xs opacity-40 tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
