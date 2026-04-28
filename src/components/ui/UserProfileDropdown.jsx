import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../context/AuthContext';

const UserProfileDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(45); // minutes
  const dropdownRef = useRef(null);

  const { user, logout } = useAuth();
  
  // Logic: Admin is always "Sarah Mitchell" as requested
  // User portal reflects the actual logged-in credentials
  const currentUser = {
    name: user?.role === 'admin' ? 'Sarah Mitchell' : (user?.username || 'User'),
    email: user?.role === 'admin' ? 'sarah.mitchell@company.com' : `${user?.username || 'user'}@company.com`,
    role: user?.role === 'admin' ? 'Compliance Officer' : 'Standard User',
    avatar: null,
    lastLogin: new Date().toISOString().split('T')[0] + ' 07:30:00'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Session timeout countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => Math.max(0, prev - 1));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    console.log("Signing out...");
    localStorage.clear();
    logout();
    navigate("/");
    setIsOpen(false);
  };

  const handleProfileSettings = () => {
    console.log('Opening profile settings...');
    navigate("/profile-settings");
    setIsOpen(false);
  };

  const handleSecuritySettings = () => {
    console.log('Opening security settings...');
    navigate("/security-settings");
    setIsOpen(false);
  };

  const getInitials = (name) => {
    return name?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase();
  };

  const getSessionStatus = () => {
    if (sessionTimeLeft > 30) return { color: 'text-success', status: 'Active' };
    if (sessionTimeLeft > 10) return { color: 'text-warning', status: 'Warning' };
    return { color: 'text-error', status: 'Expiring' };
  };

  const sessionStatus = getSessionStatus();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ease-out"
        style={{ color: '#B8E3E9' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,227,233,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        aria-label="User profile menu"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
             style={{ background: 'linear-gradient(135deg,#4F7C82,#B8E3E9)', color: '#0B2E33' }}>
          {getInitials(currentUser?.name)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium" style={{ color: '#ffffff' }}>{currentUser?.name}</div>
          <div className="text-xs" style={{ color: '#93B1B5' }}>{currentUser?.role}</div>
        </div>
        <Icon
          name="ChevronDown"
          size={16}
          style={{ color: '#93B1B5', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-elevation z-200 animate-fade-in">
          {/* User Info Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-medium">
                {getInitials(currentUser?.name)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-popover-foreground">{currentUser?.name}</div>
                <div className="text-xs text-muted-foreground">{currentUser?.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">{currentUser?.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Session Status */}
          <div className="p-3 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Session Status:</span>
              <span className={`font-medium ${sessionStatus?.color}`}>
                {sessionStatus?.status} ({sessionTimeLeft}m left)
              </span>
            </div>
            <div className="mt-2 w-full bg-border rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-300 ${
                  sessionTimeLeft > 30 ? 'bg-success' : 
                  sessionTimeLeft > 10 ? 'bg-warning' : 'bg-error'
                }`}
                style={{ width: `${(sessionTimeLeft / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={handleProfileSettings}
              className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted rounded-md transition-colors duration-200"
            >
              <Icon name="User" size={16} />
              <span>Profile Settings</span>
            </button>
            
            <button
              onClick={handleSecuritySettings}
              className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted rounded-md transition-colors duration-200"
            >
              <Icon name="Shield" size={16} />
              <span>Security Settings</span>
            </button>

            <div className="border-t border-border my-2" />

            <div className="px-3 py-2">
              <div className="text-xs text-muted-foreground mb-1">Last Login</div>
              <div className="text-xs font-mono text-popover-foreground">
                {new Date(currentUser.lastLogin)?.toLocaleString()}
              </div>
            </div>

            <div className="border-t border-border my-2" />

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-error hover:bg-error/10 rounded-md transition-colors duration-200"
            >
              <Icon name="LogOut" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;