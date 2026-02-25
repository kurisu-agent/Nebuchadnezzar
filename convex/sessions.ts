import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();
    return Promise.all(
      sessions.map(async (session) => {
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
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(args.id);
  },
});
