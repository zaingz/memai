/**
 * Deepgram Service Tests
 *
 * Unit tests for DeepgramService with mocked Deepgram SDK.
 * Tests transcription with audio intelligence features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepgramService } from "../../services/deepgram.service";
import { createTestDeepgramResponse } from "../../../test/factories/bookmark.factory";

// Mock @deepgram/sdk
vi.mock("@deepgram/sdk", () => ({
  createClient: vi.fn(),
}));

describe("DeepgramService", () => {
  let service: DeepgramService;
  const mockApiKey = "test-deepgram-api-key";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    service = new DeepgramService(mockApiKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("transcribe", () => {
    it("should successfully transcribe audio buffer", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const mockDeepgramResponse = createTestDeepgramResponse();

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: mockDeepgramResponse,
        error: null,
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("fake audio data");
      const audioKey = "test-audio-key";

      const result = await service.transcribe(audioBuffer, audioKey);

      expect(result).toEqual(mockDeepgramResponse);
      expect(mockTranscribeFile).toHaveBeenCalledWith(
        audioBuffer,
        expect.any(Object) // Config object passed
      );
      expect(mockTranscribeFile).toHaveBeenCalledTimes(1);
    });

    it("should throw error when Deepgram API returns error", async () => {
      const { createClient } = await import("@deepgram/sdk");

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: null,
        error: { message: "Invalid audio format" },
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("invalid audio");
      const audioKey = "test-key";

      await expect(service.transcribe(audioBuffer, audioKey)).rejects.toThrow(
        "Deepgram API error: Invalid audio format"
      );
    });

    it("should handle network errors", async () => {
      const { createClient } = await import("@deepgram/sdk");

      const mockTranscribeFile = vi.fn().mockRejectedValue(
        new Error("Network timeout")
      );

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("audio data");
      const audioKey = "test-key";

      await expect(service.transcribe(audioBuffer, audioKey)).rejects.toThrow(
        "Network timeout"
      );
    });

    it("should handle large audio buffers", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const mockDeepgramResponse = createTestDeepgramResponse();

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: mockDeepgramResponse,
        error: null,
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("a".repeat(1000));
      const audioKey = "large-audio";

      const result = await service.transcribe(audioBuffer, audioKey);

      expect(result).toEqual(mockDeepgramResponse);
      expect(mockTranscribeFile).toHaveBeenCalledTimes(1);
    });

    it("should cast result to DeepgramResponse type", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const mockDeepgramResponse = createTestDeepgramResponse();

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: mockDeepgramResponse,
        error: null,
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("audio");
      const result = await service.transcribe(audioBuffer, "key");

      // Verify response has expected audio intelligence features
      expect(result.results.sentiments).toBeDefined();
      expect(result.results.summary).toBeDefined();
      expect(result.results.channels).toBeDefined();
      expect(result.metadata.duration).toBeDefined();
    });

    it("should handle audio with all intelligence features", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const mockDeepgramResponse = createTestDeepgramResponse({
        results: {
          ...createTestDeepgramResponse().results,
          intents: {
            segments: [
              {
                text: "Test intent",
                intent: "question",
                intent_score: 0.95,
                start_word: 0,
                end_word: 5,
              },
            ],
          },
          topics: {
            segments: [
              {
                text: "Test topic",
                topics: [
                  {
                    topic: "technology",
                    confidence_score: 0.92,
                  },
                ],
                start_word: 0,
                end_word: 5,
              },
            ],
          },
        },
      });

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: mockDeepgramResponse,
        error: null,
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("audio");
      const result = await service.transcribe(audioBuffer, "key");

      expect(result.results.intents).toBeDefined();
      expect(result.results.topics).toBeDefined();
    });

    it("should handle empty audio buffer", async () => {
      const { createClient } = await import("@deepgram/sdk");

      const mockTranscribeFile = vi.fn().mockResolvedValue({
        result: null,
        error: { message: "Empty audio buffer" },
      });

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      const audioBuffer = Buffer.from("");
      const audioKey = "empty";

      await expect(service.transcribe(audioBuffer, audioKey)).rejects.toThrow(
        "Deepgram API error: Empty audio buffer"
      );
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout after 60 seconds and cleanup resources", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const audioBuffer = Buffer.from("fake audio data");
      const audioKey = "test-audio-key";

      // Mock transcribeFile to never resolve (simulates hang)
      const mockTranscribeFile = vi.fn(() => new Promise(() => {})); // Never resolves

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      // Start transcription (will hang)
      const transcribePromise = service.transcribe(audioBuffer, audioKey);

      // Fast-forward time by 60 seconds
      await vi.advanceTimersByTimeAsync(60000);

      // Should reject with timeout error
      await expect(transcribePromise).rejects.toThrow(/timed out after 60 seconds/);

      // Verify transcribeFile was called
      expect(mockTranscribeFile).toHaveBeenCalledOnce();
    });

    it("should succeed when transcription completes within timeout", async () => {
      const { createClient } = await import("@deepgram/sdk");
      const mockDeepgramResponse = createTestDeepgramResponse();
      const audioBuffer = Buffer.from("fake audio data");
      const audioKey = "test-audio-key";

      // Mock successful transcription that completes quickly
      const mockTranscribeFile = vi.fn(() =>
        Promise.resolve({
          result: mockDeepgramResponse,
          error: null,
        })
      );

      (createClient as any).mockReturnValue({
        listen: {
          prerecorded: {
            transcribeFile: mockTranscribeFile,
          },
        },
      });

      // Start transcription
      const transcribePromise = service.transcribe(audioBuffer, audioKey);

      // Fast-forward by 10 seconds (well within 60s timeout)
      await vi.advanceTimersByTimeAsync(10000);

      // Should succeed
      const result = await transcribePromise;
      expect(result).toBeDefined();
      expect(result.results.channels).toHaveLength(1);
    });
  });
});
