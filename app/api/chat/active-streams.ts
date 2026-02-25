import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Id } from "@/convex/_generated/dataModel";

export interface ActiveStream {
  controller: AbortController;
  generator: AsyncGenerator<SDKMessage>;
  messageId: Id<"messages">;
}

/**
 * In-memory registry of currently-streaming SDK sessions.
 * Keyed by Convex sessionId. Only one stream per session at a time.
 */
export const activeStreams = new Map<string, ActiveStream>();
