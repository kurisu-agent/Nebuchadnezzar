"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  PaneNode,
  PaneLeaf,
  PaneSplit,
  WorkspaceState,
  WorkspaceActions,
  SplitDirection,
} from "./types";

function genId(): string {
  return crypto.randomUUID();
}

function makeLeaf(sessionId: Id<"sessions"> | null): PaneLeaf {
  return { type: "leaf", id: genId(), sessionId };
}

/** Recursively find and replace a node by ID */
function mapTree(
  node: PaneNode,
  id: string,
  fn: (n: PaneNode) => PaneNode,
): PaneNode {
  if (node.id === id) return fn(node);
  if (node.type === "split") {
    return {
      ...node,
      first: mapTree(node.first, id, fn),
      second: mapTree(node.second, id, fn),
    };
  }
  return node;
}

/** Find a leaf by its ID */
export function findLeaf(node: PaneNode, id: string): PaneLeaf | null {
  if (node.type === "leaf") return node.id === id ? node : null;
  return findLeaf(node.first, id) || findLeaf(node.second, id);
}

/** Find a leaf by session ID */
function findLeafBySession(
  node: PaneNode,
  sessionId: Id<"sessions">,
): PaneLeaf | null {
  if (node.type === "leaf") return node.sessionId === sessionId ? node : null;
  return (
    findLeafBySession(node.first, sessionId) ||
    findLeafBySession(node.second, sessionId)
  );
}

/** Find the parent split of a node by ID, and which child it is */
function findParent(
  node: PaneNode,
  targetId: string,
): { parent: PaneSplit; which: "first" | "second" } | null {
  if (node.type === "leaf") return null;
  if (node.first.id === targetId)
    return { parent: node as PaneSplit, which: "first" };
  if (node.second.id === targetId)
    return { parent: node as PaneSplit, which: "second" };
  return findParent(node.first, targetId) || findParent(node.second, targetId);
}

/** Collect all session IDs from the tree */
function collectSessionIds(node: PaneNode): Id<"sessions">[] {
  if (node.type === "leaf") {
    return node.sessionId ? [node.sessionId] : [];
  }
  return [...collectSessionIds(node.first), ...collectSessionIds(node.second)];
}

/** Count all leaves */
function countLeaves(node: PaneNode): number {
  if (node.type === "leaf") return 1;
  return countLeaves(node.first) + countLeaves(node.second);
}

/** Find the first leaf */
export function firstLeaf(node: PaneNode): PaneLeaf {
  if (node.type === "leaf") return node;
  return firstLeaf(node.first);
}

