"use client";

import { useRef, useState, useCallback } from "react";
import {
  Columns,
  Rows,
  X,
  Globe,
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { useWorkspace, getMoveDirection } from "./workspace-context";

function extractTitle(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

export function IframePane({ paneId, url }: { paneId: string; url: string }) {
  const { state, actions } = useWorkspace();
  const isFocused = state.focusedPaneId === paneId;
  const moveDir = getMoveDirection(state.root, paneId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const title = extractTitle(currentUrl);

  const handleReload = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.location.reload();
    } catch {
      // Cross-origin: reset src to force reload
      iframe.src = currentUrl;
    }
  }, [currentUrl]);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const newUrl = iframe.contentWindow?.location.href;
      if (newUrl && newUrl !== "about:blank" && newUrl !== currentUrl) {
        setCurrentUrl(newUrl);
        actions.setIframeForPane(paneId, newUrl);
      }
    } catch {
      // Cross-origin — can't read URL, keep the original
    }
  }, [currentUrl, paneId, actions]);

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden ${
        isFocused ? "ring-1 ring-primary/30 bg-base-100" : "bg-base-200"
      }`}
      onClick={() => actions.focusPane(paneId)}
    >
      <div className="shrink-0 flex items-center gap-1.5 px-2 h-8 bg-base-200/60">
        <Globe size={14} weight="duotone" className="opacity-40 shrink-0" />
        <span className="text-sm truncate flex-1 opacity-60" title={currentUrl}>
          {title}
        </span>
        <button
          className="btn btn-ghost btn-xs btn-square opacity-30 hover:opacity-70"
          aria-label="Reload"
          onClick={(e) => {
            e.stopPropagation();
            handleReload();
          }}
        >
          <ArrowClockwise size={14} weight="bold" />
        </button>
        <div
          className="dropdown dropdown-end"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            tabIndex={0}
            className="btn btn-ghost btn-xs px-0.5 opacity-30 hover:opacity-70"
            aria-label="Pane menu"
          >
            <Columns size={14} weight="bold" />
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-10 menu bg-base-200 rounded-box shadow-lg w-44 p-2 mt-1"
          >
            {moveDir && (
              <li>
                <button
                  onClick={() => {
                    (document.activeElement as HTMLElement)?.blur();
                    actions.swapPane(paneId);
                  }}
                >
                  {moveDir === "left" && <ArrowLeft size={16} weight="bold" />}
                  {moveDir === "right" && (
                    <ArrowRight size={16} weight="bold" />
                  )}
                  {moveDir === "up" && <ArrowUp size={16} weight="bold" />}
                  {moveDir === "down" && <ArrowDown size={16} weight="bold" />}
                  Move {moveDir.charAt(0).toUpperCase() + moveDir.slice(1)}
                </button>
              </li>
            )}
            <li>
              <button onClick={() => actions.splitPane(paneId, "horizontal")}>
                <Columns size={16} weight="duotone" />
                Split Right
              </button>
            </li>
            <li>
              <button onClick={() => actions.splitPane(paneId, "vertical")}>
                <Rows size={16} weight="duotone" />
                Split Down
              </button>
            </li>
            <li>
              <button onClick={() => actions.closePane(paneId)}>
                <X size={16} weight="bold" />
                Close Pane
              </button>
            </li>
          </ul>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        className={`flex-1 w-full border-0 ${state.isDragging ? "pointer-events-none" : ""}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
      />
    </div>
  );
}
