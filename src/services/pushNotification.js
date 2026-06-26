import { supabase } from '../lib/supabase';

let nativeOneSignalInitialized = false;
let nativeSubscriptionListenerAdded = false;
let nativeClickListenerAdded = false;
let nativePushUserId = null;

/**
 * Detect if running inside Capacitor native shell (Android/iOS)
 */
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

async function syncNativeOneSignalProfile(subscriptionId, token) {
    if (!nativePushUserId || !subscriptionId) return;

    const update = { onesignal_id: subscriptionId };
    if (token) update.push_token = token;

    const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', nativePushUserId);

    if (error) {
        console.error('[Native Push] Error syncing OneSignal subscription:', error);
    } else {
        console.log('[Native Push] OneSignal subscription synced to profile.');
    }
}

function routeNotificationUrl(url) {
    if (!url || typeof window === 'undefined') return;

    try {
        const parsed = new URL(url, window.location.origin);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
        console.warn('[Native Push] Could not route notification URL:', error);
    }
}

// NATIVE PUSH (OneSignal Capacitor SDK over Firebase Cloud Messaging)
async function initNativePush(userId) {
    const nativePushEnabled = import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true';
    if (!nativePushEnabled) {
        console.warn('[Native Push] Skipped. Set VITE_ENABLE_NATIVE_PUSH=true after adding android/app/google-services.json.');
        return;
    }

    try {
        const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

        if (!appId) {
            console.warn('[Native Push] Skipped. Missing VITE_ONESIGNAL_APP_ID.');
            return;
        }

        nativePushUserId = userId;

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
                const url = event?.result?.url || event?.notification?.additionalData?.url;
                routeNotificationUrl(url);
            });
            nativeClickListenerAdded = true;
        }

        const hasPermission = await OneSignal.Notifications.hasPermission();
        if (!hasPermission) {
            const granted = await OneSignal.Notifications.requestPermission(true);
            if (!granted) {
                console.warn('[Native Push] Permission denied.');
                return;
            }
        }

        await OneSignal.User.pushSubscription.optIn();
        const [subscriptionId, token] = await Promise.all([
            OneSignal.User.pushSubscription.getIdAsync(),
            OneSignal.User.pushSubscription.getTokenAsync()
        ]);
        await syncNativeOneSignalProfile(subscriptionId, token);
    } catch (err) {
        console.error('[Native Push] Init error:', err);
    }
}

// WEB PUSH (OneSignal Web SDK, browser only)
async function initWebPush(userId) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[Web Push] Skipping OneSignal init on localhost');
        return;
    }

    // Skip on auth pages
    const currentPath = window.location.pathname;
    if (currentPath.includes('/signup') || currentPath.includes('/login') || currentPath.includes('/auth')) {
        console.log('[OneSignal] Skipping permission prompt on auth page:', currentPath);
        return;
    }

    try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];

        window.OneSignalDeferred.push(async function (OneSignal) {
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('[OneSignal] Notifications API not ready');
                return;
            }

            const permission = OneSignal.Notifications.permission;
            if (!permission) {
                if (typeof OneSignal.Notifications.requestPermission === 'function') {
                    await OneSignal.Notifications.requestPermission();
                }
            }

            if (OneSignal.User) {
                if (userId) {
                    console.log('[OneSignal] Linking External ID:', userId);
                    OneSignal.login(userId);
                }

                if (OneSignal.User.PushSubscription) {
                    const subscriptionId = OneSignal.User.PushSubscription.id;
                    if (subscriptionId && userId) {
                        const { error } = await supabase
                            .from('profiles')
                            .update({ onesignal_id: subscriptionId })
                            .eq('id', userId);
                        if (error) console.error('[OneSignal] Sync error:', error);
                        else console.log('[OneSignal] ID synced to profile.');
                    }
                }
            }
        });

    } catch (error) {
        console.error('[OneSignal] Service Error:', error);
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
    if (isNative()) {
        console.log('[Push] Native platform detected - using OneSignal native SDK');
        await initNativePush(userId);
    } else {
        console.log('[Push] Web platform detected - using OneSignal Web SDK');
        await initWebPush(userId);
    }
}

export async function logoutPushNotifications() {
    if (!isNative() || !nativeOneSignalInitialized) return;

    try {
        const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
        await OneSignal.logout();
        nativePushUserId = null;
    } catch (err) {
        console.error('[Native Push] Logout error:', err);
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
