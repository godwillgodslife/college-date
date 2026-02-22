import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './contexts/NotificationContext';
import { initPushNotifications } from './services/pushNotification';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import TourGuide from './components/TourGuide'; // Import TourGuide

// Pages
import Landing from './pages/Landing'; // Import Landing
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import Chat from './pages/Chat';
import StatusUpdates from './pages/StatusUpdates';
import Snap from './pages/Snap';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Settings from './pages/Settings';
import Referrals from './pages/Referrals';
import Wallet from './pages/Wallet';
import Requests from './pages/Requests';
import Leaderboard from './pages/Leaderboard';
import Confessions from './pages/Confessions';
import PremiumUpgrade from './pages/PremiumUpgrade';
import Viewers from './pages/Viewers';
import MiniProfileSetup from './pages/MiniProfileSetup';

/**
 * SmartHomeRoute determines where an authenticated user should land.
 * If they haven't finished onboarding, they go to /mini-profile-setup.
 * If they are done, they go straight to /discover (the main app).
 */
function SmartHomeRoute() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!currentUser) return <Landing />;

  // Wait for profile to load
  if (!userProfile) return <LoadingSpinner fullScreen />;

  const isProfileComplete =
    userProfile.full_name?.trim() &&
    userProfile.bio?.length >= 10 &&
    userProfile.university &&
    userProfile.age &&
    userProfile.profile_photos?.filter(Boolean).length >= 4;

  return isProfileComplete ? <Navigate to="/discover" replace /> : <Navigate to="/mini-profile-setup" replace />;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (currentUser) {
      initPushNotifications(currentUser.id);
    }
  }, [currentUser]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={<SmartHomeRoute />}
      />
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes with AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
            <TourGuide />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/status" element={<StatusUpdates />} />
        <Route path="/snap" element={<Snap />} />
        {/* <Route path="/snapshots" element={<Snapshots />} /> Removed obsolete route */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/confessions" element={<Confessions />} />
        <Route path="/premium" element={<PremiumUpgrade />} />
        <Route path="/viewers" element={<Viewers />} />
        <Route path="/mini-profile-setup" element={<MiniProfileSetup />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
