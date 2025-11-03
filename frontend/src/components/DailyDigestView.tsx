import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DailyDigest, Bookmark } from '../types';
import { generateDailyDigest, getDailyDigest, listDailyDigests, listBookmarks } from '../lib/api';
import { formatDate, extractHostname } from '../lib/formatters';
import './DailyDigestView.css';

interface DailyDigestViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyDigestView({ isOpen, onClose }: DailyDigestViewProps) {
  const [digests, setDigests] = useState<DailyDigest[]>([]);
  const [selectedDigest, setSelectedDigest] = useState<DailyDigest | null>(null);
  const [digestBookmarks, setDigestBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDigests();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDigest) {
      loadDigestBookmarks();
    }
  }, [selectedDigest]);

  const loadDigests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listDailyDigests(10, 0);
      setDigests(response.digests);
      if (response.digests.length > 0) {
        setSelectedDigest(response.digests[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load digests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDigestBookmarks = async () => {
    if (!selectedDigest) return;

    try {
      const response = await listBookmarks();

      // Filter bookmarks by the digest date range
      const digestDate = new Date(selectedDigest.digest_date);
      digestDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(digestDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const filtered = response.bookmarks.filter(bookmark => {
        const bookmarkDate = new Date(bookmark.created_at);
        return bookmarkDate >= digestDate && bookmarkDate < nextDay;
      });

      setDigestBookmarks(filtered);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateDailyDigest();
      setSelectedDigest(response.digest);
      await loadDigests();
    } catch (err: any) {
      setError(err.message || 'Failed to generate digest');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDigest = async () => {
    if (!selectedDigest) return;

    setIsRegenerating(true);
    setError(null);
    try {
      const digestDate = new Date(selectedDigest.digest_date);
      const dateString = digestDate.toISOString().split('T')[0];

      const response = await generateDailyDigest(dateString, true); // Force regenerate
      setSelectedDigest(response.digest);
      await loadDigests();
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate digest');
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatDigestDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="daily-digest-modal">
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

        <div className="daily-digest-header">
          <h2>Daily Digests</h2>
          <button
            onClick={handleGenerateDigest}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? (
              <>
                <span className="button-spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Generate Today
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading digests...</p>
          </div>
        ) : digests.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No digests yet</h3>
            <p>Generate your first daily digest to get started</p>
          </div>
        ) : (
          <div className="daily-digest-layout">
            {/* Digest List Sidebar */}
            <div className="digest-list">
              <h3>Recent Digests</h3>
              <div className="digest-list-items">
                {digests.map((digest) => (
                  <button
                    key={digest.id}
                    onClick={() => setSelectedDigest(digest)}
                    className={`digest-list-item ${selectedDigest?.id === digest.id ? 'active' : ''}`}
                  >
                    <div className="digest-list-item-date">
                      {formatDigestDate(digest.digest_date)}
                    </div>
                    <div className="digest-list-item-meta">
                      <span className="digest-list-item-count">
                        {digest.bookmark_count} bookmarks
                      </span>
                      <span className={`digest-status-badge digest-status-badge--${digest.status}`}>
                        {digest.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Digest Content */}
            <div className="digest-content">
              {selectedDigest ? (
                <>
                  {/* Digest Header */}
                  <div className="digest-content-header">
                    <div>
                      <h2>{formatDigestDate(selectedDigest.digest_date)}</h2>
                      <div className="digest-content-meta">
                        <span className={`digest-status-badge digest-status-badge--${selectedDigest.status}`}>
                          {selectedDigest.status}
                        </span>
                        <span className="digest-bookmark-count">
                          {selectedDigest.bookmark_count} bookmarks
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleRegenerateDigest}
                      disabled={isRegenerating}
                      className="btn btn-secondary digest-regenerate-btn"
                      title="Regenerate this digest"
                    >
                      {isRegenerating ? (
                        <>
                          <span className="button-spinner"></span>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bookmarks Carousel */}
                  {digestBookmarks.length > 0 && (
                    <div className="bookmarks-carousel">
                      <h3>Bookmarks in this digest</h3>
                      <div className="bookmarks-carousel-scroll">
                        {digestBookmarks.map((bookmark) => {
                          const preview = bookmark.metadata?.linkPreview;
                          return (
                            <div key={bookmark.id} className="bookmark-carousel-card">
                              {preview?.thumbnailUrl ? (
                                <div className="bookmark-carousel-card-thumbnail">
                                  <img src={preview.thumbnailUrl} alt={preview.title || 'Bookmark'} />
                                </div>
                              ) : (
                                <div className="bookmark-carousel-card-thumbnail-fallback">
                                  <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                  </svg>
                                </div>
                              )}
                              <div className="bookmark-carousel-card-content">
                                <div className="bookmark-carousel-card-title">
                                  {preview?.title || bookmark.title || extractHostname(bookmark.url)}
                                </div>
                                <div className="bookmark-carousel-card-source">
                                  {bookmark.source}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sources Breakdown */}
                  {selectedDigest.sources_breakdown && (
                    <div className="sources-breakdown">
                      <h3>Sources</h3>
                      <div className="sources-tags">
                        {Object.entries(selectedDigest.sources_breakdown).map(([source, count]) =>
                          count ? (
                            <span key={source} className="source-tag">
                              {source}: {count}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  {/* Digest Summary */}
                  {selectedDigest.status === 'completed' && selectedDigest.digest_content ? (
                    <div className="digest-summary">
                      <h3>Summary</h3>
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedDigest.digest_content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : selectedDigest.status === 'failed' ? (
                    <div className="digest-error">
                      <strong>Generation failed:</strong> {selectedDigest.error_message || 'Unknown error'}
                    </div>
                  ) : (
                    <div className="digest-processing">
                      Digest is {selectedDigest.status}...
                    </div>
                  )}
                </>
              ) : (
                <div className="digest-empty">
                  Select a digest to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
