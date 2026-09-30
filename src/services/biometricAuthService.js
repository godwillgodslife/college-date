import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryType
} from '@aparajita/capacitor-biometric-auth';
import {
  AUTH_PREF_KEYS,
  getAuthPreference,
  removeAuthPreference,
  setAuthPreference
} from '../lib/authPreferences';
import { isNativePlatform } from '../lib/secureAuthStorage';

function getBiometryLabel(biometryType) {
  switch (biometryType) {
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return 'Face Unlock';
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return 'Fingerprint';
    case BiometryType.irisAuthentication:
      return 'Biometric Unlock';
    default:
      return 'Biometric Unlock';
  }
}

export async function getBiometricAvailability() {
  if (!isNativePlatform()) {
    return {
      isAvailable: false,
      label: 'Biometric Unlock',
      reason: 'Biometric login is available in the mobile app.'
    };
  }

  try {
    const result = await BiometricAuth.checkBiometry();
    return {
      ...result,
      label: getBiometryLabel(result.biometryType)
    };
  } catch (error) {
    return {
      isAvailable: false,
      label: 'Biometric Unlock',
      reason: error?.message || 'Biometric login is not available on this device.'
    };
  }
}

export async function getBiometricLoginState(userId) {
  const [availability, enabled, savedUserId] = await Promise.all([
    getBiometricAvailability(),
    getAuthPreference(AUTH_PREF_KEYS.biometricEnabled),
    getAuthPreference(AUTH_PREF_KEYS.biometricUserId)
  ]);

  return {
    ...availability,
    enabled: availability.isAvailable
      && enabled === 'true'
      && (!savedUserId || !userId || savedUserId === userId)
  };
}

export async function shouldRequireBiometricUnlock(userId) {
  const state = await getBiometricLoginState(userId);
  return state.isAvailable && state.enabled;
}

export async function promptBiometricUnlock() {
  await BiometricAuth.authenticate({
    reason: 'Unlock The College Date securely.',
    cancelTitle: 'Use password',
    allowDeviceCredential: true,
    iosFallbackTitle: 'Use passcode',
    androidTitle: 'Unlock The College Date',
    androidSubtitle: 'Confirm it is you',
    androidConfirmationRequired: false,
    androidBiometryStrength: AndroidBiometryStrength.weak
  });
}

export async function enableBiometricLoginForUser(userId) {
  if (!userId) {
    return { enabled: false, error: 'Sign in before enabling biometric login.' };
  }

  const availability = await getBiometricAvailability();
  if (!availability.isAvailable) {
    return {
      enabled: false,
      error: availability.reason || 'Biometric login is not available on this device.'
    };
  }

  try {
    await promptBiometricUnlock();
    await Promise.all([
      setAuthPreference(AUTH_PREF_KEYS.biometricEnabled, 'true'),
      setAuthPreference(AUTH_PREF_KEYS.biometricUserId, userId)
    ]);
    return { enabled: true, error: null };
  } catch (error) {
    await disableBiometricLogin();
    return {
      enabled: false,
      error: error?.message || 'Biometric login could not be enabled.'
    };
  }
}

export async function disableBiometricLogin() {
  await Promise.all([
    removeAuthPreference(AUTH_PREF_KEYS.biometricEnabled),
    removeAuthPreference(AUTH_PREF_KEYS.biometricUserId)
  ]);
}
