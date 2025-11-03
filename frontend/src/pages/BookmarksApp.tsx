import { useEffect, useMemo, useState } from "react";
import type { Bookmark, BookmarkDetailsResponse } from "../types";
import { listBookmarks, getBookmarkDetails } from "../lib/api";
import { BookmarkCard } from "../components/BookmarkCard";
import { BookmarkDetails } from "../components/BookmarkDetails";
import { DailyDigestView } from "../components/DailyDigestView";
import { CreateBookmarkModal } from "../components/CreateBookmarkModal";
import { useAuth } from "../contexts/AuthContext";
import "./BookmarksApp.css";

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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    listBookmarks()
      .then(response => {
        setBookmarks(response.bookmarks);
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

  const selectedBookmark = useMemo(
    () => bookmarks.find(bookmark => bookmark.id === selectedId) ?? null,
    [bookmarks, selectedId]
  );

  const handleRefreshBookmarks = () => {
    listBookmarks()
      .then(response => {
        setBookmarks(response.bookmarks);
      })
      .catch(err => {
        console.error(err);
      });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">Bookmarks</h1>
            <span className="bookmark-count">{filteredBookmarks.length} items</span>
          </div>

          <div className="header-center">
            <div className="search-container desktop-only">
              <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="search"
                className="search-input"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="header-right">
            <button
              className="icon-button mobile-only"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              aria-label="Search"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              className="create-button"
              onClick={() => setShowCreateModal(true)}
              aria-label="Create Bookmark"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="desktop-only">Create</span>
            </button>

            <button
              className="icon-button"
              onClick={() => setShowDigestModal(true)}
              aria-label="Daily Digest"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              className="icon-button"
              onClick={signOut}
              aria-label="Sign Out"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="mobile-search-bar">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="search"
                className="search-input"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="app-main">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h2>No bookmarks found</h2>
            <p>
              {searchQuery
                ? "Try adjusting your search terms"
                : "Save your first bookmark to get started"}
            </p>
          </div>
        ) : (
          <div className="bookmarks-grid">
            {filteredBookmarks.map(bookmark => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                isActive={bookmark.id === selectedId}
                onSelect={(bookmark) => setSelectedId(bookmark.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedBookmark && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setSelectedId(null)}
          />
          <div className="details-modal">
            {isDetailsLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading details...</p>
              </div>
            ) : (
              <BookmarkDetails
                bookmark={selectedBookmark}
                details={details}
                onClose={() => setSelectedId(null)}
                isOpen={true}
              />
            )}
          </div>
        </>
      )}

      {/* Create Bookmark Modal */}
      <CreateBookmarkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefreshBookmarks}
      />

      {/* Daily Digest Modal */}
      <DailyDigestView
        isOpen={showDigestModal}
        onClose={() => setShowDigestModal(false)}
      />
    </div>
  );
}