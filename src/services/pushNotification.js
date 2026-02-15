import OneSignal from 'react-onesignal';

/**
 * Initialize OneSignal Push Notifications.
 * Call this in your main App.jsx or a top-level provider.
 */
export async function initPushNotifications() {
    try {
        await OneSignal.init({
            appId: "YOUR_ONESIGNAL_APP_ID", // TODO: Replace with actual ID
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
                enable: true,
            },
        });
        console.log('OneSignal initialized');

        // Check permission
        const permission = await OneSignal.getNotificationPermission();
        console.log('Notification Permission:', permission);

        if (permission === 'default') {
            await OneSignal.showSlidedownPrompt();
        }

        // Get Player ID (Device ID)
        const deviceId = await OneSignal.getPlayerId();
        if (deviceId) {
            console.log('OneSignal Player ID:', deviceId);
            // TODO: Save this deviceId to the user's profile in Supabase 
            // if you want to target specific users from the backend
        }

    } catch (error) {
        console.error('OneSignal Init Error:', error);
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
