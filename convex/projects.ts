import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();
    return projects.filter((p) => !p.deletedAt);
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    path: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      name: args.name,
      path: args.path,
      color: args.color,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.color !== undefined) patch.color = args.color;
    await ctx.db.patch(args.id, patch);
  },
});

export const addPort = mutation({
  args: { id: v.id("projects"), port: v.number() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return;
    const ports = project.ports ?? [];
    if (!ports.includes(args.port)) {
      await ctx.db.patch(args.id, { ports: [...ports, args.port] });
    }
  },
});

export const removePort = mutation({
  args: { id: v.id("projects"), port: v.number() },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return;
    const ports = (project.ports ?? []).filter((p) => p !== args.port);
    await ctx.db.patch(args.id, { ports });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { deletedAt: Date.now() });
  },
});