const WorkspaceContext = createContext<{
  state: WorkspaceState;
  actions: WorkspaceActions;
} | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be inside WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({
  initialSessionId,
  initialTree,
  children,
}: {
  initialSessionId?: Id<"sessions">;
  initialTree?: PaneNode;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WorkspaceState>(() => {
    if (initialTree) {
      return { root: initialTree, focusedPaneId: firstLeaf(initialTree).id, inputFocusedPaneId: null, isWorkspaceView: true };
    }
    const leaf = makeLeaf(initialSessionId ?? null);
    return { root: leaf, focusedPaneId: leaf.id, inputFocusedPaneId: null, isWorkspaceView: false };
  });

  // Keep focused pane's session in sync with the URL session
  // (only for single-session mode on /session/[id], not /workspace)
  if (initialSessionId && !initialTree) {
    const rootLeaf = state.root.type === "leaf" ? state.root : null;
    if (rootLeaf && rootLeaf.sessionId !== initialSessionId) {
      setState((prev) => ({
        ...prev,
        root: { ...prev.root, sessionId: initialSessionId } as PaneLeaf,
      }));
    }
  }

  const splitPane = useCallback((paneId: string, direction: SplitDirection) => {
    setState((prev) => {
      const newLeaf = makeLeaf(null);
      const newRoot = mapTree(prev.root, paneId, (node) => ({
        type: "split" as const,
        id: genId(),
        direction,
        first: node,
        second: newLeaf,
        ratio: 0.5,
      }));
      return { root: newRoot, focusedPaneId: newLeaf.id };
    });
  }, []);

  const closePane = useCallback((paneId: string) => {
    setState((prev) => {
      // Can't close the last pane
      if (countLeaves(prev.root) <= 1) return prev;

      const parentInfo = findParent(prev.root, paneId);
      if (!parentInfo) return prev;

      const sibling =
        parentInfo.which === "first"
          ? parentInfo.parent.second
          : parentInfo.parent.first;

      // Replace the parent split with the sibling
      const newRoot = mapTree(prev.root, parentInfo.parent.id, () => sibling);

      // If we closed the focused pane, focus the sibling's first leaf
      const newFocus =
        prev.focusedPaneId === paneId
          ? firstLeaf(sibling).id
          : prev.focusedPaneId;

      return { root: newRoot, focusedPaneId: newFocus };
    });
  }, []);

  const focusPane = useCallback((paneId: string) => {
    setState((prev) =>
      prev.focusedPaneId === paneId ? prev : { ...prev, focusedPaneId: paneId },
    );
  }, []);

  const setSessionForPane = useCallback(
    (paneId: string, sessionId: Id<"sessions">) => {
      setState((prev) => ({
        ...prev,
        root: mapTree(prev.root, paneId, (node) => ({
          ...node,
          sessionId,
        })),
      }));
    },
    [],
  );

  const setRatio = useCallback((splitId: string, ratio: number) => {
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    setState((prev) => ({
      ...prev,
      root: mapTree(prev.root, splitId, (node) => ({
        ...node,
        ratio: clamped,
      })),
    }));
  }, []);

  const addSessionPane = useCallback((sessionId: Id<"sessions">) => {
    setState((prev) => {
      // Don't add duplicate sessions
      if (findLeafBySession(prev.root, sessionId)) return prev;

      const newLeaf = makeLeaf(sessionId);
      const focusedLeaf = findLeaf(prev.root, prev.focusedPaneId);
      if (!focusedLeaf) return prev;

      // Split the focused pane vertically (stacked top/bottom)
      const newRoot = mapTree(prev.root, prev.focusedPaneId, (node) => ({
        type: "split" as const,
        id: genId(),
        direction: "vertical" as const,
        first: node,
        second: newLeaf,
        ratio: 0.5,
      }));

      return { root: newRoot, focusedPaneId: newLeaf.id };
    });
  }, []);

  const hasSession = useCallback(
    (sessionId: Id<"sessions">) => {
      return findLeafBySession(state.root, sessionId) !== null;
    },
    [state.root],
  );

  const removeSessionPane = useCallback(
    (sessionId: Id<"sessions">) => {
      const leaf = findLeafBySession(state.root, sessionId);
      if (leaf) closePane(leaf.id);
    },
    [state.root, closePane],
  );

  const getSessionIds = useCallback(() => {
    return collectSessionIds(state.root);
  }, [state.root]);

  const setInputFocused = useCallback((paneId: string | null) => {
    setState((prev) =>
      prev.inputFocusedPaneId === paneId ? prev : { ...prev, inputFocusedPaneId: paneId },
    );
  }, []);

  const actions = useMemo<WorkspaceActions>(
    () => ({
      splitPane,
      closePane,
      focusPane,
      setSessionForPane,
      setRatio,
      addSessionPane,
      hasSession,
      removeSessionPane,
      getSessionIds,
      setInputFocused,
    }),
    [
      splitPane,
      closePane,
      focusPane,
      setSessionForPane,
      setRatio,
      addSessionPane,
      hasSession,
      removeSessionPane,
      getSessionIds,
      setInputFocused,
    ],
  );

  return (
    <WorkspaceContext.Provider value={{ state, actions }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
