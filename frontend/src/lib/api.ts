import type {
  BookmarkDetailsResponse,
  ListBookmarksResponse,
} from "../types";

const DEFAULT_LIMIT = 60;

const runtimeOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || runtimeOrigin
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
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
