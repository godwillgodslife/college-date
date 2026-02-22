// OneSignal is now handled via script tag in index.html and window.OneSignalDeferred


/**
 * Initialize OneSignal Push Notifications.
 * Because we now init in index.html, this function just handles post-init logic
 * like checking permissions and getting IDs.
 */
export async function initPushNotifications() {
    try {
        // Skip OneSignal errors on localhost (requires HTTPS/Domain)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('OneSignal: Skipping initialization on localhost to avoid domain errors.');
            return;
        }

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
                // Defensive check for Slidedown
                if (OneSignal.Slidedown) {
                    await OneSignal.Slidedown.prompt();
                }
            }

            // Defensive check for User Subscription
            if (OneSignal.User && OneSignal.User.PushSubscription) {
                const subscriptionId = OneSignal.User.PushSubscription.id;
                if (subscriptionId) {
                    console.log('OneSignal Subscription ID:', subscriptionId);
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
