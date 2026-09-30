import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import {
    NOTIFICATION_CATEGORIES,
    countUnreadByCategory,
    getNotificationCategory,
    getNotificationDeepLink,
    getNotificationIcon
} from '../utils/notificationRouting';
import './NotificationCenter.css';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: NOTIFICATION_CATEGORIES.MESSAGES, label: 'Messages' },
    { id: NOTIFICATION_CATEGORIES.MATCHES, label: 'Matches' },
    { id: NOTIFICATION_CATEGORIES.REQUESTS, label: 'Requests' },
    { id: NOTIFICATION_CATEGORIES.PROFILE_ACTIVITY, label: 'Profile' },
    { id: NOTIFICATION_CATEGORIES.SOCIAL, label: 'Social' },
    { id: NOTIFICATION_CATEGORIES.ACCOUNT, label: 'Account' },
];

function formatNotificationTime(value) {
    if (!value) return '';

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationCenter() {
    const navigate = useNavigate();
    const { notifications, markRead, markAllRead, dismissNotification } = useNotifications();
    const [activeFilter, setActiveFilter] = useState('all');

    const unreadCounts = useMemo(() => countUnreadByCategory(notifications), [notifications]);

    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'all') return notifications;
        return (notifications || []).filter((notification) => getNotificationCategory(notification) === activeFilter);
    }, [activeFilter, notifications]);

    const handleOpenNotification = (notification) => {
        if (notification.type === 'call') {
            dismissNotification(notification.id);
        } else {
            markRead(notification.id);
        }
        const destination = getNotificationDeepLink(notification);
        navigate(destination.to, destination.state ? { state: destination.state } : undefined);
    };

    return (
        <div className="notification-center-page">
            <header className="notification-center-header">
                <div>
                    <p className="notification-center-kicker">Activity</p>
                    <h1>Notifications</h1>
                    <p>Messages, matches, requests, profile activity, and account updates in one place.</p>
                </div>
                <button
                    className="notification-center-mark"
                    type="button"
                    onClick={markAllRead}
                    disabled={!unreadCounts.total}
                >
                    Mark all read
                </button>
            </header>

            <div className="notification-filter-row" role="tablist" aria-label="Notification filters">
                {FILTERS.map((filter) => {
                    const count = filter.id === 'all'
                        ? unreadCounts.total
                        : unreadCounts[filter.id] || 0;

                    return (
                        <button
                            key={filter.id}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === filter.id}
                            className={`notification-filter ${activeFilter === filter.id ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter.id)}
                        >
                            <span>{filter.label}</span>
                            {count > 0 && <strong>{count > 99 ? '99+' : count}</strong>}
                        </button>
                    );
                })}
            </div>

            <section className="notification-center-list" aria-live="polite">
                {filteredNotifications.length === 0 ? (
                    <div className="notification-center-empty">
                        <span>!</span>
                        <h2>No notifications here</h2>
                        <p>When something meaningful happens, it will appear in this section.</p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            role="button"
                            tabIndex={0}
                            className={`notification-center-item ${notification.is_read ? '' : 'unread'}`}
                            onClick={() => handleOpenNotification(notification)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleOpenNotification(notification);
                                }
                            }}
                        >
                            <span className="notification-center-icon">
                                {getNotificationIcon(notification.type)}
                            </span>
                            <span className="notification-center-copy">
                                <span className="notification-center-title-row">
                                    <strong>{notification.title || 'Notification'}</strong>
                                    <time>{formatNotificationTime(notification.created_at)}</time>
                                </span>
                                <span className="notification-center-message">
                                    {notification.content || 'Open to view the latest activity.'}
                                </span>
                                <small>{getNotificationCategory(notification).replace(/_/g, ' ')}</small>
                            </span>
                            <div className="notification-center-actions">
                                {!notification.is_read && <span className="notification-center-dot" />}
                                <button
                                    type="button"
                                    className="notification-center-dismiss-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissNotification(notification.id);
                                    }}
                                    title="Dismiss notification"
                                    aria-label="Dismiss notification"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
