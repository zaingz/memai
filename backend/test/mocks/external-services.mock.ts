/**
 * External Service Mocks
 *
 * Provides mock implementations for external dependencies:
 * - Deepgram SDK (transcription)
 * - OpenAI SDK (summarization)
 * - Encore Bucket (object storage)
 * - Encore Pub/Sub Topics (event publishing)
 *
 * Use these mocks to isolate service and processor tests from external APIs.
 */

import { vi } from "vitest";
import {
  createTestDeepgramResponse,
  createTestOpenAIResponse,
} from "../factories/bookmark.factory";

// =============================================================================
// Deepgram SDK Mock
// =============================================================================

/**
 * Creates a mock Deepgram client for testing
 * Returns a mock that simulates the Deepgram SDK structure:
 * createClient(apiKey).listen.prerecorded.transcribeFile(buffer, config)
 *
 * @param mockResponse - Optional custom Deepgram response (uses factory default if not provided)
 * @param shouldFail - If true, mock will throw an error
 * @param errorMessage - Custom error message (only used if shouldFail is true)
 * @returns Mock function that can be used with vi.mocked()
 *
 * @example
 * ```typescript
 * // Success case
 * const mockClient = mockDeepgramClient();
 * vi.mocked(createClient).mockReturnValue(mockClient as any);
 *
 * // Failure case
 * const mockClient = mockDeepgramClient(undefined, true, "API rate limit exceeded");
 * vi.mocked(createClient).mockReturnValue(mockClient as any);
 * ```
 */
export function mockDeepgramClient(
  mockResponse?: any,
  shouldFail = false,
  errorMessage = "Deepgram API error"
) {
  const response = mockResponse || createTestDeepgramResponse();

  const transcribeFile = vi.fn().mockImplementation(async () => {
    if (shouldFail) {
      return {
        result: null,
        error: { message: errorMessage },
      };
    }
    return {
      result: response,
      error: null,
    };
  });

  return {
    listen: {
      prerecorded: {
        transcribeFile,
      },
    },
  };
}

/**
 * Helper to create a Deepgram mock that always fails
 * @param errorMessage - Custom error message
 */
export function mockDeepgramClientFailure(errorMessage = "Deepgram API error") {
  return mockDeepgramClient(undefined, true, errorMessage);
}

// =============================================================================
// OpenAI SDK Mock
// =============================================================================

/**
 * Creates a mock OpenAI client for testing
 * Returns a mock that simulates the OpenAI SDK structure:
 * new OpenAI({ apiKey }).responses.create({ ... })
 *
 * @param mockResponse - Optional custom OpenAI response (uses factory default if not provided)
 * @param shouldFail - If true, mock will throw an error
 * @param errorMessage - Custom error message (only used if shouldFail is true)
 * @returns Mock OpenAI client instance
 *
 * @example
 * ```typescript
 * // Success case
 * const mockClient = mockOpenAIClient({
 *   output_text: "This is a custom summary",
 * });
 *
 * // Failure case
 * const mockClient = mockOpenAIClient(undefined, true, "OpenAI API error: Rate limit exceeded");
 * ```
 */
export function mockOpenAIClient(
  mockResponse?: any,
  shouldFail = false,
  errorMessage = "OpenAI API error"
) {
  const response = mockResponse || createTestOpenAIResponse();

  const create = vi.fn().mockImplementation(async () => {
    if (shouldFail) {
      throw new Error(errorMessage);
    }
    return response;
  });

  return {
    responses: {
      create,
    },
  };
}

/**
 * Helper to create an OpenAI mock that always fails
 * @param errorMessage - Custom error message
 */
export function mockOpenAIClientFailure(
  errorMessage = "OpenAI API error: Rate limit exceeded"
) {
  return mockOpenAIClient(undefined, true, errorMessage);
}

// =============================================================================
// Encore Bucket Mock
// =============================================================================

/**
 * Creates a mock Encore Bucket for testing
 * Simulates object storage operations (upload, download, remove)
 *
 * @param options - Configuration options
 * @param options.shouldFailUpload - If true, upload() will throw an error
 * @param options.shouldFailDownload - If true, download() will throw an error
 * @param options.shouldFailRemove - If true, remove() will throw an error
 * @param options.mockStorage - Optional in-memory storage map for stateful testing
 * @returns Mock bucket instance with upload, download, and remove methods
 *
 * @example
 * ```typescript
 * // Stateless mock (always succeeds)
 * const bucket = mockEncoreBucket();
 *
 * // Stateful mock (tracks uploads/downloads in memory)
 * const storage = new Map<string, Buffer>();
 * const bucket = mockEncoreBucket({ mockStorage: storage });
 * await bucket.upload("key", Buffer.from("data"));
 * const data = await bucket.download("key"); // Returns Buffer.from("data")
 *
 * // Failure scenarios
 * const bucket = mockEncoreBucket({ shouldFailUpload: true });
 * await bucket.upload("key", buffer); // Throws error
 * ```
 */
