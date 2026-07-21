import { supabase } from '../lib/supabase';

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
    'marketing_notifications'
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
            .update({ is_read: true })
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
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error marking all as read:', error);
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

function getExternalNotificationCopy(settings, category, title, content) {
    if (category !== 'messages' || settings?.message_previews_enabled !== false) {
        return { title, content };
    }

    return {
        title: 'New message',
        content: 'Open The College Date to view this message.'
    };
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
    dedupeKey = null
}) {
    console.log('[NotificationService] Creating notification for:', userId, 'Type:', type);
    
    try {
        const enrichedMetadata = {
            ...metadata,
            url: deepLink || metadata.url
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

        // 2. Trigger Email/Push Notification (if user has it enabled)
        const { data: settings } = await getUserSettings(userId);
        const shouldSendExternally = shouldSendExternalNotification(
            settings,
            effectiveCategory,
            type,
            effectivePriority
        );
        const externalCopy = getExternalNotificationCopy(settings, effectiveCategory, title, content);

        if (!shouldSendExternally) {
            return { error: null };
        }

        if (settings?.email_notifications) {
            await sendEmailNotification(userId, externalCopy.title, externalCopy.content);
        }

        // 3. Trigger Push Notification (OneSignal)
        if (settings?.push_notifications) {
            const pushTargetState = await getActivePushTargets(userId);
            const legacyTarget = settings.onesignal_id && !pushTargetState.blockedTargets.includes(settings.onesignal_id)
                ? settings.onesignal_id
                : null;
            const pushTargets = pushTargetState.activeTargets.length > 0
                ? pushTargetState.activeTargets
                : [legacyTarget].filter(Boolean);
            const externalUserIds = pushTargets.length > 0 || pushTargetState.deviceRegistryAvailable
                ? []
                : [userId];

            if (pushTargets.length === 0 && externalUserIds.length === 0) {
                return { error: null };
            }

            await sendPushNotification({
                subscriptionIds: pushTargets,
                externalUserIds,
                title: externalCopy.title,
                content: externalCopy.content,
                data: {
                    ...enrichedMetadata,
                    notification_id: data?.id,
                    type,
                    category: effectiveCategory,
                    priority: effectivePriority,
                    group_key: groupKey || effectiveCategory,
                    dedupe_key: effectiveDedupeKey,
                    collapse_id: effectiveDedupeKey || undefined,
                    url: effectiveDeepLink || enrichedMetadata.url,
                    web_url: getAbsoluteWebUrl(effectiveDeepLink || enrichedMetadata.url),
                    actor_avatar_url: metadata.actor_avatar_url || metadata.avatar_url,
                    image_url: metadata.image_url || metadata.actor_avatar_url || metadata.avatar_url
                }
            });
        }

        return { error: null };
    } catch (error) {
        // We generally don't want to crash the app if a notification fails
        console.error('[NotificationService] Fatal error sending notification:', error);
        return { error: error.message };
    }
}

// Helper to trigger email via Edge Function
async function sendEmailNotification(userId, subject, body) {
    try {
        // We call a Supabase Edge Function that handles the actual SMTP/SendGrid logic
        const { error } = await supabase.functions.invoke('send-notification-email', {
            body: { userId, subject, body }
        });
        if (error) console.error('Edge function email trigger failed:', error);
    } catch (err) {
        console.warn('Silent email failure:', err.message);
    }
}

// Helper to trigger push via Edge Function
async function sendPushNotification({ subscriptionIds = [], externalUserIds = [], title, content, data = {} }) {
    try {
        const { error } = await supabase.functions.invoke('send-notification-push', {
            body: {
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
