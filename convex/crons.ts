import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Model prices, so each call's cost uses today's rate.
crons.daily("refresh model prices", { hourUTC: 3, minuteUTC: 10 }, internal.ai.router.refreshPrices, {});

// Retention limits (convex/privacy/retention.ts).
crons.daily("retention sweep", { hourUTC: 1, minuteUTC: 30 }, internal.privacy.retention.sweep, {});

export default crons;
