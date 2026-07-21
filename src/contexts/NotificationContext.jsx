import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    getNotifications,
    getUserSettings,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../services/notificationService';
import { useToast } from '../components/Toast';
import {
    countUnreadByCategory,
    getNotificationCategory,
    getNotificationDeepLink,
    isViewingNotificationDestination
} from '../utils/notificationRouting';
import { 
    playNotificationDing, 
    playMatchSuccess, 
    playLikePop, 
    playViewChime, 
    playSocialFlutter, 
    playMoneySound, 
    playSystemPock 
} from '../lib/audioContext';
import { triggerLightHaptic } from '../utils/haptics';
import { CACHE_LIMITS, CACHE_TTL } from '../lib/cachePolicy';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { enqueueOfflineOperation, removeOfflineOperation } from '../lib/offlineQueue';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

const SOUND_MAP = {
    message: playNotificationDing,
    match: playMatchSuccess,
    like: playLikePop,
    super_swipe: playLikePop,
    call: playNotificationDing,
    view: playViewChime,
    profile_view: playViewChime,
    payment: playMoneySound,
    goal_reached: playMoneySound,
    snapshot_reaction: playSocialFlutter,
    status_update: playSocialFlutter,
    system: playSystemPock
};

function minutesFromTime(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
    return (hours * 60) + minutes;
}

function isQuietHoursActive(profile) {
    if (profile?.quiet_hours_enabled !== true) return false;

    const start = minutesFromTime(profile.quiet_hours_start, 22 * 60);
    const end = minutesFromTime(profile.quiet_hours_end, 7 * 60);
    const now = new Date();
    const current = (now.getHours() * 60) + now.getMinutes();

    if (start === end) return false;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
}

function isCriticalNotification(notification) {
    const category = getNotificationCategory(notification);
    const priority = notification?.priority || notification?.metadata?.priority;

    return priority === 'critical'
        || category === 'system'
        || notification?.type === 'security';
}

function allowsForegroundAlert(profile, notification) {
    if (isCriticalNotification(notification)) return true;

    const category = getNotificationCategory(notification);
    const type = notification?.type;

    if (category === 'messages') return profile?.message_notifications !== false;
    if (category === 'requests') return profile?.request_notifications !== false;
    if (category === 'matches') return profile?.match_notifications !== false;
    if (category === 'profile_activity') {
        return profile?.profile_activity_notifications !== false && profile?.view_notifications !== false;
    }
    if (category === 'social') {
        if (type === 'confession') {
            return profile?.social_notifications !== false && profile?.confession_notifications !== false;
        }
        return profile?.social_notifications !== false;
    }

    return true;
}

function getForegroundNotificationCopy(profile, notification) {
    const category = getNotificationCategory(notification);
    if (category === 'messages' && profile?.message_previews_enabled === false) {
        return {
            title: 'New message',
            body: 'Open The College Date to view this message.'
        };
    }

    return {
        title: notification?.title || 'New notification',
        body: notification?.content || ''
    };
}

function getForegroundNotificationMeta(notification) {
    const category = getNotificationCategory(notification);
    if (category === 'messages') return 'Message';
    if (category === 'matches') return 'Match';
    if (category === 'requests') return 'Request';
    if (category === 'profile_activity') return 'Profile activity';
    if (category === 'social') return 'Campus activity';
    if (category === 'account') return 'Account';
    if (category === 'system') return 'System';
    return 'Tap to open';
}

function getForegroundNotificationIcon(notification) {
    const category = getNotificationCategory(notification);
    if (category === 'messages') return 'M';
    if (category === 'matches') return 'CD';
    if (category === 'requests') return '+';
    if (category === 'profile_activity') return 'V';
    if (category === 'social') return '#';
    if (category === 'account') return '$';
    if (category === 'system') return '!';
    return 'CD';
}

