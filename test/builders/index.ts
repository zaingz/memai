/**
 * Test Data Builders
 *
 * Provides fluent, chainable builders for creating test data.
 * Each builder follows the Builder pattern with method chaining.
 *
 * @example
 * // Simple bookmark
 * const bookmark = await new BookmarkBuilder()
 *   .forUser(userId)
 *   .asYouTube("videoId123")
 *   .build();
 *
 * @example
 * // Bookmark with completed transcription
 * const { bookmark, transcription } = await new TranscriptionBuilder()
 *   .withBookmark(new BookmarkBuilder().forUser(userId).asYouTube())
 *   .asCompleted("Full transcript text")
 *   .build();
 *
 * @example
 * // User created via webhook
 * const user = await new UserBuilder()
 *   .withEmail("test@example.com")
 *   .viaWebhook()
 *   .build();
 */

export { BookmarkBuilder } from "./bookmark.builder";
export { TranscriptionBuilder } from "./transcription.builder";
export { WebContentBuilder } from "./web-content.builder";
export { DigestBuilder } from "./digest.builder";
export { UserBuilder } from "./user.builder";
