import { query } from "./_generated/server";
import { v } from "convex/values";

export const searchMessages = query({
  args: {
    searchTerm: v.string(),
    includeDeleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase().trim();
    if (!term || term.length < 2) return [];

    const allSessions = await ctx.db.query("sessions").collect();
    const sessions = allSessions.filter((s) =>
      args.includeDeleted ? !!s.deletedAt : !s.deletedAt,
    );

    const results: Array<{
      sessionId: string;
      sessionTitle: string;
      messageId: string;
      role: "user" | "assistant";
      snippet: string;
      matchStart: number;
      matchLength: number;
      createdAt: number;
    }> = [];

    const MAX_RESULTS = 50;
    const MAX_PER_SESSION = 5;
    const SNIPPET_RADIUS = 80;

    for (const session of sessions) {
      if (results.length >= MAX_RESULTS) break;

      let sessionHits = 0;
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const message of messages) {
        if (sessionHits >= MAX_PER_SESSION || results.length >= MAX_RESULTS)
          break;
        if (!message.content) continue;

        const lowerContent = message.content.toLowerCase();
        const idx = lowerContent.indexOf(term);
        if (idx === -1) continue;

        const start = Math.max(0, idx - SNIPPET_RADIUS);
        const end = Math.min(
          message.content.length,
          idx + term.length + SNIPPET_RADIUS,
        );
        const prefix = start > 0 ? "..." : "";
        const suffix = end < message.content.length ? "..." : "";
        const snippet = prefix + message.content.slice(start, end) + suffix;
        const matchStart = idx - start + prefix.length;

        results.push({
          sessionId: session._id,
          sessionTitle: session.title,
          messageId: message._id,
          role: message.role,
          snippet,
          matchStart,
          matchLength: term.length,
          createdAt: message.createdAt,
        });

        sessionHits++;
      }
    }

    // User messages first, then assistant — within each group keep original order
    results.sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === "user" ? -1 : 1;
    });

    return results;
  },
});
