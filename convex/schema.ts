import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    claudeSessionId: v.optional(v.string()),
    createdAt: v.number(),
  }),
  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    streaming: v.boolean(),
    steps: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
  queuedMessages: defineTable({
    sessionId: v.id("sessions"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
});
