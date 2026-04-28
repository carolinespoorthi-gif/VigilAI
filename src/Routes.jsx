// src/Routes.jsx
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";

import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";

import ComplianceReports from "./pages/compliance-reports";
import DataSourceManagement from "./pages/data-source-management";

import RiskAssessmentDetails from "./pages/risk-assessment-details";
import ComplianceDashboard from "./pages/compliance-dashboard";
import RemediationPlanning from "./pages/remediation-planning";
import ActivityPage from "./pages/activity";
import DashboardSettings from "./pages/dashboard-settings";
import ProfileSettings from "./pages/profile-settings";
import SecuritySettings from "./pages/security-settings";

/* 🔹 NEW IMPORTS */
import AlertDetails from "./pages/alerts/AlertDetails";
import AlertsList from "./pages/alerts/AlertsList";
import RemediationPage from "./pages/remediation/RemediationPage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleSelection from "./pages/auth/RoleSelection";
import Login from "./pages/auth/Login";
import MonitoringPage from "./pages/monitoring";
import RemediationCentre from "./pages/remediation-centre";
import LandingPage from "./pages/landing";

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/select-role" element={<RoleSelection />} />
            <Route path="/login" element={<Login />} />

            {/* ADMIN ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin-dashboard" element={<ComplianceDashboard />} />
              <Route path="/settings" element={<DashboardSettings />} />
              <Route path="/data-source-management" element={<DataSourceManagement />} />
              <Route path="/risk-assessment-details" element={<RiskAssessmentDetails />} />
              <Route path="/alerts" element={<AlertsList />} />
              <Route path="/alerts/:id" element={<AlertDetails />} />
              <Route path="/remediation/:id" element={<RemediationPage />} />
            </Route>

            {/* USER ROUTES */}
            <Route element={<ProtectedRoute allowedRoles={['user']} />}>
              <Route path="/user-dashboard" element={<ComplianceDashboard />} />
            </Route>

            {/* SHARED ROUTES (Admin & User) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'user']} />}>
              <Route path="/dashboard" element={<ComplianceDashboard />} />
              <Route path="/compliance-reports" element={<ComplianceReports />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/remediation-centre" element={<RemediationCentre />} />
              <Route path="/remediation-planning" element={<RemediationPlanning />} />
              <Route path="/profile-settings" element={<ProfileSettings />} />
              <Route path="/security-settings" element={<SecuritySettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
