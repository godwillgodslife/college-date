import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './NotificationSoftPrompt.css';

const STORAGE_DISMISSED_KEY = 'tcd_notification_prepermission_dismissed';
const STORAGE_DISMISSED_AT_KEY = 'tcd_notification_prepermission_dismissed_at';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14-day dismissal cooldown
const ENGAGEMENT_DELAY_MS = 25000; // 25s engagement delay for subtle timing

function isNativePlatform() {
    if (typeof window === 'undefined') return false;
    return Boolean(
        window.Capacitor?.isNativePlatform?.() ||
        document.documentElement.classList.contains('is-native-app')
    );
}

function isEligiblePath() {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname || '';

    // NEVER on landing, welcome screen, or root
    if (pathname === '/' || pathname === '' || pathname === '/landing' || pathname === '/the-college-date') {
        return false;
    }

    // NEVER on authentication, onboarding, legal, blogs or public info routes
    const excludedPrefixes = [
        '/login', '/signup', '/auth', '/forgot-password', '/reset-password',
        '/privacy', '/terms', '/faq', '/about', '/safety', '/community-guidelines',
        '/cookies', '/delete-account', '/wireframe-showcase', '/ux-compare',
        '/ux-review', '/design-review', '/blog', '/official', '/mini-profile-setup'
    ];
    if (excludedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return false;
    }

    // ELIGIBLE ONLY on active authenticated app surfaces
    const activeAppPrefixes = [
        '/dashboard', '/match', '/explore', '/chat', '/status',
        '/snap', '/confessions', '/requests', '/viewers', '/wallet',
        '/referrals', '/leaderboard', '/notifications'
    ];
    return activeAppPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default function NotificationSoftPrompt() {
    let authContext = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        authContext = useAuth();
    } catch {
        authContext = null;
    }
    const currentUser = authContext?.currentUser;

    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    const openSheet = useCallback(() => {
        // Exclusively removed in Android native app
        if (isNativePlatform()) return;
        setAnimating(true);
        setTimeout(() => setShow(true), 30);
    }, []);

    const closeSheet = useCallback(() => {
        setShow(false);
        setTimeout(() => setAnimating(false), 320);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Expose debug triggers for QA audits and emulator verification
        window.__showNotificationPrePermissionSheet = openSheet;
        window.__hideNotificationPrePermissionSheet = closeSheet;

        // In Android native app, exclusively suppress soft prompt
        if (isNativePlatform()) {
            return () => {
                delete window.__showNotificationPrePermissionSheet;
                delete window.__hideNotificationPrePermissionSheet;
            };
        }

        // Check if explicitly requested via query params (QA & debugging)
        const params = new URLSearchParams(window.location.search);
        if (params.get('prompt') === 'notifications' || params.get('soft_prompt') === 'true') {
            openSheet();
            return;
        }

        // Only prompt authenticated users actively using features
        if (!currentUser) return;

        // Only prompt on eligible active application routes (never landing or welcome screen)
        if (!isEligiblePath()) return;

        // Respect 14-day dismissal cooldown
        const dismissedAt = localStorage.getItem(STORAGE_DISMISSED_AT_KEY);
        if (dismissedAt) {
            const elapsed = Date.now() - Number(dismissedAt);
            if (!Number.isNaN(elapsed) && elapsed < COOLDOWN_MS) return;
        } else if (localStorage.getItem(STORAGE_DISMISSED_KEY) === 'true') {
            return;
        }

        // Do not prompt if already granted or permanently denied in browser
        if (window.Notification?.permission === 'granted' || window.Notification?.permission === 'denied') {
            return;
        }

        // Subtle, non-intrusive timing: prompt after natural engagement delay
        const timer = setTimeout(() => {
            if (isEligiblePath() && !isNativePlatform()) {
                openSheet();
            }
        }, ENGAGEMENT_DELAY_MS);

        return () => {
            clearTimeout(timer);
            delete window.__showNotificationPrePermissionSheet;
            delete window.__hideNotificationPrePermissionSheet;
        };
    }, [openSheet, closeSheet, currentUser]);

    const handleEnable = async () => {
        closeSheet();
        const now = String(Date.now());
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
        localStorage.setItem(STORAGE_DISMISSED_AT_KEY, now);

        const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

        if (isNative) {
            try {
                const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
                const { default: OneSignal, LogLevel } = await import('@onesignal/capacitor-plugin');
                if (appId && import.meta.env.VITE_ENABLE_NATIVE_PUSH === 'true') {
                    try {
                        OneSignal.Debug?.setLogLevel?.(LogLevel?.Warn ?? 2);
                        await OneSignal.initialize(appId);
                    } catch (initErr) {
                        console.warn('[SoftPrompt] OneSignal init warning:', initErr);
                    }
                }
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
        const now = String(Date.now());
        localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
        localStorage.setItem(STORAGE_DISMISSED_AT_KEY, now);
    };

    // Exclusively removed from Android native app
    if (isNativePlatform()) return null;

    if (!animating) return null;

    return (
        <div className={`soft-prompt-overlay ${show ? 'visible' : ''}`} onClick={handleDismiss}>
            <div className="soft-prompt-card" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="soft-prompt-close-btn"
                    onClick={handleDismiss}
                    aria-label="Close notification prompt"
                >
                    ✕
                </button>
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
