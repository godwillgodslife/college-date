import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './contexts/NotificationContext';
import { initPushNotifications } from './services/pushNotification.js';
import { initializeRevenueCat } from './services/paymentService.js';
import { warmupNativeDataCache } from './services/cacheWarmupService.js';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import NotificationSoftPrompt from './components/NotificationSoftPrompt.jsx';
import { SWRProvider } from './lib/perfSWR.jsx';

import AdminRoute from './components/AdminRoute.jsx';

// Lazy load Pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Match = lazy(() => import('./pages/Match'));
const Explore = lazy(() => import('./pages/Explore'));
const Chat = lazy(() => import('./pages/Chat'));
const StatusUpdates = lazy(() => import('./pages/StatusUpdates'));
const Snap = lazy(() => import('./pages/Snap'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Requests = lazy(() => import('./pages/Requests'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Confessions = lazy(() => import('./pages/Confessions'));
const PremiumUpgrade = lazy(() => import('./pages/PremiumUpgrade'));
const Viewers = lazy(() => import('./pages/Viewers'));
const MiniProfileSetup = lazy(() => import('./pages/MiniProfileSetup'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VoiceCallRoom = lazy(() => import('./pages/VoiceCallRoom'));

// Components that can be lazy loaded
const TourGuide = lazy(() => import('./components/TourGuide'));

function isNativePlatform() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
}

function preloadNativeRouteChunks() {
  if (!isNativePlatform()) return;

  const preload = () => {
    const imports = [
      import('./pages/Dashboard'),
      import('./pages/Match'),
      import('./pages/Explore'),
      import('./pages/Chat'),
      import('./pages/StatusUpdates'),
      import('./pages/Snap'),
      import('./pages/Profile'),
      import('./pages/EditProfile'),
      import('./pages/Settings'),
      import('./pages/Referrals'),
      import('./pages/Wallet'),
      import('./pages/Requests'),
      import('./pages/Leaderboard'),
      import('./pages/Confessions'),
      import('./pages/PremiumUpgrade'),
      import('./pages/Viewers'),
      import('./pages/MiniProfileSetup'),
      import('./components/TourGuide'),
    ];

    Promise.allSettled(imports).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed) {
        console.warn(`[Native preload] ${failed} route chunk(s) failed to preload.`);
      }
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(preload, { timeout: 2500 });
  } else {
    setTimeout(preload, 1200);
  }
}

/**
 * SmartHomeRoute determines where an authenticated user should land.
 * If they haven't finished onboarding, they go to /mini-profile-setup.
 * If they are done, they go straight to /dashboard (the main app command center).
 */
function SmartHomeRoute() {
  const { currentUser, userProfile, loading, profileLoading } = useAuth();

  if (loading || profileLoading) return <LoadingSpinner fullScreen />;
  if (!currentUser) return <Landing />;

  // 1. Basic field check (Only essentials)
  // We use a more resilient check that allows for slight data variations
  const hasFullName = userProfile?.full_name && userProfile?.full_name.trim().length > 1;
  const hasUniversity = userProfile?.university && userProfile?.university !== 'None';
  
  // 2. Photo check
  const hasPhoto = (userProfile?.profile_photos?.filter(p => p && p !== '').length >= 1) || 
                   (userProfile?.avatar_url && userProfile?.avatar_url.startsWith('http'));

  // 3. New: Explicit marked-complete flag (optional backup)
  const isManuallyComplete = userProfile?.is_onboarded === true;

  const isProfileComplete = isManuallyComplete || (hasFullName && hasUniversity && hasPhoto);

  console.log('[Auth] SmartHomeRoute Evaluation:', { 
    isProfileComplete, 
    hasFullName, 
    hasUniversity, 
    hasPhoto,
    isManuallyComplete
  });

  return isProfileComplete ? <Navigate to="/dashboard" replace /> : <Navigate to="/mini-profile-setup" replace />;
}

function AppRoutes() {
  const { currentUser, userProfile, loading } = useAuth();

  // Set accurate viewport height unit for mobile browsers
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  useEffect(() => {
    preloadNativeRouteChunks();
  }, []);

  useEffect(() => {
    if (currentUser) {
      // 🚀 SLIMMING RUNTIME: Defer non-critical initializations
      const deferInit = () => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => {
            initPushNotifications(currentUser.id);
            setupOneSignal(currentUser.id);
            initializeRevenueCat(currentUser.id);
          });
        } else {
          setTimeout(() => {
            initPushNotifications(currentUser.id);
            setupOneSignal(currentUser.id);
            initializeRevenueCat(currentUser.id);
          }, 2000); // 2s delay fallback
        }
      };

      const setupOneSignal = (uid) => {
        // OneSignal web SDK is only available in browser, not in Capacitor native
        const isNativePlatform = window.Capacitor?.isNativePlatform?.();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isNativePlatform && !isLocal) {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(function (OneSignal) {
            const handleClick = (event) => {
              const data = event?.notification?.additionalData || {};
              const url = data.url;
              if (url) {
                window.history.pushState({}, '', url);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            };
            OneSignal.Notifications.addEventListener('click', handleClick);
          });
        }
      };

      deferInit();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      warmupNativeDataCache(currentUser.id, userProfile);
    }
  }, [currentUser, userProfile]);

  // Global loading gatekeeper removed to prevent "6-8 reloads" flicker.
  // We now let the individual routes (SmartHomeRoute, ProtectedRoute) handle 
  // their own loading states without unmounting the entire application tree.

  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="Loading..." />}>
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

        {/* Protected routes with AppLayout shell always mounted */}
        <Route element={<AppLayout />}>
          {/* Inner Guard: Gated contents only, shell remains stable */}
          <Route
            element={
              <ProtectedRoute>
                <TourGuide />
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/match" element={<Match />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/status" element={<StatusUpdates />} />
            <Route path="/snap" element={<Snap />} />
            <Route path="/profile/:userId?" element={<Profile />} />
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
        </Route>

        {/* Full screen voice call room */}
        <Route
          path="/call/:roomID"
          element={
            <ProtectedRoute>
              <VoiceCallRoom />
            </ProtectedRoute>
          }
        />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SWRProvider>
          <NotificationSoftPrompt />
          <ToastProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </ToastProvider>
        </SWRProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
