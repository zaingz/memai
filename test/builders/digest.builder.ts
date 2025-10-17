import { DailyDigestRepository } from "../../bookmarks/repositories/daily-digest.repository";
import { DailyDigest, DigestStatus } from "../../bookmarks/types";
import { db } from "../../bookmarks/db";

export class DigestBuilder {
  private userId: string | null = null;
  private digestDate: Date = new Date("2025-01-15");
  private status: DigestStatus = DigestStatus.PENDING;
  private bookmarkCount: number = 5;
  private digestContent: string | null = null;

  private digestRepo = new DailyDigestRepository(db);

  forUser(userId: string): DigestBuilder {
    this.userId = userId;
    return this;
  }

  forDate(date: Date): DigestBuilder {
    this.digestDate = date;
    return this;
  }

  asCompleted(content: string = "Test digest content"): DigestBuilder {
    this.status = DigestStatus.COMPLETED;
    this.digestContent = content;
    return this;
  }

  asFailed(): DigestBuilder {
    this.status = DigestStatus.FAILED;
    return this;
  }

  withBookmarkCount(count: number): DigestBuilder {
    this.bookmarkCount = count;
    return this;
  }

  async build(): Promise<DailyDigest> {
    const digest = await this.digestRepo.create({
      digestDate: this.digestDate,
      userId: this.userId,
      bookmarkCount: this.bookmarkCount,
      sourcesBreakdown: { youtube: 3, web: 2 },
      dateRangeStart: this.digestDate,
      dateRangeEnd: this.digestDate,
    });

    if (this.status === DigestStatus.COMPLETED) {
      await this.digestRepo.markAsCompletedWithContent(
        digest.id,
        this.digestContent!,
        600, // total duration
        { modelUsed: "gpt-4", processingDurationMs: 5000 }
      );
    }

    return await this.digestRepo.findByDate(this.digestDate, this.userId || undefined) || digest;
  }
}
