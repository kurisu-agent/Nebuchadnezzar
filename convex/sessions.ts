import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();
    const active = sessions.filter((s) => !s.deletedAt);
    const enriched = await Promise.all(
      active.map(async (session) => {
        const latestMsg = await ctx.db
          .query("messages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .first();
        const lastActivity = latestMsg?.createdAt ?? session.createdAt;
        const hasUnseen =
          latestMsg?.role === "assistant" &&
          !latestMsg.streaming &&
          latestMsg.createdAt > (session.lastSeenAt ?? session.createdAt);
        return {
          ...session,
          lastActivity,
          isStreaming: latestMsg?.streaming ?? false,
          isPlanning: (latestMsg?.streaming && latestMsg?.planning) ?? false,
          hasUnseen,
        };
      }),
    );
    // Sort by most recent activity first
    return enriched.sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

export const hasUnseen = query({
  args: { exclude: v.optional(v.id("sessions")) },
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("sessions").collect();
    for (const session of sessions) {
      if (session.deletedAt) continue;
      if (args.exclude && session._id === args.exclude) continue;
      const latest = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .first();
      if (
        latest?.role === "assistant" &&
        !latest.streaming &&
        latest.createdAt > (session.lastSeenAt ?? session.createdAt)
      )
        return true;
    }
    return false;
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();
    const active = sessions.filter(
      (s) => !s.deletedAt && s.projectId === args.projectId,
    );
    const enriched = await Promise.all(
      active.map(async (session) => {
        const latestMsg = await ctx.db
          .query("messages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .first();
        const lastActivity = latestMsg?.createdAt ?? session.createdAt;
        const hasUnseen =
          latestMsg?.role === "assistant" &&
          !latestMsg.streaming &&
          latestMsg.createdAt > (session.lastSeenAt ?? session.createdAt);
        return {
          ...session,
          lastActivity,
          isStreaming: latestMsg?.streaming ?? false,
          isPlanning: (latestMsg?.streaming && latestMsg?.planning) ?? false,
          hasUnseen,
        };
      }),
    );
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
  args: {
    title: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      title: args.title ?? "New Session",
      createdAt: now,
      lastSeenAt: now,
      ...(args.projectId ? { projectId: args.projectId } : {}),
    });
  },
});

export const updateTitle = mutation({
  args: { id: v.id("sessions"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title, customTitle: true });
  },
});

export const autoTitle = mutation({
  args: { id: v.id("sessions"), title: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session || session.customTitle) return;
    await ctx.db.patch(args.id, { title: args.title });
  },
});

export const clearCustomTitle = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      customTitle: undefined,
      title: "Generating title...",
    });
  },
});

export const setClaudeSessionId = mutation({
  args: { id: v.id("sessions"), claudeSessionId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { claudeSessionId: args.claudeSessionId });
  },
});

export const updateContextUsage = mutation({
  args: {
    id: v.id("sessions"),
    contextUsed: v.number(),
    contextWindow: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      contextUsed: args.contextUsed,
      contextWindow: args.contextWindow,
    });
  },
});

export const markSeen = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastSeenAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { deletedAt: Date.now() });
  },
});

export const removeMany = mutation({
  args: { ids: v.array(v.id("sessions")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, { deletedAt: now });
    }
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
    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();
    for (const upload of uploads) {
      await ctx.storage.delete(upload.storageId);
      if (upload.thumbnailStorageId) {
        await ctx.storage.delete(upload.thumbnailStorageId);
      }
      await ctx.db.delete(upload._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const fork = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) throw new Error("Session not found");

    const now = Date.now();
    const newSessionId = await ctx.db.insert("sessions", {
      title: `Forked: ${source.title}`,
      createdAt: now,
      lastSeenAt: now,
      ...(source.projectId ? { projectId: source.projectId } : {}),
    });

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const msg of messages) {
      if (msg.streaming) continue; // skip in-progress messages
      await ctx.db.insert("messages", {
        sessionId: newSessionId,
        role: msg.role,
        content: msg.content,
        streaming: false,
        ...(msg.wasPlan ? { wasPlan: msg.wasPlan } : {}),
        ...(msg.planContent ? { planContent: msg.planContent } : {}),
        ...(msg.steps ? { steps: msg.steps } : {}),
        ...(msg.attachments ? { attachments: msg.attachments } : {}),
        ...(msg.cancelled ? { cancelled: msg.cancelled } : {}),
        ...(msg.error ? { error: msg.error } : {}),
        createdAt: msg.createdAt,
      });
    }

    return newSessionId;
  },
});

export const permanentDeleteAll = mutation({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const deleted = sessions.filter((s) => s.deletedAt);
    for (const session of deleted) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      const queued = await ctx.db
        .query("queuedMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const q of queued) {
        await ctx.db.delete(q._id);
      }
      const uploads = await ctx.db
        .query("uploads")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const upload of uploads) {
        await ctx.storage.delete(upload.storageId);
        if (upload.thumbnailStorageId) {
          await ctx.storage.delete(upload.thumbnailStorageId);
        }
        await ctx.db.delete(upload._id);
      }
      await ctx.db.delete(session._id);
    }
  },
});
