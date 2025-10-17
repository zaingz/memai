import { randomUUID } from "crypto";
import { BookmarkRepository } from "../../bookmarks/repositories/bookmark.repository";
import { BookmarkSource, Bookmark } from "../../bookmarks/types";
import { db } from "../../bookmarks/db";

export class BookmarkBuilder {
  private userId: string = randomUUID();
  private url: string = "https://example.com/test";
  private title: string | null = "Test Bookmark";
  private source: BookmarkSource = BookmarkSource.WEB;
  private clientTime: Date = new Date();
  private metadata: Record<string, any> | null = null;

  private bookmarkRepo = new BookmarkRepository(db);

  forUser(userId: string): BookmarkBuilder {
    this.userId = userId;
    return this;
  }

  withUrl(url: string): BookmarkBuilder {
    this.url = url;
    return this;
  }

  withSource(source: BookmarkSource): BookmarkBuilder {
    this.source = source;
    return this;
  }

  asYouTube(videoId: string = "dQw4w9WgXcQ"): BookmarkBuilder {
    this.url = `https://youtube.com/watch?v=${videoId}`;
    this.source = BookmarkSource.YOUTUBE;
    this.title = `YouTube Video: ${videoId}`;
    return this;
  }

  asPodcast(episodeId: string = "ep-123"): BookmarkBuilder {
    this.url = `https://podcasts.example.com/episodes/${episodeId}`;
    this.source = BookmarkSource.PODCAST;
    this.title = `Podcast Episode: ${episodeId}`;
    return this;
  }

  withoutTitle(): BookmarkBuilder {
    this.title = null;
    return this;
  }

  async build(): Promise<Bookmark> {
    return await this.bookmarkRepo.create({
      user_id: this.userId,
      url: this.url,
      title: this.title,
      source: this.source,
      client_time: this.clientTime,
      metadata: this.metadata,
    });
  }
}
