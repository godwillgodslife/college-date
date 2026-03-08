import { supabase } from '../lib/supabase';

// OneSignal is now handled via script tag in index.html and window.OneSignalDeferred


/**
 * Initialize OneSignal Push Notifications.
 * Because we now init in index.html, this function just handles post-init logic
 * like checking permissions and getting IDs.
 */
export async function initPushNotifications(userId) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('[Dev] Skipping OneSignal init on localhost');
        return;
    }
    try {
        // OneSignal is globally available via OneSignalDeferred
        window.OneSignalDeferred = window.OneSignalDeferred || [];

        window.OneSignalDeferred.push(async function (OneSignal) {
            console.log('OneSignal accessed from React service');

            // Defensive check for OneSignal objects
            if (!OneSignal || !OneSignal.Notifications) {
                console.warn('OneSignal Notifications API not ready');
                return;
            }

            // v16 API Check
            const permission = OneSignal.Notifications.permission;

            if (!permission) {
                // Defensive check before requesting permission
                if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
                    await OneSignal.Notifications.requestPermission();
                }
            }

            // Defensive check for User Subscription
            if (OneSignal.User) {
                // Sync Supabase UID as OneSignal External ID
                if (userId) {
                    console.log('Linking OneSignal External ID to:', userId);
                    OneSignal.login(userId);
                }

                if (OneSignal.User.PushSubscription) {
                    const subscriptionId = OneSignal.User.PushSubscription.id;
                    if (subscriptionId) {
                        console.log('OneSignal Subscription ID:', subscriptionId);

                        // Sync with Supabase Profile
                        if (userId) {
                            try {
                                const { error } = await supabase
                                    .from('profiles')
                                    .update({ onesignal_id: subscriptionId })
                                    .eq('id', userId);

                                if (error) console.error('Error syncing OneSignal ID to Supabase:', error);
                                else console.log('Successfully synced OneSignal ID to profile');
                            } catch (err) {
                                console.error('Push sync error:', err);
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('OneSignal Service Error:', error);
    }
}

/**
 * Send a notification (Client-side trigger - usually for testing or local alerts).
 * For real production apps, trigger via OneSignal REST API from Supabase Edge Functions.
 */
export async function sendLocalNotification(title, message) {
    console.log(`[Mock Push] ${title}: ${message}`);
    // OneSignal doesn't support direct client-to-client push for security.
    // This would typically involve calling your backend.
}
