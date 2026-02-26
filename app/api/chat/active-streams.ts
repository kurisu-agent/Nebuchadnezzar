import type { Query } from "@anthropic-ai/claude-agent-sdk";
import type { Id } from "@/convex/_generated/dataModel";

export interface ActiveStream {
  controller: AbortController;
  query: Query;
  messageId: Id<"messages">;
}

/**
 * In-memory registry of currently-streaming SDK sessions.
 * Keyed by Convex sessionId. Only one stream per session at a time.
 */
export const activeStreams = new Map<string, ActiveStream>();

/**
 * Sessions that have been cancelled before the SDK stream was registered.
 * processChatStream checks this before starting work, so cancels that
 * arrive during the gap between POST /api/chat and activeStreams.set()
 * are still honoured.
 */
export const cancelledSessions = new Set<string>();
