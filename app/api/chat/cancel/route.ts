import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { activeStreams, cancelledSessions } from "../active-streams";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  // Mark session as cancelled so processChatStream honours the cancel
  // even if it hasn't registered in activeStreams yet (pre-registration gap).
  cancelledSessions.add(sessionId);

  // Clear the message queue so no future queued messages start new streams.
  await convex.mutation(api.queuedMessages.clearBySession, { sessionId });

  const stream = activeStreams.get(sessionId);
  if (!stream) {
    // No active stream — clean up any orphaned streaming messages in DB.
    const count = await convex.mutation(
      api.messages.cancelStreamingBySession,
      { sessionId },
    );
    return Response.json({ ok: true, alreadyDone: true, cleaned: count });
  }

  // 1. Signal the AbortController — tells the SDK to stop the underlying process
  stream.controller.abort();

  // 2. Forcefully close the query (kills subprocess, cleans up resources)
  try {
    stream.query.close();
  } catch {
    // Query may already be done — ignore
  }

  // 3. Finalize the message in Convex (keeps accumulated content, sets streaming: false)
  await convex.mutation(api.messages.cancelStreaming, {
    messageId: stream.messageId,
  });

  // 4. Clean up
  activeStreams.delete(sessionId);

  return Response.json({ ok: true });
}
