import type { Bookmark, BookmarkDetailsResponse } from "../types";
import {
  extractHostname,
  formatDate,
  formatDuration,
  formatRelativeTime,
  truncate,
} from "../lib/formatters";

interface BookmarkDetailsProps {
  bookmark: Bookmark | null;
  details: BookmarkDetailsResponse | null;
  onClose: () => void;
  isOpen: boolean;
}

export function BookmarkDetails({ bookmark, details, onClose, isOpen }: BookmarkDetailsProps) {
  const preview = bookmark?.metadata?.linkPreview;
  const formatStatus = (value: string) => {
    const label = value.replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <aside className={`details-panel glass-panel ${isOpen ? "open" : ""}`} aria-live="polite">
      <button className="close-button" onClick={onClose} aria-label="Close details">
        ✕
      </button>
      {bookmark && details ? (
        <div className="details-panel__body">
          <div className="details-panel__header">
            <span className="status-pill">{bookmark.source.toUpperCase()}</span>
            {preview?.thumbnailUrl && (
              <div className="details-hero">
                <img src={preview.thumbnailUrl} alt="Bookmark cover" loading="lazy" />
              </div>
            )}
            <h2>{preview?.title || bookmark.title || extractHostname(bookmark.url)}</h2>
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              Visit original ↗
            </a>
            {preview?.description && <p className="muted">{preview.description}</p>}
          </div>

          <div className="details-panel__section">
            <span className="section-title">Overview</span>
            <div className="section-grid">
              <div className="detail-row">
                <strong>Site</strong>
                <span>{preview?.siteName || extractHostname(bookmark.url)}</span>
              </div>
              <div className="detail-row">
                <strong>Added</strong>
                <span>{formatDate(bookmark.created_at)}</span>
              </div>
              <div className="detail-row">
                <strong>Last updated</strong>
                <span>{formatRelativeTime(bookmark.updated_at)}</span>
              </div>
              {preview?.publishedTime && (
                <div className="detail-row">
                  <strong>Published</strong>
                  <span>{formatDate(preview.publishedTime)}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Original URL</strong>
                <span className="muted">{bookmark.url}</span>
              </div>
            </div>
          </div>

          {details.webContent && (
            <div className="details-panel__section">
              <span className="section-title">Article Insights</span>
              <div className="section-grid">
                <div className="detail-row">
                  <strong>Reading time</strong>
                  <span>
                    {details.webContent.estimated_reading_minutes !== null &&
                    details.webContent.estimated_reading_minutes !== undefined
                      ? `${details.webContent.estimated_reading_minutes} min`
                      : "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Word count</strong>
                  <span>{details.webContent.word_count ?? "—"}</span>
                </div>
                <div className="detail-row">
                  <strong>Status</strong>
                  <span className={`status-pill status-pill--${details.webContent.status}`}>
                    {formatStatus(details.webContent.status)}
                  </span>
                </div>
              </div>
              {details.webContent.summary && (
                <div className="transcription-block">
                  <strong>AI Summary</strong>
                  <pre>{truncate(details.webContent.summary, 500)}</pre>
                </div>
              )}
            </div>
          )}

          {details.transcription && (
            <div className="details-panel__section">
              <span className="section-title">Transcription</span>
              <div className="section-grid">
                <div className="detail-row">
                  <strong>Duration</strong>
                  <span>{formatDuration(details.transcription.duration)}</span>
                </div>
                <div className="detail-row">
                  <strong>Confidence</strong>
                  <span>
                    {details.transcription.confidence !== null &&
                    details.transcription.confidence !== undefined
                      ? `${Math.round(details.transcription.confidence * 100)}%`
                      : "—"}
                  </span>
                </div>
              <div className="detail-row">
                <strong>Sentiment</strong>
                <span>{details.transcription.sentiment ?? "—"}</span>
              </div>
              <div className="detail-row">
                <strong>Status</strong>
                <span className={`status-pill status-pill--${details.transcription.status}`}>
                  {formatStatus(details.transcription.status)}
                </span>
              </div>
            </div>
              {details.transcription.summary && (
                <div className="transcription-block">
                  <strong>Summary</strong>
                  <pre>{details.transcription.summary}</pre>
                </div>
              )}
              {details.transcription.transcript && (
                <div className="transcription-block">
                  <strong>Transcript</strong>
                  <pre>{truncate(details.transcription.transcript, 1200)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="details-panel__empty">
          <p>Select a bookmark to see the rich preview, summaries, and transcripts.</p>
        </div>
      )}
    </aside>
  );
}
