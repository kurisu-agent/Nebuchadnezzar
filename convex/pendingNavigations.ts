import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const latest = query({
  handler: async (ctx) => {
    return await ctx.db.query("pendingNavigations").order("desc").first();
  },
});

export const create = mutation({
  args: { targetUrl: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingNavigations", {
      targetUrl: args.targetUrl,
      createdAt: Date.now(),
    });
  },
});

export const consume = mutation({
  args: { id: v.id("pendingNavigations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
