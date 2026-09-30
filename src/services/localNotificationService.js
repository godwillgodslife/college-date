import { Capacitor } from '@capacitor/core';

let LocalNotifications = null;
let isInitialized = false;
let actionCallback = null;

const CALL_NOTIFICATION_ID = 7771;

export function isNativePlatform() {
    return Capacitor.isNativePlatform();
}

/**
 * Initialize Android notification channels, action types, and listeners
 */
export async function initLocalNotifications(onActionHandler = null) {
    if (actionCallback && onActionHandler) {
        actionCallback = onActionHandler;
    }
    if (!isNativePlatform()) return;

    try {
        if (!LocalNotifications) {
            const module = await import('@capacitor/local-notifications');
            LocalNotifications = module.LocalNotifications;
        }

        if (onActionHandler) {
            actionCallback = onActionHandler;
        }

        if (!isInitialized) {
            // Request permission on Android 13+
            try {
                const status = await LocalNotifications.checkPermissions();
                if (status.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            } catch (permErr) {
                console.warn('[LocalNotifications] Permission check error:', permErr);
            }

            // 1. Create Android Notification Channels
            await LocalNotifications.createChannel({
                id: 'incoming_calls',
                name: 'Incoming Calls',
                description: 'Full-screen and heads-up notifications for incoming calls',
                importance: 5, // MAX importance for heads-up notification
                visibility: 1, // PUBLIC
                sound: 'default',
                vibration: true,
                lights: true,
                lightColor: '#8b5cf6'
            });

            await LocalNotifications.createChannel({
                id: 'chat_messages',
                name: 'Chat Messages',
                description: 'Notifications for direct student messages',
                importance: 4, // HIGH
                visibility: 1,
                sound: 'default',
                vibration: true,
                lights: true,
                lightColor: '#ec4899'
            });

            // 2. Register Action Types for Incoming Calls (Accept / Decline buttons)
            await LocalNotifications.registerActionTypes({
                types: [
                    {
                        id: 'INCOMING_CALL',
                        actions: [
                            {
                                id: 'accept',
                                title: 'Accept 📞',
                                foreground: true
                            },
                            {
                                id: 'decline',
                                title: 'Decline ✕',
                                destructive: true,
                                foreground: false
                            }
                        ]
                    }
                ]
            });

            // 3. Register Action Performed Listener
            LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
                console.log('[LocalNotifications] Action performed:', action.actionId, action.notification);
                if (action.notification.id === CALL_NOTIFICATION_ID) {
                    // Auto-cancel call notification
                    try {
                        await LocalNotifications.cancel({ notifications: [{ id: CALL_NOTIFICATION_ID }] });
                    } catch (e) {
                        // ignore
                    }
                }

                if (actionCallback) {
                    actionCallback({
                        actionId: action.actionId,
                        notification: action.notification,
                        extra: action.notification.extra || {}
                    });
                }
            });

            isInitialized = true;
            console.log('[LocalNotifications] Channels and action types initialized successfully.');
        }
    } catch (err) {
        console.error('[LocalNotifications] Initialization error:', err);
    }
}

/**
 * Display high-priority Heads-up notification for incoming voice/video call
 */
export async function showIncomingCallNotification(callData) {
    if (!isNativePlatform()) return;
    try {
        if (!LocalNotifications) {
            const module = await import('@capacitor/local-notifications');
            LocalNotifications = module.LocalNotifications;
        }

        const callTypeLabel = callData.callType === 'video' ? 'Video Call' : 'Voice Call';
        const callerName = callData.callerName || 'Campus Match';

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: CALL_NOTIFICATION_ID,
                    title: `Incoming ${callTypeLabel}`,
                    body: `${callerName} is calling you on The College Date...`,
                    channelId: 'incoming_calls',
                    actionTypeId: 'INCOMING_CALL',
                    ongoing: true,
                    autoCancel: true,
                    extra: {
                        callId: callData.callId,
                        matchId: callData.matchId,
                        callerId: callData.callerId,
                        callerName,
                        callerAvatar: callData.callerAvatar,
                        callType: callData.callType || 'voice'
                    }
                }
            ]
        });
        console.log('[LocalNotifications] Scheduled incoming call notification:', callData);
    } catch (err) {
        console.error('[LocalNotifications] Failed to schedule incoming call:', err);
    }
}

/**
 * Cancel incoming call notification (e.g. after answered, declined, or caller hung up)
 */
export async function cancelIncomingCallNotification() {
    if (!isNativePlatform()) return;
    try {
        if (!LocalNotifications) {
            const module = await import('@capacitor/local-notifications');
            LocalNotifications = module.LocalNotifications;
        }
        await LocalNotifications.cancel({
            notifications: [{ id: CALL_NOTIFICATION_ID }]
        });
        console.log('[LocalNotifications] Cancelled incoming call notification.');
    } catch (err) {
        console.warn('[LocalNotifications] Error cancelling notification:', err);
    }
}

/**
 * Display local chat message notification
 */
export async function showChatMessageNotification({ senderName, messageText, matchId }) {
    if (!isNativePlatform()) return;
    try {
        if (!LocalNotifications) {
            const module = await import('@capacitor/local-notifications');
            LocalNotifications = module.LocalNotifications;
        }

        const notifId = Math.floor(Date.now() % 100000);
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: notifId,
                    title: senderName || 'New Message',
                    body: messageText || 'You received a new message.',
                    channelId: 'chat_messages',
                    extra: { matchId }
                }
            ]
        });
    } catch (err) {
        console.warn('[LocalNotifications] Chat notification error:', err);
    }
}
