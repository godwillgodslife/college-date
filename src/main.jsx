import './utils/performanceMonitor.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import './styles/androidPolish.css';
import { openNotificationRoute } from './utils/notificationRouting.js';

// ─────────────────────────────────────────────
// Platform Detection
// ─────────────────────────────────────────────
const isNative = typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  window.Capacitor.isNativePlatform();

const isLocalDevHost = typeof window !== 'undefined' &&
  import.meta.env.DEV &&
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

if (isNative) {
  document.documentElement.classList.add('is-native-app');
  const platform = typeof window.Capacitor.getPlatform === 'function'
    ? window.Capacitor.getPlatform()
    : 'native';
  document.documentElement.classList.add(`is-${platform}-app`);
}

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('native-preview')) {
  document.documentElement.classList.add('is-native-app');
}

async function clearNativeWebCaches() {
  if (!isNative) return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith('tcd-media-cache-'))
          .map((key) => caches.delete(key))
      );
    }
  } catch (error) {
    console.warn('[Capacitor] Cache cleanup skipped:', error);
  }
}

clearNativeWebCaches();

async function clearLocalDevWebCaches() {
  if (!isLocalDevHost) return;

  try {
    const hadController = Boolean(navigator.serviceWorker?.controller);

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith('tcd-media-cache-'))
          .map((key) => caches.delete(key))
      );
    }

    if (hadController && window.sessionStorage?.getItem('local-dev-sw-cleared') !== '1') {
      window.sessionStorage.setItem('local-dev-sw-cleared', '1');
      const url = new URL(window.location.href);
      url.searchParams.set('devCacheCleared', String(Date.now()));
      window.location.replace(url.toString());
    }
  } catch (error) {
    console.warn('[Dev] Local cache cleanup skipped:', error);
  }
}

clearLocalDevWebCaches();

// ─────────────────────────────────────────────
// PWA Service Worker — Web only
// ─────────────────────────────────────────────
if (!isNative && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-pwa.js')
      .then(reg => {
        console.log('PWA Service Worker registered');

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available, please refresh.');
                }
              }
            };
          }
        };
      })
      .catch(err => console.log('PWA Service Worker registration failed', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('Service Worker controller changed. New version active.');
      // window.location.reload(); // Removed to prevent infinite reload loops
    }
  });
}

// ─────────────────────────────────────────────
// Capacitor Native Setup
// ─────────────────────────────────────────────
async function initCapacitor() {
  if (!isNative) return;

  try {
    const handleIncomingUrl = async (incomingUrl, source = 'appUrlOpen') => {
      if (!incomingUrl) return;

      console.log(`[Capacitor] Deep link received from ${source}:`, incomingUrl);

      try {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch (browserError) {
          console.warn('[Capacitor] Browser close skipped:', browserError);
        }

        openNotificationRoute(incomingUrl, '/notifications');
      } catch (e) {
        console.error('[Capacitor] Failed to parse deep link URL:', e);
      }
    };

    // 1. Handle incoming deep links and notification/app-link taps.
    const { App: CapApp } = await import('@capacitor/app');
    if (typeof CapApp.getLaunchUrl === 'function') {
      CapApp.getLaunchUrl().then((launch) => {
        if (launch?.url) {
          handleIncomingUrl(launch.url, 'launch');
        }
      }).catch((error) => {
        console.warn('[Capacitor] Launch URL check skipped:', error);
      });
    }

    CapApp.addListener('appUrlOpen', async (data) => {
      await handleIncomingUrl(data?.url, 'appUrlOpen');
    });

    // 2. Handle Android hardware back button on root route (exit app)
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

  } catch (err) {
    console.error('[Capacitor] Native init error:', err);
  }
}

// Run Capacitor init before render
initCapacitor();

// ─────────────────────────────────────────────
// Render App
// ─────────────────────────────────────────────
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// ─────────────────────────────────────────────
// Hide Capacitor SplashScreen after React renders
// ─────────────────────────────────────────────
if (isNative) {
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    // Give React time to paint first frame before hiding splash
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 500 });
    }, 300);
  }).catch(err => console.error('[SplashScreen] Hide error:', err));
}
