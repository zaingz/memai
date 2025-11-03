import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, isMobile }) => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  // Mock notifications for demo
  const notifications = [
    { id: 1, text: 'Daily digest is ready', time: '5m ago', unread: true },
    { id: 2, text: 'New bookmark added successfully', time: '1h ago', unread: true },
    { id: 3, text: 'Processing completed', time: '2h ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="header glass-panel">
      {/* Left Section */}
      <div className="header__left">
        <button
          className="header__menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {!isMobile && (
          <nav className="header__breadcrumb">
            <span>Dashboard</span>
          </nav>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="header__center">
        <form className="header__search" onSubmit={handleSearch}>
          <input
            type="search"
            className="header__search-input"
            placeholder="Search bookmarks... (Cmd+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="header__search-btn">
            🔍
          </button>
        </form>
      </div>

      {/* Right Section */}
      <div className="header__right">
        {/* Notifications */}
        <div className="header__notifications" ref={notificationsRef}>
          <button
            className="header__icon-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="header__badge">{unreadCount}</span>
            )}
          </button>

          {notificationsOpen && (
            <div className="header__dropdown header__dropdown--notifications">
              <div className="header__dropdown-header">
                <h3>Notifications</h3>
                <button className="header__dropdown-action">Mark all read</button>
              </div>
              <div className="header__dropdown-content">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`header__notification-item ${
                      notification.unread ? 'header__notification-item--unread' : ''
                    }`}
                  >
                    <div className="header__notification-text">
                      {notification.text}
                    </div>
                    <div className="header__notification-time">
                      {notification.time}
                    </div>
                  </div>
                ))}
              </div>
              <div className="header__dropdown-footer">
                <button className="header__dropdown-action">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="header__user" ref={userMenuRef}>
          <button
            className="header__user-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
          >
            <span className="header__user-avatar">
              {user?.email?.[0]?.toUpperCase() || '👤'}
            </span>
            {!isMobile && (
              <span className="header__user-name">
                {user?.email?.split('@')[0] || 'Guest'}
              </span>
            )}
          </button>

          {userMenuOpen && (
            <div className="header__dropdown header__dropdown--user">
              <div className="header__dropdown-header">
                <div className="header__user-info">
                  <div className="header__user-info-name">
                    {user?.email?.split('@')[0] || 'Guest User'}
                  </div>
                  <div className="header__user-info-email">
                    {user?.email || 'Not signed in'}
                  </div>
                </div>
              </div>
              <div className="header__dropdown-content">
                <button className="header__dropdown-item">
                  <span>👤</span> Profile
                </button>
                <button className="header__dropdown-item">
                  <span>⚙️</span> Settings
                </button>
                <button className="header__dropdown-item">
                  <span>📊</span> Usage Stats
                </button>
                <button className="header__dropdown-item">
                  <span>🌙</span> Dark Mode
                </button>
              </div>
              <div className="header__dropdown-footer">
                <button
                  className="header__dropdown-item header__dropdown-item--danger"
                  onClick={handleSignOut}
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};