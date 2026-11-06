import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Public & Core Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SpectatorLoginPage from './pages/SpectatorLoginPage';
import LiveAuction from './pages/LiveAuction';
import CaptainsDashboard from './pages/CaptainsDashboard';
import TeamSquadPage from './pages/TeamSquadPage';
import PlayerGallery from './pages/PlayerGallery';
import AuctionHistory from './pages/AuctionHistory';
import AuctionResults from './pages/AuctionResults';
import SpectatorScreen from './pages/SpectatorScreen';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import TeamManagement from './pages/TeamManagement';
import PlayerManagement from './pages/PlayerManagement';
import PlayerCardDesigner from './pages/PlayerCardDesigner';
import AuctionConfig from './pages/AuctionConfig';
import LeagueSettings from './pages/LeagueSettings';
import ReportsPage from './pages/ReportsPage';
import AuditLog from './pages/AuditLog';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role === 'spectator' && location.pathname.startsWith('/admin')) {
    return <Navigate to="/spectator" replace />;
  }

  return (
    <Routes>
      <Route
        path="/spectator"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <SpectatorScreen />
          </ProtectedRoute>
        }
      />
      <Route path="/spectator-login" element={<SpectatorLoginPage />} />

      {/* Pages Wrapped in Main League Layout */}
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
      />

      <Route
        path="/login"
        element={
          <Layout>
            <LoginPage />
          </Layout>
        }
      />

      <Route
        path="/auction"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <Layout>
              <LiveAuction />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/captains-dashboard"
        element={
          <ProtectedRoute loginPath="/login" roles={['super_admin', 'auctioneer', 'captain']}>
            <Layout>
              <CaptainsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams/:id"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <Layout>
              <TeamSquadPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/players"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <Layout>
              <PlayerGallery />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <Layout>
              <AuctionHistory />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/results"
        element={
          <ProtectedRoute loginPath="/spectator-login">
            <Layout>
              <AuctionResults />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['super_admin', 'auctioneer']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <Layout>
              <TeamManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/players"
        element={
          <ProtectedRoute roles={['super_admin', 'auctioneer']}>
            <Layout>
              <PlayerManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/card-designer"
        element={
          <ProtectedRoute roles={['super_admin', 'auctioneer']}>
            <Layout>
              <PlayerCardDesigner />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/config"
        element={
          <ProtectedRoute roles={['super_admin', 'auctioneer']}>
            <Layout>
              <AuctionConfig />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <Layout>
              <LeagueSettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <Layout>
              <ReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <Layout>
              <AuditLog />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
