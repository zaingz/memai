/**
 * Daily Digest API Tests
 *
 * Unit tests for daily digest endpoints:
 * - POST /digests/generate (generateDailyDigest)
 * - GET /digests/:date (getDailyDigest)
 * - GET /digests (listDailyDigests)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DigestStatus } from "../../types/daily-digest.types";
import type { DailyDigest } from "../../types/daily-digest.types";

// Hoist mock functions for use in module mocks
const {
  mockGetAuthData,
  mockGenerateDailyDigest,
  mockGetDigestByDate,
  mockListDigests,
  mockParseDigestDate,
  mockGetDigestDateRange,
} = vi.hoisted(() => ({
  mockGetAuthData: vi.fn(),
  mockGenerateDailyDigest: vi.fn(),
  mockGetDigestByDate: vi.fn(),
  mockListDigests: vi.fn(),
  mockParseDigestDate: vi.fn(),
  mockGetDigestDateRange: vi.fn(),
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

vi.mock("../../services/daily-digest.service", () => ({
  DailyDigestService: class MockDailyDigestService {
    generateDailyDigest = mockGenerateDailyDigest;
    getDigestByDate = mockGetDigestByDate;
    listDigests = mockListDigests;
  },
}));

vi.mock("../../config/daily-digest.config", () => ({
  parseDigestDate: mockParseDigestDate,
  getDigestDateRange: mockGetDigestDateRange,
}));

// Import after mocks
import * as api from "../../api";

describe("Daily Digest API", () => {
  const mockUserId = "user-uuid-123";
  const mockAuth = { userID: mockUserId };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthData.mockReturnValue(mockAuth);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock digest
  const createMockDigest = (
    id: number,
    date: Date,
    content: string | null = "Digest content"
  ): DailyDigest => ({
    id,
    user_id: mockUserId,
    digest_date: date,
    digest_content: content,
    bookmark_count: 5,
    sources_breakdown: null,
    date_range_start: null,
    date_range_end: null,
    total_duration: null,
    processing_metadata: null,
    status: content ? DigestStatus.COMPLETED : DigestStatus.PENDING,
    error_message: null,
    processing_started_at: null,
    processing_completed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  describe("POST /digests/generate (generateDailyDigest)", () => {
    it("should generate digest for yesterday by default", async () => {
      const yesterday = new Date("2025-01-10");
      mockGetDigestDateRange.mockReturnValue({ digestDate: yesterday });

      const mockDigest = createMockDigest(1, yesterday, "Yesterday's digest");
      mockGenerateDailyDigest.mockResolvedValue(mockDigest);

      const result = await api.generateDailyDigest({});

      expect(mockGetDigestDateRange).toHaveBeenCalled();
      expect(mockGenerateDailyDigest).toHaveBeenCalledWith({
        date: yesterday,
        userId: mockUserId,
        forceRegenerate: false,
      });
      expect(result.digest).toEqual(mockDigest);
      expect(result.message).toBe("Daily digest generated successfully");
    });

    it("should generate digest for specific date when provided", async () => {
      const specificDate = new Date("2025-01-05");
      mockParseDigestDate.mockReturnValue(specificDate);

      const mockDigest = createMockDigest(2, specificDate, "Specific date digest");
      mockGenerateDailyDigest.mockResolvedValue(mockDigest);

      const result = await api.generateDailyDigest({ date: "2025-01-05" });

      expect(mockParseDigestDate).toHaveBeenCalledWith("2025-01-05");
      expect(mockGenerateDailyDigest).toHaveBeenCalledWith({
        date: specificDate,
        userId: mockUserId,
        forceRegenerate: false,
      });
      expect(result.digest).toEqual(mockDigest);
    });

    it("should return scaffolding message when content is pending", async () => {
      const yesterday = new Date("2025-01-10");
      mockGetDigestDateRange.mockReturnValue({ digestDate: yesterday });

      const mockDigest = createMockDigest(3, yesterday, null);
      mockGenerateDailyDigest.mockResolvedValue(mockDigest);

      const result = await api.generateDailyDigest({});

      expect(result.digest).toEqual(mockDigest);
      expect(result.message).toBe("Daily digest scaffolding completed (summarization pending)");
    });

    it("should throw error for invalid date format", async () => {
      mockParseDigestDate.mockImplementation(() => {
        throw new Error("Invalid date");
      });

      await expect(api.generateDailyDigest({ date: "invalid" })).rejects.toThrow(
        "Invalid date format. Use YYYY-MM-DD"
      );
    });

    it("should handle service errors", async () => {
      const yesterday = new Date("2025-01-10");
      mockGetDigestDateRange.mockReturnValue({ digestDate: yesterday });
      mockGenerateDailyDigest.mockRejectedValue(new Error("No bookmarks found"));

      await expect(api.generateDailyDigest({})).rejects.toThrow(
        "Failed to generate daily digest: No bookmarks found"
      );
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.generateDailyDigest({})).rejects.toThrow("Authentication required");
      expect(mockGenerateDailyDigest).not.toHaveBeenCalled();
    });

    it("should use authenticated user's ID", async () => {
      const yesterday = new Date("2025-01-10");
      mockGetDigestDateRange.mockReturnValue({ digestDate: yesterday });
      mockGenerateDailyDigest.mockResolvedValue(createMockDigest(1, yesterday));

      await api.generateDailyDigest({});

      expect(mockGenerateDailyDigest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        })
      );
    });
  });

  describe("GET /digests/:date (getDailyDigest)", () => {
    it("should return digest for specific date", async () => {
      const digestDate = new Date("2025-01-05");
      mockParseDigestDate.mockReturnValue(digestDate);

      const mockDigest = createMockDigest(1, digestDate);
      mockGetDigestByDate.mockResolvedValue(mockDigest);

      const result = await api.getDailyDigest({ date: "2025-01-05" });

      expect(mockParseDigestDate).toHaveBeenCalledWith("2025-01-05");
      expect(mockGetDigestByDate).toHaveBeenCalledWith(digestDate, mockUserId);
      expect(result.digest).toEqual(mockDigest);
    });

    it("should return null when digest doesn't exist", async () => {
      const digestDate = new Date("2025-01-05");
      mockParseDigestDate.mockReturnValue(digestDate);
      mockGetDigestByDate.mockResolvedValue(null);

      const result = await api.getDailyDigest({ date: "2025-01-05" });

      expect(result.digest).toBeNull();
    });

    it("should throw error for invalid date format", async () => {
      mockParseDigestDate.mockImplementation(() => {
        throw new Error("Invalid date");
      });

      await expect(api.getDailyDigest({ date: "bad-date" })).rejects.toThrow(
        "Invalid date format. Use YYYY-MM-DD"
      );
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.getDailyDigest({ date: "2025-01-05" })).rejects.toThrow(
        "Authentication required"
      );
      expect(mockGetDigestByDate).not.toHaveBeenCalled();
    });

    it("should only return digests for authenticated user", async () => {
      const digestDate = new Date("2025-01-05");
      mockParseDigestDate.mockReturnValue(digestDate);
      mockGetDigestByDate.mockResolvedValue(createMockDigest(1, digestDate));

      await api.getDailyDigest({ date: "2025-01-05" });

      expect(mockGetDigestByDate).toHaveBeenCalledWith(digestDate, mockUserId);
    });
  });

  describe("GET /digests (listDailyDigests)", () => {
    it("should list digests with default pagination", async () => {
      const mockDigests = [
        createMockDigest(1, new Date("2025-01-10")),
        createMockDigest(2, new Date("2025-01-09")),
        createMockDigest(3, new Date("2025-01-08")),
      ];

      mockListDigests.mockResolvedValue({
        digests: mockDigests,
        total: 3,
      });

      const result = await api.listDailyDigests({});

      expect(mockListDigests).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        userId: mockUserId,
      });
      expect(result.digests).toEqual(mockDigests);
      expect(result.total).toBe(3);
    });

    it("should respect custom limit and offset", async () => {
      mockListDigests.mockResolvedValue({ digests: [], total: 0 });

      await api.listDailyDigests({ limit: 10, offset: 20 });

      expect(mockListDigests).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
        userId: mockUserId,
      });
    });

    it("should return empty list when no digests exist", async () => {
      mockListDigests.mockResolvedValue({ digests: [], total: 0 });

      const result = await api.listDailyDigests({});

      expect(result.digests).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should require authentication", async () => {
      mockGetAuthData.mockReturnValue(null);

      await expect(api.listDailyDigests({})).rejects.toThrow("Authentication required");
      expect(mockListDigests).not.toHaveBeenCalled();
    });

    it("should only list digests for authenticated user", async () => {
      mockListDigests.mockResolvedValue({ digests: [], total: 0 });

      await api.listDailyDigests({});

      expect(mockListDigests).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
        })
      );
    });

    it("should handle large result sets", async () => {
      const manyDigests = Array.from({ length: 100 }, (_, i) =>
        createMockDigest(i + 1, new Date(`2025-01-${String(i + 1).padStart(2, "0")}`))
      );

      mockListDigests.mockResolvedValue({
        digests: manyDigests,
        total: 100,
      });

      const result = await api.listDailyDigests({ limit: 100 });

      expect(result.digests).toHaveLength(100);
      expect(result.total).toBe(100);
    });
  });

  describe("Cross-cutting Concerns", () => {
    it("should enforce user isolation across digest endpoints", async () => {
      const user1 = "user-1";
      const user2 = "user-2";
      const digestDate = new Date("2025-01-05");

      // User 1 generates digest
      mockGetAuthData.mockReturnValue({ userID: user1 });
      mockGetDigestDateRange.mockReturnValue({ digestDate });
      mockGenerateDailyDigest.mockResolvedValue(createMockDigest(1, digestDate));

      await api.generateDailyDigest({});

      expect(mockGenerateDailyDigest).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user1 })
      );

      // User 2 tries to access it
      mockGetAuthData.mockReturnValue({ userID: user2 });
      mockParseDigestDate.mockReturnValue(digestDate);
      mockGetDigestByDate.mockResolvedValue(null);

      const result = await api.getDailyDigest({ date: "2025-01-05" });

      expect(mockGetDigestByDate).toHaveBeenCalledWith(digestDate, user2);
      expect(result.digest).toBeNull();
    });

    it("should handle various date formats consistently", async () => {
      const testDates = [
        { input: "2025-01-01", parsed: new Date("2025-01-01") },
        { input: "2025-12-31", parsed: new Date("2025-12-31") },
      ];

      for (const { input, parsed } of testDates) {
        mockParseDigestDate.mockReturnValue(parsed);
        mockGetDigestByDate.mockResolvedValue(createMockDigest(1, parsed));

        const result = await api.getDailyDigest({ date: input });

        expect(mockParseDigestDate).toHaveBeenCalledWith(input);
        expect(result.digest?.digest_date).toEqual(parsed);

        vi.clearAllMocks();
        mockGetAuthData.mockReturnValue(mockAuth);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle service unavailable errors", async () => {
      mockGetDigestDateRange.mockReturnValue({ digestDate: new Date() });
      mockGenerateDailyDigest.mockRejectedValue(new Error("Service unavailable"));

      await expect(api.generateDailyDigest({})).rejects.toThrow(
        "Failed to generate daily digest: Service unavailable"
      );
    });

    it("should handle database errors gracefully", async () => {
      const digestDate = new Date("2025-01-05");
      mockParseDigestDate.mockReturnValue(digestDate);
      mockGetDigestByDate.mockRejectedValue(new Error("Database error"));

      await expect(api.getDailyDigest({ date: "2025-01-05" })).rejects.toThrow();
    });

    it("should handle non-Error exceptions", async () => {
      mockGetDigestDateRange.mockReturnValue({ digestDate: new Date() });
      mockGenerateDailyDigest.mockRejectedValue("String error");

      await expect(api.generateDailyDigest({})).rejects.toThrow(
        "Failed to generate daily digest: String error"
      );
    });
  });
});
