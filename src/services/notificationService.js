import { supabase } from '../lib/supabase';

// Fetch notifications for a user
export async function getNotifications(userId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
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
            .eq('recipient_id', userId)
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
        const { error } = await supabase
            .from('notifications')
            .insert({
                recipient_id: userId,
                sender_id: actorId || null,
                type,
                title,
                content,
                metadata
            });

        if (error) throw error;
        return { error: null };
    } catch (error) {
        // We generally don't want to crash the app if a notification fails
        console.error('Error sending notification:', error);
        return { error: error.message };
    }
}

// Get user settings (from profiles)
export async function getUserSettings(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('match_notifications, email_notifications, push_notifications, show_online_status, incognito_mode')
            .eq('id', userId)
            .single();

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
