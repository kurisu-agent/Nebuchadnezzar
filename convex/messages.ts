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
  args: {
    sessionId: v.id("sessions"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("uploads"))),
  },
  handler: async (ctx, args) => {
    const doc: {
      sessionId: typeof args.sessionId;
      role: "user";
      content: string;
      streaming: boolean;
      attachments?: typeof args.attachments;
      createdAt: number;
    } = {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      streaming: false,
      createdAt: Date.now(),
    };
    if (args.attachments && args.attachments.length > 0) {
      doc.attachments = args.attachments;
    }
    return await ctx.db.insert("messages", doc);
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
    planning: v.optional(v.boolean()),
    steps: v.optional(v.array(v.string())),
    error: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      content: args.content,
      streaming: args.streaming,
    };
    if (args.planning !== undefined) {
      patch.planning = args.planning;
    }
    if (args.steps !== undefined) {
      patch.steps = args.steps;
    }
    if (args.error !== undefined) {
      patch.error = args.error;
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
        cancelled: true,
        content: message.content || "(cancelled)",
      });
    }
  },
});

/**
 * Cancel all streaming messages in a session.
 * Used when the active stream is gone (e.g. server restart) but the DB
 * still has messages stuck in streaming state.
 */
export const cancelStreamingBySession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    let count = 0;
    for (const message of messages) {
      if (message.streaming) {
        await ctx.db.patch(message._id, {
          streaming: false,
          cancelled: true,
          content: message.content || "(cancelled)",
        });
        count++;
      }
    }
    return count;
  },
});
