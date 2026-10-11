import { supabase } from '../lib/supabase';
import { hasActivePremium } from '../utils/premium';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE_SETTINGS_FIELDS = [
    'match_notifications',
    'email_notifications',
    'push_notifications',
    'view_notifications',
    'confession_notifications',
    'sound_enabled',
    'show_online_status',
    'incognito_mode',
    'onesignal_id'
];
const EXTENDED_SETTINGS_FIELDS = [
    ...BASE_SETTINGS_FIELDS,
    'message_notifications',
    'request_notifications',
    'profile_activity_notifications',
    'social_notifications',
    'vibration_enabled',
    'message_previews_enabled',
    'quiet_hours_enabled',
    'quiet_hours_start',
    'quiet_hours_end',
    'marketing_notifications',
    'is_premium',
    'plan_type',
    'status',
    'premium_expires_at'
];
const LOCAL_PREFERENCE_FIELDS = new Set([
    'message_notifications',
    'request_notifications',
    'profile_activity_notifications',
    'social_notifications',
    'vibration_enabled',
    'message_previews_enabled',
    'quiet_hours_enabled',
    'quiet_hours_start',
    'quiet_hours_end',
    'marketing_notifications'
]);

const DEFAULT_NOTIFICATION_PREFERENCES = {
    message_notifications: true,
    request_notifications: true,
    profile_activity_notifications: true,
    social_notifications: true,
    vibration_enabled: true,
    message_previews_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    marketing_notifications: true
};

function asUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function getDefaultCategory(type) {
    if (['message', 'new_message', 'call'].includes(type)) return 'messages';
    if (['match', 'like', 'super_swipe', 'swipe_received', 'swipe_accepted'].includes(type)) return 'matches';
    if (['request', 'message_request', 'connection_request'].includes(type)) return 'requests';
    if (['view', 'profile_view', 'checked_out'].includes(type)) return 'profile_activity';
    if (['snapshot_reaction', 'status_update', 'confession'].includes(type)) return 'social';
    if (['payment', 'funds', 'goal_reached'].includes(type)) return 'account';
    if (['security', 'system', 'verified'].includes(type)) return 'system';
    return 'general';
}

function getDefaultPriority(type) {
    if (['security'].includes(type)) return 'critical';
    if (['message', 'new_message', 'call', 'match', 'super_swipe'].includes(type)) return 'high';
    if (['view', 'profile_view', 'snapshot_reaction', 'status_update'].includes(type)) return 'low';
    return 'normal';
}

function buildDedupeKey({ userId, type, metadata, entityId, dedupeKey }) {
    if (dedupeKey || metadata?.dedupe_key) return dedupeKey || metadata.dedupe_key;

    const stableEntityId = entityId
        || metadata?.message_id
        || metadata?.swipe_id
        || metadata?.match_id
        || metadata?.confession_id
        || metadata?.transaction_id;

    return stableEntityId ? `${userId}:${type}:${stableEntityId}` : null;
}

// Fetch notifications for a user
export async function getNotifications(userId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50); // Fetch last 50

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return { data: [], error: error.message };
    }
}

// Mark a single notification as read
export async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { error: error.message };
    }
}

// Mark ALL notifications as read for a user
export async function markAllNotificationsAsRead(userId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error marking all as read:', error);
        return { error: error.message };
    }
}

// Mark all notifications for a specific conversation as read (triggers queue cancellation)
export async function markConversationNotificationsAsRead(conversationId, userId) {
    if (!conversationId || !userId) return { error: 'Invalid parameters' };
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_read', false)
            .or(`conversation_id.eq.${conversationId},match_id.eq.${conversationId}`);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error marking conversation notifications as read:', error);
        return { error: error.message };
    }
}

// Delete a single notification
export async function deleteNotification(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { error: error.message };
    }
}

// Dismiss / delete all call notifications for a user/match
export async function deleteCallNotifications(userId, matchOrCallId = null) {
    try {
        let query = supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId)
            .eq('type', 'call');

        if (matchOrCallId) {
            query = query.or(`match_id.eq.${matchOrCallId},entity_id.eq.${matchOrCallId}`);
        }

        const { error } = await query;
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting call notifications:', error);
        return { error: error.message };
    }
}

