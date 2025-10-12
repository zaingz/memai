import { CronJob } from "encore.dev/cron";
import { generateYesterdaysDigest } from "../api";

/**
 * Daily Digest Cron Job
 *
 * Runs daily at 9 PM GMT to generate a digest of all bookmarks
 * from the previous day.
 *
 * Schedule: 9 PM GMT every day (21:00 UTC)
 * Endpoint: generateYesterdaysDigest API (no parameters required)
 *
 * This cron job will:
 * 1. Fetch all completed transcriptions from yesterday
 * 2. Calculate metadata (bookmark count, sources breakdown, total duration)
 * 3. Generate a unified summary using adaptive 3-tier OpenAI strategy
 * 4. Store the completed digest in the database
 */
const _ = new CronJob("daily-digest-generator", {
  title: "Generate Daily Digest",
  schedule: "0 21 * * *", // 9 PM GMT every day
  endpoint: generateYesterdaysDigest,
});
