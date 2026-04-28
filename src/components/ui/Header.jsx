// Header.jsx — Vigil AI dark-teal navbar (#0B2E33)
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import UserProfileDropdown from './UserProfileDropdown';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const Header = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const getDashboardPath = () =>
    user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';

  const isAdmin = user?.role === 'admin';

  const allNavItems = [
    { label: 'Dashboard',          path: getDashboardPath(),         icon: 'LayoutDashboard', roles: ['admin','user'] },
    { label: 'Monitoring',         path: '/monitoring',              icon: 'Activity',        roles: ['admin','user'] },
    { label: 'Data Sources',       path: '/data-source-management',  icon: 'Database',        roles: ['admin'] },
    { label: 'Risk Analysis',      path: '/risk-assessment-details', icon: 'Shield',          roles: ['admin'] },
    { label: 'Remediation Centre', path: '/remediation-centre',      icon: 'AlertTriangle',   roles: ['admin','user'] },
    { label: 'Reports',            path: '/compliance-reports',      icon: 'FileText',        roles: ['admin','user'] },
  ];

  const navigationItems = allNavItems.filter(item =>
    item.roles.includes(user?.role || 'user')
  );

  const handleNavigation = path => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isActivePath = path => location?.pathname === path;

  const toggleMobileMenu = () => setIsMobileMenuOpen(v => !v);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100]"
      style={{ background: '#0B2E33', borderBottom: '1px solid rgba(184,227,233,0.15)' }}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">

        {/* ── Logo ── */}
        <div
          className="flex items-center space-x-2 cursor-pointer select-none"
          onClick={() => handleNavigation(getDashboardPath())}
        >
          {logoError ? (
            /* Fallback badge when image fails to load */
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #34D399 0%, #3B82F6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              letterSpacing: '-0.5px', flexShrink: 0,
            }}>VA</div>
          ) : (
            <img
              src="/assets/images/vigilai-logo.png"
              alt="Vigil AI"
              style={{ height: 36, width: 36, objectFit: 'contain', flexShrink: 0 }}
              onError={() => setLogoError(true)}
            />
          )}
          <span style={{
            color: '#B8E3E9', fontWeight: 700, fontSize: 16,
            letterSpacing: '-0.3px', userSelect: 'none',
          }}>
            Vigil AI
          </span>
        </div>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navigationItems.map(item => {
            const active = isActivePath(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={
                  active
                    ? { background: '#4F7C82', color: '#ffffff' }
                    : { color: '#B8E3E9', background: 'transparent' }
                }
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(79,124,130,0.3)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#B8E3E9';
                  }
                }}
              >
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Right section ── */}
        <div className="flex items-center space-x-3">
          <div style={{ color: '#B8E3E9' }}>
            <NotificationCenter />
          </div>
          <UserProfileDropdown />
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-md transition-colors duration-200"
            style={{ color: '#B8E3E9' }}
            aria-label="Toggle mobile menu"
          >
            <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={20} />
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation ── */}
      {isMobileMenuOpen && (
        <div style={{ background: '#0d3540', borderTop: '1px solid rgba(184,227,233,0.1)' }}>
          <nav className="px-4 py-2 space-y-1">
            {navigationItems.map(item => {
              const active = isActivePath(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  style={active ? { background: '#4F7C82', color: '#fff' } : { color: '#B8E3E9' }}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;