import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check for updates",
  { hours: 5 },
  internal.updates.checkForUpdates,
);

export default crons;
