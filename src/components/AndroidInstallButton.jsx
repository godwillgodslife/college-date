import React, { useState, useEffect } from 'react';
import './AndroidInstallButton.css';

export default function AndroidInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log('✅ PWA Install Prompt Ready');
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            // Instead of a dry alert, show a nice guide UI
            setShowGuide(true);
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
    };

    return (
        <>
            <button className="android-install-btn" onClick={handleInstall}>
                <span className="btn-icon">🤖</span>
                <div className="btn-text-content">
                    <span className="btn-subtitle">Next-Gen App</span>
                    <span className="btn-title">Install on Android</span>
                </div>
                <span className="btn-chevron">→</span>
            </button>

            {showGuide && (
                <div className="install-guide-overlay" onClick={() => setShowGuide(false)}>
                    <div className="install-guide-card" onClick={e => e.stopPropagation()}>
                        <div className="guide-header">
                            <h2>Install College Date</h2>
                            <button className="close-guide" onClick={() => setShowGuide(false)}>×</button>
                        </div>
                        <div className="guide-body">
                            <p>To get the best experience, add College Date to your home screen:</p>
                            <div className="guide-steps">
                                <div className="guide-step">
                                    <span className="step-num">1</span>
                                    <p>Tap the <strong>three dots (⋮)</strong> or <strong>Share</strong> icon in your browser.</p>
                                </div>
                                <div className="guide-step">
                                    <span className="step-num">2</span>
                                    <p>Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</p>
                                </div>
                                <div className="guide-step">
                                    <span className="step-num">3</span>
                                    <p>Launch it from your home screen just like a native app!</p>
                                </div>
                            </div>
                        </div>
                        <button className="btn-primary w-full" onClick={() => setShowGuide(false)}>
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
