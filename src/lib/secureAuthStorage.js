import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';

const NATIVE_AUTH_KEY_PREFIX = 'tcd-auth:';
const AUTH_KEY_PATTERNS = [
  'sb-',
  'supabase',
  'auth-token',
  'college-date-auth'
];

let secureStorageReadyPromise = null;

export function isNativePlatform() {
  return typeof window !== 'undefined'
    && window.Capacitor !== undefined
    && window.Capacitor.isNativePlatform?.();
}

function hasBrowserStorage(storageName) {
  return typeof window !== 'undefined' && typeof window[storageName] !== 'undefined';
}

function nativeAuthKey(key) {
  return `${NATIVE_AUTH_KEY_PREFIX}${key}`;
}

function isAuthStorageKey(key) {
  return AUTH_KEY_PATTERNS.some((pattern) => key.startsWith(pattern) || key.includes(pattern));
}

async function ensureSecureStorageReady() {
  if (!isNativePlatform()) return false;

  if (!secureStorageReadyPromise) {
    secureStorageReadyPromise = SecureStorage
      .setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly)
      .catch((error) => {
        console.warn('[Auth] Secure storage setup skipped:', error);
      });
  }

  await secureStorageReadyPromise;
  return true;
}

function readBrowserItem(key) {
  if (!hasBrowserStorage('localStorage')) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeBrowserItem(key) {
  if (!hasBrowserStorage('localStorage')) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best effort cleanup.
  }
}

async function migrateBrowserAuthItemToSecureStorage(key) {
  const legacyValue = readBrowserItem(key);
  if (legacyValue === null) return null;

  try {
    await SecureStorage.setItem(nativeAuthKey(key), legacyValue);
    removeBrowserItem(key);
  } catch (error) {
    console.warn('[Auth] Legacy session migration skipped:', error);
  }

  return legacyValue;
}

export const secureSupabaseAuthStorage = {
  async getItem(key) {
    if (!isNativePlatform()) return readBrowserItem(key);

    try {
      const readPromise = (async () => {
        await ensureSecureStorageReady();
        return await SecureStorage.getItem(nativeAuthKey(key));
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(undefined), 1200));
      const value = await Promise.race([readPromise, timeoutPromise]);

      if (typeof value === 'string' && value.length > 0) {
        // Keep fast localStorage cache synchronized
        if (hasBrowserStorage('localStorage')) {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            // Ignore quota errors
          }
        }
        return value;
      }
    } catch (error) {
      console.warn('[Auth] Secure session read failed, falling back to browser storage:', error);
    }

    // Resilient fallback to browser localStorage if SecureStorage had Keystore lag or was empty
    const localFallback = readBrowserItem(key);
    if (localFallback) {
      // Asynchronously backfill to SecureStorage
      SecureStorage.setItem(nativeAuthKey(key), localFallback).catch(() => {});
      return localFallback;
    }

    return null;
  },

  async setItem(key, value) {
    // 1. Always keep local fast-cache so Supabase JS client never defaults to anon during native transitions
    if (hasBrowserStorage('localStorage')) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('[Auth] localStorage setItem failed:', e);
      }
    }

    // 2. If on native platform, also persist securely to Android Keystore / iOS Keychain
    if (!isNativePlatform()) return;

    try {
      await ensureSecureStorageReady();
      await SecureStorage.setItem(nativeAuthKey(key), value);
    } catch (error) {
      console.warn('[Auth] Secure storage setItem failed:', error);
    }
  },

  async removeItem(key) {
    removeBrowserItem(key);

    if (!isNativePlatform()) return;

    try {
      await ensureSecureStorageReady();
      await SecureStorage.remove(nativeAuthKey(key));
    } catch (error) {
      console.warn('[Auth] Secure session removal skipped:', error);
    }
  }
};

export function clearBrowserAuthStorage() {
  if (hasBrowserStorage('localStorage')) {
    Object.keys(window.localStorage).forEach((key) => {
      if (isAuthStorageKey(key)) {
        window.localStorage.removeItem(key);
      }
    });
  }

  if (hasBrowserStorage('sessionStorage')) {
    Object.keys(window.sessionStorage).forEach((key) => {
      if (isAuthStorageKey(key)) {
        window.sessionStorage.removeItem(key);
      }
    });
  }
}

export async function clearSecureAuthStorage() {
  clearBrowserAuthStorage();

  if (!isNativePlatform()) return;

  try {
    await ensureSecureStorageReady();
    const keys = await SecureStorage.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(NATIVE_AUTH_KEY_PREFIX) || isAuthStorageKey(key))
        .map((key) => SecureStorage.remove(key).catch(() => {}))
    );
  } catch (error) {
    console.warn('[Auth] Secure storage cleanup skipped:', error);
  }
}
