import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { oneShot } from "@/app/api/prompt/one-shot";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

const TITLE_SYSTEM_PROMPT =
  "You generate concise titles for coding sessions. Output ONLY the title text — no quotes, no prefix, no explanation. Max 150 characters.";

export async function generateTitle(
  sessionId: Id<"sessions">,
  messages: Array<{ role: string; content: string }>,
  latestResponse: string,
) {
  // Focus on the last few messages for a relevant title.
  // Include the first user message for original context, then the last 3 exchanges.
  const recent = messages.slice(-6);
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (firstUserMsg && !recent.includes(firstUserMsg)) {
    recent.unshift(firstUserMsg);
  }

  const conversation = recent
    .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
    .join("\n");

  const responseSummary = latestResponse.slice(0, 800);

  const prompt = `Generate a concise title (max 150 characters) for this coding session based on the most recent activity. Focus on what was last requested or implemented, not the entire history.

Recent messages:
${conversation}

Latest response (excerpt): ${responseSummary}`;

  const raw = await oneShot({
    prompt,
    model: "haiku",
    systemPrompt: TITLE_SYSTEM_PROMPT,
  });

  const title = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .slice(0, 150);

  if (title) {
    await convex.mutation(api.sessions.autoTitle, {
      id: sessionId,
      title,
    });
  }
}

/**
 * Fetch messages for a session and generate a title.
 * Used by the retitle endpoint when the user resets to auto-generated.
 */
export async function generateTitleForSession(sessionId: Id<"sessions">) {
  const messages = await convex.query(api.messages.list, { sessionId });
  if (messages.length === 0) return;

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  await generateTitle(
    sessionId,
    messages,
    lastAssistant?.content ?? "",
  );
}
