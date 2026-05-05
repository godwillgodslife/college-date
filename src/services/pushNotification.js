import { supabase } from '../lib/supabase';

/**
 * Detect if running inside Capacitor native shell (Android/iOS)
 */
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

// ─────────────────────────────────────────────
// NATIVE PUSH (Capacitor @capacitor/push-notifications)
// ─────────────────────────────────────────────
async function initNativePush(userId) {
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
            console.warn('[Native Push] Permission denied.');
            return;
        }

        await PushNotifications.register();

        // Handle successful FCM token registration
        PushNotifications.addListener('registration', async (token) => {
            console.log('[Native Push] FCM Token:', token.value);
            if (userId && token.value) {
                // Sync the FCM token to the Supabase profile
                const { error } = await supabase
                    .from('profiles')
                    .update({ push_token: token.value, onesignal_id: token.value })
                    .eq('id', userId);
                if (error) console.error('[Native Push] Error syncing token:', error);
                else console.log('[Native Push] Token synced to profile.');
            }
        });

        // Handle registration errors
        PushNotifications.addListener('registrationError', (err) => {
            console.error('[Native Push] Registration error:', err);
        });

        // Handle incoming push notification (app is in foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[Native Push] Received foreground notification:', notification);
        });

        // Handle push notification tap (user taps a notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[Native Push] Notification tapped:', action);
            const url = action.notification?.data?.url;
            if (url && typeof window !== 'undefined') {
                // Navigate to the target route inside the app
                window.history.pushState({}, '', url);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        });

    } catch (err) {
        console.error('[Native Push] Init error:', err);
    }
}

// ─────────────────────────────────────────────
// WEB PUSH (OneSignal Web SDK — browser only)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// MAIN ENTRYPOINT — Auto-detects platform
// ─────────────────────────────────────────────
/**
 * Initialize push notifications for the current platform.
 * - On Android/iOS (Capacitor): uses @capacitor/push-notifications (FCM)
 * - On Web (browser): uses OneSignal Web SDK
 * @param {string} userId - The authenticated Supabase user ID
 */
export async function initPushNotifications(userId) {
    if (isNative()) {
        console.log('[Push] Native platform detected — using Capacitor Push Notifications');
        await initNativePush(userId);
    } else {
        console.log('[Push] Web platform detected — using OneSignal Web SDK');
        await initWebPush(userId);
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
