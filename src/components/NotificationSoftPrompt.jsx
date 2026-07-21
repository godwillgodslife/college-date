import { useState, useEffect } from 'react';
import './NotificationSoftPrompt.css';

function isLocalWeb() {
    return import.meta.env.DEV
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname === '[::1]'
        || window.location.hostname.startsWith('192.168.')
        || window.location.hostname.startsWith('10.')
        || window.location.hostname.endsWith('.local')
        || window.location.port !== '';
}

function isAuthPath() {
    return ['/login', '/signup', '/auth'].some((path) => window.location.pathname.startsWith(path));
}

export default function NotificationSoftPrompt() {
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const isNativePlatform = window.Capacitor?.isNativePlatform?.();
        if (isNativePlatform || isLocalWeb() || isAuthPath()) return;

        if (!window.OneSignalDeferred) return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal) {
            if (!OneSignal?.Notifications) return;

            const permission = OneSignal.Notifications.permission;
            const dismissed = localStorage.getItem('onesignal-prompt-dismissed');

            if (!permission && !dismissed) {
                setTimeout(() => {
                    setAnimating(true);
                    setTimeout(() => setShow(true), 50);
                }, 4000);
            }
        });
    }, []);

    const handleEnable = () => {
        setShow(false);
        if (!window.OneSignalDeferred) return;

        window.OneSignalDeferred.push(async function (OneSignal) {
            if (!OneSignal?.Notifications) return;
            await OneSignal.Notifications.requestPermission();
        });
    };

    const handleDismiss = () => {
        setShow(false);
        setAnimating(false);
        localStorage.setItem('onesignal-prompt-dismissed', 'true');
    };

    if (isLocalWeb() || isAuthPath() || !animating) return null;

    return (
        <div className={`soft-prompt-overlay ${show ? 'visible' : ''}`} onClick={handleDismiss}>
            <div className="soft-prompt-card" onClick={(event) => event.stopPropagation()}>
                <div className="money-rain" aria-hidden="true">
                    {['$', 'CD', '+', 'N', '$'].map((label, index) => (
                        <span key={index} className={`money-drop drop-${index + 1}`}>{label}</span>
                    ))}
                </div>

                <div className="soft-prompt-content">
                    <div className="soft-prompt-icon-ring">
                        <span>CD</span>
                    </div>

                    <h3>Get campus alerts the moment they happen</h3>
                    <p>
                        Enable notifications so you know when someone messages you, likes you, matches with you,
                        or sends an account update.
                    </p>

                    <div className="soft-prompt-preview">
                        <div className="preview-notif">
                            <span className="preview-icon">M</span>
                            <div>
                                <strong>New message</strong>
                                <p>Amaka sent you a message. Tap to reply.</p>
                            </div>
                        </div>
                    </div>

                    <div className="soft-prompt-actions">
                        <button className="btn-enable-notif" onClick={handleEnable}>
                            Enable alerts
                        </button>
                        <button className="btn-not-now" onClick={handleDismiss}>Not now</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
