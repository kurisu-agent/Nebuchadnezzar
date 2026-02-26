"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { SessionDrawer } from "@/app/components/session-drawer";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/app/workspace/workspace-context";
import { PaneTree } from "@/app/workspace/pane-tree";
import { serializeTree } from "@/app/workspace/url-encoding";

function WorkspaceContent() {
  const { state } = useWorkspace();
  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      <PaneTree node={state.root} />
    </div>
  );
}

function SessionPageInner({ sessionId }: { sessionId: Id<"sessions"> }) {
  const router = useRouter();
  const session = useQuery(api.sessions.get, { id: sessionId });
  const { state, actions } = useWorkspace();
  const createWorkspace = useMutation(api.workspaces.create);
  const creatingRef = useRef(false);

  // Redirect to new session if this one was deleted
  useEffect(() => {
    if (session === null || (session && session.deletedAt)) {
      router.replace("/session/new");
    }
  }, [session, router]);

  // When a split is created, persist as a workspace in DB and navigate to it
  useEffect(() => {
    if (state.root.type === "split" && !creatingRef.current) {
      creatingRef.current = true;
      const layout = serializeTree(state.root);
      createWorkspace({ layout }).then((wsId) => {
        router.replace(`/workspace/${wsId}`);
      });
    }
  }, [state.root, createWorkspace, router]);

  return (
    <SessionDrawer
      activeSessionId={sessionId}
      onAddToWorkspace={(id) => actions.addSessionPane(id)}
    >
      <WorkspaceContent />
    </SessionDrawer>
  );
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as Id<"sessions">;

  return (
    <WorkspaceProvider initialSessionId={sessionId}>
      <SessionPageInner sessionId={sessionId} />
    </WorkspaceProvider>
  );
}
