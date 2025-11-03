import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MobileNav.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  isSpecial?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    href: '/',
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: '🔖',
    href: '/bookmarks',
  },
  {
    id: 'add',
    label: 'Add',
    icon: '➕',
    href: '/add',
    isSpecial: true,
  },
  {
    id: 'digest',
    label: 'Digest',
    icon: '📰',
    href: '/digest',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    href: '/profile',
  },
];

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'add') {
      // TODO: Open add bookmark modal instead of navigation
      console.log('Open add bookmark modal');
    } else {
      navigate(item.href);
    }
  };

  const isActive = (item: NavItem) => {
    return location.pathname === item.href;
  };

  return (
    <nav className="mobile-nav glass-panel">
      <div className="mobile-nav__list">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`mobile-nav__item ${
              isActive(item) ? 'mobile-nav__item--active' : ''
            } ${item.isSpecial ? 'mobile-nav__item--special' : ''}`}
            onClick={() => handleNavClick(item)}
            aria-label={item.label}
          >
            <span className="mobile-nav__icon">{item.icon}</span>
            <span className="mobile-nav__label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};