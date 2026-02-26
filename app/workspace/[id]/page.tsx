"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SessionDrawer } from "@/app/components/session-drawer";
import { TopBar } from "@/app/components/top-bar";
import {
  WorkspaceProvider,
  useWorkspace,
  findLeaf,
  firstLeaf,
} from "@/app/workspace/workspace-context";
import { PaneTree } from "@/app/workspace/pane-tree";
import { deserializeTree } from "@/app/workspace/url-encoding";
import { useWorkspacePersist } from "@/app/workspace/use-workspace-persist";
import { EditNameModal } from "@/app/workspace/edit-name-modal";
import { GearSix, Eraser } from "@phosphor-icons/react";

function WorkspaceContent({
  workspaceId,
  name,
  onDissolve,
}: {
  workspaceId: Id<"workspaces">;
  name: string;
  onDissolve: () => void;
}) {
  const { state } = useWorkspace();
  const [showEditName, setShowEditName] = useState(false);

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col">
      <TopBar
        trailing={
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-sm btn-square"
            >
              <GearSix size={18} weight="bold" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-300 rounded-box z-50 w-56 p-2 shadow-lg"
            >
              <li>
                <button onClick={onDissolve}>
                  <Eraser size={16} weight="bold" />
                  Dissolve Workspace
                </button>
              </li>
            </ul>
          </div>
        }
      >
        <button
          onClick={() => setShowEditName(true)}
          className="text-sm font-medium opacity-40 px-1 truncate active:opacity-60"
        >
          {name}
        </button>
      </TopBar>
      <div className="flex-1 overflow-hidden">
        <PaneTree node={state.root} />
      </div>
      {showEditName && (
        <EditNameModal
          workspaceId={workspaceId}
          currentName={name}
          onClose={() => setShowEditName(false)}
        />
      )}
    </div>
  );
}

function WorkspaceInner({
  workspaceId,
  name,
  onNavigatingAway,
}: {
  workspaceId: Id<"workspaces">;
  name: string;
  onNavigatingAway: () => void;
}) {
  const router = useRouter();
  const { state, actions } = useWorkspace();
  const removeWorkspace = useMutation(api.workspaces.remove);

  // Persist layout changes to DB (debounced)
  useWorkspacePersist(workspaceId, state.root);

  // When collapsed to single pane, navigate and clean up
  useEffect(() => {
    if (state.root.type === "leaf") {
      onNavigatingAway();
      if (state.root.iframeUrl) {
        router.replace("/session/new");
      } else if (state.root.sessionId) {
        router.replace(`/session/${state.root.sessionId}`);
      } else {
        router.replace("/session/new");
      }
      removeWorkspace({ id: workspaceId });
    }
  }, [state.root, router, removeWorkspace, workspaceId, onNavigatingAway]);

  const focusedLeaf = findLeaf(state.root, state.focusedPaneId);
  const activeSessionId =
    focusedLeaf?.sessionId ?? firstLeaf(state.root).sessionId;

  const handleDissolve = () => {
    onNavigatingAway();
    const leaf = firstLeaf(state.root);
    if (leaf.iframeUrl) {
      router.replace("/session/new");
    } else if (leaf.sessionId) {
      router.replace(`/session/${leaf.sessionId}`);
    } else {
      router.replace("/session/new");
    }
    removeWorkspace({ id: workspaceId });
  };

  return (
    <SessionDrawer
      activeSessionId={activeSessionId ?? undefined}
      onAddToWorkspace={(id) => actions.addSessionPane(id)}
      workspaceSessionIds={actions.getSessionIds()}
    >
      <WorkspaceContent
        workspaceId={workspaceId}
        name={name}
        onDissolve={handleDissolve}
      />
    </SessionDrawer>
  );
}

/** Renders once workspace data has loaded and been parsed */
function WorkspaceReady({
  workspaceId,
  name,
  layout,
  onNavigatingAway,
}: {
  workspaceId: Id<"workspaces">;
  name: string;
  layout: string;
  onNavigatingAway: () => void;
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
      <WorkspaceInner workspaceId={workspaceId} name={name} onNavigatingAway={onNavigatingAway} />
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
  const [navigatingAway, setNavigatingAway] = useState(false);

  // Still loading
  if (workspace === undefined) return null;

  // Workspace deleted or not found — only redirect if we didn't navigate away intentionally
  if (workspace === null) {
    if (navigatingAway) return null;
    return <WorkspaceNotFound />;
  }

  // Ready — pass layout as prop so WorkspaceReady mounts fresh
  return (
    <WorkspaceReady
      workspaceId={workspaceId}
      name={workspace.name}
      layout={workspace.layout}
      onNavigatingAway={() => { setNavigatingAway(true); }}
    />
  );
}
