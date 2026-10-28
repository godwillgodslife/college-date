import { supabase } from '../lib/supabase';
import { openNotificationRoute } from '../utils/notificationRouting';

let nativeOneSignalInitialized = false;
let nativeSubscriptionListenerAdded = false;
let nativeClickListenerAdded = false;
let nativePushUserId = null;
let webSubscriptionListenerAdded = false;
let webClickListenerAdded = false;
let webOneSignalLoadPromise = null;
let webOneSignalInitialized = false;
const DEVICE_ID_STORAGE_KEY = 'tcd_notification_device_id';
let currentDeviceId = null;
let currentSubscriptionId = null;
let pushDebugState = {
    platform: 'web',
    nativeShell: false,
    nativePushEnabled: false,
    oneSignalAppIdPresent: false,
    nativeInitialized: false,
    webInitialized: false,
    permissionStatus: 'unknown',
    deviceId: null,
    subscriptionId: null,
    pushTokenPresent: false,
    userId: null,
    lastSyncedAt: null,
    lastOpenedRoute: null,
    lastOpenedRawUrl: null,
    lastError: null
};

/**
 * Detect if running inside Capacitor native shell (Android/iOS)
 */
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

function getStoredDeviceId() {
    if (currentDeviceId) return currentDeviceId;

    try {
        const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
        if (existing) {
            currentDeviceId = existing;
            return existing;
        }

        const generated = window.crypto?.randomUUID?.()
            || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
        currentDeviceId = generated;
        return generated;
    } catch {
        currentDeviceId = `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return currentDeviceId;
    }
}

function getPlatformName() {
    if (isNative()) {
        return window.Capacitor?.getPlatform?.() || 'native';
    }
    return 'web';
}

function maskValue(value) {
    if (!value || typeof value !== 'string') return null;
    if (value.length <= 10) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function updatePushDebugState(nextState) {
    pushDebugState = {
        ...pushDebugState,
        ...nextState,
        platform: getPlatformName(),
        nativeShell: isNative(),
        nativePushEnabled: import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true',
        oneSignalAppIdPresent: Boolean(import.meta.env.VITE_ONESIGNAL_APP_ID),
        nativeInitialized: nativeOneSignalInitialized,
        webInitialized: webOneSignalInitialized
    };

    if (typeof window !== 'undefined') {
        window.__TCD_PUSH_DEBUG_STATE__ = pushDebugState;
        window.dispatchEvent(new CustomEvent('tcd:push-debug-state', { detail: pushDebugState }));
    }
}

async function registerNotificationDevice({ userId, subscriptionId, token, permissionStatus = 'unknown' }) {
    if (!userId || !subscriptionId) return;

    currentSubscriptionId = subscriptionId;
    const deviceId = getStoredDeviceId();
    const platform = getPlatformName();
    const appVersion = import.meta.env.VITE_APP_VERSION || null;

    const { error: rpcError } = await supabase.rpc('register_notification_device', {
        p_platform: platform,
        p_device_id: deviceId,
        p_onesignal_subscription_id: subscriptionId,
        p_push_token: token || null,
        p_permission_status: permissionStatus,
        p_app_version: appVersion,
        p_device_model: navigator.userAgent || null
    });

    if (rpcError) {
        console.warn('[Push] Device registry unavailable; falling back to profile token sync:', rpcError.message);
    }

    const legacyUpdate = { onesignal_id: subscriptionId };
    if (token) legacyUpdate.push_token = token;

    const { error } = await supabase
        .from('profiles')
        .update(legacyUpdate)
        .eq('id', userId);

    if (error) {
        console.error('[Push] Error syncing legacy profile push fields:', error);
    }

    updatePushDebugState({
        userId,
        deviceId,
        subscriptionId,
        pushTokenPresent: Boolean(token),
        permissionStatus,
        lastSyncedAt: new Date().toISOString(),
        lastError: error?.message || rpcError?.message || null
    });
}

async function syncNativeOneSignalProfile(subscriptionId, token) {
    if (!nativePushUserId || !subscriptionId) return;

    await registerNotificationDevice({
        userId: nativePushUserId,
        subscriptionId,
        token,
        permissionStatus: 'granted'
    });
    console.log('[Native Push] OneSignal subscription synced.');
}

async function syncWebOneSignalProfile(userId, subscriptionState = {}) {
    if (!userId || !subscriptionState.id) return;

    await registerNotificationDevice({
        userId,
        subscriptionId: subscriptionState.id,
        token: subscriptionState.token,
        permissionStatus: window.Notification?.permission || 'unknown'
    });
    console.log('[Web Push] OneSignal subscription synced.');
}

function routeNotificationUrl(url) {
    if (!url || typeof window === 'undefined') return;

    try {
        const route = openNotificationRoute(url);
        updatePushDebugState({
            lastOpenedRoute: route,
            lastOpenedRawUrl: url,
            lastError: null
        });
    } catch (error) {
        console.warn('[Native Push] Could not route notification URL:', error);
        updatePushDebugState({
            lastOpenedRawUrl: url,
            lastError: error.message
        });
    }
}

// NATIVE PUSH (OneSignal Capacitor SDK over Firebase Cloud Messaging)
async function initNativePush(userId) {
    const nativePushEnabled = import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true';
    if (!nativePushEnabled) {
        console.warn('[Native Push] Skipped. Set VITE_ENABLE_NATIVE_PUSH=true after adding android/app/google-services.json.');
        updatePushDebugState({
            userId,
            permissionStatus: 'disabled',
            lastError: 'Native push disabled by VITE_ENABLE_NATIVE_PUSH'
        });
        return;
    }

    try {
        const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

        if (!appId) {
            console.warn('[Native Push] Skipped. Missing VITE_ONESIGNAL_APP_ID.');
            updatePushDebugState({
                userId,
                permissionStatus: 'missing_app_id',
                lastError: 'Missing VITE_ONESIGNAL_APP_ID'
            });
            return;
        }

        nativePushUserId = userId;
        updatePushDebugState({ userId, lastError: null });

        if (!nativeOneSignalInitialized) {
            OneSignal.Debug.setLogLevel(LogLevel.Warn);
            await OneSignal.initialize(appId);
            nativeOneSignalInitialized = true;
        }

        if (userId) {
            await OneSignal.login(userId);
        }

        if (!nativeSubscriptionListenerAdded) {
            OneSignal.User.pushSubscription.addEventListener('change', async (event) => {
                await syncNativeOneSignalProfile(event.current?.id, event.current?.token);
            });
            nativeSubscriptionListenerAdded = true;
        }

        if (!nativeClickListenerAdded) {
            OneSignal.Notifications.addEventListener('click', (event) => {
                const actionId = event?.result?.actionId;
                const additionalData = event?.notification?.additionalData || {};
                let url = event?.result?.url || additionalData?.url;

                if (actionId === 'see_admirer') {
                    url = '/requests';
                } else if (actionId === 'claim_reward') {
                    url = '/dashboard';
                } else if (actionId === 'reply' || actionId === 'say_hi' || actionId === 'play_back') {
                    if (additionalData?.conversation_id || additionalData?.chat_id || additionalData?.match_id) {
                        const chatId = additionalData.conversation_id || additionalData.chat_id || additionalData.match_id;
                        url = `/chat?chatId=${chatId}&focus=true`;
                    }
                } else if (actionId === 'view_match' || actionId === 'endorse_back') {
                    if (additionalData?.actor_id) {
                        url = `/profile?id=${additionalData.actor_id}`;
                    }
                }

                routeNotificationUrl(url);
            });
            nativeClickListenerAdded = true;
        }

        const hasPermission = await OneSignal.Notifications.hasPermission();
        if (!hasPermission) {
            const granted = await OneSignal.Notifications.requestPermission(true);
            if (!granted) {
                console.warn('[Native Push] Permission denied.');
                updatePushDebugState({ permissionStatus: 'denied' });
                return;
            }
        }

        await OneSignal.User.pushSubscription.optIn();
        const [subscriptionId, token] = await Promise.all([
            OneSignal.User.pushSubscription.getIdAsync(),
            OneSignal.User.pushSubscription.getTokenAsync()
        ]);
        await syncNativeOneSignalProfile(subscriptionId, token);
        await syncOneSignalUserTags(userId);
    } catch (err) {
        console.error('[Native Push] Init error:', err);
        updatePushDebugState({ lastError: err.message || String(err) });
    }
}

// WEB PUSH (OneSignal Web SDK, browser only)
function ensureWebOneSignalSdk() {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.OneSignal) return Promise.resolve(true);
    if (webOneSignalLoadPromise) return webOneSignalLoadPromise;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    webOneSignalLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-tcd-onesignal-sdk="true"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(true), { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.dataset.tcdOnesignalSdk = 'true';
        script.addEventListener('load', () => resolve(true), { once: true });
        script.addEventListener('error', reject, { once: true });
        document.head.appendChild(script);
    });

    return webOneSignalLoadPromise;
}

async function initWebPush(userId) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[Web Push] Skipping OneSignal init on localhost');
        updatePushDebugState({
            userId,
            permissionStatus: window.Notification?.permission || 'local_preview',
            lastError: null
        });
        return;
    }

    // Skip on auth pages
    const currentPath = window.location.pathname;
    if (currentPath.includes('/signup') || currentPath.includes('/login') || currentPath.includes('/auth')) {
        console.log('[OneSignal] Skipping permission prompt on auth page:', currentPath);
        updatePushDebugState({ userId, permissionStatus: window.Notification?.permission || 'auth_page_skipped' });
        return;
    }

    try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        await ensureWebOneSignalSdk();

        window.OneSignalDeferred.push(async function (OneSignal) {
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('[OneSignal] Notifications API not ready');
                return;
            }

            if (!webOneSignalInitialized) {
                const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || 'eda29312-5e13-406f-a1bd-5c8a8e27e6c4';
                await OneSignal.init({
                    appId,
                    allowLocalhostAsSecureOrigin: true,
                });
                webOneSignalInitialized = true;
            }

            if (OneSignal.Notifications && !webClickListenerAdded) {
                OneSignal.Notifications.addEventListener('click', (event) => {
                    const actionId = event?.result?.actionId;
                    const additionalData = event?.notification?.additionalData || {};
                    let url = event?.result?.url || additionalData?.url;

                    if (actionId === 'see_admirer') {
                        url = '/requests';
                    } else if (actionId === 'claim_reward') {
                        url = '/dashboard';
                    } else if (actionId === 'reply' || actionId === 'say_hi' || actionId === 'play_back') {
                        if (additionalData?.conversation_id || additionalData?.chat_id || additionalData?.match_id) {
                            const chatId = additionalData.conversation_id || additionalData.chat_id || additionalData.match_id;
                            url = `/chat?chatId=${chatId}&focus=true`;
                        }
                    } else if (actionId === 'view_match' || actionId === 'endorse_back') {
                        if (additionalData?.actor_id) {
                            url = `/profile?id=${additionalData.actor_id}`;
                        }
                    }

                    routeNotificationUrl(url);
                });
                webClickListenerAdded = true;
            }

            if (OneSignal.User?.PushSubscription && !webSubscriptionListenerAdded) {
                OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
                    await syncWebOneSignalProfile(userId, event.current);
                });
                webSubscriptionListenerAdded = true;
            }

            let permission = OneSignal.Notifications.permission;
            if (!permission) {
                if (typeof OneSignal.Notifications.requestPermission === 'function') {
                    await OneSignal.Notifications.requestPermission();
                    permission = OneSignal.Notifications.permission;
                }
            }

            if (OneSignal.User) {
                if (userId) {
                    console.log('[OneSignal] Linking External ID:', userId);
                    await OneSignal.login(userId);
                }

                if (OneSignal.User.PushSubscription) {
                    if (permission && !OneSignal.User.PushSubscription.optedIn) {
                        await OneSignal.User.PushSubscription.optIn();
                    }

                    await syncWebOneSignalProfile(userId, {
                        id: OneSignal.User.PushSubscription.id,
                        token: OneSignal.User.PushSubscription.token
                    });
                }
                await syncOneSignalUserTags(userId);
            }
            updatePushDebugState({
                userId,
                permissionStatus: window.Notification?.permission || OneSignal.Notifications.permission || 'unknown',
                subscriptionId: OneSignal.User?.PushSubscription?.id || currentSubscriptionId,
                pushTokenPresent: Boolean(OneSignal.User?.PushSubscription?.token),
                lastError: null
            });
        });

    } catch (error) {
        console.error('[OneSignal] Service Error:', error);
        updatePushDebugState({ userId, lastError: error.message || String(error) });
    }
}

// MAIN ENTRYPOINT: auto-detects platform
/**
 * Initialize push notifications for the current platform.
 * - On Android/iOS (Capacitor): uses OneSignal native SDK backed by FCM
 * - On Web (browser): uses OneSignal Web SDK
 * @param {string} userId - The authenticated Supabase user ID
 */
export async function initPushNotifications(userId) {
    updatePushDebugState({
        userId,
        deviceId: getStoredDeviceId(),
        permissionStatus: window.Notification?.permission || 'unknown',
        lastError: null
    });

    if (isNative()) {
        console.log('[Push] Native platform detected - using OneSignal native SDK');
        await initNativePush(userId);
    } else {
        console.log('[Push] Web platform detected - using OneSignal Web SDK');
        await initWebPush(userId);
    }
}

export async function getPushDebugState() {
    const baseState = {
        ...pushDebugState,
        platform: getPlatformName(),
        nativeShell: isNative(),
        nativePushEnabled: import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true',
        oneSignalAppIdPresent: Boolean(import.meta.env.VITE_ONESIGNAL_APP_ID),
        deviceId: pushDebugState.deviceId || getStoredDeviceId(),
        subscriptionId: pushDebugState.subscriptionId || currentSubscriptionId,
        permissionStatus: window.Notification?.permission || pushDebugState.permissionStatus || 'unknown',
        appVisibility: document.visibilityState,
        online: navigator.onLine,
        currentRoute: `${window.location.pathname}${window.location.search}${window.location.hash}`
    };

    try {
        if (isNative() && nativeOneSignalInitialized) {
            const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
            const [subscriptionId, token, hasPermission] = await Promise.all([
                OneSignal.User.pushSubscription.getIdAsync().catch(() => null),
                OneSignal.User.pushSubscription.getTokenAsync().catch(() => null),
                OneSignal.Notifications.hasPermission().catch(() => null)
            ]);

            return {
                ...baseState,
                permissionStatus: hasPermission === true ? 'granted' : hasPermission === false ? 'denied' : baseState.permissionStatus,
                subscriptionId: subscriptionId || baseState.subscriptionId,
                pushTokenPresent: Boolean(token) || baseState.pushTokenPresent,
                maskedDeviceId: maskValue(baseState.deviceId),
                maskedSubscriptionId: maskValue(subscriptionId || baseState.subscriptionId)
            };
        }

        if (!isNative() && window.OneSignal?.User?.PushSubscription) {
            return {
                ...baseState,
                subscriptionId: window.OneSignal.User.PushSubscription.id || baseState.subscriptionId,
                pushTokenPresent: Boolean(window.OneSignal.User.PushSubscription.token) || baseState.pushTokenPresent,
                maskedDeviceId: maskValue(baseState.deviceId),
                maskedSubscriptionId: maskValue(window.OneSignal.User.PushSubscription.id || baseState.subscriptionId)
            };
        }
    } catch (error) {
        return {
            ...baseState,
            lastError: error.message || String(error),
            maskedDeviceId: maskValue(baseState.deviceId),
            maskedSubscriptionId: maskValue(baseState.subscriptionId)
        };
    }

    return {
        ...baseState,
        maskedDeviceId: maskValue(baseState.deviceId),
        maskedSubscriptionId: maskValue(baseState.subscriptionId)
    };
}

export async function logoutPushNotifications() {
    const deviceId = getStoredDeviceId();

    try {
        await supabase.rpc('revoke_notification_device', {
            p_device_id: deviceId,
            p_onesignal_subscription_id: currentSubscriptionId
        });
    } catch (err) {
        console.warn('[Push] Device revoke skipped:', err.message);
    }

    if (!isNative() || !nativeOneSignalInitialized) return;

    try {
        const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
        await OneSignal.logout();
        nativePushUserId = null;
        updatePushDebugState({
            userId: null,
            subscriptionId: null,
            pushTokenPresent: false,
            lastSyncedAt: null
        });
    } catch (err) {
        console.error('[Native Push] Logout error:', err);
        updatePushDebugState({ lastError: err.message || String(err) });
    }
}

/**
 * Send a local notification (native-only).
 * On web, this is a no-op (OneSignal handles delivery server-side).
 */
export async function sendLocalNotification(title, message) {
    if (isNative()) {
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body: message,
                        id: Date.now(),
                        sound: null,
                        attachments: null,
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });
        } catch (err) {
            console.error('[LocalNotifications] Error:', err);
        }
    } else {
        console.log(`[Mock Push] ${title}: ${message}`);
    }
}

/**
 * Sync rich campus and engagement tags to OneSignal for targeted segmentation.
 * Tags: university, faculty, department, gender, level, is_premium, verified, profile_completion, streak_count
 */
export async function syncOneSignalUserTags(userId, profile = null) {
    if (!userId) return;

    try {
        let profileData = profile;
        if (!profileData || !profileData.university) {
            const { data } = await supabase
                .from('profiles')
                .select('university, faculty, department, gender, level, is_premium, verified, completion_score, full_name')
                .eq('id', userId)
                .maybeSingle();
            if (data) {
                profileData = { ...profileData, ...data };
            }
        }

        // Fetch score streak if available
        let streakCount = 0;
        try {
            const { data: streakData } = await supabase
                .from('user_score_streaks')
                .select('current_streak')
                .eq('user_id', userId)
                .maybeSingle();
            if (streakData?.current_streak) {
                streakCount = streakData.current_streak;
            }
        } catch {
            // non-blocking
        }

        if (!profileData) return;

        const tags = {};
        if (profileData.university) tags.university = String(profileData.university);
        if (profileData.faculty) tags.faculty = String(profileData.faculty);
        if (profileData.department) tags.department = String(profileData.department);
        if (profileData.gender) tags.gender = String(profileData.gender).toLowerCase();
        if (profileData.level) tags.level = String(profileData.level);
        tags.is_premium = String(Boolean(profileData.is_premium));
        tags.verified = String(Boolean(profileData.is_verified || profileData.photo_verified || profileData.verified));
        if (typeof profileData.completion_score === 'number') {
            tags.profile_completion = String(profileData.completion_score);
        }
        const firstName = profileData.full_name ? profileData.full_name.trim().split(/\s+/)[0] : '';
        if (firstName) {
            tags.first_name = String(firstName);
        }
        if (streakCount > 0) {
            tags.streak_count = String(streakCount);
        }

        console.log('[OneSignal] Syncing user profile tags:', tags);

        // Native Capacitor Plugin
        if (isNative()) {
            if (!nativeOneSignalInitialized) {
                const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
                if (appId && import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true') {
                    try {
                        const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
                        OneSignal.Debug.setLogLevel(LogLevel.Warn);
                        await OneSignal.initialize(appId);
                        nativeOneSignalInitialized = true;
                    } catch (initErr) {
                        console.warn('[OneSignal] Lazy native initialization before tag sync failed:', initErr);
                    }
                }
            }
            if (nativeOneSignalInitialized) {
                const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
                if (OneSignal?.User?.addTags) {
                    await OneSignal.User.addTags(tags);
                }
            } else {
                console.log('[OneSignal] Skipping native tag sync: OneSignal not yet initialized');
            }
        } else {
            // Web SDK
            if (typeof window !== 'undefined' && window.OneSignal?.User?.addTags) {
                await window.OneSignal.User.addTags(tags);
            } else if (typeof window !== 'undefined' && window.OneSignalDeferred) {
                window.OneSignalDeferred.push(async function (OneSignal) {
                    if (OneSignal?.User?.addTags) {
                        await OneSignal.User.addTags(tags);
                    }
                });
            }
        }
    } catch (err) {
        console.warn('[OneSignal] Tag sync warning:', err.message);
    }
}

/**
 * Link user email address to OneSignal user profile
 */
export async function syncOneSignalUserEmail(email) {
    if (!email || typeof email !== 'string') return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return;

    try {
        console.log('[OneSignal] Linking email subscription:', cleanEmail);
        if (isNative()) {
            if (!nativeOneSignalInitialized) {
                const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
                if (appId && import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true') {
                    try {
                        const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
                        OneSignal.Debug.setLogLevel(LogLevel.Warn);
                        await OneSignal.initialize(appId);
                        nativeOneSignalInitialized = true;
                    } catch (initErr) {
                        console.warn('[OneSignal] Lazy native initialization before email sync failed:', initErr);
                    }
                }
            }
            if (nativeOneSignalInitialized) {
                const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
                if (OneSignal?.User?.addEmail) {
                    await OneSignal.User.addEmail(cleanEmail);
                }
            } else {
                console.log('[OneSignal] Skipping native email sync: OneSignal not yet initialized');
            }
        } else {
            if (typeof window !== 'undefined' && window.OneSignal?.User?.addEmail) {
                await window.OneSignal.User.addEmail(cleanEmail);
            } else if (typeof window !== 'undefined' && window.OneSignalDeferred) {
                window.OneSignalDeferred.push(async function (OneSignal) {
                    if (OneSignal?.User?.addEmail) {
                        await OneSignal.User.addEmail(cleanEmail);
                    }
                });
            }
        }
    } catch (err) {
        console.warn('[OneSignal] Email sync warning:', err.message);
    }
}

