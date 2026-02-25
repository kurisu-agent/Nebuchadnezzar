import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { activeStreams } from "../active-streams";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  const stream = activeStreams.get(sessionId);
  if (!stream) {
    // No active stream — but the DB may still have orphaned streaming messages
    // (e.g. server restarted while streaming). Clean those up.
    const count = await convex.mutation(api.messages.cancelStreamingBySession, {
      sessionId,
    });
    return Response.json({ ok: true, alreadyDone: true, cleaned: count });
  }

  // 1. Signal the streaming loop to stop flushing
  stream.controller.abort();

  // 2. Terminate the SDK generator to unblock the for-await loop
  try {
    await stream.generator.return(undefined as never);
  } catch {
    // Generator may already be done — ignore
  }

  // 3. Finalize the message in Convex (keeps accumulated content, sets streaming: false)
  await convex.mutation(api.messages.cancelStreaming, {
    messageId: stream.messageId,
  });

  // 4. Clean up
  activeStreams.delete(sessionId);

  return Response.json({ ok: true });
}
