/**
 * Bookmarks CRUD API Tests
 *
 * Unit tests for bookmark CRUD endpoints:
 * - POST /bookmarks (create)
 * - GET /bookmarks/:id (get)
 * - GET /bookmarks (list)
 * - PUT /bookmarks/:id (update)
 * - DELETE /bookmarks/:id (remove)
 * - GET /bookmarks/:id/details (getDetails)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookmarkSource, TranscriptionStatus } from "../../types/domain.types";
import type { Bookmark, Transcription } from "../../types/domain.types";
import type { WebContent } from "../../types/web-content.types";
import { ContentStatus } from "../../types/web-content.types";

// Hoist mock functions for use in module mocks
const {
  mockGetAuthData,
  mockBookmarkCreate,
  mockBookmarkFindById,
  mockBookmarkList,
  mockBookmarkUpdate,
  mockBookmarkDelete,
  mockTranscriptionFindByBookmarkId,
  mockWebContentFindByBookmarkId,
  mockTopicPublish,
} = vi.hoisted(() => ({
  mockGetAuthData: vi.fn(),
  mockBookmarkCreate: vi.fn(),
  mockBookmarkFindById: vi.fn(),
  mockBookmarkList: vi.fn(),
  mockBookmarkUpdate: vi.fn(),
  mockBookmarkDelete: vi.fn(),
  mockTranscriptionFindByBookmarkId: vi.fn(),
  mockWebContentFindByBookmarkId: vi.fn(),
  mockTopicPublish: vi.fn(),
}));

// Mock modules before imports
vi.mock("encore.dev/log", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("~encore/auth", () => ({
  getAuthData: mockGetAuthData,
}));

vi.mock("../../repositories/bookmark.repository", () => ({
  BookmarkRepository: class MockBookmarkRepository {
    create = mockBookmarkCreate;
    findById = mockBookmarkFindById;
    list = mockBookmarkList;
    update = mockBookmarkUpdate;
    delete = mockBookmarkDelete;
  },
}));

vi.mock("../../repositories/transcription.repository", () => ({
  TranscriptionRepository: class MockTranscriptionRepository {
    findByBookmarkId = mockTranscriptionFindByBookmarkId;
  },
}));

vi.mock("../../repositories/web-content.repository", () => ({
  WebContentRepository: class MockWebContentRepository {
    findByBookmarkId = mockWebContentFindByBookmarkId;
  },
}));

vi.mock("../../events/bookmark-created.events", () => ({
  bookmarkCreatedTopic: {
    publish: mockTopicPublish,
  },
}));

// Import after mocks
import * as api from "../../api";

describe("Bookmarks CRUD API", () => {
  const mockUserId = "user-uuid-123";
  const mockAuth = { userID: mockUserId };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthData.mockReturnValue(mockAuth);
    mockWebContentFindByBookmarkId.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock bookmark
  const createMockBookmark = (id: number, url: string, source: BookmarkSource = BookmarkSource.WEB): Bookmark => ({
    id,
    user_id: mockUserId,
    url,
    title: `Title ${id}`,
    source,
    client_time: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    metadata: null,
  });

  describe("POST /bookmarks (create)", () => {
    it("should create a bookmark with all fields", async () => {
      const request = {
        url: "https://www.youtube.com/watch?v=test",
        title: "Test Video",
        source: BookmarkSource.YOUTUBE,
        client_time: new Date("2025-01-01T00:00:00Z"),
        metadata: { tags: ["tech", "tutorial"] },
      };

      const mockBookmark = {
        ...createMockBookmark(1, request.url, BookmarkSource.YOUTUBE),
        title: request.title,
      };
      mockBookmarkCreate.mockResolvedValue(mockBookmark);
      mockTopicPublish.mockResolvedValue("msg-123");

      const result = await api.create(request);

      expect(mockBookmarkCreate).toHaveBeenCalledWith({
        user_id: mockUserId,
        url: request.url,
        title: request.title,
        source: BookmarkSource.YOUTUBE,
        client_time: request.client_time,
        metadata: request.metadata,
      });
      expect(mockTopicPublish).toHaveBeenCalledWith({
        bookmarkId: 1,
        url: request.url,
        source: BookmarkSource.YOUTUBE,
        title: request.title,
      });
      expect(result.bookmark).toEqual(mockBookmark);
    });

    it("should default source to 'web' if not provided", async () => {
      const request = {
        url: "https://example.com/article",
        client_time: new Date(),
      };

      const mockBookmark = createMockBookmark(2, request.url, BookmarkSource.WEB);
      mockBookmarkCreate.mockResolvedValue(mockBookmark);
      mockTopicPublish.mockResolvedValue("msg-456");

      await api.create(request);

      expect(mockBookmarkCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          source: BookmarkSource.WEB,
        })
      );
    });

    it("should throw error if url is missing", async () => {
      const request = {
        url: "",
        client_time: new Date(),
      };

      await expect(api.create(request)).rejects.toThrow("url and client_time are required");
      expect(mockBookmarkCreate).not.toHaveBeenCalled();
    });

    it("should throw error if client_time is missing", async () => {
      const request = {
        url: "https://example.com",
        client_time: null as any,
      };

      await expect(api.create(request)).rejects.toThrow("url and client_time are required");
      expect(mockBookmarkCreate).not.toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      const request = {
        url: "https://example.com",
        client_time: new Date(),
      };

      await expect(api.create(request)).rejects.toThrow("Authentication required");
      expect(mockBookmarkCreate).not.toHaveBeenCalled();
    });

    it("should continue if event publishing fails", async () => {
      const request = {
        url: "https://example.com",
        client_time: new Date(),
      };

      const mockBookmark = createMockBookmark(3, request.url);
      mockBookmarkCreate.mockResolvedValue(mockBookmark);
      mockTopicPublish.mockRejectedValue(new Error("Topic publish failed"));

      const result = await api.create(request);

      expect(result.bookmark).toEqual(mockBookmark);
      // Should not throw even though publish failed
    });
  });

  describe("GET /bookmarks/:id (get)", () => {
    it("should return bookmark by id", async () => {
      const mockBookmark = createMockBookmark(1, "https://example.com");
      mockBookmarkFindById.mockResolvedValue(mockBookmark);

      const result = await api.get({ id: 1 });

      expect(mockBookmarkFindById).toHaveBeenCalledWith(1, mockUserId);
      expect(result.bookmark).toEqual(mockBookmark);
    });

    it("should throw not found error if bookmark doesn't exist", async () => {
      mockBookmarkFindById.mockResolvedValue(null);

      await expect(api.get({ id: 999 })).rejects.toThrow("Bookmark with id 999 not found");
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.get({ id: 1 })).rejects.toThrow("Authentication required");
      expect(mockBookmarkFindById).not.toHaveBeenCalled();
    });

    it("should only return bookmarks owned by the user", async () => {
      mockBookmarkFindById.mockResolvedValue(null);

      await expect(api.get({ id: 1 })).rejects.toThrow("Bookmark with id 1 not found");

      expect(mockBookmarkFindById).toHaveBeenCalledWith(1, mockUserId);
    });
  });

  describe("GET /bookmarks (list)", () => {
    it("should list bookmarks with default pagination", async () => {
      const mockBookmarks = [
        createMockBookmark(1, "https://example.com/1"),
        createMockBookmark(2, "https://example.com/2"),
      ];

      mockBookmarkList.mockResolvedValue({
        bookmarks: mockBookmarks,
        total: 2,
      });

      const result = await api.list({});

      expect(mockBookmarkList).toHaveBeenCalledWith({
        userId: mockUserId,
        limit: 50,
        offset: 0,
        source: undefined,
      });
      expect(result.bookmarks).toEqual(mockBookmarks);
      expect(result.total).toBe(2);
    });

    it("should respect custom limit and offset", async () => {
      mockBookmarkList.mockResolvedValue({ bookmarks: [], total: 0 });

      await api.list({ limit: 10, offset: 20 });

      expect(mockBookmarkList).toHaveBeenCalledWith({
        userId: mockUserId,
        limit: 10,
        offset: 20,
        source: undefined,
      });
    });

    it("should filter by source", async () => {
      mockBookmarkList.mockResolvedValue({ bookmarks: [], total: 0 });

      await api.list({ source: BookmarkSource.YOUTUBE });

      expect(mockBookmarkList).toHaveBeenCalledWith({
        userId: mockUserId,
        limit: 50,
        offset: 0,
        source: BookmarkSource.YOUTUBE,
      });
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.list({})).rejects.toThrow("Authentication required");
      expect(mockBookmarkList).not.toHaveBeenCalled();
    });
  });

  describe("PUT /bookmarks/:id (update)", () => {
    it("should update bookmark with provided fields", async () => {
      const updateRequest = {
        id: 1,
        title: "Updated Title",
        url: "https://updated.com",
      };

      const mockUpdatedBookmark = createMockBookmark(1, updateRequest.url!);
      mockBookmarkUpdate.mockResolvedValue(mockUpdatedBookmark);

      const result = await api.update(updateRequest);

      expect(mockBookmarkUpdate).toHaveBeenCalledWith(1, mockUserId, {
        url: "https://updated.com",
        title: "Updated Title",
        source: undefined,
        metadata: undefined,
      });
      expect(result.bookmark).toEqual(mockUpdatedBookmark);
    });

    it("should update only source field", async () => {
      const updateRequest = {
        id: 1,
        source: BookmarkSource.PODCAST,
      };

      const mockUpdatedBookmark = createMockBookmark(1, "https://example.com", BookmarkSource.PODCAST);
      mockBookmarkUpdate.mockResolvedValue(mockUpdatedBookmark);

      await api.update(updateRequest);

      expect(mockBookmarkUpdate).toHaveBeenCalledWith(1, mockUserId, {
        url: undefined,
        title: undefined,
        source: BookmarkSource.PODCAST,
        metadata: undefined,
      });
    });

    it("should throw error if no fields to update", async () => {
      const updateRequest = { id: 1 };

      await expect(api.update(updateRequest)).rejects.toThrow("No fields to update");
      expect(mockBookmarkUpdate).not.toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.update({ id: 1, title: "New Title" })).rejects.toThrow(
        "Authentication required"
      );
      expect(mockBookmarkUpdate).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /bookmarks/:id (remove)", () => {
    it("should delete bookmark by id", async () => {
      mockBookmarkDelete.mockResolvedValue(undefined);

      const result = await api.remove({ id: 1 });

      expect(mockBookmarkDelete).toHaveBeenCalledWith(1, mockUserId);
      expect(result.success).toBe(true);
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.remove({ id: 1 })).rejects.toThrow("Authentication required");
      expect(mockBookmarkDelete).not.toHaveBeenCalled();
    });

    it("should only delete bookmarks owned by the user", async () => {
      mockBookmarkDelete.mockResolvedValue(undefined);

      await api.remove({ id: 1 });

      expect(mockBookmarkDelete).toHaveBeenCalledWith(1, mockUserId);
    });
  });

  describe("GET /bookmarks/:id/details (getDetails)", () => {
    it("should return bookmark with transcription details", async () => {
      const mockBookmark = createMockBookmark(1, "https://www.youtube.com/watch?v=test", BookmarkSource.YOUTUBE);
      const mockTranscription: Transcription = {
        id: 1,
        bookmark_id: 1,
        transcript: "Full transcript text",
        deepgram_summary: "Deepgram summary",
        summary: "OpenAI summary",
        sentiment: "positive",
        sentiment_score: 0.85,
        duration: 180,
        confidence: 0.95,
        status: TranscriptionStatus.COMPLETED,
        error_message: null,
        deepgram_response: {} as any,
        created_at: new Date(),
        updated_at: new Date(),
        processing_started_at: new Date(),
        processing_completed_at: new Date(),
        transcription_method: null,
      };

      mockBookmarkFindById.mockResolvedValue(mockBookmark);
      mockTranscriptionFindByBookmarkId.mockResolvedValue(mockTranscription);
      const mockWebContent: WebContent = {
        id: 10,
        bookmark_id: 1,
        raw_markdown: "# Sample",
        raw_html: "<h1>Sample</h1>",
        page_title: "Sample Page",
        page_description: "Description",
        language: "en",
        word_count: 1000,
        char_count: 4000,
        estimated_reading_minutes: 5,
        summary: "Summary",
        metadata: { ogImage: "https://example.com/image.jpg" },
        status: ContentStatus.COMPLETED,
        error_message: null,
        processing_started_at: new Date(),
        processing_completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockWebContentFindByBookmarkId.mockResolvedValue(mockWebContent);

      const result = await api.getDetails({ id: 1 });

      expect(mockBookmarkFindById).toHaveBeenCalledWith(1, mockUserId);
      expect(mockTranscriptionFindByBookmarkId).toHaveBeenCalledWith(1);
      expect(mockWebContentFindByBookmarkId).toHaveBeenCalledWith(1);
      expect(result.bookmark).toEqual(mockBookmark);
      expect(result.transcription).toEqual({
        transcript: "Full transcript text",
        deepgram_summary: "Deepgram summary",
        summary: "OpenAI summary",
        sentiment: "positive",
        sentiment_score: 0.85,
        duration: 180,
        confidence: 0.95,
        status: "completed",
        error_message: null,
        created_at: mockTranscription.created_at,
        updated_at: mockTranscription.updated_at,
      });
      expect(result.webContent).toEqual(mockWebContent);
    });

    it("should return bookmark without transcription if none exists", async () => {
      const mockBookmark = createMockBookmark(2, "https://example.com/article", BookmarkSource.BLOG);
      mockBookmarkFindById.mockResolvedValue(mockBookmark);
      mockTranscriptionFindByBookmarkId.mockResolvedValue(null);
      mockWebContentFindByBookmarkId.mockResolvedValue(null);

      const result = await api.getDetails({ id: 2 });

      expect(result.bookmark).toEqual(mockBookmark);
      expect(result.transcription).toBeNull();
      expect(result.webContent).toBeNull();
    });

    it("should throw not found error if bookmark doesn't exist", async () => {
      mockBookmarkFindById.mockResolvedValue(null);

      await expect(api.getDetails({ id: 999 })).rejects.toThrow(
        "Bookmark with id 999 not found"
      );
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.getDetails({ id: 1 })).rejects.toThrow("Authentication required");
      expect(mockBookmarkFindById).not.toHaveBeenCalled();
    });
  });

  describe("Cross-cutting Concerns", () => {
    it("should enforce user isolation across all endpoints", async () => {
      const userId1 = "user-1";
      const userId2 = "user-2";

      // User 1 creates bookmark
      mockGetAuthData.mockReturnValue({ userID: userId1 });
      mockBookmarkCreate.mockResolvedValue(createMockBookmark(1, "https://example.com"));
      mockTopicPublish.mockResolvedValue("msg");

      await api.create({ url: "https://example.com", client_time: new Date() });

      // User 2 tries to access it
      mockGetAuthData.mockReturnValue({ userID: userId2 });
      mockBookmarkFindById.mockResolvedValue(null);

      await expect(api.get({ id: 1 })).rejects.toThrow("Bookmark with id 1 not found");

      expect(mockBookmarkFindById).toHaveBeenCalledWith(1, userId2);
    });
  });
});
