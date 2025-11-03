import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import './AppShell.css';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleSidebarItemClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          onItemClick={handleSidebarItemClick}
        />
      )}

      {/* Main Content Area */}
      <div
        className={`app-shell__main ${
          !isMobile && sidebarOpen && !sidebarCollapsed ? 'app-shell__main--sidebar-open' : ''
        } ${
          !isMobile && sidebarOpen && sidebarCollapsed ? 'app-shell__main--sidebar-collapsed' : ''
        }`}
      >
        {/* Header */}
        <Header
          onMenuClick={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Page Content */}
        <main className="app-shell__content">
          <div className="app-shell__content-inner">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <>
          <MobileNav />
          <div
            className={`app-shell__mobile-drawer ${
              mobileMenuOpen ? 'app-shell__mobile-drawer--open' : ''
            }`}
          >
            <div className="app-shell__mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
            <div className="app-shell__mobile-drawer-content">
              <Sidebar
                isOpen={true}
                isCollapsed={false}
                onToggle={() => setMobileMenuOpen(false)}
                onItemClick={handleSidebarItemClick}
                isMobile={true}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};