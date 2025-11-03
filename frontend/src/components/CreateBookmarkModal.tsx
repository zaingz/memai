import { useState } from "react";
import { createBookmark } from "../lib/api";
import "./CreateBookmarkModal.css";

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SOURCE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "reddit", label: "Reddit" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "blog", label: "Blog/Article" },
  { value: "other", label: "Other" },
];

export function CreateBookmarkModal({ isOpen, onClose, onSuccess }: CreateBookmarkModalProps) {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("web");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBookmark({
        url: url.trim(),
        source: source as any,
        client_time: new Date().toISOString(),
      });

      // Success!
      setUrl("");
      setSource("web");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create bookmark");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrl("");
    setSource("web");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />
      <div className="create-bookmark-modal">
        <button
          className="modal-close"
          onClick={handleClose}
          aria-label="Close"
          type="button"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="create-bookmark-modal__content">
          <h2>Create Bookmark</h2>
          <p className="modal-description">Save a new bookmark to your collection</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="bookmark-url">URL</label>
              <input
                id="bookmark-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bookmark-source">Source Type</label>
              <select
                id="bookmark-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={isSubmitting}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="button-spinner"></span>
                    Creating...
                  </>
                ) : (
                  "Create Bookmark"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
