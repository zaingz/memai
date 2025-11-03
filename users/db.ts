import { SQLDatabase } from "encore.dev/storage/sqldb";

/**
 * Users database instance
 * Manages user accounts and authentication data
 */
export const db = new SQLDatabase("users", {
  migrations: "./migrations",
});
