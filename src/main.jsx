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

function setNativeViewport() {
  if (!isNative) return;

  const content = [
    'width=device-width',
    'initial-scale=1',
    'maximum-scale=1',
    'viewport-fit=cover',
    'interactive-widget=resizes-content',
  ].join(', ');

  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    document.head.appendChild(viewport);
  }

  viewport.setAttribute('content', content);
}

function setViewportHeightVar() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
}

function setKeyboardOffset(offset = 0) {
  const safeOffset = Math.max(0, Math.round(Number(offset) || 0));
  document.documentElement.style.setProperty('--keyboard-offset', `${safeOffset}px`);
  document.documentElement.classList.toggle('keyboard-open', safeOffset > 0);
}

async function initKeyboardOffsetTracking() {
  const shouldTrack = isNative || document.documentElement.classList.contains('is-native-app');
  if (!shouldTrack) return;

  setViewportHeightVar();
  window.addEventListener('resize', setViewportHeightVar, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(setViewportHeightVar, 250);
  }, { passive: true });

  if (isNative) {
    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardOffset(info?.keyboardHeight);
        window.dispatchEvent(new CustomEvent('tcd:keyboard-show', { detail: info }));
      });
      Keyboard.addListener('keyboardDidShow', (info) => {
        setKeyboardOffset(info?.keyboardHeight);
        window.dispatchEvent(new CustomEvent('tcd:keyboard-show', { detail: info }));
      });
      Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardOffset(0);
        window.dispatchEvent(new CustomEvent('tcd:keyboard-hide'));
      });
      Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardOffset(0);
        window.dispatchEvent(new CustomEvent('tcd:keyboard-hide'));
      });
      return;
    } catch (error) {
      console.warn('[Capacitor] Keyboard offset tracking skipped:', error);
    }
  }

  if (window.visualViewport) {
    const updateFromVisualViewport = () => {
      const offset = Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
      );
      setKeyboardOffset(offset);
      setViewportHeightVar();
    };

    window.visualViewport.addEventListener('resize', updateFromVisualViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', updateFromVisualViewport, { passive: true });
    updateFromVisualViewport();
  }
}

setNativeViewport();
initKeyboardOffsetTracking();

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
        // Check for updates on load
        reg.update().catch(() => {});

        // Re-check for updates whenever user returns to tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version ready, preparing seamless transition.');
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
      const lastReload = sessionStorage.getItem('tcd_sw_last_reload');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 15000) {
        sessionStorage.setItem('tcd_sw_last_reload', String(now));
        console.log('[PWA] Service Worker controller updated. Refreshing to load latest build...');
        window.location.reload();
      }
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

    // 2. Handle Android hardware back button (dispatches cancelable event to active components first)
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const event = new CustomEvent('tcd:hardware-back', { cancelable: true });
      const wasPrevented = !window.dispatchEvent(event);
      if (wasPrevented) {
        return; // Handled by active view/screen (e.g. closing chat conversation or modal)
      }

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