export function mockEncoreBucket(options: {
  shouldFailUpload?: boolean;
  shouldFailDownload?: boolean;
  shouldFailRemove?: boolean;
  mockStorage?: Map<string, Buffer>;
} = {}) {
  const {
    shouldFailUpload = false,
    shouldFailDownload = false,
    shouldFailRemove = false,
    mockStorage,
  } = options;

  const upload = vi.fn().mockImplementation(async (key: string, data: Buffer) => {
    if (shouldFailUpload) {
      throw new Error("Bucket upload failed");
    }
    if (mockStorage) {
      mockStorage.set(key, data);
    }
    return { version: "v1" };
  });

  const download = vi.fn().mockImplementation(async (key: string) => {
    if (shouldFailDownload) {
      throw new Error("Bucket download failed");
    }
    if (mockStorage) {
      const data = mockStorage.get(key);
      if (!data) {
        throw new Error(`Object not found: ${key}`);
      }
      return data;
    }
    // Return dummy buffer for stateless mode
    return Buffer.from("mock-audio-data");
  });

  const remove = vi.fn().mockImplementation(async (key: string) => {
    if (shouldFailRemove) {
      throw new Error("Bucket remove failed");
    }
    if (mockStorage) {
      mockStorage.delete(key);
    }
  });

  return {
    upload,
    download,
    remove,
  };
}

/**
 * Helper to create a stateful bucket mock with in-memory storage
 * Useful for testing workflows that upload, download, and remove objects
 *
 * @returns Object with bucket mock and storage map
 *
 * @example
 * ```typescript
 * const { bucket, storage } = mockEncoreBucketWithStorage();
 * await bucket.upload("test-key", Buffer.from("test data"));
 * expect(storage.has("test-key")).toBe(true);
 * await bucket.remove("test-key");
 * expect(storage.has("test-key")).toBe(false);
 * ```
 */
export function mockEncoreBucketWithStorage() {
  const storage = new Map<string, Buffer>();
  const bucket = mockEncoreBucket({ mockStorage: storage });
  return { bucket, storage };
}

// =============================================================================
// Pub/Sub Topic Mock
// =============================================================================

/**
 * Creates a mock Pub/Sub Topic for testing
 * Simulates Encore's Topic.publish() method
 *
 * @param options - Configuration options
 * @param options.shouldFail - If true, publish() will throw an error
 * @param options.errorMessage - Custom error message (only used if shouldFail is true)
 * @param options.captureEvents - If provided, published events will be pushed to this array
 * @returns Mock topic instance with publish method
 *
 * @example
 * ```typescript
 * // Basic mock (fire and forget)
 * const topic = mockPubSubTopic();
 * await topic.publish({ bookmarkId: 1 });
 * expect(topic.publish).toHaveBeenCalledWith({ bookmarkId: 1 });
 *
 * // Capture published events for assertions
 * const events: any[] = [];
 * const topic = mockPubSubTopic({ captureEvents: events });
 * await topic.publish({ bookmarkId: 1 });
 * expect(events).toHaveLength(1);
 * expect(events[0]).toEqual({ bookmarkId: 1 });
 *
 * // Simulate failure
 * const topic = mockPubSubTopic({ shouldFail: true, errorMessage: "Topic unavailable" });
 * await expect(topic.publish({ bookmarkId: 1 })).rejects.toThrow("Topic unavailable");
 * ```
 */
export function mockPubSubTopic<T = any>(options: {
  shouldFail?: boolean;
  errorMessage?: string;
  captureEvents?: T[];
} = {}) {
  const {
    shouldFail = false,
    errorMessage = "Topic publish failed",
    captureEvents,
  } = options;

  const publish = vi.fn().mockImplementation(async (event: T) => {
    if (shouldFail) {
      throw new Error(errorMessage);
    }
    if (captureEvents) {
      captureEvents.push(event);
    }
    // Encore Topic.publish() returns the message ID
    return "mock-message-id";
  });

  return {
    publish,
  };
}

/**
 * Helper to create a topic mock that captures all published events
 * Useful for testing processor logic that publishes events
 *
 * @returns Object with topic mock and events array
 *
 * @example
 * ```typescript
 * const { topic, events } = mockPubSubTopicWithCapture<AudioDownloadedEvent>();
 * await someProcessor.handle(inputEvent); // Publishes downstream event
 * expect(events).toHaveLength(1);
 * expect(events[0]).toMatchObject({ bookmarkId: 123 });
 * ```
 */
export function mockPubSubTopicWithCapture<T = any>() {
  const events: T[] = [];
  const topic = mockPubSubTopic<T>({ captureEvents: events });
  return { topic, events };
}

// =============================================================================
// Combined Mock Helpers
// =============================================================================

/**
 * Creates a complete set of mocks for testing processors
 * Returns all external dependencies mocked and ready for testing
 *
 * @returns Object containing all service mocks
 *
 * @example
 * ```typescript
 * const mocks = createProcessorMocks();
 * vi.mocked(createClient).mockReturnValue(mocks.deepgram as any);
 * // Use mocks in processor test
 * ```
 */
export function createProcessorMocks() {
  return {
    deepgram: mockDeepgramClient(),
    openai: mockOpenAIClient(),
    bucket: mockEncoreBucket(),
    topics: {
      bookmarkCreated: mockPubSubTopic(),
      bookmarkSourceClassified: mockPubSubTopic(),
      audioDownloaded: mockPubSubTopic(),
      audioTranscribed: mockPubSubTopic(),
    },
  };
}

/**
 * Creates a complete set of mocks for testing services
 * Similar to createProcessorMocks but excludes pub/sub topics (services don't publish events)
 *
 * @returns Object containing service dependency mocks
 *
 * @example
 * ```typescript
 * const mocks = createServiceMocks();
 * const service = new DeepgramService("test-api-key");
 * vi.mocked(createClient).mockReturnValue(mocks.deepgram as any);
 * ```
 */
export function createServiceMocks() {
  return {
    deepgram: mockDeepgramClient(),
    openai: mockOpenAIClient(),
    bucket: mockEncoreBucket(),
  };
}
