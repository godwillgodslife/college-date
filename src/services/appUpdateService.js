import { registerPlugin } from '@capacitor/core';

// Lazy resolvers for unit test portability, headless testing, and offline resilience
let _playUpdatePlugin = null;
function getPlayUpdatePlugin() {
  if (_playUpdatePlugin) return _playUpdatePlugin;
  try {
    _playUpdatePlugin = registerPlugin('PlayUpdate');
    return _playUpdatePlugin;
  } catch {
    return null;
  }
}

let _supabaseClient = null;
async function getSupabase() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof window !== 'undefined' && window.__supabase) {
    _supabaseClient = window.__supabase;
    return _supabaseClient;
  }
  try {
    const mod = await import('../lib/supabase.js');
    _supabaseClient = mod.supabase;
    return _supabaseClient;
  } catch {
    return null;
  }
}

let _cacheModule = null;
async function getCache() {
  if (_cacheModule) return _cacheModule;
  try {
    _cacheModule = await import('../lib/persistentCache.js');
    return _cacheModule;
  } catch {
    return null;
  }
}

export const UPDATE_SEVERITY = {
  NORMAL: 'NORMAL',       // Level 1: Routine release, flexible update, 7-day cooldown
  IMPORTANT: 'IMPORTANT', // Level 2: Recommended improvements, 24-hour cooldown
  REQUIRED: 'REQUIRED'    // Level 3: Mandatory compatibility/security, immediate update
};

const COOLDOWN_MS = {
  NORMAL: 7 * 24 * 60 * 60 * 1000,   // 7 days
  IMPORTANT: 24 * 60 * 60 * 1000,    // 24 hours
  REQUIRED: 0                        // No cooldown (non-bypassable)
};

// In-memory session latch: ensure prompt is displayed at most once per app session
let sessionPromptShown = false;

export function isAndroidNative() {
  return typeof window !== 'undefined'
    && Boolean(window.Capacitor?.isNativePlatform?.())
    && window.Capacitor?.getPlatform?.() === 'android';
}

function getDismissalKey(versionCode) {
  return `tcd_update_dismissed_${versionCode || 'unknown'}`;
}

export function isUpdateInCooldown(versionCode, severity) {
  if (severity === UPDATE_SEVERITY.REQUIRED) return false;
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const raw = window.localStorage.getItem(getDismissalKey(versionCode));
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (isNaN(dismissedAt)) return false;

    const cooldownDuration = COOLDOWN_MS[severity] || COOLDOWN_MS.NORMAL;
    return Date.now() - dismissedAt < cooldownDuration;
  } catch {
    return false;
  }
}

export function recordUpdateDismissal(versionCode) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(getDismissalKey(versionCode), String(Date.now()));
  } catch (err) {
    console.warn('[AppUpdateService] Failed to record dismissal:', err);
  }
}

export function resetSessionPromptLatch() {
  sessionPromptShown = false;
}

export function markSessionPromptShown() {
  sessionPromptShown = true;
}

export function hasSessionPromptBeenShown() {
  return sessionPromptShown;
}

let mockServerPolicy = null;

export function setMockServerPolicy(policy) {
  mockServerPolicy = policy;
}

/**
 * Reads server-authoritative version policy from Supabase public.app_config.
 * Caches with 6-hour TTL; gracefully falls back on network failure.
 */
export async function fetchServerVersionPolicy() {
  if (mockServerPolicy !== null) {
    return mockServerPolicy;
  }

  const cache = await getCache();
  const cacheKey = 'app_config_android_version_policy';
  const cached = cache?.getCachedData?.(cacheKey, { ttlMs: 6 * 60 * 60 * 1000, allowStale: true });
  if (cached && typeof cached === 'object') {
    return cached;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return cached || null;
    }

    const sb = await getSupabase();
    if (!sb) return cached || null;

    const { data, error } = await sb
      .from('app_config')
      .select('value')
      .eq('key', 'android_version_policy')
      .maybeSingle();

    if (error || !data?.value) {
      return cached || null;
    }

    const policy = data.value;
    cache?.setCachedData?.(cacheKey, policy);
    return policy;
  } catch (err) {
    console.warn('[AppUpdateService] Error fetching version policy:', err);
    return cached || null;
  }
}

/**
 * Pure evaluation function resolving severity from Play Store info and server policy.
 */
export function evaluateUpdateSeverity({
  currentVersionCode = 0,
  availableVersionCode = 0,
  updatePriority = 0,
  clientVersionStalenessDays = 0,
  serverPolicy = null,
  updateAvailable = false
} = {}) {
  const minSupported = Number(serverPolicy?.min_supported_version_code || 0);
  const recommended = Number(serverPolicy?.recommended_version_code || 0);

  // LEVEL 3: Required Update (Server-enforced incompatibility)
  if (minSupported > 0 && currentVersionCode > 0 && currentVersionCode < minSupported) {
    return {
      severity: UPDATE_SEVERITY.REQUIRED,
      isAllowed: true,
      preferredType: 'IMMEDIATE',
      reason: serverPolicy?.critical_message || 'Your installed version is no longer supported. Please update to continue.'
    };
  }

  // If no newer version is reported by Google Play, no update needed
  if (!updateAvailable && availableVersionCode <= currentVersionCode) {
    return {
      severity: null,
      isAllowed: false,
      preferredType: null,
      reason: null
    };
  }

  // LEVEL 2: Important Update
  // Triggered if Google Play priority >= 4, staleness >= 14 days, or backend recommended > current
  const isHighPriority = updatePriority >= 4;
  const isStale = clientVersionStalenessDays >= 14;
  const isRecommendedByServer = recommended > 0 && currentVersionCode < recommended;

  if (isHighPriority || isStale || isRecommendedByServer) {
    return {
      severity: UPDATE_SEVERITY.IMPORTANT,
      isAllowed: true,
      preferredType: 'FLEXIBLE',
      reason: "We've made important stability and performance improvements to keep College Date working smoothly."
    };
  }

  // LEVEL 1: Normal Update
  return {
    severity: UPDATE_SEVERITY.NORMAL,
    isAllowed: true,
    preferredType: 'FLEXIBLE',
    reason: "We've made improvements to make College Date faster, smoother, and more reliable."
  };
}

