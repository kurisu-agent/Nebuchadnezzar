import { Id } from "@/convex/_generated/dataModel";

export type SplitDirection = "horizontal" | "vertical";

export interface PaneLeaf {
  type: "leaf";
  id: string;
  sessionId: Id<"sessions"> | null;
}

export interface PaneSplit {
  type: "split";
  id: string;
  direction: SplitDirection;
  first: PaneNode;
  second: PaneNode;
  ratio: number; // 0-1, fraction allocated to `first`
}

export type PaneNode = PaneLeaf | PaneSplit;

export interface WorkspaceState {
  root: PaneNode;
  focusedPaneId: string;
  /** When a chat textarea is focused (keyboard up), this pane gets full screen */
  inputFocusedPaneId: string | null;
  /** True when viewing a multi-pane workspace (vs a single session page) */
  isWorkspaceView: boolean;
}

export interface WorkspaceActions {
  splitPane: (paneId: string, direction: SplitDirection) => void;
  closePane: (paneId: string) => void;
  focusPane: (paneId: string) => void;
  setSessionForPane: (paneId: string, sessionId: Id<"sessions">) => void;
  setRatio: (splitId: string, ratio: number) => void;
  /** Add a session as a new horizontal split pane alongside the focused pane */
  addSessionPane: (sessionId: Id<"sessions">) => void;
  /** Check if a session is already open in a pane */
  hasSession: (sessionId: Id<"sessions">) => boolean;
  /** Remove a session from the workspace (close its pane) */
  removeSessionPane: (sessionId: Id<"sessions">) => void;
  /** Get all session IDs currently in the workspace */
  getSessionIds: () => Id<"sessions">[];
  /** Set which pane has its chat input focused (null to clear) */
  setInputFocused: (paneId: string | null) => void;
}
