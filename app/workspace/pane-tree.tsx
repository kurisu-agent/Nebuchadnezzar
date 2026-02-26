"use client";

import { PaneNode } from "./types";
import { ResizeHandle } from "./resize-handle";
import { ChatPane } from "./chat-pane";
import { useWorkspace } from "./workspace-context";

/** Check if a subtree contains a leaf with the given ID */
function containsLeaf(node: PaneNode, leafId: string): boolean {
  if (node.type === "leaf") return node.id === leafId;
  return containsLeaf(node.first, leafId) || containsLeaf(node.second, leafId);
}

export function PaneTree({ node }: { node: PaneNode }) {
  const { state } = useWorkspace();
  const inputPaneId = state.inputFocusedPaneId;

  if (node.type === "leaf") {
    return <ChatPane paneId={node.id} sessionId={node.sessionId} />;
  }

  const isHorizontal = node.direction === "horizontal";
  const dim = isHorizontal ? "width" : "height";

  // When a chat input is focused, expand the subtree containing it via CSS
  // (keep DOM structure intact so the textarea doesn't unmount/lose focus)
  const firstHasFocus = inputPaneId ? containsLeaf(node.first, inputPaneId) : false;
  const secondHasFocus = inputPaneId ? containsLeaf(node.second, inputPaneId) : false;
  const expandFirst = firstHasFocus && !secondHasFocus;
  const expandSecond = secondHasFocus && !firstHasFocus;

  const firstSize = expandFirst ? 100 : expandSecond ? 0 : node.ratio * 100;
  const secondSize = expandSecond ? 100 : expandFirst ? 0 : (1 - node.ratio) * 100;
  const hideHandle = expandFirst || expandSecond;

  return (
    <div
      className={`flex ${isHorizontal ? "flex-row" : "flex-col"} h-full w-full`}
    >
      <div
        style={{ [dim]: `${firstSize}%` }}
        className="min-w-0 min-h-0 overflow-hidden transition-all duration-200"
      >
        <PaneTree node={node.first} />
      </div>
      {!hideHandle && (
        <ResizeHandle splitId={node.id} direction={node.direction} />
      )}
      <div
        style={{ [dim]: `${secondSize}%` }}
        className="min-w-0 min-h-0 overflow-hidden transition-all duration-200"
      >
        <PaneTree node={node.second} />
      </div>
    </div>
  );
}
