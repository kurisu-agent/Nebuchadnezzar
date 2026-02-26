import {
  query,
  internalAction,
  internalMutation,
  action,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getLatest = query({
  handler: async (ctx) => {
    return (await ctx.db.query("updateInfo").first()) ?? null;
  },
});

export const storeUpdateInfo = internalMutation({
  args: {
    remoteSha: v.string(),
    remoteMessage: v.string(),
    remoteAuthor: v.string(),
    remoteDate: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("updateInfo").first();
    const data = { ...args, checkedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("updateInfo", data);
    }
  },
});

export const checkForUpdates = internalAction({
  handler: async (ctx) => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/kurisu-agent/Nebuchadnezzar/commits/master",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Nebuchadnezzar-UpdateChecker",
          },
        },
      );
      if (!response.ok) {
        console.error(`[update check] GitHub API returned ${response.status}`);
        return;
      }
      const data = await response.json();
      await ctx.runMutation(internal.updates.storeUpdateInfo, {
        remoteSha: data.sha,
        remoteMessage: data.commit.message.split("\n")[0],
        remoteAuthor: data.commit.author.name,
        remoteDate: data.commit.author.date,
      });
    } catch (err) {
      console.error("[update check] failed:", err);
    }
  },
});

export const checkNow = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.updates.checkForUpdates);
  },
});
