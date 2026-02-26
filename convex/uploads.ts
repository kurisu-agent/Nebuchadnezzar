import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("uploads", {
      storageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      sessionId: args.sessionId,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_created")
      .order("desc")
      .collect();
    return Promise.all(
      uploads.map(async (upload) => ({
        ...upload,
        url: await ctx.storage.getUrl(upload.storageId),
        thumbnailUrl: upload.thumbnailStorageId
          ? await ctx.storage.getUrl(upload.thumbnailStorageId)
          : null,
      })),
    );
  },
});

export const getMany = query({
  args: { uploadIds: v.array(v.id("uploads")) },
  handler: async (ctx, args) => {
    return Promise.all(
      args.uploadIds.map(async (id) => {
        const upload = await ctx.db.get(id);
        if (!upload) return null;
        const url = await ctx.storage.getUrl(upload.storageId);
        const thumbnailUrl = upload.thumbnailStorageId
          ? await ctx.storage.getUrl(upload.thumbnailStorageId)
          : null;
        return { ...upload, url, thumbnailUrl };
      }),
    );
  },
});

export const assignSession = mutation({
  args: {
    uploadIds: v.array(v.id("uploads")),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.uploadIds.map(async (id) => {
        const upload = await ctx.db.get(id);
        if (upload && !upload.sessionId) {
          await ctx.db.patch(id, { sessionId: args.sessionId });
        }
      }),
    );
  },
});

export const remove = mutation({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) return;
    await ctx.storage.delete(upload.storageId);
    if (upload.thumbnailStorageId) {
      await ctx.storage.delete(upload.thumbnailStorageId);
    }
    await ctx.db.delete(args.uploadId);
  },
});
