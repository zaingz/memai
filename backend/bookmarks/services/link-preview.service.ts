import log from "encore.dev/log";
import ogs from "open-graph-scraper";
import { extractYouTubeVideoId } from "../utils/youtube-url.util";

export interface LinkPreviewMetadata {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  mediaType?: string | null;
  favicon?: string | null;
  thumbnailUrl?: string | null;
  accentColor?: string | null;
  publishedTime?: string | null;
  fetchedAt: string;
}

interface FetchOptions {
  existingMetadata?: Record<string, any> | null;
  fallbackTitle?: string | null;
}

/**
 * Service for enriching bookmarks with link preview metadata.
 * Uses Open Graph scraping with sensible fallbacks for common sources.
 */
export class LinkPreviewService {
  /**
   * Fetches metadata for a given URL.
   */
  async fetchMetadata(url: string, options: FetchOptions = {}): Promise<LinkPreviewMetadata | null> {
    const { existingMetadata, fallbackTitle } = options;

    try {
      const { result, error: ogError } = await ogs({
        url,
        timeout: 10000,
        fetchOptions: {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          },
        },
      });

      if (ogError) {
        log.warn("OpenGraph scraping returned an error", {
          url,
          error: result?.error || ogError,
        });
      }

      const normalized = this.normalizeMetadata(url, result, existingMetadata, fallbackTitle);

      if (!normalized.thumbnailUrl) {
        const youtubeFallback = this.getYouTubeThumbnail(url);
        if (youtubeFallback) {
          normalized.thumbnailUrl = youtubeFallback;
        }
      }

      if (!normalized.favicon) {
        normalized.favicon = this.buildFaviconUrl(url);
      }

      return normalized;
    } catch (error) {
      log.warn("Failed to fetch link preview metadata", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      const fallback = this.buildFallbackMetadata(url, existingMetadata, fallbackTitle);
      return fallback.thumbnailUrl || fallback.title ? fallback : null;
    }
  }

  private normalizeMetadata(
    url: string,
    result: Record<string, any> | undefined,
    existingMetadata?: Record<string, any> | null,
    fallbackTitle?: string | null
  ): LinkPreviewMetadata {
    const image = this.extractImage(result?.ogImage);
    const title =
      result?.ogTitle ||
      result?.twitterTitle ||
      existingMetadata?.title ||
      fallbackTitle ||
      null;
    const description =
      result?.ogDescription ||
      result?.twitterDescription ||
      existingMetadata?.description ||
      null;

    const metadata: LinkPreviewMetadata = {
      url,
      title,
      description,
      siteName: result?.ogSiteName || existingMetadata?.siteName || this.extractHostname(url),
      mediaType: result?.ogType || existingMetadata?.mediaType || null,
      favicon: result?.favicon || existingMetadata?.favicon || null,
      thumbnailUrl: image || existingMetadata?.thumbnailUrl || null,
      accentColor: result?.themeColor || existingMetadata?.accentColor || this.deriveAccentColor(url),
      publishedTime: result?.articlePublishedTime || existingMetadata?.publishedTime || null,
      fetchedAt: new Date().toISOString(),
    };

    return metadata;
  }

  private extractImage(imageField: any): string | null {
    if (!imageField) {
      return null;
    }

    if (typeof imageField === "string") {
      return imageField;
    }

    if (Array.isArray(imageField) && imageField.length > 0) {
      const firstImage = imageField[0];
      if (typeof firstImage === "string") {
        return firstImage;
      }
      if (firstImage && typeof firstImage === "object" && firstImage.url) {
        return firstImage.url as string;
      }
    }

    if (typeof imageField === "object" && imageField.url) {
      return imageField.url as string;
    }

    return null;
  }

  /**
   * Gets the highest quality YouTube thumbnail available.
   * YouTube provides different quality levels:
   * - maxresdefault.jpg (1920x1080) - Best quality, but not always available
   * - sddefault.jpg (640x480) - Standard definition
   * - hqdefault.jpg (480x360) - High quality, always available
   *
   * We use maxresdefault as it provides the best visual experience for thumbnails.
   */
  private getYouTubeThumbnail(url: string): string | null {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return null;
    }

    // Use maxresdefault for best quality
    // Note: maxresdefault may not exist for all videos, but modern videos typically have it
    // If it doesn't exist, browsers will fail to load and we can fallback in the UI
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  private buildFaviconUrl(url: string): string {
    try {
      const hostname = new URL(url).origin;
      return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(hostname)}`;
    } catch {
      return "https://www.google.com/s2/favicons?sz=128&domain_url=https://www.google.com";
    }
  }

  private buildFallbackMetadata(
    url: string,
    existingMetadata?: Record<string, any> | null,
    fallbackTitle?: string | null
  ): LinkPreviewMetadata {
    return {
      url,
      title: existingMetadata?.title || fallbackTitle || this.extractHostname(url),
      description: existingMetadata?.description || null,
      siteName: existingMetadata?.siteName || this.extractHostname(url),
      mediaType: existingMetadata?.mediaType || null,
      favicon: existingMetadata?.favicon || this.buildFaviconUrl(url),
      thumbnailUrl: existingMetadata?.thumbnailUrl || this.getYouTubeThumbnail(url),
      accentColor: existingMetadata?.accentColor || this.deriveAccentColor(url),
      publishedTime: existingMetadata?.publishedTime || null,
      fetchedAt: new Date().toISOString(),
    };
  }

  private extractHostname(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }

  private deriveAccentColor(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      let hash = 0;
      for (let i = 0; i < hostname.length; i++) {
        hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
      }
      const color = ((hash & 0x00ffffff) >>> 0).toString(16).toUpperCase();
      return `#${"000000".substring(0, 6 - color.length) + color}`;
    } catch {
      return "#1F2937";
    }
  }
}
