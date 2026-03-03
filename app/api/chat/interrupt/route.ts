import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  activeStreams,
  cancelledSessions,
  processingSessions,
} from "../active-streams";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

/**
 * Interrupt the current stream without clearing the message queue.
 * Used by "send directly" to stop the AI mid-response so a new
 * message can be processed immediately.
 */
export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  // Signal cancellation so the processing loop breaks
  cancelledSessions.add(sessionId);

  const stream = activeStreams.get(sessionId);
  if (!stream) {
    // No active stream — clean up any orphaned streaming messages
    await convex.mutation(api.messages.cancelStreamingBySession, {
      sessionId,
    });
    processingSessions.delete(sessionId);
    return Response.json({ ok: true, alreadyDone: true });
  }

  // Abort the SDK stream
  stream.controller.abort();
  try {
    stream.query.close();
  } catch {
    // Query may already be done
  }

  // Finalize the message in Convex (keeps accumulated content)
  await convex.mutation(api.messages.cancelStreaming, {
    messageId: stream.messageId,
  });

  activeStreams.delete(sessionId);

  // Wait for processingSessions to clear (the after() finally block)
  // Give it a brief moment to settle
  await new Promise((resolve) => setTimeout(resolve, 50));
  processingSessions.delete(sessionId);

  return Response.json({ ok: true });
}