export function NotificationProvider({ children }) {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadByCategory, setUnreadByCategory] = useState({ total: 0 });

    // Use a ref for userProfile to keep the realtime callback 'fresh' without re-subscribing
    const profileRef = useRef(userProfile);
    useEffect(() => {
        profileRef.current = userProfile;
    }, [userProfile]);

    useEffect(() => {
        const handleSettingsUpdate = (event) => {
            profileRef.current = {
                ...(profileRef.current || {}),
                ...(event.detail || {})
            };
        };

        window.addEventListener('tcd:notification-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('tcd:notification-settings-updated', handleSettingsUpdate);
    }, []);

    // Load initial notifications
    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            setUnreadByCategory({ total: 0 });
            return;
        }

        const loadNotifications = async () => {
            try {
                const cachedNotifications = getCachedData(['notifications', currentUser.id], {
                    ttlMs: CACHE_TTL.notifications,
                    allowStale: true
                });
                if (cachedNotifications) {
                    const counts = countUnreadByCategory(cachedNotifications);
                    setNotifications(cachedNotifications);
                    setUnreadCount(counts.total);
                    setUnreadByCategory(counts);
                }

                const [{ data, error }, { data: settings }] = await Promise.all([
                    getNotifications(currentUser.id),
                    getUserSettings(currentUser.id)
                ]);

                if (settings) {
                    profileRef.current = {
                        ...(profileRef.current || {}),
                        ...settings
                    };
                }

                if (error) {
                    console.error('Failed to load notifications:', error);
                    return;
                }
                const validData = Array.isArray(data) ? data : [];
                setNotifications(validData);
                setCachedData(['notifications', currentUser.id], validData.slice(0, CACHE_LIMITS.notifications), {
                    userId: currentUser.id,
                    type: 'notifications'
                });
                const counts = countUnreadByCategory(validData);
                setUnreadCount(counts.total);
                setUnreadByCategory(counts);
            } catch (err) {
                console.error('NotificationContext load error:', err);
            }
        };

        loadNotifications();

        // Subscribe to Realtime Insert events with Auto-Retry logic
        let channel;
        let retryTimeout;

        const subscribeWithRetry = () => {
            if (!currentUser) return;
            
            console.log('[Notifications] Initializing stable realtime channel...');
            channel = supabase
                .channel(`public:notifications:${currentUser.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${currentUser.id}`
                    },
                    (payload) => {
                        const newNotification = payload.new;
                        console.log('[Notifications] New entry:', newNotification.type);

                        const alreadyViewingDestination = isViewingNotificationDestination(
                            newNotification,
                            window.location.pathname,
                            window.location.search
                        );
                        const nextNotification = alreadyViewingDestination
                            ? { ...newNotification, is_read: true, read_at: new Date().toISOString() }
                            : newNotification;

                        setNotifications(prev => {
                            const nextNotifications = [nextNotification, ...prev].slice(0, CACHE_LIMITS.notifications);
                            setCachedData(['notifications', currentUser.id], nextNotifications, {
                                userId: currentUser.id,
                                type: 'notifications'
                            });
                            return nextNotifications;
                        });

                        if (alreadyViewingDestination) {
                            markNotificationAsRead(newNotification.id).catch((error) => {
                                console.warn('[Notifications] Auto-read failed:', error);
                            });
                        }

                        if (!alreadyViewingDestination) {
                            const quietNow = isQuietHoursActive(profileRef.current);
                            const critical = isCriticalNotification(newNotification);
                            const categoryAllowed = allowsForegroundAlert(profileRef.current, newNotification);
                            const shouldInterrupt = categoryAllowed && (!quietNow || critical);

                            if (shouldInterrupt && profileRef.current?.vibration_enabled !== false) {
                                triggerLightHaptic();
                            }

                            if (shouldInterrupt && typeof addToast === 'function') {
                                const destination = getNotificationDeepLink(newNotification);
                                const copy = getForegroundNotificationCopy(profileRef.current, newNotification);

                                addToast(copy.title, 'info', 6500, {
                                    variant: 'notification',
                                    title: copy.title,
                                    body: copy.body,
                                    icon: getForegroundNotificationIcon(newNotification),
                                    meta: getForegroundNotificationMeta(newNotification),
                                    onClick: () => {
                                        navigate(destination.to, destination.state ? { state: destination.state } : undefined);
                                    }
                                });
                            }

                            const playSound = SOUND_MAP[newNotification.type] || playNotificationDing;

                            if (shouldInterrupt && profileRef.current?.sound_enabled !== false) {
                                playSound();
                            }
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Notifications] Stable channel active ✓');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn(`[Notifications] Realtime ${status} - retrying in 5s...`);
                        supabase.removeChannel(channel);
                        retryTimeout = setTimeout(subscribeWithRetry, 5000);
                    }
                });
        };

        subscribeWithRetry();

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [currentUser, addToast]); // Only re-subscribe if user or toast system changes

    useEffect(() => {
        const counts = countUnreadByCategory(notifications);
        setUnreadCount(counts.total);
        setUnreadByCategory(counts);
        if (currentUser?.id && notifications.length) {
            setCachedData(['notifications', currentUser.id], notifications.slice(0, CACHE_LIMITS.notifications), {
                userId: currentUser.id,
                type: 'notifications'
            });
        }
    }, [notifications]);

    const markRead = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        const operationId = `mark_notification_read:${id}`;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            enqueueOfflineOperation(currentUser?.id, {
                id: operationId,
                type: 'mark_notification_read',
                payload: { notificationId: id }
            });
            return;
        }

        const result = await markNotificationAsRead(id);
        if (result?.error) {
            enqueueOfflineOperation(currentUser?.id, {
                id: operationId,
                type: 'mark_notification_read',
                payload: { notificationId: id },
                lastError: result.error
            });
        } else {
            removeOfflineOperation(currentUser?.id, operationId);
        }
    };

    const markAllRead = async () => {
        const unreadNotificationIds = notifications
            .filter(notification => !notification.is_read)
            .map(notification => notification.id)
            .filter(Boolean);

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const operationId = `mark_all_notifications_read:${currentUser.id}`;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            unreadNotificationIds.forEach((notificationId) => {
                enqueueOfflineOperation(currentUser.id, {
                    id: `mark_notification_read:${notificationId}`,
                    type: 'mark_notification_read',
                    payload: { notificationId }
                });
            });
            return;
        }

        const result = await markAllNotificationsAsRead(currentUser.id);
        if (result?.error) {
            unreadNotificationIds.forEach((notificationId) => {
                enqueueOfflineOperation(currentUser.id, {
                    id: `mark_notification_read:${notificationId}`,
                    type: 'mark_notification_read',
                    payload: { notificationId },
                    lastError: result.error
                });
            });
        } else {
            removeOfflineOperation(currentUser.id, operationId);
        }
    };

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        unreadByCategory,
        markRead,
        markAllRead
    }), [notifications, unreadCount, unreadByCategory]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
