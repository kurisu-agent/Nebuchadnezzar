"use client";

import { useRef } from "react";
import { useWorkspace } from "./workspace-context";
import { SplitDirection } from "./types";

export function ResizeHandle({
  splitId,
  direction,
}: {
  splitId: string;
  direction: SplitDirection;
}) {
  const { actions } = useWorkspace();
  const handleRef = useRef<HTMLDivElement>(null);
  const isHorizontal = direction === "horizontal";

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = handleRef.current;
    if (!el) return;

    // Capture the pointer so events follow the finger even off-element
    el.setPointerCapture(e.pointerId);

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const parent = el.parentElement;
    if (!parent) return;
    const parentSize = isHorizontal ? parent.offsetWidth : parent.offsetHeight;

    const firstChild = parent.children[0] as HTMLElement;
    const startRatio =
      (isHorizontal ? firstChild.offsetWidth : firstChild.offsetHeight) /
      parentSize;

    const cleanup = () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("lostpointercapture", onEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const onPointerMove = (ev: PointerEvent) => {
      const delta =
        ((isHorizontal ? ev.clientX : ev.clientY) - startPos) / parentSize;
      actions.setRatio(splitId, startRatio + delta);
    };

    const onEnd = () => cleanup();

    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("lostpointercapture", onEnd);
  };

  return (
    <div
      ref={handleRef}
      onPointerDown={onPointerDown}
      style={{ touchAction: "none" }}
      className={`shrink-0 relative bg-base-300 hover:bg-primary/30 active:bg-primary/50 transition-colors ${
        isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
      }`}
    >
      {/* Invisible expanded touch target */}
      <div
        className={`absolute ${
          isHorizontal
            ? "inset-y-0 -left-2.5 -right-2.5"
            : "inset-x-0 -top-2.5 -bottom-2.5"
        }`}
      />
    </div>
  );
}
