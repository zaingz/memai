import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Bookmark, BookmarkDetailsResponse } from "../types";
import {
  extractHostname,
  formatDate,
  formatDuration,
  formatRelativeTime,
} from "../lib/formatters";
import "./BookmarkDetails.css";

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
            <img src={preview.thumbnailUrl} alt="Bookmark preview" loading="lazy" />
          </div>
        )}

        {/* Header Section */}
        <div className="details-header">
          <span className="details-badge">{bookmark.source.toUpperCase()}</span>
          <h2 className="details-title">
            {preview?.title || bookmark.title || extractHostname(bookmark.url)}
          </h2>
          {preview?.description && (
            <p className="details-description">{preview.description}</p>
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
                {preview?.siteName || extractHostname(bookmark.url)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Added</span>
              <span className="detail-value">{formatDate(bookmark.created_at)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">{formatRelativeTime(bookmark.updated_at)}</span>
            </div>
            {preview?.publishedTime && (
              <div className="detail-item">
                <span className="detail-label">Published</span>
                <span className="detail-value">{formatDate(preview.publishedTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Article Insights Section */}
        {details?.webContent && (
          <div className="details-section">
            <h3 className="section-title">Article Insights</h3>
            <div className="details-grid">
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
                <span className="detail-value">{details.webContent.word_count ?? "—"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-badge--${details.webContent.status}`}>
                  {formatStatus(details.webContent.status)}
                </span>
              </div>
            </div>

            {details.webContent.summary && (
              <div className="markdown-content">
                <h4>AI Summary</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {details.webContent.summary}
                </ReactMarkdown>
              </div>
            )}
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
                  {details.transcription.confidence !== null &&
                  details.transcription.confidence !== undefined
                    ? `${Math.round(details.transcription.confidence * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sentiment</span>
                <span className="detail-value">{details.transcription.sentiment ?? "—"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-badge--${details.transcription.status}`}>
                  {formatStatus(details.transcription.status)}
                </span>
              </div>
            </div>

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
