import { supabase } from '../lib/supabase';

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

// Create a notification (To be used by other services)
export async function createNotification({ userId, actorId, type, title, content, metadata = {} }) {
    try {
        // 1. Create In-App Notification
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                actor_id: actorId || null,
                type,
                title,
                content,
                metadata
            });

        if (error) throw error;

        // 2. Trigger Email Notification (if user has it enabled)
        const { data: settings } = await getUserSettings(userId);
        if (settings?.email_notifications) {
            await sendEmailNotification(userId, title, content);
        }

        // 3. Trigger Push Notification (OneSignal)
        if (settings?.push_notifications && settings?.onesignal_id) {
            await sendPushNotification(settings.onesignal_id, title, content, metadata);
        }

        return { error: null };
    } catch (error) {
        // We generally don't want to crash the app if a notification fails
        console.error('Error sending notification:', error);
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
async function sendPushNotification(onesignalId, title, content, data = {}) {
    try {
        const { error } = await supabase.functions.invoke('send-notification-push', {
            body: { onesignalId, title, content, data }
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
            .select('match_notifications, email_notifications, push_notifications, show_online_status, incognito_mode, onesignal_id')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return { data: null, error: error.message };
    }
}

// Update user settings
export async function updateUserSettings(userId, settings) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update(settings)
            .eq('id', userId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error updating user settings:', error);
        return { error: error.message };
    }
}
