"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { NavigationWatcher } from "./components/navigation-watcher";

function getConvexUrl() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return process.env.NEXT_PUBLIC_CONVEX_URL;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/convex`;
  }
  return "http://localhost:3000/convex";
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(getConvexUrl()), []);
  return (
    <ConvexProvider client={convex}>
      <NavigationWatcher />
      {children}
    </ConvexProvider>
  );
}
