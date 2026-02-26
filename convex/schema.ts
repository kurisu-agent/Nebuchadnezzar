import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    customTitle: v.optional(v.boolean()),
    claudeSessionId: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
  }),
  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    streaming: v.boolean(),
    planning: v.optional(v.boolean()),
    cancelled: v.optional(v.boolean()),
    error: v.optional(v.boolean()),
    steps: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.id("uploads"))),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
  queuedMessages: defineTable({
    sessionId: v.id("sessions"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("uploads"))),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
  workspaces: defineTable({
    name: v.string(),
    customName: v.optional(v.boolean()),
    layout: v.string(),
    updatedAt: v.number(),
  }),
  updateInfo: defineTable({
    remoteSha: v.string(),
    remoteMessage: v.string(),
    remoteAuthor: v.string(),
    remoteDate: v.string(),
    checkedAt: v.number(),
  }),
  uploads: defineTable({
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    sessionId: v.optional(v.id("sessions")),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_created", ["createdAt"]),
});
