import { SQLDatabase } from "encore.dev/storage/sqldb";

// Initialize the bookmarks database
export const db = new SQLDatabase("bookmarks", {
  migrations: "./migrations",
});
