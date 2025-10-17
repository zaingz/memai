import { TranscriptionRepository } from "../../bookmarks/repositories/transcription.repository";
import { Transcription, TranscriptionStatus, Bookmark } from "../../bookmarks/types";
import { db } from "../../bookmarks/db";
import { BookmarkBuilder } from "./bookmark.builder";

export class TranscriptionBuilder {
  private bookmarkId?: number;
  private status: TranscriptionStatus = TranscriptionStatus.PENDING;
  private transcript: string | null = null;
  private summary: string | null = null;
  private duration: number | null = null;

  private transcriptionRepo = new TranscriptionRepository(db);
  private bookmarkBuilder?: BookmarkBuilder;

  forBookmark(bookmarkId: number): TranscriptionBuilder {
    this.bookmarkId = bookmarkId;
    return this;
  }

  withBookmark(builder: BookmarkBuilder): TranscriptionBuilder {
    this.bookmarkBuilder = builder;
    return this;
  }

  asPending(): TranscriptionBuilder {
    this.status = TranscriptionStatus.PENDING;
    return this;
  }

  asProcessing(): TranscriptionBuilder {
    this.status = TranscriptionStatus.PROCESSING;
    return this;
  }

  asCompleted(transcript: string = "Test transcript"): TranscriptionBuilder {
    this.status = TranscriptionStatus.COMPLETED;
    this.transcript = transcript;
    this.summary = "Test summary";
    this.duration = 120;
    return this;
  }

  asFailed(error: string = "Test error"): TranscriptionBuilder {
    this.status = TranscriptionStatus.FAILED;
    return this;
  }

  async build(): Promise<{ bookmark: Bookmark; transcription: Transcription }> {
    // Create bookmark if needed
    const bookmark = this.bookmarkBuilder
      ? await this.bookmarkBuilder.build()
      : await new BookmarkBuilder().asYouTube().build();

    const bookmarkId = this.bookmarkId || bookmark.id;

    // Create transcription
    await this.transcriptionRepo.createPending(bookmarkId);

    if (this.status === TranscriptionStatus.PROCESSING) {
      await this.transcriptionRepo.markAsProcessing(bookmarkId);
    } else if (this.status === TranscriptionStatus.COMPLETED) {
      await this.transcriptionRepo.updateTranscriptionData(bookmarkId, {
        transcript: this.transcript!,
        deepgramSummary: "Deepgram summary",
        sentiment: "positive",
        sentimentScore: 0.8,
        deepgramResponse: {} as any,
        duration: this.duration!,
        confidence: 0.95,
      });
      await this.transcriptionRepo.updateSummary(bookmarkId, this.summary!);
    } else if (this.status === TranscriptionStatus.FAILED) {
      await this.transcriptionRepo.markAsFailedByBookmarkId(bookmarkId, "Test error");
    }

    const transcription = await this.transcriptionRepo.findByBookmarkIdInternal(bookmarkId);

    return { bookmark, transcription: transcription! };
  }
}
