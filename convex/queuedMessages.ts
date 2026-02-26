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
  args: {
    sessionId: v.id("sessions"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("uploads"))),
  },
  handler: async (ctx, args) => {
    const doc: {
      sessionId: typeof args.sessionId;
      content: string;
      attachments?: typeof args.attachments;
      createdAt: number;
    } = {
      sessionId: args.sessionId,
      content: args.content,
      createdAt: Date.now(),
    };
    if (args.attachments && args.attachments.length > 0) {
      doc.attachments = args.attachments;
    }
    return await ctx.db.insert("queuedMessages", doc);
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
    return {
      content: first.content,
      attachments: first.attachments ?? null,
    };
  },
});
