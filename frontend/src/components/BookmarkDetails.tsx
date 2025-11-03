import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Bookmark, BookmarkDetailsResponse } from "../types";
import {
  extractHostname,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
} from "../lib/formatters";
import "./BookmarkDetails.css";

interface BookmarkDetailsProps {
  bookmark: Bookmark | null;
  details: BookmarkDetailsResponse | null;
  onClose: () => void;
  isOpen: boolean;
}

const SOURCE_LABELS: Record<Bookmark["source"], string> = {
  youtube: "YouTube",
  podcast: "Podcast",
  reddit: "Reddit",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  blog: "Blog",
  web: "Web",
  other: "Bookmark",
};

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  const label = value.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function BookmarkDetails({ bookmark, details, onClose, isOpen }: BookmarkDetailsProps) {
  const preview = bookmark?.metadata?.linkPreview;
  const youtubeMetadata = bookmark?.metadata?.youtubeMetadata as any;

  const bookmarkMetadata = useMemo(() => {
    if (!bookmark?.metadata) return [] as Array<[string, unknown]>;

    return Object.entries(bookmark.metadata).filter(
      ([key]) => key !== "linkPreview" && key !== "youtubeMetadata"
    );
  }, [bookmark]);

  const webContentMetadata = useMemo(() => {
    if (!details?.webContent?.metadata) return [] as Array<[string, unknown]>;

    return Object.entries(details.webContent.metadata);
  }, [details?.webContent?.metadata]);

  // Format upload date from YYYYMMDD to readable format
  const formatUploadDate = (uploadDate: string | undefined) => {
    if (!uploadDate) return "—";
    const year = uploadDate.substring(0, 4);
    const month = uploadDate.substring(4, 6);
    const day = uploadDate.substring(6, 8);
    return formatDate(`${year}-${month}-${day}`);
  };

  /**
   * Handles YouTube thumbnail loading errors by falling back to lower quality.
   */
  const handleThumbnailError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const currentSrc = img.src;

    if (currentSrc.includes('maxresdefault.jpg') && bookmark?.source === 'youtube') {
      const fallbackSrc = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
      img.src = fallbackSrc;
    } else {
      // Hide the thumbnail if it fails to load
      if (img.parentElement) {
        img.parentElement.style.display = 'none';
      }
    }
  };

  if (!isOpen || !bookmark) return null;

  return (
    <div className="bookmark-details-wrapper">
      {/* Modal close button - inside the modal content */}
      <div className="details-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Thumbnail/Hero Section */}
        {preview?.thumbnailUrl && (
          <div className="details-hero">
            <img
              src={preview.thumbnailUrl}
              alt="Bookmark preview"
              loading="lazy"
              onError={handleThumbnailError}
            />
          </div>
        )}

        {/* Header Section */}
        <div className="details-header">
          <span className="details-badge">{SOURCE_LABELS[bookmark.source] ?? "Bookmark"}</span>
          <h2 className="details-title">
            {preview?.title || details?.webContent?.page_title || bookmark.title ||
              extractHostname(bookmark.url)}
          </h2>
          {(preview?.description || details?.webContent?.page_description) && (
            <p className="details-description">
              {preview?.description || details?.webContent?.page_description}
            </p>
          )}
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="details-link"
          >
            Visit Original →
          </a>
        </div>

        {/* Overview Section */}
        <div className="details-section">
          <h3 className="section-title">Overview</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Site</span>
              <span className="detail-value">
                {preview?.siteName || details?.webContent?.metadata?.siteName ||
                  extractHostname(bookmark.url)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Source</span>
              <span className="detail-value">
                {SOURCE_LABELS[bookmark.source] ?? formatStatus(bookmark.source)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Added</span>
              <span className="detail-value">{formatDateTime(bookmark.created_at)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">
                {formatDateTime(bookmark.updated_at)}
                <span className="detail-subtext">
                  {formatRelativeTime(bookmark.updated_at)}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Captured</span>
              <span className="detail-value">{formatDateTime(bookmark.client_time)}</span>
            </div>
            {preview?.publishedTime && (
              <div className="detail-item">
                <span className="detail-label">Published</span>
                <span className="detail-value">
                  {formatDate(preview.publishedTime)}
                </span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Bookmark ID</span>
              <span className="detail-value detail-value--muted">#{bookmark.id}</span>
            </div>
          </div>

          {bookmarkMetadata.length > 0 && (
            <div className="details-metadata">
              <h4 className="details-subtitle">Bookmark Metadata</h4>
              <dl className="details-metadata-list">
                {bookmarkMetadata.map(([key, value]) => (
                  <div key={key} className="metadata-item">
                    <dt className="metadata-key">{key}</dt>
                    <dd className="metadata-value">{formatMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* YouTube Metadata Section */}
        {youtubeMetadata && bookmark.source === 'youtube' && (
          <div className="details-section">
            <h3 className="section-title">YouTube Video Details</h3>
            <div className="details-grid">
              {youtubeMetadata.duration && (
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{formatDuration(youtubeMetadata.duration)}</span>
                </div>
              )}
              {youtubeMetadata.uploader && (
                <div className="detail-item">
                  <span className="detail-label">Channel</span>
                  <span className="detail-value">{youtubeMetadata.uploader}</span>
                </div>
              )}
              {youtubeMetadata.view_count !== undefined && youtubeMetadata.view_count !== null && (
                <div className="detail-item">
                  <span className="detail-label">Views</span>
                  <span className="detail-value">{formatNumber(youtubeMetadata.view_count)}</span>
                </div>
              )}
              {youtubeMetadata.like_count !== undefined && youtubeMetadata.like_count !== null && (
                <div className="detail-item">
                  <span className="detail-label">Likes</span>
                  <span className="detail-value">{formatNumber(youtubeMetadata.like_count)}</span>
                </div>
              )}
              {youtubeMetadata.upload_date && (
                <div className="detail-item">
                  <span className="detail-label">Published</span>
                  <span className="detail-value">{formatUploadDate(youtubeMetadata.upload_date)}</span>
                </div>
              )}
              {youtubeMetadata.channel_id && (
                <div className="detail-item">
                  <span className="detail-label">Channel ID</span>
                  <span className="detail-value detail-value--muted">{youtubeMetadata.channel_id}</span>
                </div>
              )}
            </div>

            {youtubeMetadata.description && (
              <div className="details-metadata">
                <h4 className="details-subtitle">Description</h4>
                <p className="detail-description">{youtubeMetadata.description}</p>
              </div>
            )}

            {youtubeMetadata.tags && youtubeMetadata.tags.length > 0 && (
              <div className="details-metadata">
                <h4 className="details-subtitle">Tags</h4>
                <div className="tag-list">
                  {youtubeMetadata.tags.slice(0, 20).map((tag: string, index: number) => (
                    <span key={index} className="tag-badge">{tag}</span>
                  ))}
                  {youtubeMetadata.tags.length > 20 && (
                    <span className="tag-badge tag-badge--more">+{youtubeMetadata.tags.length - 20} more</span>
                  )}
                </div>
              </div>
            )}

            {youtubeMetadata.categories && youtubeMetadata.categories.length > 0 && (
              <div className="details-metadata">
                <h4 className="details-subtitle">Categories</h4>
                <div className="tag-list">
                  {youtubeMetadata.categories.map((category: string, index: number) => (
                    <span key={index} className="tag-badge tag-badge--category">{category}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Article Insights Section */}
        {details?.webContent ? (
          <div className="details-section">
            <h3 className="section-title">Article Insights</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-badge--${details.webContent.status}`}>
                  {formatStatus(details.webContent.status)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Language</span>
                <span className="detail-value">{details.webContent.language ?? "—"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reading Time</span>
                <span className="detail-value">
                  {details.webContent.estimated_reading_minutes !== null &&
                  details.webContent.estimated_reading_minutes !== undefined
                    ? `${details.webContent.estimated_reading_minutes} min`
                    : "—"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Word Count</span>
                <span className="detail-value">{formatNumber(details.webContent.word_count)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Characters</span>
                <span className="detail-value">{formatNumber(details.webContent.char_count)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Processing Started</span>
                <span className="detail-value">
                  {details.webContent.processing_started_at
                    ? formatDateTime(details.webContent.processing_started_at)
                    : "—"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Processing Completed</span>
                <span className="detail-value">
                  {details.webContent.processing_completed_at
                    ? formatDateTime(details.webContent.processing_completed_at)
                    : "—"}
                </span>
              </div>
            </div>

            {(details.webContent.page_title || details.webContent.page_description) && (
              <div className="details-metadata">
                <h4 className="details-subtitle">Page Details</h4>
                <dl className="details-metadata-list">
                  {details.webContent.page_title && (
                    <div className="metadata-item">
                      <dt className="metadata-key">Title</dt>
                      <dd className="metadata-value">{details.webContent.page_title}</dd>
                    </div>
                  )}
                  {details.webContent.page_description && (
                    <div className="metadata-item">
                      <dt className="metadata-key">Description</dt>
                      <dd className="metadata-value">
                        {details.webContent.page_description}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {webContentMetadata.length > 0 && (
              <div className="details-metadata">
                <h4 className="details-subtitle">Extracted Metadata</h4>
                <dl className="details-metadata-list">
                  {webContentMetadata.map(([key, value]) => (
                    <div key={key} className="metadata-item">
                      <dt className="metadata-key">{key}</dt>
                      <dd className="metadata-value">{formatMetadataValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {details.webContent.summary && (
              <div className="markdown-content">
                <h4>AI Summary</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {details.webContent.summary}
                </ReactMarkdown>
              </div>
            )}

            {details.webContent.error_message && (
              <div className="details-alert details-alert--error">
                <h4>Processing Error</h4>
                <p>{details.webContent.error_message}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="details-section">
            <h3 className="section-title">Article Insights</h3>
            <p className="detail-value detail-value--muted">
              Article content has not been processed for this bookmark yet.
            </p>
          </div>
        )}

        {/* Transcription Section */}
        {details?.transcription && (
          <div className="details-section">
            <h3 className="section-title">Transcription</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Duration</span>
                <span className="detail-value">
                  {formatDuration(details.transcription.duration)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Confidence</span>
                <span className="detail-value">
                  {formatPercentage(details.transcription.confidence)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sentiment</span>
                <span className="detail-value">{details.transcription.sentiment ?? "—"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sentiment Score</span>
                <span className="detail-value">
                  {formatPercentage(details.transcription.sentiment_score, {
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-badge--${details.transcription.status}`}>
                  {formatStatus(details.transcription.status)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created</span>
                <span className="detail-value">
                  {formatDateTime(details.transcription.created_at)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Updated</span>
                <span className="detail-value">
                  {formatDateTime(details.transcription.updated_at)}
                </span>
              </div>
            </div>

            {details.transcription.error_message && (
              <div className="details-alert details-alert--error">
                <h4>Transcription Error</h4>
                <p>{details.transcription.error_message}</p>
              </div>
            )}

            {details.transcription.deepgram_summary && (
              <div className="markdown-content">
                <h4>Deepgram Summary</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {details.transcription.deepgram_summary}
                </ReactMarkdown>
              </div>
            )}

            {details.transcription.summary && (
              <div className="markdown-content">
                <h4>Summary</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {details.transcription.summary}
                </ReactMarkdown>
              </div>
            )}

            {details.transcription.transcript && (
              <div className="markdown-content">
                <h4>Full Transcript</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {details.transcription.transcript}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
