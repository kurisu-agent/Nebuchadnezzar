import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const send = mutation({
  args: { sessionId: v.id("sessions"), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      streaming: false,
      createdAt: Date.now(),
    });
  },
});

export const createAssistant = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: "",
      streaming: true,
      createdAt: Date.now(),
    });
  },
});

export const updateContent = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    streaming: v.boolean(),
    steps: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      content: args.content,
      streaming: args.streaming,
    };
    if (args.steps !== undefined) {
      patch.steps = args.steps;
    }
    await ctx.db.patch(args.messageId, patch);
  },
});

export const cancelStreaming = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message && message.streaming) {
      await ctx.db.patch(args.messageId, {
        streaming: false,
        content: message.content || "(cancelled)",
      });
    }
  },
});
