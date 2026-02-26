import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("workspaces").collect();
  },
});

export const get = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { layout: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workspaces", {
      layout: args.layout,
      updatedAt: Date.now(),
    });
  },
});

export const save = mutation({
  args: { id: v.id("workspaces"), layout: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      layout: args.layout,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
