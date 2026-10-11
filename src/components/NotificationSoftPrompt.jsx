import { useState, useEffect, useCallback } from 'react';
import './NotificationSoftPrompt.css';

const STORAGE_DISMISSED_KEY = 'tcd_notification_prepermission_dismissed';

function isAuthPath() {
    if (typeof window === 'undefined') return false;
    return ['/login', '/signup', '/auth', '/forgot-password', '/reset-password'].some(
        (path) => window.location.pathname.startsWith(path)
    );
}

export default function NotificationSoftPrompt() {
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    const openSheet = useCallback(() => {
        setAnimating(true);
        setTimeout(() => setShow(true), 30);
    }, []);

    const closeSheet = useCallback(() => {
        setShow(false);
        setTimeout(() => setAnimating(false), 320);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Expose debug triggers for QA audits and emulator testing
        window.__showNotificationPrePermissionSheet = openSheet;
        window.__hideNotificationPrePermissionSheet = closeSheet;

        // Check if explicitly requested via query params
        const params = new URLSearchParams(window.location.search);
        if (params.get('prompt') === 'notifications' || params.get('soft_prompt') === 'true') {
            openSheet();
            return;
        }

        if (isAuthPath()) return;

        // Check if user already dismissed or already granted
        const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);
        if (dismissed === 'true') return;

        if (window.Notification?.permission === 'granted') return;

        // On native, check if permission already granted or prompt after brief delay
        const timer = setTimeout(() => {
            if (!isAuthPath()) {
                openSheet();
            }
        }, 4000);

        return () => {
            clearTimeout(timer);
            delete window.__showNotificationPrePermissionSheet;
            delete window.__hideNotificationPrePermissionSheet;
        };
    }, [openSheet, closeSheet]);

    const handleEnable = async () => {
        closeSheet();
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');

        const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

        if (isNative) {
            try {
                const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
                await OneSignal.Notifications.requestPermission(true);
            } catch (err) {
                console.warn('[SoftPrompt] Native OneSignal request skipped:', err?.message || err);
            }
        } else {
            try {
                if (window.Notification?.requestPermission) {
                    await window.Notification.requestPermission();
                } else if (window.OneSignalDeferred) {
                    window.OneSignalDeferred.push(async function (OneSignal) {
                        if (OneSignal?.Notifications) {
                            await OneSignal.Notifications.requestPermission();
                        }
                    });
                }
            } catch (err) {
                console.warn('[SoftPrompt] Web permission request skipped:', err?.message || err);
            }
        }
    };

    const handleDismiss = () => {
        closeSheet();
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
    };

    if (!animating) return null;

    return (
        <div className={`soft-prompt-overlay ${show ? 'visible' : ''}`} onClick={handleDismiss}>
            <div className="soft-prompt-card" onClick={(e) => e.stopPropagation()}>
                <div className="soft-prompt-drag-handle" aria-hidden="true" />

                <div className="soft-prompt-content">
                    <div className="soft-prompt-header-icon-wrap">
                        <div className="soft-prompt-icon-ring">
                            <span className="soft-prompt-bell">🔔</span>
                        </div>
                        <span className="soft-prompt-pulse-dot" />
                    </div>

                    <h3 className="soft-prompt-title">Never miss a campus connection</h3>
                    <p className="soft-prompt-subtitle">
                        Turn on notifications so you know the second someone likes you, matches with you, or sends a confession.
                    </p>

                    {/* Benefit points */}
                    <div className="soft-prompt-benefits-list">
                        <div className="soft-prompt-benefit-item">
                            <span className="benefit-icon">💖</span>
                            <div className="benefit-text">
                                <strong>Mutual Matches & Chats</strong>
                                <p>Instant alerts when your campus crush says hi</p>
                            </div>
                        </div>

                        <div className="soft-prompt-benefit-item">
                            <span className="benefit-icon">👀</span>
                            <div className="benefit-text">
                                <strong>Profile Views & Admirers</strong>
                                <p>Know who checked your profile before they disappear</p>
                            </div>
                        </div>

                        <div className="soft-prompt-benefit-item">
                            <span className="benefit-icon">🤫</span>
                            <div className="benefit-text">
                                <strong>Campus Confessions & Q&A</strong>
                                <p>Receive anonymous questions and secrets from your school</p>
                            </div>
                        </div>
                    </div>

                    {/* Simulated live preview toast */}
                    <div className="soft-prompt-preview-wrap">
                        <div className="soft-prompt-preview-card">
                            <div className="preview-avatar-ring">
                                <span className="preview-avatar-emoji">👩🏾‍🎓</span>
                            </div>
                            <div className="preview-body-copy">
                                <div className="preview-topline">
                                    <span className="preview-name">Amaka • UNILAG</span>
                                    <span className="preview-time">Just now</span>
                                </div>
                                <p className="preview-msg">Hey! Saw your profile, are you on campus today? 😊</p>
                            </div>
                            <span className="preview-reply-chip">Reply</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="soft-prompt-actions">
                        <button className="btn-enable-notif" onClick={handleEnable}>
                            Turn on notifications 🔔
                        </button>
                        <button className="btn-not-now" onClick={handleDismiss}>
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
