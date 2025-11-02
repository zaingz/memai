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
  const title = preview?.title || bookmark.title || extractHostname(bookmark.url);
  const description = truncate(preview?.description, 120);
  const badgeLabel = SOURCE_LABELS[bookmark.source] ?? "Bookmark";

  const thumbnail = preview?.thumbnailUrl;
  const favicon = preview?.favicon;

  return (
    <article
      className={clsx("bookmark-card glass-panel", { "bookmark-card--active": isActive })}
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
      <div className="bookmark-card__thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title ?? "Bookmark preview"} loading="lazy" />
        ) : (
          <div
            className="bookmark-card__thumbnail-fallback"
            style={{ background: preview?.accentColor || "rgba(15, 23, 42, 0.7)" }}
          >
            <div className="bookmark-card__thumbnail-favicon">
              {favicon ? (
                <img src={favicon} alt="Site icon" style={{ width: "24px", height: "24px" }} loading="lazy" />
              ) : (
                <span role="img" aria-label="link">
                  🔖
                </span>
              )}
            </div>
            <span>{extractHostname(bookmark.url)}</span>
          </div>
        )}
      </div>
      <div className="bookmark-card__body">
        <div className="bookmark-card__meta">
          <span className="badge">{badgeLabel}</span>
          <span className="muted">{extractHostname(bookmark.url)}</span>
        </div>
        <h3 className="bookmark-card__title">{title}</h3>
        {description && <p className="muted">{description}</p>}
      </div>
    </article>
  );
}
