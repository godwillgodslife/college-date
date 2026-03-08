import { useState, useEffect } from 'react';
import './NotificationSoftPrompt.css';

export default function NotificationSoftPrompt() {
    const [show, setShow] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal) {
            const permission = OneSignal.Notifications.permission;
            const dismissed = localStorage.getItem('onesignal-prompt-dismissed');

            if (!permission && !dismissed) {
                // Delay 4s so user can settle into the app
                setTimeout(() => {
                    setAnimating(true);
                    setTimeout(() => setShow(true), 50);
                }, 4000);
            }
        });
    }, []);

    const handleEnable = () => {
        setShow(false);
        window.OneSignalDeferred.push(async function (OneSignal) {
            await OneSignal.Notifications.requestPermission();
        });
    };

    const handleDismiss = () => {
        setShow(false);
        setAnimating(false);
        localStorage.setItem('onesignal-prompt-dismissed', 'true');
    };

    if (!animating) return null;

    return (
        <div className={`soft-prompt-overlay ${show ? 'visible' : ''}`} onClick={handleDismiss}>
            <div className="soft-prompt-card" onClick={e => e.stopPropagation()}>
                {/* Animated money rain */}
                <div className="money-rain" aria-hidden="true">
                    {['💸', '💰', '💳', '💵', '🪙'].map((emoji, i) => (
                        <span key={i} className={`money-drop drop-${i + 1}`}>{emoji}</span>
                    ))}
                </div>

                <div className="soft-prompt-content">
                    <div className="soft-prompt-icon-ring">
                        <span>🔔</span>
                    </div>

                    <h3>Want to know the second you make money? 💸</h3>
                    <p>Enable alerts so you <strong>never miss a credit</strong>. Get notified the moment someone swipes on you or pays for a vibe.</p>

                    <div className="soft-prompt-preview">
                        <div className="preview-notif">
                            <span className="preview-icon">💰</span>
                            <div>
                                <strong>Credit Alert!</strong>
                                <p>You just earned ₦250. Tap to see who paid.</p>
                            </div>
                        </div>
                    </div>

                    <div className="soft-prompt-actions">
                        <button className="btn-enable-notif" onClick={handleEnable}>
                            Enable Alerts 🔔
                        </button>
                        <button className="btn-not-now" onClick={handleDismiss}>Not now</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
