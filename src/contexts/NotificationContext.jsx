import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { useToast } from '../components/Toast'; // Assuming you have this, or we can use a simpler alert

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

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

        // Subscribe to Realtime Insert events
        let channel;
        try {
            channel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `recipient_id=eq.${currentUser.id}`
                    },
                    (payload) => {
                        console.log('New Notification Received:', payload);
                        const newNotification = payload.new;

                        // Add to list safely
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        // Show Toast Alert if function exists
                        if (typeof addToast === 'function') {
                            addToast(newNotification.title || 'New Notification', 'info');
                        }

                        // Optional: Play a sound
                        try {
                            const audio = new Audio('/assets/sounds/notification.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(e => console.log('Audio play failed', e));
                        } catch (e) { }
                    }
                )
                .subscribe((status) => {
                    if (status !== 'SUBSCRIBED') {
                        // Handle subscription error if needed
                    }
                });
        } catch (err) {
            console.error('Realtime subscription error:', err);
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
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

    const value = {
        notifications,
        unreadCount,
        markRead,
        markAllRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
