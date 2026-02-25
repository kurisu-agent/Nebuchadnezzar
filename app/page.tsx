"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { SessionRow } from "./components/session-row";

export default function Home() {
  const sessions = useQuery(api.sessions.list);
  const createSession = useMutation(api.sessions.create);
  const removeSession = useMutation(api.sessions.remove);
  const router = useRouter();

  const handleNewSession = async () => {
    const id = await createSession({});
    router.push(`/session/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: Id<"sessions">) => {
    e.stopPropagation();
    await removeSession({ id });
  };

  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="shrink-0 flex flex-col items-center pt-16 pb-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight brand-glow mb-1">
          Nebuchadnezzar
        </h1>
        <p className="text-base-content/40 text-sm mb-8">Claude Code UI</p>
        <button onClick={handleNewSession} className="btn btn-primary gap-2">
          <Plus size={18} weight="bold" />
          New Session
        </button>
      </div>

      {sessions && sessions.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ul className="list bg-base-200 rounded-box max-w-md mx-auto">
            <li className="p-4 pb-2 text-xs opacity-60 tracking-wide uppercase">
              Recent Sessions
            </li>
            {sessions.map((session) => (
              <SessionRow
                key={session._id}
                session={session}
                onNavigate={() => router.push(`/session/${session._id}`)}
                onDelete={(e) => handleDelete(e, session._id)}
              />
            ))}
          </ul>
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
