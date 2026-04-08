import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Use a ref for userProfile to keep the realtime callback 'fresh' without re-subscribing
    const profileRef = useRef(userProfile);
    useEffect(() => {
        profileRef.current = userProfile;
    }, [userProfile]);

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
                        
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        
                        if (typeof addToast === 'function') {
                            const url = newNotification.metadata?.url;
                            const matchId = newNotification.metadata?.match_id;
                            const actorId = newNotification.actor_id;

                            addToast(newNotification.title || 'New Notification', 'info', 5000, {
                                onClick: () => {
                                    if (url === '/chat') {
                                        navigate(matchId ? `/chat?chatId=${matchId}` : '/chat', {
                                            state: { 
                                                chatId: matchId,
                                                openChatWith: actorId
                                            }
                                        });
                                    } else if (url) {
                                        navigate(url);
                                    }
                                }
                            });
                        }
                        
                        // Specialized Sound Signature using REFRESHED profile via Ref
                        const playSound = SOUND_MAP[newNotification.type] || playNotificationDing;
                        
                        if (profileRef.current?.sound_enabled !== false) {
                            playSound();
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
