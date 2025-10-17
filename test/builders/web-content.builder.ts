import { WebContentRepository } from "../../bookmarks/repositories/web-content.repository";
import { WebContent, ContentStatus, Bookmark } from "../../bookmarks/types";
import { db } from "../../bookmarks/db";
import { BookmarkBuilder } from "./bookmark.builder";

export class WebContentBuilder {
  private bookmarkId?: number;
  private status: ContentStatus = ContentStatus.PENDING;
  private rawMarkdown: string | null = null;
  private rawHtml: string | null = null;
  private pageTitle: string = "Test Page";
  private wordCount: number = 100;

  private webContentRepo = new WebContentRepository(db);
  private bookmarkBuilder?: BookmarkBuilder;

  forBookmark(bookmarkId: number): WebContentBuilder {
    this.bookmarkId = bookmarkId;
    return this;
  }

  withBookmark(builder: BookmarkBuilder): WebContentBuilder {
    this.bookmarkBuilder = builder;
    return this;
  }

  asCompleted(markdown: string = "# Test Content\n\nTest paragraph."): WebContentBuilder {
    this.status = ContentStatus.COMPLETED;
    this.rawMarkdown = markdown;
    this.rawHtml = "<h1>Test Content</h1><p>Test paragraph.</p>";
    return this;
  }

  asFailed(): WebContentBuilder {
    this.status = ContentStatus.FAILED;
    return this;
  }

  withWordCount(count: number): WebContentBuilder {
    this.wordCount = count;
    return this;
  }

  async build(): Promise<{ bookmark: Bookmark; webContent: WebContent }> {
    const bookmark = this.bookmarkBuilder
      ? await this.bookmarkBuilder.build()
      : await new BookmarkBuilder().build();

    const bookmarkId = this.bookmarkId || bookmark.id;

    await this.webContentRepo.createPending(bookmarkId);

    if (this.status === ContentStatus.COMPLETED) {
      await this.webContentRepo.updateContent(bookmarkId, {
        raw_markdown: this.rawMarkdown!,
        raw_html: this.rawHtml!,
        page_title: this.pageTitle,
        page_description: "Test description",
        language: "en",
        word_count: this.wordCount,
        char_count: this.rawMarkdown!.length,
        estimated_reading_minutes: Math.ceil(this.wordCount / 200),
        metadata: {},
      });
    } else if (this.status === ContentStatus.FAILED) {
      await this.webContentRepo.markAsFailed(bookmarkId, "Test error");
    }

    const webContent = await this.webContentRepo.findByBookmarkIdInternal(bookmarkId);

    return { bookmark, webContent: webContent! };
  }
}
