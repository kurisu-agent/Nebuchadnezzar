import { execFile } from "child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    execFile(
      "claude",
      [
        "--print",
        "--output-format",
        "json",
        "--max-turns",
        "1",
        "--model",
        "haiku",
        "--dangerously-skip-permissions",
        "--no-session-persistence",
        prompt,
      ],
      { env, timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result.result ?? "");
        } catch {
          resolve(stdout.trim());
        }
      },
    );
  });
}

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  const messages = await convex.query(api.messages.list, { sessionId });
  if (messages.length === 0) {
    return Response.json(
      { error: "No messages to summarize" },
      { status: 400 },
    );
  }

  // Build a condensed conversation snippet (first ~2000 chars)
  const snippet = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 2000);

  try {
    const raw = await runClaude(
      `Generate a very short title (3-6 words, no quotes, no punctuation) that summarizes this conversation. Reply with ONLY the title, nothing else:\n\n${snippet}`,
    );
    const title = raw.trim() || "Untitled";

    return Response.json({ title });
  } catch (err) {
    console.error("[summarize] Error:", err);
    return Response.json(
      { error: "Failed to generate title" },
      { status: 500 },
    );
  }
}
