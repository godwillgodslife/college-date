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
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Landing />}
      />
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />}
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
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={currentUser ? '/dashboard' : '/login'} replace />} />
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
