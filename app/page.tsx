"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  CaretDown,
  ClockCounterClockwise,
  Broom,
} from "@phosphor-icons/react";
import { SessionRow, SessionInfo } from "./components/session-row";

const ONE_HOUR = 60 * 60 * 1000;

export default function Home() {
  const sessions = useQuery(api.sessions.list);
  const removeSession = useMutation(api.sessions.remove);
  const removeMany = useMutation(api.sessions.removeMany);
  const router = useRouter();
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

  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="shrink-0 flex flex-col items-center pt-16 pb-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight brand-glow mb-1">
          Nebuchadnezzar
        </h1>
        <p className="text-base-content/40 text-sm mb-8">Claude Code UI</p>
        <button onClick={() => router.push("/session/new")} className="btn btn-primary gap-2">
          <Plus size={18} weight="bold" />
          New Session
        </button>
      </div>

      {sessions && recentSessions.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ul className="list bg-base-200 rounded-box max-w-md mx-auto">
            <li className="p-4 pb-2 text-xs opacity-60 tracking-wide uppercase">
              Recent Sessions
            </li>
            {recentSessions.map((session) => (
              <SessionRow
                key={session._id}
                session={session}
                onNavigate={() => router.push(`/session/${session._id}`)}
                onDelete={() => removeSession({ id: session._id })}
              />
            ))}
          </ul>
          {oldSessions.length > 0 && (
            <div className="max-w-md mx-auto mt-2">
              <button
                onClick={() => setShowOld(!showOld)}
                className="btn btn-ghost btn-sm w-full justify-between text-base-content/50"
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
                      onNavigate={() => router.push(`/session/${session._id}`)}
                      onDelete={() => removeSession({ id: session._id })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {sessions && recentSessions.length === 0 && oldSessions.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setShowOld(!showOld)}
              className="btn btn-ghost btn-sm w-full justify-between text-base-content/50"
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
                    onNavigate={() => router.push(`/session/${session._id}`)}
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