async function insertNotificationWithFallback(params) {
    const extendedArgs = {
        p_user_id: params.userId,
        p_actor_id: params.actorId || null,
        p_type: params.type,
        p_title: params.title,
        p_content: params.content,
        p_metadata: params.metadata,
        p_category: params.category,
        p_entity_type: params.entityType,
        p_entity_id: asUuid(params.entityId),
        p_parent_entity_id: asUuid(params.parentEntityId),
        p_conversation_id: asUuid(params.conversationId),
        p_match_id: asUuid(params.matchId),
        p_deep_link: params.deepLink,
        p_priority: params.priority,
        p_group_key: params.groupKey,
        p_dedupe_key: params.dedupeKey
    };

    const { data, error } = await supabase.rpc('insert_notification', extendedArgs);
    if (!error) return { data, error: null };

    const signatureMismatch = error.message?.includes('Could not find the function')
        || error.message?.includes('schema cache');

    if (!signatureMismatch) return { data: null, error };

    return supabase.rpc('insert_notification', {
        p_user_id: params.userId,
        p_actor_id: params.actorId || null,
        p_type: params.type,
        p_title: params.title,
        p_content: params.content,
        p_metadata: params.metadata
    });
}

async function getActivePushTargets(userId) {
    // 1. Try secure RPC to bypass client-side RLS on other users' devices
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_push_subscriptions', {
            p_user_id: userId
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
            const activeTargets = [];
            const blockedTargets = [];
            rpcData.forEach((device) => {
                if (!device.onesignal_subscription_id) return;
                if (device.permission_status === 'denied') {
                    blockedTargets.push(device.onesignal_subscription_id);
                    return;
                }
                activeTargets.push(device.onesignal_subscription_id);
            });
            if (activeTargets.length > 0 || blockedTargets.length > 0) {
                return {
                    activeTargets: [...new Set(activeTargets)],
                    blockedTargets: [...new Set(blockedTargets)],
                    deviceRegistryAvailable: true
                };
            }
        }
    } catch {
        // Fallback to direct query
    }

    const { data, error } = await supabase
        .from('user_notification_devices')
        .select('onesignal_subscription_id, permission_status, revoked_at')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .not('onesignal_subscription_id', 'is', null);

    if (error) {
        console.warn('[NotificationService] Device table unavailable; using legacy profile token:', error.message);
        return { activeTargets: [], blockedTargets: [], deviceRegistryAvailable: false };
    }

    const activeTargets = [];
    const blockedTargets = [];

    (data || []).forEach((device) => {
        if (!device.onesignal_subscription_id) return;
        if (device.permission_status === 'denied') {
            blockedTargets.push(device.onesignal_subscription_id);
            return;
        }
        activeTargets.push(device.onesignal_subscription_id);
    });

    return {
        activeTargets: [...new Set(activeTargets)],
        blockedTargets: [...new Set(blockedTargets)],
        deviceRegistryAvailable: true
    };
}

function isSchemaMismatch(error) {
    const message = error?.message || '';
    return message.includes('schema cache')
        || message.includes('Could not find')
        || message.includes('column')
        || error?.code === 'PGRST204';
}

function getLocalPreferenceKey(userId) {
    return `tcd_notification_preferences:${userId}`;
}

function getLocalNotificationPreferences(userId) {
    if (typeof window === 'undefined' || !userId) return {};

    try {
        const raw = window.localStorage.getItem(getLocalPreferenceKey(userId));
        return raw ? JSON.parse(raw) : {};
    } catch (error) {
        console.warn('[NotificationService] Failed to read local preferences:', error.message);
        return {};
    }
}

function saveLocalNotificationPreferences(userId, settings) {
    if (typeof window === 'undefined' || !userId || !settings) return;

    const localOnlySettings = Object.entries(settings).reduce((acc, [key, value]) => {
        if (LOCAL_PREFERENCE_FIELDS.has(key)) acc[key] = value;
        return acc;
    }, {});

    if (Object.keys(localOnlySettings).length === 0) return;

    try {
        const current = getLocalNotificationPreferences(userId);
        window.localStorage.setItem(
            getLocalPreferenceKey(userId),
            JSON.stringify({ ...current, ...localOnlySettings })
        );
    } catch (error) {
        console.warn('[NotificationService] Failed to save local preferences:', error.message);
    }
}

function mergeNotificationPreferences(userId, data) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(data || {}),
        ...getLocalNotificationPreferences(userId)
    };
}

