import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();
    const active = sessions.filter((s) => !s.deletedAt);
    const enriched = await Promise.all(
      active.map(async (session) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .first();
        return {
          ...session,
          lastActivity: messages?.createdAt ?? session.createdAt,
          isStreaming: messages?.streaming ?? false,
        };
      }),
    );
    // Sort by most recent activity first
    return enriched.sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

export const listDeleted = query({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();
    return sessions
      .filter((s) => s.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  },
});

export const get = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      title: args.title ?? "New Session",
      createdAt: Date.now(),
    });
  },
});

export const updateTitle = mutation({
  args: { id: v.id("sessions"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});

export const setClaudeSessionId = mutation({
  args: { id: v.id("sessions"), claudeSessionId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { claudeSessionId: args.claudeSessionId });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { deletedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { deletedAt: undefined });
  },
});

export const permanentDelete = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    const queued = await ctx.db
      .query("queuedMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    for (const q of queued) {
      await ctx.db.delete(q._id);
    }
    await ctx.db.delete(args.id);
  },
});
