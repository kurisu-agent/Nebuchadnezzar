import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    path: v.string(),
    color: v.string(),
    ports: v.optional(v.array(v.number())),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  }),
  sessions: defineTable({
    title: v.string(),
    customTitle: v.optional(v.boolean()),
    claudeSessionId: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    deletedAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    contextUsed: v.optional(v.number()),
    contextWindow: v.optional(v.number()),
    createdAt: v.number(),
  }),
  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    streaming: v.boolean(),
    planning: v.optional(v.boolean()),
    wasPlan: v.optional(v.boolean()),
    planContent: v.optional(v.string()),
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
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
  pendingNavigations: defineTable({
    targetUrl: v.string(),
    createdAt: v.number(),
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
    source: v.optional(v.union(v.literal("user"), v.literal("screenshot"))),
    metadata: v.optional(
      v.object({
        url: v.optional(v.string()),
        device: v.optional(v.string()),
        fullPage: v.optional(v.boolean()),
      }),
    ),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_source", ["source", "createdAt"]),
});
