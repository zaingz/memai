import { Query } from "encore.dev/api";
import { Bookmark, BookmarkSource } from "./domain.types";

// ============================================
// Bookmark API Types
// ============================================

// Request interface for creating a bookmark
export interface CreateBookmarkRequest {
  url: string;
  title?: string;
  source: BookmarkSource;
  client_time: Date;
  metadata?: Record<string, any>;
}

// Response interface for bookmark operations
export interface BookmarkResponse {
  bookmark: Bookmark;
}

// Request interface for updating a bookmark
export interface UpdateBookmarkRequest {
  id: number;
  url?: string;
  title?: string;
  source?: BookmarkSource;
  metadata?: Record<string, any>;
}

// Request interface for getting a bookmark by ID
export interface GetBookmarkRequest {
  id: number;
}

// Request interface for listing bookmarks with pagination
export interface ListBookmarksRequest {
  limit?: Query<number>;
  offset?: Query<number>;
  source?: Query<BookmarkSource>;
}

// Response interface for listing bookmarks
export interface ListBookmarksResponse {
  bookmarks: Bookmark[];
  total: number;
}

// Request interface for deleting a bookmark
export interface DeleteBookmarkRequest {
  id: number;
}

// Response interface for delete operation
export interface DeleteBookmarkResponse {
  success: boolean;
}
