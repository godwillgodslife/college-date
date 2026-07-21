import { useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { getNotificationDeepLink, getNotificationIcon } from '../utils/notificationRouting';
import './NotificationTray.css';

export default function NotificationTray({ onClose }) {
    const { notifications, markRead, markAllRead } = useNotifications();
    const navigate = useNavigate();
    const trayRef = useRef(null);

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

        const destination = getNotificationDeepLink(notification);
        navigate(destination.to, destination.state ? { state: destination.state } : undefined);
    };

    return (
        <div className="notification-tray" ref={trayRef}>
            <div className="notif-header">
                <h3>Notifications</h3>
                {notifications.length > 0 && (
                    <div className="notif-header-actions">
                        <button
                            className="mark-read-btn"
                            onClick={() => {
                                onClose();
                                navigate('/notifications');
                            }}
                        >
                            View all
                        </button>
                        <button className="mark-read-btn" onClick={markAllRead}>
                            Mark all read
                        </button>
                    </div>
                )}
            </div>

            <div className="notif-list">
                {notifications.length === 0 ? (
                    <div className="notif-empty">
                        <span className="empty-icon">!</span>
                        <p>No new notifications</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                            onClick={() => handleItemClick(notif)}
                        >
                            <div className="notif-icon">{getNotificationIcon(notif.type)}</div>
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
