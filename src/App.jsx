import { useEffect, lazy, Suspense, Profiler } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './contexts/NotificationContext';
import { initPushNotifications } from './services/pushNotification.js';
import { initializeRevenueCat } from './services/paymentService.js';
import { warmupAppDataCache } from './services/cacheWarmupService.js';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import NotificationSoftPrompt from './components/NotificationSoftPrompt.jsx';
import { SWRProvider } from './lib/perfSWR.jsx';
import { performanceMonitor } from './utils/performanceMonitor';
import { hasLocalAdminAccess } from './utils/adminAccess';
import { safeArray } from './utils/profileData';
import { normalizeNotificationRoute, openNotificationRoute } from './utils/notificationRouting';

import AdminRoute from './components/AdminRoute.jsx';

const CHUNK_RELOAD_KEY = 'college-date-chunk-reload-attempted';

function isChunkLoadError(error) {
  const message = String(error?.message || error || '');
  return /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i.test(message);
}

function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (
        typeof window !== 'undefined' &&
        isChunkLoadError(error) &&
        window.sessionStorage?.getItem(CHUNK_RELOAD_KEY) !== '1'
      ) {
        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });
}

// Lazy load Pages
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const AuthCallback = lazyWithRetry(() => import('./pages/AuthCallback'));
const PaymentCallback = lazyWithRetry(() => import('./pages/PaymentCallback'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Match = lazyWithRetry(() => import('./pages/Match'));
const Explore = lazyWithRetry(() => import('./pages/Explore'));
const Chat = lazyWithRetry(() => import('./pages/Chat'));
const StatusUpdates = lazyWithRetry(() => import('./pages/StatusUpdates'));
const Snap = lazyWithRetry(() => import('./pages/Snap'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const EditProfile = lazyWithRetry(() => import('./pages/EditProfile'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Referrals = lazyWithRetry(() => import('./pages/Referrals'));
const Wallet = lazyWithRetry(() => import('./pages/Wallet'));
const Requests = lazyWithRetry(() => import('./pages/Requests'));
const Leaderboard = lazyWithRetry(() => import('./pages/Leaderboard'));
const Confessions = lazyWithRetry(() => import('./pages/Confessions'));
const PremiumUpgrade = lazyWithRetry(() => import('./pages/PremiumUpgrade'));
const Viewers = lazyWithRetry(() => import('./pages/Viewers'));
const MiniProfileSetup = lazyWithRetry(() => import('./pages/MiniProfileSetup'));
const NotificationCenter = lazyWithRetry(() => import('./pages/NotificationCenter'));
const NotificationPreviewLab = lazyWithRetry(() => import('./pages/NotificationPreviewLab'));
const AdminDashboard = lazyWithRetry(() => (
  import.meta.env.DEV
    ? import('./pages/AdminDashboard.jsx?admin-permission-flags-v2')
    : import('./pages/AdminDashboard')
));
const VoiceCallRoom = lazyWithRetry(() => import('./pages/VoiceCallRoom'));
const WireframeShowcase = lazyWithRetry(() => import('./pages/WireframeShowcase'));

// Components that can be lazy loaded
const AppLayout = lazyWithRetry(() => import('./components/AppLayout.jsx'));
const TourGuide = lazyWithRetry(() => import('./components/TourGuide'));

function getSafeAuthRedirect(location, fallback = '/') {
  const stateTarget = location.state?.from?.pathname || location.state?.from;
  const queryTarget = new URLSearchParams(location.search).get('redirect');
  const target = stateTarget || queryTarget || fallback;

  if (typeof target !== 'string') return fallback;
  if (!target.startsWith('/') || target.startsWith('//')) return fallback;
  return target;
}

function preloadRouteChunks() {
  const preload = () => {
    // Check for save-data mode to respect user bandwidth on mobile web
    if (typeof navigator !== 'undefined' && (navigator.connection?.saveData || navigator.userAgent?.includes('Lighthouse'))) {
      return;
    }

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
      import('./pages/NotificationCenter'),
      import('./components/TourGuide'),
    ];

    Promise.allSettled(imports).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed) {
        console.warn(`[Route preload] ${failed} route chunk(s) failed to preload.`);
      }
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(preload, { timeout: 3500 });
  } else {
    setTimeout(preload, 2000);
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
  if (hasLocalAdminAccess(currentUser)) return <Navigate to="/admin" replace />;

  // 1. Basic field check (Only essentials)
  // We use a more resilient check that allows for slight data variations
  const hasFullName = userProfile?.full_name && userProfile?.full_name.trim().length > 1;
  const hasUniversity = userProfile?.university && userProfile?.university !== 'None';
  
  // 2. Photo check
  const hasPhoto = (safeArray(userProfile?.profile_photos).filter(p => p && p !== '').length >= 1) || 
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

function ProfiledRoute({ id, children }) {
  const onRender = (
    profilerId,
    phase,
    actualDuration
  ) => {
    if (performanceMonitor.isEnabled()) {
      performanceMonitor.endRouteTransition(window.location.pathname, actualDuration);
    }
  };

  if (!performanceMonitor.isEnabled()) {
    return children;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

function CanonicalNotificationRouteRedirect() {
  const location = useLocation();
  const destination = normalizeNotificationRoute(`${location.pathname}${location.search}${location.hash}`);
  return <Navigate to={destination} replace />;
}

function AppRoutes() {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (performanceMonitor.isEnabled()) {
      performanceMonitor.startRouteTransition(location.pathname);
    }
  }, [location.pathname]);

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
    window.sessionStorage?.removeItem(CHUNK_RELOAD_KEY);
    if (currentUser) {
      preloadRouteChunks();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      // 🚀 SLIMMING RUNTIME: Defer non-critical initializations
      const deferInit = () => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => {
            initPushNotifications(currentUser.id);
            setupOneSignal();
            initializeRevenueCat(currentUser.id);
          });
        } else {
          setTimeout(() => {
            initPushNotifications(currentUser.id);
            setupOneSignal();
            initializeRevenueCat(currentUser.id);
          }, 2000); // 2s delay fallback
        }
      };

      const setupOneSignal = () => {
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
                openNotificationRoute(url);
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
      warmupAppDataCache(currentUser.id, userProfile);
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
          element={currentUser ? <Navigate to={getSafeAuthRedirect(location)} replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={currentUser ? <Navigate to={getSafeAuthRedirect(location)} replace /> : <Signup />}
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/wireframes" element={<WireframeShowcase />} />
        <Route path="/notification-preview" element={<NotificationPreviewLab />} />
        <Route path="/notification-preview-lab" element={<NotificationPreviewLab />} />
        <Route path="/push-preview" element={<NotificationPreviewLab />} />
        <Route path="/push-lab" element={<NotificationPreviewLab />} />
        <Route path="/messages" element={<CanonicalNotificationRouteRedirect />} />
        <Route path="/messages/:chatId" element={<CanonicalNotificationRouteRedirect />} />

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
            <Route path="/dashboard" element={<ProfiledRoute id="Dashboard"><Dashboard /></ProfiledRoute>} />
            <Route path="/match" element={<ProfiledRoute id="Match"><Match /></ProfiledRoute>} />
            <Route path="/explore" element={<ProfiledRoute id="Explore"><Explore /></ProfiledRoute>} />
            <Route path="/chat" element={<ProfiledRoute id="Chat"><Chat /></ProfiledRoute>} />
            <Route path="/status" element={<ProfiledRoute id="StatusUpdates"><StatusUpdates /></ProfiledRoute>} />
            <Route path="/snap" element={<ProfiledRoute id="Snap"><Snap /></ProfiledRoute>} />
            <Route path="/profile/:userId?" element={<ProfiledRoute id="Profile"><Profile /></ProfiledRoute>} />
            <Route path="/profile/edit" element={<ProfiledRoute id="EditProfile"><EditProfile /></ProfiledRoute>} />
            <Route path="/settings" element={<ProfiledRoute id="Settings"><Settings /></ProfiledRoute>} />
            <Route path="/referrals" element={<ProfiledRoute id="Referrals"><Referrals /></ProfiledRoute>} />
            <Route path="/wallet" element={<ProfiledRoute id="Wallet"><Wallet /></ProfiledRoute>} />
            <Route path="/requests" element={<ProfiledRoute id="Requests"><Requests /></ProfiledRoute>} />
            <Route path="/leaderboard" element={<ProfiledRoute id="Leaderboard"><Leaderboard /></ProfiledRoute>} />
            <Route path="/confessions" element={<ProfiledRoute id="Confessions"><Confessions /></ProfiledRoute>} />
            <Route path="/premium" element={<ProfiledRoute id="PremiumUpgrade"><PremiumUpgrade /></ProfiledRoute>} />
            <Route path="/viewers" element={<ProfiledRoute id="Viewers"><Viewers /></ProfiledRoute>} />
            <Route path="/notifications" element={<ProfiledRoute id="NotificationCenter"><NotificationCenter /></ProfiledRoute>} />
            <Route path="/mini-profile-setup" element={<ProfiledRoute id="MiniProfileSetup"><MiniProfileSetup /></ProfiledRoute>} />
          </Route>
        </Route>

        {/* Full screen voice call room */}
        <Route
          path="/call/:roomID"
          element={
            <ProtectedRoute>
              <ProfiledRoute id="VoiceCallRoom">
                <VoiceCallRoom />
              </ProfiledRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <ProfiledRoute id="AdminDashboard">
                <AdminDashboard />
              </ProfiledRoute>
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
