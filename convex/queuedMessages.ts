import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("queuedMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const add = mutation({
  args: { sessionId: v.id("sessions"), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("queuedMessages", {
      sessionId: args.sessionId,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("queuedMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: { id: v.id("queuedMessages"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { content: args.content });
  },
});

export const shift = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("queuedMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!first) return null;
    await ctx.db.delete(first._id);
    return first.content;
  },
});
