"use client";

import { useState, useEffect } from "react";

/**
 * Detects whether the on-screen keyboard is visible by monitoring
 * the Visual Viewport API. Returns true when the viewport height
 * shrinks significantly (>100px) from its maximum observed height.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let maxHeight = vv.height;

    const onResize = () => {
      if (vv.height > maxHeight) maxHeight = vv.height;
      setVisible(maxHeight - vv.height > 100);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return visible;
}
