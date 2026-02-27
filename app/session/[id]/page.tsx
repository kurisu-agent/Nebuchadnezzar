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
  firstLeaf,
} from "@/app/workspace/workspace-context";
import { PaneTree } from "@/app/workspace/pane-tree";
import { serializeTree } from "@/app/workspace/url-encoding";
import { randomWorkspaceName } from "@/lib/random-name";

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

  // When a split is created, persist as workspace and navigate to it
  useEffect(() => {
    if (state.root.type === "split" && !creatingRef.current) {
      creatingRef.current = true;
      const layout = serializeTree(state.root);
      createWorkspace({ name: randomWorkspaceName(), layout }).then((wsId) => {
        router.replace(`/workspace/${wsId}`);
      });
    }
  }, [state.root, createWorkspace, router]);

  // Always render the first leaf — don't show splits locally,
  // the workspace page handles that after navigation
  const displayRoot =
    state.root.type === "leaf" ? state.root : firstLeaf(state.root);

  return (
    <SessionDrawer
      activeSessionId={sessionId}
      onAddToWorkspace={(id) => actions.addSessionPane(id)}
    >
      <div className="h-[100dvh] w-full overflow-hidden">
        <PaneTree node={displayRoot} />
      </div>
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
