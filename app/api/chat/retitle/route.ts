import { Id } from "@/convex/_generated/dataModel";
import { generateTitleForSession } from "../generate-title";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  // Fire and forget — respond immediately, generate in background
  generateTitleForSession(sessionId).catch((err) =>
    console.error("[retitle error]", err),
  );

  return Response.json({ ok: true });
}
