import React, { useState, useRef, useEffect } from 'react';
import Icon from '../AppIcon';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Mock notifications data
  useEffect(() => {
    const mockNotifications = [
      {
        id: 1,
        type: 'critical',
        title: 'High-Risk PII Detected',
        message: 'Sensitive data found in customer_data_2025.csv requiring immediate attention',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isRead: false,
        source: 'Risk Assessment',
        actionRequired: true
      },
      {
        id: 2,
        type: 'warning',
        title: 'Data Source Connection Issue',
        message: 'Unable to connect to Salesforce integration - last sync 2 hours ago',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: false,
        source: 'Data Sources',
        actionRequired: true
      },
      {
        id: 3,
        type: 'info',
        title: 'Compliance Report Generated',
        message: 'Monthly GDPR compliance report is ready for review and export',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        isRead: true,
        source: 'Reports',
        actionRequired: false
      },
      {
        id: 4,
        type: 'success',
        title: 'Remediation Completed',
        message: 'Successfully anonymized 1,247 records in marketing database',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isRead: true,
        source: 'Remediation',
        actionRequired: false
      },
      {
        id: 5,
        type: 'warning',
        title: 'Policy Update Required',
        message: 'New CCPA regulations require policy review by end of week',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        isRead: false,
        source: 'Compliance',
        actionRequired: true
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications?.filter(n => !n?.isRead)?.length);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical': return { name: 'AlertTriangle', color: 'text-error' };
      case 'warning': return { name: 'AlertCircle', color: 'text-warning' };
      case 'success': return { name: 'CheckCircle', color: 'text-success' };
      case 'info': return { name: 'Info', color: 'text-accent' };
      default: return { name: 'Bell', color: 'text-muted-foreground' };
    }
  };

  const getNotificationBg = (type, isRead) => {
    if (isRead) return 'bg-muted/30';
    
    switch (type) {
      case 'critical': return 'bg-error/5 border-l-4 border-l-error';
      case 'warning': return 'bg-warning/5 border-l-4 border-l-warning';
      case 'success': return 'bg-success/5 border-l-4 border-l-success';
      case 'info': return 'bg-accent/5 border-l-4 border-l-accent';
      default: return 'bg-card';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationClick = (notification) => {
    if (!notification?.isRead) {
      setNotifications(prev => 
        prev?.map(n => 
          n?.id === notification?.id ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Navigate to relevant section based on source
    console.log(`Navigating to ${notification?.source} for notification:`, notification?.title);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev?.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const criticalCount = notifications?.filter(n => n?.type === 'critical' && !n?.isRead)?.length;
  const actionRequiredCount = notifications?.filter(n => n?.actionRequired && !n?.isRead)?.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md transition-colors duration-200 ease-out"
        style={{ color: '#B8E3E9' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(184,227,233,0.1)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B8E3E9'; }}
        aria-label="Notification center"
      >
        <Icon name="Bell" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-foreground text-xs font-medium rounded-full flex items-center justify-center animate-pulse-subtle">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {criticalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full animate-pulse-subtle" />
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-popover border border-border rounded-lg shadow-elevation z-250 animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-popover-foreground">Notifications</h3>
                <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                  <span>{unreadCount} unread</span>
                  {actionRequiredCount > 0 && (
                    <span className="text-warning font-medium">
                      {actionRequiredCount} require action
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications?.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="Bell" size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications?.map((notification) => {
                  const iconConfig = getNotificationIcon(notification?.type);
                  return (
                    <button
                      key={notification?.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        w-full p-3 rounded-md text-left transition-colors duration-200 hover:bg-muted/50
                        ${getNotificationBg(notification?.type, notification?.isRead)}
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon 
                          name={iconConfig?.name} 
                          size={16} 
                          className={`mt-0.5 ${iconConfig?.color}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${!notification?.isRead ? 'text-popover-foreground' : 'text-muted-foreground'}`}>
                              {notification?.title}
                            </h4>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatTimestamp(notification?.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification?.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {notification?.source}
                            </span>
                            {notification?.actionRequired && (
                              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                                Action Required
                              </span>
                            )}
                          </div>
                        </div>
                        {!notification?.isRead && (
                          <div className="w-2 h-2 bg-accent rounded-full mt-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications?.length > 0 && (
            <div className="p-3 border-t border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
                <button className="text-xs text-accent hover:text-accent/80 transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;