/**
 * Comprehensive check for Android updates.
 * Safe to call on any platform; strictly no-op outside Android native.
 */
export async function checkAppUpdate() {
  if (!isAndroidNative()) {
    return {
      isSupported: false,
      updateAvailable: false,
      severity: null
    };
  }

  try {
    // 1. Query Google Play In-App Update API via native plugin
    const plugin = getPlayUpdatePlugin();
    if (!plugin) {
      return { isSupported: false, updateAvailable: false };
    }

    const playInfo = await plugin.getAppUpdateInfo().catch((err) => {
      console.warn('[AppUpdateService] PlayUpdate.getAppUpdateInfo failed:', err);
      return { updateAvailable: false, isPlayServicesAvailable: false };
    });

    const currentVersionCode = Number(playInfo.currentVersionCode || 0);
    const availableVersionCode = Number(playInfo.availableVersionCode || 0);
    const updateAvailable = Boolean(playInfo.updateAvailable);

    // 2. Fetch server-authoritative version policy
    const serverPolicy = await fetchServerVersionPolicy();

    // 3. Evaluate severity
    const evaluation = evaluateUpdateSeverity({
      currentVersionCode,
      availableVersionCode,
      updatePriority: Number(playInfo.updatePriority || 0),
      clientVersionStalenessDays: Number(playInfo.clientVersionStalenessDays || 0),
      serverPolicy,
      updateAvailable
    });

    if (!evaluation.severity) {
      return {
        isSupported: true,
        updateAvailable: false,
        severity: null,
        installStatus: playInfo.installStatus || 'UNKNOWN',
        currentVersionCode,
        availableVersionCode
      };
    }

    // 4. Check cooldown & session frequency
    const targetVersion = availableVersionCode || currentVersionCode;
    const inCooldown = isUpdateInCooldown(targetVersion, evaluation.severity);

    return {
      isSupported: true,
      updateAvailable: true,
      severity: evaluation.severity,
      preferredType: evaluation.preferredType,
      reason: evaluation.reason,
      currentVersionCode,
      availableVersionCode: targetVersion,
      installStatus: playInfo.installStatus || 'UNKNOWN',
      isFlexibleAllowed: Boolean(playInfo.isFlexibleAllowed),
      isImmediateAllowed: Boolean(playInfo.isImmediateAllowed),
      inCooldown,
      isUpdateInProgress: Boolean(playInfo.isUpdateInProgress)
    };
  } catch (error) {
    console.warn('[AppUpdateService] Unexpected error during check:', error);
    return {
      isSupported: true,
      updateAvailable: false,
      error: error?.message || String(error)
    };
  }
}

/**
 * Triggers the native update flow (Flexible or Immediate).
 */
export async function triggerInAppUpdate(preferredType = 'FLEXIBLE') {
  if (!isAndroidNative()) return { success: false, reason: 'NOT_ANDROID' };

  try {
    const plugin = getPlayUpdatePlugin();
    if (!plugin) return { success: false, reason: 'PLUGIN_UNAVAILABLE' };

    if (preferredType === 'IMMEDIATE') {
      return await plugin.startImmediateUpdate();
    } else {
      return await plugin.startFlexibleUpdate();
    }
  } catch (err) {
    console.error('[AppUpdateService] triggerInAppUpdate error:', err);
    throw err;
  }
}

/**
 * Triggers completion/restart for a downloaded flexible update.
 */
export async function completeFlexibleUpdate() {
  if (!isAndroidNative()) return;
  try {
    const plugin = getPlayUpdatePlugin();
    return await plugin?.completeFlexibleUpdate();
  } catch (err) {
    console.error('[AppUpdateService] completeFlexibleUpdate error:', err);
    throw err;
  }
}

/**
 * Subscribes to native installation status changes (e.g. DOWNLOADING -> DOWNLOADED).
 */
export function subscribeToInstallStatus(listener) {
  if (!isAndroidNative()) return () => {};

  let handle = null;
  const plugin = getPlayUpdatePlugin();
  plugin?.addListener?.('onInstallStatusChange', (data) => {
    listener?.(data);
  })?.then((sub) => {
    handle = sub;
  })?.catch((err) => {
    console.warn('[AppUpdateService] Failed to add install status listener:', err);
  });

  return () => {
    handle?.remove?.();
  };
}

/**
 * Mock helper for automated emulator verification.
 */
export async function setMockUpdateState(mockConfig) {
  if (!isAndroidNative()) return;
  const plugin = getPlayUpdatePlugin();
  return await plugin?.setMockUpdateInfo(mockConfig);
}

if (typeof window !== 'undefined') {
  window.__TCD_APP_UPDATE_SERVICE__ = {
    isAndroidNative,
    checkAppUpdate,
    triggerInAppUpdate,
    completeFlexibleUpdate,
    setMockUpdateState,
    setMockServerPolicy,
    recordUpdateDismissal,
    isUpdateInCooldown,
    evaluateUpdateSeverity,
    resetSessionPromptLatch,
    UPDATE_SEVERITY
  };
}