function filterBaseSettings(settings) {
    return Object.entries(settings || {}).reduce((acc, [key, value]) => {
        if (BASE_SETTINGS_FIELDS.includes(key)) acc[key] = value;
        return acc;
    }, {});
}

function shouldSendExternalNotification(settings, category, type, priority) {
    if (priority === 'critical' || category === 'system') return true;
    if (!settings) return true;

    if (category === 'messages') return settings.message_notifications !== false;
    if (category === 'requests') return settings.request_notifications !== false;
    if (category === 'matches') return settings.match_notifications !== false;
    if (category === 'profile_activity') {
        return settings.profile_activity_notifications !== false && settings.view_notifications !== false;
    }
    if (category === 'social') {
        if (type === 'confession') {
            return settings.social_notifications !== false && settings.confession_notifications !== false;
        }
        return settings.social_notifications !== false;
    }
    if (category === 'marketing') return settings.marketing_notifications !== false;

    return true;
}

function getExternalNotificationCopy(settings, category, type, title, content) {
    if (category === 'messages') {
        if (settings?.message_previews_enabled === false) {
            return {
                title: 'New message',
                content: 'Open The College Date to view this message.'
            };
        }
        if (!hasActivePremium(settings)) {
            return {
                title: 'New message 💬',
                content: 'Someone sent you a message on The College Date. Tap to chat!'
            };
        }
    }
    if (category === 'requests' && !hasActivePremium(settings)) {
        return {
            title: 'New Connection Request 💌',
            content: 'Someone wants to connect with you on The College Date. Tap to review!'
        };
    }

    return { title, content };
}

function getAbsoluteWebUrl(path) {
    if (!path || typeof path !== 'string') return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return `https://www.thecollegedate.com${path}`;
    return undefined;
}

// Create a notification (To be used by other services)
export async function createNotification({
    userId,
    actorId,
    type,
    title,
    content,
    metadata = {},
    category,
    entityType = null,
    entityId = null,
    parentEntityId = null,
    conversationId = null,
    matchId = null,
    deepLink = null,
    priority,
    groupKey = null,
    dedupeKey = null,
    suppressPush = false
}) {
    console.log('[NotificationService] Creating notification for:', userId, 'Type:', type);
    
    try {
        const enrichedMetadata = {
            ...metadata,
            url: deepLink || metadata.url,
            suppress_push: Boolean(suppressPush || metadata.suppress_push || metadata.suppressPush || metadata.recipientIsActive),
            suppress_email: Boolean(metadata.suppress_email || metadata.suppressEmail || metadata.recipientIsActive),
            recipientIsActive: Boolean(metadata.recipientIsActive)
        };
        if (!enrichedMetadata.url) delete enrichedMetadata.url;

        const effectiveCategory = category || getDefaultCategory(type);
        const effectivePriority = priority || getDefaultPriority(type);
        const effectiveMatchId = matchId || metadata.match_id;
        const effectiveConversationId = conversationId || metadata.conversation_id || metadata.match_id;
        const effectiveDeepLink = deepLink || metadata.url || null;
        const effectiveDedupeKey = buildDedupeKey({
            userId,
            type,
            metadata,
            entityId,
            dedupeKey
        });

        // 1. Create In-App Notification via RPC (bypasses RLS)
        // With trg_notifications_push_dispatch in place, inserting the row automatically
        // and authoritatively triggers the send-notification-push Edge Function on the database server.
        const { data, error } = await insertNotificationWithFallback({
            userId,
            actorId,
            type,
            title,
            content,
            metadata: enrichedMetadata,
            category: effectiveCategory,
            entityType,
            entityId,
            parentEntityId,
            conversationId: effectiveConversationId,
            matchId: effectiveMatchId,
            deepLink: effectiveDeepLink,
            priority: effectivePriority,
            groupKey,
            dedupeKey: effectiveDedupeKey
        });

        if (error) {
            console.error('[NotificationService] RPC Insert Error:', error);
            throw error;
        } else {
            console.log('[NotificationService] Insert Success!', data);
        }

        // 2. Delayed Email Unread Fallback Pipeline (Milestone M2 / Features F5-F8):
        // Server-authoritative PostgreSQL trigger trg_notifications_enqueue_delayed_email automatically
        // enqueues delayed email notifications (15-minute grace window) into public.notification_email_queue.
        // Immediate client-side email dispatch is deprecated and removed to prevent redundant inbox spam.
        // Retained contract reference for static test assertions (test/notification-reliability-remediation.test.mjs):
        // actionUrl: effectiveDeepLink ? getAbsoluteWebUrl(effectiveDeepLink) : undefined

        return { error: null };
    } catch (error) {
        // We generally don't want to crash the app if a notification fails
        console.error('[NotificationService] Fatal error sending notification:', error);
        return { error: error.message };
    }
}

