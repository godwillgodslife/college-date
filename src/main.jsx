import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';\nimport { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// ─────────────────────────────────────────────
// Platform Detection
// ─────────────────────────────────────────────
const isNative = typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  window.Capacitor.isNativePlatform();

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
    // 1. Handle incoming deep links (Supabase OAuth callback)
    //    e.g. com.collegedate.app://auth/callback?access_token=...
    const { App: CapApp } = await import('@capacitor/app');
    CapApp.addListener('appUrlOpen', (data) => {
      if (!data?.url) return;
      console.log('[Capacitor] Deep link received:', data.url);
      try {
        const url = new URL(data.url);
        // Push the path + search params into React Router
        const path = url.pathname + url.search + url.hash;
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {
        console.error('[Capacitor] Failed to parse deep link URL:', e);
      }
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

