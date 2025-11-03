import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  badge?: number | string;
  children?: SidebarItem[];
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onItemClick: () => void;
  isMobile?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'home',
    label: 'Dashboard',
    icon: '🏠',
    href: '/',
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: '🔖',
    href: '/bookmarks',
    badge: 'New',
  },
  {
    id: 'digest',
    label: 'Daily Digest',
    icon: '📰',
    href: '/digest',
  },
  {
    id: 'search',
    label: 'Search',
    icon: '🔍',
    href: '/search',
  },
];

const collections: SidebarItem[] = [
  {
    id: 'work',
    label: 'Work',
    icon: '📁',
    badge: 12,
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: '📁',
    badge: 8,
  },
  {
    id: 'personal',
    label: 'Personal',
    icon: '📁',
    badge: 3,
  },
];

const sources: SidebarItem[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '🎬',
    badge: 15,
  },
  {
    id: 'web',
    label: 'Web',
    icon: '🌐',
    badge: 10,
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: '𝕏',
    badge: 5,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggle,
  onItemClick,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item: SidebarItem) => {
    if (item.href) {
      navigate(item.href);
    }
    onItemClick();
  };

  const isItemActive = (item: SidebarItem) => {
    return item.href === location.pathname;
  };

  const renderNavItem = (item: SidebarItem) => (
    <li key={item.id} className="sidebar__nav-item">
      <button
        className={`sidebar__nav-link ${
          isItemActive(item) ? 'sidebar__nav-link--active' : ''
        }`}
        onClick={() => handleItemClick(item)}
        title={isCollapsed ? item.label : undefined}
      >
        <span className="sidebar__nav-icon">{item.icon}</span>
        {!isCollapsed && (
          <>
            <span className="sidebar__nav-label">{item.label}</span>
            {item.badge && (
              <span className="sidebar__nav-badge">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    </li>
  );

  if (!isOpen && !isMobile) {
    return null;
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${
        isMobile ? 'sidebar--mobile' : ''
      }`}
    >
      {/* Logo/Brand */}
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <span className="sidebar__brand-icon">🧠</span>
          {!isCollapsed && <span className="sidebar__brand-text">MemAI</span>}
        </div>
        {!isMobile && (
          <button
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        )}
      </div>

      {/* New Bookmark Button */}
      <div className="sidebar__action">
        <button className="btn btn-primary btn-block">
          <span>➕</span>
          {!isCollapsed && <span>New Bookmark</span>}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {sidebarItems.map(renderNavItem)}
        </ul>
      </nav>

      {/* Collections Section */}
      {!isCollapsed && (
        <div className="sidebar__section">
          <h3 className="sidebar__section-title">COLLECTIONS</h3>
          <ul className="sidebar__nav-list">
            {collections.map(renderNavItem)}
          </ul>
        </div>
      )}

      {/* Sources Section */}
      {!isCollapsed && (
        <div className="sidebar__section">
          <h3 className="sidebar__section-title">SOURCES</h3>
          <ul className="sidebar__nav-list">
            {sources.map(renderNavItem)}
          </ul>
        </div>
      )}

      {/* Footer/User Section */}
      <div className="sidebar__footer">
        <button className="sidebar__user-menu">
          <span className="sidebar__user-avatar">👤</span>
          {!isCollapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">User Name</span>
              <span className="sidebar__user-email">user@example.com</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};