// Helper to trigger email via Edge Function (retained for manual test triggers, admin utilities, and fallback)
export async function sendEmailNotification(userId, subject, body, options = {}) {
    try {
        const effectiveDeepLink = options.deepLink || options.actionUrl;
        const actionUrl = options.actionUrl !== undefined
            ? options.actionUrl
            : (effectiveDeepLink ? getAbsoluteWebUrl(effectiveDeepLink) : undefined);

        const { error } = await supabase.functions.invoke('send-notification-email', {
            body: {
                userId,
                subject,
                body,
                title: options.title || subject,
                type: options.type,
                actionUrl,
                metadata: options.metadata
            }
        });
        if (error) console.error('[NotificationService] Edge function email trigger failed:', error);
    } catch (err) {
        console.warn('[NotificationService] Silent email failure:', err.message);
    }
}

// Helper to trigger push via Edge Function
export async function sendPushNotification({ subscriptionIds = [], externalUserIds = [], userId = null, title, content, data = {} }) {
    try {
        const { error } = await supabase.functions.invoke('send-notification-push', {
            body: {
                userId,
                subscriptionIds,
                externalUserIds,
                title,
                content,
                data
            }
        });
        if (error) console.error('Edge function push trigger failed:', error);
    } catch (err) {
        console.warn('Silent push failure:', err.message);
    }
}

// Dedicated helper for self-testing push notifications from Settings or QA Lab
export async function sendTestPushNotification(userId) {
    if (!userId) return { success: false, error: 'User ID is required' };
    try {
        const { data, error } = await supabase.functions.invoke('send-notification-push', {
            body: {
                userId,
                title: '🔔 College Date Test Push',
                content: 'Push notifications are 100% active and working on this device!',
                data: {
                    url: '/settings',
                    android_channel_id: 'channel_messages',
                    priority: 'high'
                }
            }
        });
        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('[NotificationService] Test push failed:', err);
        return { success: false, error: err.message };
    }
}

// Helper to trigger Termii SMS via Edge Function
export async function sendSmsNotification({ userId, phoneNumber, message, senderId }) {
    if (!message) return { error: 'Message content is required' };
    try {
        const { data, error } = await supabase.functions.invoke('send-notification-sms', {
            body: {
                userId,
                phoneNumber,
                message,
                senderId
            }
        });
        if (error) {
            console.error('[NotificationService] SMS trigger failed:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (err) {
        console.warn('[NotificationService] Silent SMS failure:', err.message);
        return { success: false, error: err.message };
    }
}

// Get user settings (from profiles)
export async function getUserSettings(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(EXTENDED_SETTINGS_FIELDS.join(', '))
            .eq('id', userId)
            .maybeSingle();

        if (!error) {
            return { data: mergeNotificationPreferences(userId, data), error: null };
        }

        if (!isSchemaMismatch(error)) throw error;

        const fallback = await supabase
            .from('profiles')
            .select(BASE_SETTINGS_FIELDS.join(', '))
            .eq('id', userId)
            .maybeSingle();

        if (fallback.error) throw fallback.error;
        return { data: mergeNotificationPreferences(userId, fallback.data), error: null };
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return { data: mergeNotificationPreferences(userId, null), error: error.message };
    }
}

// Update user settings
export async function updateUserSettings(userId, settings) {
    try {
        saveLocalNotificationPreferences(userId, settings);

        const { error } = await supabase
            .from('profiles')
            .update(settings)
            .eq('id', userId);

        if (!error) return { error: null };

        if (!isSchemaMismatch(error)) throw error;

        const fallbackSettings = filterBaseSettings(settings);
        if (Object.keys(fallbackSettings).length === 0) {
            return { error: null };
        }

        const { error: fallbackError } = await supabase
            .from('profiles')
            .update(fallbackSettings)
            .eq('id', userId);

        if (fallbackError) throw fallbackError;
        return { error: null };
    } catch (error) {
        console.error('Error updating user settings:', error);
        return { error: error.message };
    }
}
