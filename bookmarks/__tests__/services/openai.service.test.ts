/**
 * OpenAI Service Tests
 *
 * Unit tests for OpenAIService with mocked OpenAI SDK.
 * Tests summary generation and daily digest generation using Responses API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIService } from "../../services/openai.service";

// Mock openai module
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: {
        create: vi.fn(),
      },
    })),
  };
});

describe("OpenAIService", () => {
  let service: OpenAIService;
  let mockCreate: any;
  const mockApiKey = "test-openai-api-key";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the mock
    const OpenAI = (await import("openai")).default;

    // Create mock function
    mockCreate = vi.fn();

    // Reset the mock implementation for each test
    (OpenAI as any).mockImplementation(() => ({
      responses: {
        create: mockCreate,
      },
    }));

    service = new OpenAIService(mockApiKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateSummary", () => {
    it("should generate summary successfully", async () => {
      const mockResponse = {
        output_text: "This is a concise summary of the transcript.",
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const transcript = "This is a long transcript that needs summarization.";
      const summary = await service.generateSummary(transcript);

      expect(summary).toBe("This is a concise summary of the transcript.");
      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4.1-mini",
        instructions: expect.any(String),
        input: expect.stringContaining(transcript),
        temperature: 0.7,
        max_output_tokens: 500,
      });
    });

    it("should use custom instructions when provided", async () => {
      const mockResponse = {
        output_text: "Custom summary output.",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const transcript = "Transcript text";
      const customInstructions = "Custom prompt instructions";
      const summary = await service.generateSummary(transcript, customInstructions);

      expect(summary).toBe("Custom summary output.");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: customInstructions,
        })
      );
    });

    it("should return fallback text when output_text is null", async () => {
      const mockResponse = {
        output_text: null,
      };

      mockCreate.mockResolvedValue(mockResponse);

      const transcript = "Transcript";
      const summary = await service.generateSummary(transcript);

      expect(summary).toBe("No summary available");
    });

    it("should return fallback text when output_text is empty", async () => {
      const mockResponse = {
        output_text: "",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const transcript = "Transcript";
      const summary = await service.generateSummary(transcript);

      expect(summary).toBe("No summary available");
    });

    it("should throw error on API failure", async () => {
      mockCreate.mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      const transcript = "Transcript";

      await expect(service.generateSummary(transcript)).rejects.toThrow(
        "OpenAI API error: API rate limit exceeded"
      );
    });

    it("should handle network timeout errors", async () => {
      mockCreate.mockRejectedValue(
        new Error("Request timeout")
      );

      await expect(service.generateSummary("text")).rejects.toThrow(
        "OpenAI API error: Request timeout"
      );
    });
  });

  describe("generateDigest", () => {
    it("should generate digest successfully", async () => {
      const mockResponse = {
        output_text: "This is your daily digest with key insights.",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const prompt = "Generate a daily digest";
      const content = "Summary 1. Summary 2. Summary 3.";
      const digest = await service.generateDigest(prompt, content);

      expect(digest).toBe("This is your daily digest with key insights.");
      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4.1", // From DAILY_DIGEST_CONFIG
        instructions: prompt,
        input: content,
        temperature: 0.7,
        max_output_tokens: 4000, // Default from DAILY_DIGEST_CONFIG
      });
    });

    it("should use custom maxTokens when provided", async () => {
      const mockResponse = {
        output_text: "Short digest.",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const prompt = "Generate digest";
      const content = "Content";
      const customMaxTokens = 500;

      await service.generateDigest(prompt, content, customMaxTokens);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_output_tokens: customMaxTokens,
        })
      );
    });

    it("should return fallback text when output_text is null", async () => {
      const mockResponse = {
        output_text: null,
      };

      mockCreate.mockResolvedValue(mockResponse);

      const digest = await service.generateDigest("prompt", "content");

      expect(digest).toBe("No digest generated");
    });

    it("should throw error on API failure", async () => {
      mockCreate.mockRejectedValue(
        new Error("Invalid API key")
      );

      await expect(
        service.generateDigest("prompt", "content")
      ).rejects.toThrow("OpenAI API error: Invalid API key");
    });

    it("should handle long content", async () => {
      const mockResponse = {
        output_text: "Digest of long content.",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const prompt = "Summarize";
      const longContent = "a".repeat(50000); // 50k characters

      const digest = await service.generateDigest(prompt, longContent);

      expect(digest).toBe("Digest of long content.");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("should handle empty content", async () => {
      const mockResponse = {
        output_text: "No content to digest.",
      };

      mockCreate.mockResolvedValue(mockResponse);

      const digest = await service.generateDigest("prompt", "");

      expect(digest).toBe("No content to digest.");
    });
  });

  describe("error handling", () => {
    it("should handle non-Error exceptions", async () => {
      mockCreate.mockRejectedValue(
        "String error message"
      );

      await expect(service.generateSummary("text")).rejects.toThrow(
        "OpenAI API error: String error message"
      );
    });

    it("should preserve error context in message", async () => {
      const errorWithContext = new Error("Token limit exceeded for model gpt-4");
      mockCreate.mockRejectedValue(errorWithContext);

      await expect(service.generateSummary("text")).rejects.toThrow(
        "OpenAI API error: Token limit exceeded for model gpt-4"
      );
    });
  });
});
