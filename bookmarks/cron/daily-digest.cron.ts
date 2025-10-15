import { CronJob } from "encore.dev/cron";
import { generateYesterdaysDigest } from "../api";

/**
 * Daily Digest Cron Job
 *
 * Runs daily at 9 PM GMT to generate per-user digests of all bookmarks
 * from the previous day.
 *
 * Schedule: 9 PM GMT every day (21:00 UTC)
 * Endpoint: generateYesterdaysDigest API (no parameters required)
 *
 * This cron job will:
 * 1. Fetch all active user IDs from the users service
 * 2. For each user:
 *    a. Fetch all completed transcriptions from yesterday
 *    b. Calculate metadata (bookmark count, sources breakdown, total duration)
 *    c. Generate a unified summary using map-reduce OpenAI strategy
 *    d. Store the completed digest in the database
 * 3. Log comprehensive results (success rate, errors, etc.)
 *
 * Note: If one user's digest fails, the cron continues processing other users
 */
const _ = new CronJob("daily-digest-generator", {
  title: "Generate Daily Digest",
  schedule: "0 21 * * *", // 9 PM GMT every day
  endpoint: generateYesterdaysDigest,
});
