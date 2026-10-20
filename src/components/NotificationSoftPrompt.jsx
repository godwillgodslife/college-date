import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { initPushNotifications } from '../services/pushNotification';
import { updateUserSettings } from '../services/notificationService';
import './NotificationSoftPrompt.css';

const STORAGE_ACCEPTED_KEY = 'tcd_notification_prepermission_accepted';
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

function isNotificationPermissionGranted() {
    if (typeof window === 'undefined') return false;
    if (window.Notification?.permission === 'granted') return true;
    if (window.OneSignal?.Notifications?.permission === true) return true;
    return false;
}

function isNotificationPermissionBlocked() {
    if (typeof window === 'undefined') return false;
    return window.Notification?.permission === 'denied';
}

function hasUserAcceptedNotifications(currentUser) {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    if (window.localStorage.getItem(STORAGE_ACCEPTED_KEY) === 'true') return true;
    if (currentUser?.id && window.localStorage.getItem(`${STORAGE_ACCEPTED_KEY}_${currentUser.id}`) === 'true') {
        return true;
    }
    return false;
}

function isUserInCooldown(currentUser) {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const userKey = currentUser?.id ? `${STORAGE_DISMISSED_AT_KEY}_${currentUser.id}` : null;
    const dismissedAt = (userKey && window.localStorage.getItem(userKey)) || window.localStorage.getItem(STORAGE_DISMISSED_AT_KEY);
    if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt);
        if (!Number.isNaN(elapsed) && elapsed < COOLDOWN_MS) return true;
    } else if (window.localStorage.getItem(STORAGE_DISMISSED_KEY) === 'true') {
        return true;
    }
    return false;
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
    const userProfile = authContext?.userProfile;

    let toastContext = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        toastContext = useToast();
    } catch {
        toastContext = null;
    }
    const addToast = toastContext?.addToast;

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

        // If user already accepted (locally or via profile with registered device), NEVER prompt again
        if (hasUserAcceptedNotifications(currentUser)) return;
        if (isNotificationPermissionGranted()) {
            try {
                localStorage.setItem(STORAGE_ACCEPTED_KEY, 'true');
                if (currentUser?.id) localStorage.setItem(`${STORAGE_ACCEPTED_KEY}_${currentUser.id}`, 'true');
            } catch {
                // Ignore storage errors
            }
            return;
        }

        // If browser permission is explicitly denied, do not nag
        if (isNotificationPermissionBlocked()) return;

        // If user has push notifications explicitly turned off in settings, respect it
        if (userProfile && userProfile.push_notifications === false) return;

        // If user already has an active onesignal subscription synced to profile
        if (userProfile?.onesignal_id) {
            try {
                localStorage.setItem(STORAGE_ACCEPTED_KEY, 'true');
                if (currentUser?.id) localStorage.setItem(`${STORAGE_ACCEPTED_KEY}_${currentUser.id}`, 'true');
            } catch {
                // Ignore storage errors
            }
            return;
        }

        // Respect 14-day dismissal cooldown for "Maybe later"
        if (isUserInCooldown(currentUser)) return;

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
    }, [openSheet, closeSheet, currentUser, userProfile]);

    const handleEnable = async () => {
        closeSheet();

        // 1. Permanently record acceptance (never expires like temporary dismissal cooldown)
        try {
            localStorage.setItem(STORAGE_ACCEPTED_KEY, 'true');
            if (currentUser?.id) {
                localStorage.setItem(`${STORAGE_ACCEPTED_KEY}_${currentUser.id}`, 'true');
            }
            localStorage.removeItem(STORAGE_DISMISSED_KEY);
            localStorage.removeItem(STORAGE_DISMISSED_AT_KEY);
            if (currentUser?.id) {
                localStorage.removeItem(`${STORAGE_DISMISSED_KEY}_${currentUser.id}`);
                localStorage.removeItem(`${STORAGE_DISMISSED_AT_KEY}_${currentUser.id}`);
            }
        } catch {
            // Ignore storage errors
        }

        // 2. Persist to database profile settings
        if (currentUser?.id) {
            try {
                await updateUserSettings(currentUser.id, { push_notifications: true });
            } catch (profileErr) {
                console.warn('[SoftPrompt] Could not update profile push setting:', profileErr);
            }
        }

        // 3. Trigger authoritative push registration and permission request
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
                // Request browser permission directly from user gesture
                let browserPermission = 'default';
                if (window.Notification?.requestPermission) {
                    browserPermission = await window.Notification.requestPermission();
                }

                // Call authoritative push notification initialization
                if (currentUser?.id) {
                    await initPushNotifications(currentUser.id);
                } else if (window.OneSignalDeferred) {
                    window.OneSignalDeferred.push(async function (OneSignal) {
                        if (OneSignal?.Notifications) {
                            await OneSignal.Notifications.requestPermission();
                        }
                    });
                }

                if (browserPermission === 'granted' || isNotificationPermissionGranted()) {
                    if (typeof addToast === 'function') {
                        addToast('🔔 Notifications turned on! Instant alerts are ready.', 'success', 3500);
                    }
                }
            } catch (err) {
                console.warn('[SoftPrompt] Web permission request skipped:', err?.message || err);
            }
        }
    };

    const handleDismiss = () => {
        closeSheet();
        const now = String(Date.now());
        try {
            localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
            localStorage.setItem(STORAGE_DISMISSED_AT_KEY, now);
            if (currentUser?.id) {
                localStorage.setItem(`${STORAGE_DISMISSED_KEY}_${currentUser.id}`, 'true');
                localStorage.setItem(`${STORAGE_DISMISSED_AT_KEY}_${currentUser.id}`, now);
            }
        } catch {
            // Ignore storage errors
        }
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
