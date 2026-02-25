"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Plus, GearSix } from "@phosphor-icons/react";
import { SessionRow } from "./session-row";

export function SessionDrawer({
  activeSessionId,
  children,
}: {
  activeSessionId?: Id<"sessions">;
  children: React.ReactNode;
}) {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const removeSession = useMutation(api.sessions.remove);
  const router = useRouter();
  const toggleRef = useRef<HTMLInputElement>(null);

  const close = () => {
    if (toggleRef.current) toggleRef.current.checked = false;
  };

  const handleNavigate = (id: Id<"sessions">) => {
    close();
    router.push(`/session/${id}`);
  };

  const handleNewSession = async () => {
    close();
    const id = await createSession({});
    router.push(`/session/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: Id<"sessions">) => {
    e.stopPropagation();
    await removeSession({ id });
    if (id === activeSessionId) {
      close();
      router.push("/");
    }
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
            <span className="text-sm font-semibold opacity-70">Sessions</span>
            <button
              onClick={handleNewSession}
              className="btn btn-primary btn-sm gap-1"
            >
              <Plus size={16} weight="bold" />
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-base-300/40">
            {sessions && sessions.length > 0 && (
              <ul className="list">
                {sessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    active={session._id === activeSessionId}
                    onNavigate={() => handleNavigate(session._id)}
                    onDelete={(e) => handleDelete(e, session._id)}
                  />
                ))}
              </ul>
            )}
            {sessions && sessions.length === 0 && (
              <p className="text-center text-base-content/30 text-sm pt-8">
                No sessions yet.
              </p>
            )}
          </div>
          <div className="p-3 shrink-0 border-t border-base-300">
            <button
              onClick={() => {
                close();
                router.push("/dashboard");
              }}
              className="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/60"
            >
              <GearSix size={18} weight="duotone" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
