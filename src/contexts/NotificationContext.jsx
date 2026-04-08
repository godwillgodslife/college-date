import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { useToast } from '../components/Toast';
import { 
    playNotificationDing, 
    playMatchSuccess, 
    playLikePop, 
    playViewChime, 
    playSocialFlutter, 
    playMoneySound, 
    playSystemPock 
} from '../lib/audioContext';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

const SOUND_MAP = {
    message: playNotificationDing,
    match: playMatchSuccess,
    like: playLikePop,
    super_swipe: playLikePop,
    view: playViewChime,
    profile_view: playViewChime,
    payment: playMoneySound,
    goal_reached: playMoneySound,
    snapshot_reaction: playSocialFlutter,
    status_update: playSocialFlutter,
    system: playSystemPock
};

export function NotificationProvider({ children }) {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load initial notifications
    useEffect(() => {
        if (!currentUser) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const loadNotifications = async () => {
            try {
                const { data, error } = await getNotifications(currentUser.id);
                if (error) {
                    console.error('Failed to load notifications:', error);
                    return;
                }
                // Ensure data is an array
                const validData = Array.isArray(data) ? data : [];
                setNotifications(validData);
                setUnreadCount(validData.filter(n => !n.is_read).length);
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
            
            console.log('[Notifications] Attempting realtime subscription...');
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
                        console.log('New Notification Received:', payload);
                        const newNotification = payload.new;
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        if (typeof addToast === 'function') {
                            addToast(newNotification.title || 'New Notification', 'info');
                        }
                        
                        // Specialized Sound Signature
                        const playSound = SOUND_MAP[newNotification.type] || playNotificationDing;
                        
                        // Check master sound toggle before playing
                        if (userProfile?.sound_enabled !== false) {
                            playSound();
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Notifications] Realtime channel subscribed ✓');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn(`[Notifications] Realtime ${status} - retrying in 5s...`);
                        // Clean up old channel and retry
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
    }, [currentUser, addToast]);

    const markRead = async (id) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await markNotificationAsRead(id);
    };

    const markAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await markAllNotificationsAsRead(currentUser.id);
    };

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        markRead,
        markAllRead
    }), [notifications, unreadCount]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
