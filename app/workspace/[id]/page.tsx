"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { List, GridFour } from "@phosphor-icons/react";
import { SessionDrawer } from "@/app/components/session-drawer";
import {
  WorkspaceProvider,
  useWorkspace,
  findLeaf,
  firstLeaf,
} from "@/app/workspace/workspace-context";
import { PaneTree } from "@/app/workspace/pane-tree";
import { deserializeTree } from "@/app/workspace/url-encoding";
import { useWorkspacePersist } from "@/app/workspace/use-workspace-persist";

function WorkspaceContent({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const { state } = useWorkspace();
  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col">
      <div className="navbar shrink-0 gap-1 min-h-0 py-0.5 px-2 pt-[calc(env(safe-area-inset-top)-16px)] bg-base-200">
        <div className="flex-none">
          <label
            htmlFor="session-drawer"
            className="btn btn-ghost btn-sm btn-square"
          >
            <List size={18} weight="bold" />
          </label>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <GridFour size={14} weight="duotone" className="opacity-50 shrink-0" />
          <span className="text-sm font-medium opacity-60 truncate">
            Workspace
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <PaneTree node={state.root} />
      </div>
    </div>
  );
}

function WorkspaceInner({ workspaceId }: { workspaceId: Id<"workspaces"> }) {
  const router = useRouter();
  const { state, actions } = useWorkspace();
  const removeWorkspace = useMutation(api.workspaces.remove);

  // Persist layout changes to DB (debounced)
  useWorkspacePersist(workspaceId, state.root);

  // When collapsed to single pane, delete workspace and go to that session
  useEffect(() => {
    if (state.root.type === "leaf") {
      removeWorkspace({ id: workspaceId });
      if (state.root.sessionId) {
        router.replace(`/session/${state.root.sessionId}`);
      } else {
        router.replace("/session/new");
      }
    }
  }, [state.root, router, removeWorkspace, workspaceId]);

  const focusedLeaf = findLeaf(state.root, state.focusedPaneId);
  const activeSessionId =
    focusedLeaf?.sessionId ?? firstLeaf(state.root).sessionId;

  return (
    <SessionDrawer
      activeSessionId={activeSessionId ?? undefined}
      onAddToWorkspace={(id) => actions.addSessionPane(id)}
      workspaceSessionIds={actions.getSessionIds()}
    >
      <WorkspaceContent workspaceId={workspaceId} />
    </SessionDrawer>
  );
}

/** Renders once workspace data has loaded and been parsed */
function WorkspaceReady({
  workspaceId,
  layout,
}: {
  workspaceId: Id<"workspaces">;
  layout: string;
}) {
  const router = useRouter();

  const [initialTree] = useState(() => {
    try {
      return deserializeTree(layout);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!initialTree) router.replace("/session/new");
  }, [initialTree, router]);

  if (!initialTree) return null;

  return (
    <WorkspaceProvider initialTree={initialTree}>
      <WorkspaceInner workspaceId={workspaceId} />
    </WorkspaceProvider>
  );
}

/** Shown while workspace is deleted or not found */
function WorkspaceNotFound() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/session/new");
  }, [router]);
  return null;
}

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as Id<"workspaces">;
  const workspace = useQuery(api.workspaces.get, { id: workspaceId });

  // Still loading
  if (workspace === undefined) return null;

  // Workspace deleted or not found
  if (workspace === null) return <WorkspaceNotFound />;

  // Ready — pass layout as prop so WorkspaceReady mounts fresh
  return <WorkspaceReady workspaceId={workspaceId} layout={workspace.layout} />;
}
