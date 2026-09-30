import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativePlatform } from './secureAuthStorage';

const PREF_KEY_PREFIX = 'tcd-auth-pref:';

export const AUTH_PREF_KEYS = {
  rememberMe: 'remember-me',
  rememberedEmail: 'remembered-email',
  biometricEnabled: 'biometric-enabled',
  biometricUserId: 'biometric-user-id',
  pendingOAuthRememberMe: 'pending-oauth-remember-me',
  pendingOAuthBiometrics: 'pending-oauth-biometrics'
};

function prefKey(key) {
  return `${PREF_KEY_PREFIX}${key}`;
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export async function getAuthPreference(key) {
  if (isNativePlatform()) {
    try {
      const value = await SecureStorage.getItem(prefKey(key));
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  if (!hasLocalStorage()) return null;

  try {
    return window.localStorage.getItem(prefKey(key));
  } catch {
    return null;
  }
}

export async function setAuthPreference(key, value) {
  if (value === undefined || value === null) {
    await removeAuthPreference(key);
    return;
  }

  const stringValue = String(value);

  if (isNativePlatform()) {
    await SecureStorage.setItem(prefKey(key), stringValue);
    return;
  }

  if (hasLocalStorage()) {
    window.localStorage.setItem(prefKey(key), stringValue);
  }
}

export async function removeAuthPreference(key) {
  if (isNativePlatform()) {
    try {
      await SecureStorage.remove(prefKey(key));
    } catch {
      // Removing a missing preference is harmless.
    }
    return;
  }

  if (hasLocalStorage()) {
    window.localStorage.removeItem(prefKey(key));
  }
}

export async function getRememberMePreference() {
  const value = await getAuthPreference(AUTH_PREF_KEYS.rememberMe);
  return value !== 'false';
}

export async function setRememberMePreference(enabled) {
  await setAuthPreference(AUTH_PREF_KEYS.rememberMe, enabled ? 'true' : 'false');
}

export async function getRememberedEmail() {
  return getAuthPreference(AUTH_PREF_KEYS.rememberedEmail);
}

export async function setRememberedEmail(email, rememberMe = true) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  await setRememberMePreference(rememberMe);

  if (rememberMe && normalizedEmail) {
    await setAuthPreference(AUTH_PREF_KEYS.rememberedEmail, normalizedEmail);
  } else {
    await removeAuthPreference(AUTH_PREF_KEYS.rememberedEmail);
  }
}

export async function setPendingOAuthPreferences({ rememberMe = true, enableBiometrics = false } = {}) {
  await Promise.all([
    setAuthPreference(AUTH_PREF_KEYS.pendingOAuthRememberMe, rememberMe ? 'true' : 'false'),
    setAuthPreference(AUTH_PREF_KEYS.pendingOAuthBiometrics, enableBiometrics ? 'true' : 'false')
  ]);
}

export async function consumePendingOAuthPreferences() {
  const [rememberMe, enableBiometrics] = await Promise.all([
    getAuthPreference(AUTH_PREF_KEYS.pendingOAuthRememberMe),
    getAuthPreference(AUTH_PREF_KEYS.pendingOAuthBiometrics)
  ]);

  await Promise.all([
    removeAuthPreference(AUTH_PREF_KEYS.pendingOAuthRememberMe),
    removeAuthPreference(AUTH_PREF_KEYS.pendingOAuthBiometrics)
  ]);

  return {
    rememberMe: rememberMe !== 'false',
    enableBiometrics: enableBiometrics === 'true'
  };
}

export async function clearLogoutAuthPreferences({ preserveRememberedEmail = true } = {}) {
  const rememberMe = await getRememberMePreference();

  await Promise.all([
    removeAuthPreference(AUTH_PREF_KEYS.biometricEnabled),
    removeAuthPreference(AUTH_PREF_KEYS.biometricUserId),
    removeAuthPreference(AUTH_PREF_KEYS.pendingOAuthRememberMe),
    removeAuthPreference(AUTH_PREF_KEYS.pendingOAuthBiometrics)
  ]);

  if (!preserveRememberedEmail || !rememberMe) {
    await removeAuthPreference(AUTH_PREF_KEYS.rememberedEmail);
  }
}
