"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChatsCircle, Plus } from "@phosphor-icons/react";
import { SessionRow } from "@/app/components/session-row";

export default function ProjectSessionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sessions = useQuery(api.sessions.listByProject, {
    projectId: id as Id<"projects">,
  });
  const createSession = useMutation(api.sessions.create);
  const removeSession = useMutation(api.sessions.remove);

  const handleNew = async () => {
    const sessionId = await createSession({
      projectId: id as Id<"projects">,
    });
    router.push(`/session/${sessionId}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3 gap-2">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <ChatsCircle size={16} weight="duotone" />
              Sessions
            </h2>
            <button
              onClick={handleNew}
              className="btn btn-ghost btn-xs btn-square active:bg-base-300"
              aria-label="New session"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>

          {sessions === undefined ? (
            <div className="py-4 text-center">
              <span className="loading loading-spinner loading-sm opacity-50" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-base-content/30 py-1">
              No sessions yet. Tap + to start one.
            </p>
          ) : (
            <ul className="list">
              {sessions.map((session) => (
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
      </div>
    </div>
  );
}
