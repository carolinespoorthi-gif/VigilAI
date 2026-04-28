import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../context/AuthContext';

const BreadcrumbNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic dashboard path based on user role
  const getDashboardPath = () => {
    return user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
  };

  // Route configuration with breadcrumb information
  const routeConfig = {
    '/admin-dashboard': {
      label: 'Dashboard',
      icon: 'LayoutDashboard'
    },
    '/user-dashboard': {
      label: 'Dashboard',
      icon: 'LayoutDashboard'
    },
    '/compliance-dashboard': {
      label: 'Dashboard',
      icon: 'LayoutDashboard'
    },
    '/data-source-management': {
      label: 'Data Sources',
      icon: 'Database',
      parent: getDashboardPath()
    },
    '/risk-assessment-details': {
      label: 'Risk Analysis',
      icon: 'Shield',
      parent: getDashboardPath()
    },
    '/remediation-planning': {
      label: 'Remediation',
      icon: 'CheckCircle',
      parent: getDashboardPath()
    },
    '/compliance-reports': {
      label: 'Reports',
      icon: 'FileText',
      parent: getDashboardPath()
    }
  };

  const buildBreadcrumbs = (pathname) => {
    const breadcrumbs = [];
    const currentRoute = routeConfig?.[pathname];

    if (!currentRoute) return breadcrumbs;

    // Build breadcrumb chain
    let current = pathname;
    const visited = new Set();

    while (current && !visited?.has(current)) {
      visited?.add(current);
      const route = routeConfig?.[current];

      if (route) {
        breadcrumbs?.unshift({
          label: route?.label,
          path: current,
          icon: route?.icon,
          isActive: current === pathname
        });
        current = route?.parent;
      } else {
        break;
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs(location?.pathname);

  // Don't render breadcrumbs on login page or if no breadcrumbs
  if (breadcrumbs?.length === 0) {
    return null;
  }

  const handleBreadcrumbClick = (path) => {
    if (path !== location?.pathname) {
      navigate(path);
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <Icon name="Home" size={14} className="text-muted-foreground" />
      {breadcrumbs?.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb?.path}>
          <Icon name="ChevronRight" size={14} className="text-muted-foreground" />

          <button
            onClick={() => handleBreadcrumbClick(breadcrumb?.path)}
            disabled={breadcrumb?.isActive}
            className={`
              flex items-center space-x-1.5 px-2 py-1 rounded-md transition-colors duration-200
              ${breadcrumb?.isActive
                ? 'text-foreground font-medium cursor-default'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
              }
            `}
            aria-current={breadcrumb?.isActive ? 'page' : undefined}
          >
            <Icon name={breadcrumb?.icon} size={14} />
            <span>{breadcrumb?.label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default BreadcrumbNavigation;