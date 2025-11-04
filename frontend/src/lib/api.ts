import type {
  BookmarkDetailsResponse,
  ListBookmarksResponse,
} from "../types";
import { supabase } from "./supabase";

const DEFAULT_LIMIT = 60;

const runtimeOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || runtimeOrigin
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Get the auth token from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Copy existing headers if provided
  if (init?.headers) {
    const existingHeaders = init.headers;
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.entries(existingHeaders).forEach(([key, value]) => {
        headers[key] = String(value);
      });
    }
  }

  // Add Authorization header if we have a session
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listBookmarks(): Promise<ListBookmarksResponse> {
  return request(`/bookmarks?limit=${DEFAULT_LIMIT}`);
}

export function getBookmarkDetails(id: number): Promise<BookmarkDetailsResponse> {
  return request(`/bookmarks/${id}/details`);
}

export function createBookmark(data: {
  url: string;
  source?: string;
  client_time: string;
}): Promise<{ bookmark: any }> {
  return request(`/bookmarks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function retryBookmarkTranscription(id: number): Promise<{ message: string; success: boolean }> {
  return request(`/bookmarks/${id}/retry`, {
    method: "POST",
  });
}

// Daily Digest API Functions
export function generateDailyDigest(date?: string, forceRegenerate?: boolean): Promise<import("../types").GenerateDailyDigestResponse> {
  return request(`/digests/generate`, {
    method: "POST",
    body: JSON.stringify({ date, forceRegenerate }),
  });
}

export function getDailyDigest(date: string): Promise<import("../types").GetDailyDigestResponse> {
  return request(`/digests/${date}`);
}

export function listDailyDigests(limit = 10, offset = 0): Promise<import("../types").ListDailyDigestsResponse> {
  return request(`/digests?limit=${limit}&offset=${offset}`);
}
