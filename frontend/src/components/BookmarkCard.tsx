import { clsx } from "clsx";
import type { Bookmark } from "../types";
import { extractHostname, truncate } from "../lib/formatters";

const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  podcast: "Podcast",
  reddit: "Reddit",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  blog: "Article",
  web: "Web",
  other: "Bookmark",
};

interface BookmarkCardProps {
  bookmark: Bookmark;
  isActive: boolean;
  onSelect: (bookmark: Bookmark) => void;
}

export function BookmarkCard({ bookmark, isActive, onSelect }: BookmarkCardProps) {
  const preview = bookmark.metadata?.linkPreview;
  const hostname = extractHostname(bookmark.url);

  // Use preview title, or bookmark title, or show a truncated URL if title is just the hostname
  let title = preview?.title || bookmark.title || hostname;
  if (title === hostname || title === bookmark.url) {
    // If title is just hostname or full URL, show truncated URL instead
    title = truncate(bookmark.url, 60) || hostname;
  }

  const description = truncate(preview?.description, 100);
  const badgeLabel = SOURCE_LABELS[bookmark.source] ?? "Bookmark";

  const thumbnail = preview?.thumbnailUrl;
  const favicon = preview?.favicon;

  return (
    <article
      className={clsx("bookmark-card card card-interactive", { "bookmark-card--active": isActive })}
      onClick={() => onSelect(bookmark)}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(bookmark);
        }
      }}
    >
      <div className="bookmark-card-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title ?? "Bookmark preview"} loading="lazy" />
        ) : (
          <div
            className="bookmark-card-thumbnail-fallback"
            style={{
              background: preview?.accentColor || "rgba(15, 23, 42, 0.7)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "0.5rem",
              color: "rgba(148, 163, 184, 0.8)"
            }}
          >
            {favicon ? (
              <img src={favicon} alt="Site icon" style={{ width: "32px", height: "32px" }} loading="lazy" />
            ) : (
              <span role="img" aria-label="link" style={{ fontSize: "2rem" }}>
                🔖
              </span>
            )}
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{extractHostname(bookmark.url)}</span>
          </div>
        )}
        <span className="bookmark-card-badge">{badgeLabel}</span>
      </div>
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span className="muted" style={{ fontSize: "0.75rem" }}>{hostname}</span>
        </div>
        <h3 className="card-title" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{title}</h3>
        {description && description.length > 10 && <p className="muted" style={{ fontSize: "0.875rem", lineHeight: "1.4" }}>{description}</p>}
      </div>
    </article>
  );
}
