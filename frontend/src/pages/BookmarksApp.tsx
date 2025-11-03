import { useEffect, useMemo, useState } from "react";
import type { Bookmark, BookmarkDetailsResponse } from "../types";
import { listBookmarks, getBookmarkDetails } from "../lib/api";
import { BookmarkCard } from "../components/BookmarkCard";
import { BookmarkDetails } from "../components/BookmarkDetails";
import { DailyDigestView } from "../components/DailyDigestView";
import { extractHostname, formatRelativeTime } from "../lib/formatters";
import { useAuth } from "../contexts/AuthContext";

function computeMetrics(bookmarks: Bookmark[]) {
  const thumbnails = bookmarks.filter(b => b.metadata?.linkPreview?.thumbnailUrl).length;
  const domains = new Set(bookmarks.map(b => extractHostname(b.url)));
  return {
    thumbnails,
    domains: domains.size,
  };
}

export function BookmarksApp() {
  const { signOut, user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<BookmarkDetailsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDigestModal, setShowDigestModal] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    listBookmarks()
      .then(response => {
        setBookmarks(response.bookmarks);
        setSelectedId(response.bookmarks[0]?.id ?? null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load bookmarks");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }

    // Only fetch if we don't have details for this bookmark ID already
    if (details?.bookmark.id === selectedId) {
      return;
    }

    setIsDetailsLoading(true);
    getBookmarkDetails(selectedId)
      .then(response => setDetails(response))
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load bookmark details");
      })
      .finally(() => setIsDetailsLoading(false));
  }, [selectedId, details]);

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery) return bookmarks;
    const normalized = searchQuery.toLowerCase();
    return bookmarks.filter(bookmark => {
      const preview = bookmark.metadata?.linkPreview;
      return (
        bookmark.url.toLowerCase().includes(normalized) ||
        (bookmark.title && bookmark.title.toLowerCase().includes(normalized)) ||
        (preview?.title && preview.title.toLowerCase().includes(normalized)) ||
        (preview?.description && preview.description.toLowerCase().includes(normalized))
      );
    });
  }, [bookmarks, searchQuery]);

  useEffect(() => {
    if (!filteredBookmarks.length) {
      setSelectedId(null);
      return;
    }

    if (selectedId === null) {
      return;
    }

    if (!filteredBookmarks.some(bookmark => bookmark.id === selectedId)) {
      setSelectedId(filteredBookmarks[0].id);
    }
  }, [filteredBookmarks, selectedId]);

  const selectedBookmark = useMemo(
    () => bookmarks.find(bookmark => bookmark.id === selectedId) ?? null,
    [bookmarks, selectedId]
  );

  const metrics = useMemo(() => computeMetrics(bookmarks), [bookmarks]);

  const lastUpdatedLabel = useMemo(() => {
    if (!bookmarks.length) return "";
    const latest = bookmarks.reduce((latestBookmark, current) =>
      new Date(current.updated_at) > new Date(latestBookmark.updated_at)
        ? current
        : latestBookmark
    );
    return formatRelativeTime(latest.updated_at);
  }, [bookmarks]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const isDetailsOpen = Boolean(selectedBookmark);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="bookmarks-container">
      {/* Quick Stats Bar */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="metrics-bar">
          <div className="metric-card">
            <span>with thumbnails</span>
            <strong>{metrics.thumbnails}</strong>
          </div>
          <div className="metric-card metric-card--secondary">
            <span>unique domains</span>
            <strong>{metrics.domains}</strong>
          </div>
          <div className="metric-card">
            <span>last updated</span>
            <strong>{lastUpdatedLabel || "—"}</strong>
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="header__search" style={{ flex: 1, minWidth: '300px' }}>
            <span className="header__search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              placeholder="Search titles, descriptions, or URLs"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: 'var(--glass-medium)',
                border: '1px solid var(--border-color-subtle)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-body-base-size)',
              }}
            />
          </div>
          <button
            onClick={() => setShowDigestModal(true)}
            className="btn btn-secondary"
          >
            📊 Daily Digest
          </button>
        </div>
      </div>

      {error && (
        <div className="empty-state">
          <h3>We hit a snag</h3>
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="empty-state">
          <div className="loading">
            <span />
            <span />
            <span />
            Loading your bookmarks…
          </div>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="empty-state">
          <h3>No bookmarks found</h3>
          <p>Try a different search or add a new bookmark from the extension.</p>
        </div>
      ) : (
        <div className="main-layout">
          <section className="card-grid" aria-label="Bookmark results">
            {filteredBookmarks.map(bookmark => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                isActive={bookmark.id === selectedId}
                onSelect={(bookmark) => setSelectedId(bookmark.id)}
              />
            ))}
          </section>
          <BookmarkDetails
            bookmark={selectedBookmark}
            details={details}
            onClose={() => setSelectedId(null)}
            isOpen={isDetailsOpen}
          />
        </div>
      )}

      {isDetailsOpen && isMobile && (
        <div className="mobile-overlay" aria-hidden={!isMobile}>
          {isDetailsLoading && (
            <div className="loading" style={{ justifyContent: "center", marginTop: "2rem" }}>
              <span />
              <span />
              <span />
              Fetching details…
            </div>
          )}
        </div>
      )}

      <DailyDigestView
        isOpen={showDigestModal}
        onClose={() => setShowDigestModal(false)}
      />
    </div>
  );
}
