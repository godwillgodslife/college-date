import React, { useState, useEffect } from 'react';
import './PwaInstallButton.css';

export default function PwaInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [platform, setPlatform] = useState('android'); // 'android', 'ios', 'desktop'

    useEffect(() => {
        // Detect Platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIos) {
            setPlatform('ios');
        } else if (isAndroid) {
            setPlatform('android');
        } else {
            setPlatform('desktop');
        }

        // Listen for Android/Chrome Install Prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log('✅ PWA Install Prompt Ready');
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (platform === 'android' && deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            setDeferredPrompt(null);
        } else {
            // Show custom guide for iOS or if deferredPrompt is not available
            setShowGuide(true);
        }
    };

    const getButtonContent = () => {
        if (platform === 'ios') {
            return {
                icon: '🍎',
                title: 'Install on iPhone',
                subtitle: 'Add to Home Screen',
                className: 'pwa-install-btn ios'
            };
        }
        return {
            icon: '🤖',
            title: 'Install on Android',
            subtitle: 'Next-Gen App',
            className: 'pwa-install-btn android'
        };
    };

    const content = getButtonContent();

    return (
        <>
            <button className={content.className} onClick={handleInstall}>
                <span className="btn-icon">{content.icon}</span>
                <div className="btn-text-content">
                    <span className="btn-subtitle">{content.subtitle}</span>
                    <span className="btn-title">{content.title}</span>
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
                            {platform === 'ios' ? (
                                <>
                                    <p>Get the full App experience on your iPhone:</p>
                                    <div className="guide-steps">
                                        <div className="guide-step">
                                            <span className="step-num">1</span>
                                            <p>Tap the <strong>Share</strong> icon <span className="share-icon-mimic">⎗</span> at the bottom of Safari.</p>
                                        </div>
                                        <div className="guide-step">
                                            <span className="step-num">2</span>
                                            <p>Scroll down and select <strong>"Add to Home Screen"</strong> ➕</p>
                                        </div>
                                        <div className="guide-step">
                                            <span className="step-num">3</span>
                                            <p>Tap <strong>Add</strong> in the top right corner.</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
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
