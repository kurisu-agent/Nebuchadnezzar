import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PaneNode } from "./types";
import { serializeTree } from "./url-encoding";

const DEBOUNCE_MS = 500;

/**
 * Debounced save of workspace layout to Convex.
 * Only saves when tree is a split (multi-pane). Skips single-leaf trees
 * since the page component handles deletion/redirect for those.
 */
export function useWorkspacePersist(
  workspaceId: Id<"workspaces">,
  root: PaneNode,
) {
  const saveWorkspace = useMutation(api.workspaces.save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only persist multi-pane layouts
    if (root.type === "leaf") return;

    const serialized = serializeTree(root);
    if (serialized === lastSavedRef.current) return;

    timerRef.current = setTimeout(() => {
      saveWorkspace({ id: workspaceId, layout: serialized });
      lastSavedRef.current = serialized;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [root, saveWorkspace, workspaceId]);
}
