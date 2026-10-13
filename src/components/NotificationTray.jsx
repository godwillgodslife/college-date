import { useRef, useEffect, useState, useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
    getNotificationDeepLink,
    getNotificationIcon,
    getNotificationCategory,
    groupNotificationsChronologically,
    countUnreadByCategory,
    formatNotificationTime,
    NOTIFICATION_CATEGORIES
} from '../utils/notificationRouting';
import { triggerLightHaptic, triggerMediumHaptic, triggerSuccessHaptic } from '../services/haptics';
import { getFreshAvatarUrl } from '../utils/profileData';
import './NotificationTray.css';

const QUICK_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: NOTIFICATION_CATEGORIES.MESSAGES, label: 'Messages' },
    { id: NOTIFICATION_CATEGORIES.MATCHES, label: 'Matches' }
];

export default function NotificationTray({ onClose }) {
    const { notifications, markRead, markAllRead, dismissNotification } = useNotifications();
    const navigate = useNavigate();
    const trayRef = useRef(null);
    const [activeFilter, setActiveFilter] = useState('all');

    const unreadCounts = useMemo(() => countUnreadByCategory(notifications), [notifications]);

    // Handle outside clicks safely without closing prematurely on trigger button clicks
    useEffect(() => {
        function handleClickOutside(event) {
            if (trayRef.current && !trayRef.current.contains(event.target)) {
                // If the user clicked the nav bell toggle button, let its handler handle the state
                if (event.target.closest && event.target.closest('.nav-icon-btn')) {
                    return;
                }
                onClose();
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Filter notifications based on active pill
    const filteredNotifications = useMemo(() => {
        const list = Array.isArray(notifications) ? notifications : [];
        if (activeFilter === 'all') return list;
        if (activeFilter === 'unread') return list.filter(n => !n.is_read);
        return list.filter(n => getNotificationCategory(n) === activeFilter);
    }, [activeFilter, notifications]);

    // Group filtered notifications chronologically: Today, Yesterday, Earlier
    const notificationGroups = useMemo(() => {
        return groupNotificationsChronologically(filteredNotifications);
    }, [filteredNotifications]);

    const handleItemClick = (notification) => {
        triggerLightHaptic();
        if (notification.type === 'call') {
            dismissNotification(notification.id);
        } else {
            markRead(notification.id);
        }
        onClose();

        const destination = getNotificationDeepLink(notification);
        navigate(destination.to, destination.state ? { state: destination.state } : undefined);
    };

    const handleMarkAllRead = async () => {
        if (!unreadCounts.total) return;
        try {
            triggerSuccessHaptic();
            await markAllRead();
        } catch (err) {
            console.warn('[NotificationTray] Failed to mark all read:', err);
        }
    };

    const handleFilterSelect = (filterId) => {
        triggerMediumHaptic();
        setActiveFilter(filterId);
    };

    const handleDismiss = (e, notifId) => {
        e.stopPropagation();
        triggerLightHaptic();
        dismissNotification(notifId);
    };

    return (
        <div
            className="notification-tray"
            ref={trayRef}
            role="dialog"
            aria-label="Notification center preview"
            aria-modal="false"
        >
            <div className="notif-header">
                <div className="notif-header-title-wrap">
                    <h3>Notifications</h3>
                    {unreadCounts.total > 0 && (
                        <span className="notif-header-badge">{unreadCounts.total > 99 ? '99+' : unreadCounts.total}</span>
                    )}
                </div>
                <div className="notif-header-actions">
                    <button
                        type="button"
                        className="mark-read-btn"
                        onClick={handleMarkAllRead}
                        disabled={!unreadCounts.total}
                        title="Mark all notifications as read"
                    >
                        Mark all read
                    </button>
                    <button
                        type="button"
                        className="view-all-link"
                        onClick={() => {
                            triggerLightHaptic();
                            onClose();
                            navigate('/notifications');
                        }}
                    >
                        Full view →
                    </button>
                </div>
            </div>

            {/* Quick Filter Strip */}
            <div className="notif-tray-filters" role="tablist" aria-label="Filter notifications">
                {QUICK_FILTERS.map((f) => {
                    let badgeCount = 0;
                    if (f.id === 'all') badgeCount = notifications.length;
                    else if (f.id === 'unread') badgeCount = unreadCounts.total;
                    else badgeCount = unreadCounts[f.id] || 0;

                    return (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={activeFilter === f.id}
                            className={`notif-tray-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
                            onClick={() => handleFilterSelect(f.id)}
                        >
                            <span>{f.label}</span>
                            {badgeCount > 0 && <strong>{badgeCount > 99 ? '99+' : badgeCount}</strong>}
                        </button>
                    );
                })}
            </div>

            <div className="notif-list" aria-live="polite">
                {filteredNotifications.length === 0 ? (
                    <div className="notif-empty">
                        <span className="empty-icon">🔔</span>
                        <p className="empty-title">
                            {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="empty-subtitle">
                            When matches, messages, or campus admirers interact with you, they'll appear here.
                        </p>
                    </div>
                ) : (
                    notificationGroups.map((group) => (
                        <div key={group.id} className="notif-group">
                            <div className="notif-group-header">
                                <span className="notif-group-title">{group.title}</span>
                                <span className="notif-group-count">{group.items.length}</span>
                            </div>
                            <div className="notif-group-items">
                                {group.items.map((notif) => {
                                    const rawAvatar = notif.actor_avatar || notif.sender_avatar || notif.metadata?.actor_avatar_url || notif.metadata?.avatar_url || null;
                                    const avatar = getFreshAvatarUrl(rawAvatar, notif.actor_id || notif.sender_id || notif.metadata?.actor_id) || rawAvatar;
                                    const categoryLabel = getNotificationCategory(notif).replace(/_/g, ' ');

                                    return (
                                        <div
                                            key={notif.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                                            onClick={() => handleItemClick(notif)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleItemClick(notif);
                                                }
                                            }}
                                        >
                                            <div className="notif-avatar-wrapper">
                                                {avatar ? (
                                                    <img
                                                        src={avatar}
                                                        alt=""
                                                        className="notif-avatar-img"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="notif-icon">
                                                        {getNotificationIcon(notif.type)}
                                                    </div>
                                                )}
                                                {avatar && (
                                                    <span className="notif-avatar-badge">
                                                        {getNotificationIcon(notif.type)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="notif-content">
                                                <div className="notif-title-row">
                                                    <p className="notif-title">{notif.title || 'Notification'}</p>
                                                    <time className="notif-time">
                                                        {formatNotificationTime(notif.created_at)}
                                                    </time>
                                                </div>
                                                <p className="notif-text">
                                                    {notif.content || 'Tap to view the latest update.'}
                                                </p>
                                                <div className="notif-meta-row">
                                                    <span className="notif-category-tag">{categoryLabel}</span>
                                                </div>
                                            </div>

                                            <div className="notif-item-actions">
                                                {!notif.is_read && <span className="notif-dot" />}
                                                <button
                                                    type="button"
                                                    className="notif-dismiss-btn"
                                                    onClick={(e) => handleDismiss(e, notif.id)}
                                                    title="Dismiss notification"
                                                    aria-label="Dismiss notification"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="notif-tray-footer">
                <button
                    type="button"
                    className="notif-view-all-btn"
                    onClick={() => {
                        triggerLightHaptic();
                        onClose();
                        navigate('/notifications');
                    }}
                >
                    View All Activity in Notification Center
                </button>
            </div>
        </div>
    );
}
