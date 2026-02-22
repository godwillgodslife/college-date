import { useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import './NotificationTray.css';

export default function NotificationTray({ onClose }) {
    const { notifications, markRead, markAllRead } = useNotifications();
    const navigate = useNavigate();
    const trayRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (trayRef.current && !trayRef.current.contains(event.target)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleItemClick = (notification) => {
        markRead(notification.id);
        onClose();

        // Navigate based on type/metadata
        if (notification.metadata?.url) {
            navigate(notification.metadata.url);
        } else if (notification.type === 'match' || notification.type === 'swipe_accepted') {
            navigate('/chat');
        } else if (notification.type === 'swipe_received') {
            navigate('/requests');
        } else if (notification.type === 'view' || notification.type === 'profile_view') {
            navigate('/viewers');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'match':
            case 'swipe_accepted': return '🔥';
            case 'swipe_received': return '✨';
            case 'payment': return '💰';
            case 'view':
            case 'profile_view': return '👀';
            case 'snapshot_reaction': return '📸';
            case 'status_update': return '⭕';
            default: return '🔔';
        }
    };

    return (
        <div className="notification-tray" ref={trayRef}>
            <div className="notif-header">
                <h3>Notifications</h3>
                {notifications.length > 0 && (
                    <button className="mark-read-btn" onClick={markAllRead}>
                        Mark all read
                    </button>
                )}
            </div>

            <div className="notif-list">
                {notifications.length === 0 ? (
                    <div className="notif-empty">
                        <span className="empty-icon">🔕</span>
                        <p>No new notifications</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                            onClick={() => handleItemClick(notif)}
                        >
                            <div className="notif-icon">{getIcon(notif.type)}</div>
                            <div className="notif-content">
                                <p className="notif-title">{notif.title}</p>
                                <p className="notif-text">{notif.content}</p>
                                <span className="notif-time">
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {!notif.is_read && <span className="notif-dot" />}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
