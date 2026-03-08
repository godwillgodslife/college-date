import React, { useState, useEffect } from 'react';
import './PwaInstallBanner.css';

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState('android');

    useEffect(() => {
        // 1. Check if already installed (standalone)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) return;

        // 2. Check if user dismissed it this session
        const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');
        if (isDismissed) return;

        // 3. Detect Platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIos) {
            setPlatform('ios');
            // iOS doesn't have beforeinstallprompt, so we just show it after a delay
            setTimeout(() => setIsVisible(true), 3000);
        } else if (isAndroid) {
            setPlatform('android');
            const handler = (e) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsVisible(true);
            };
            window.addEventListener('beforeinstallprompt', handler);
            return () => window.removeEventListener('beforeinstallprompt', handler);
        }
    }, []);

    const handleInstall = async () => {
        if (platform === 'android' && deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        } else {
            // For iOS, we can't programmatically trigger, so we show an alert or guide
            // But for now, we'll just keep the banner visible or redirect to a guide page
            alert('To install: Tap the share button and select "Add to Home Screen"');
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="pwa-banner-wrapper">
            <div className="pwa-banner-content glass-morph">
                <div className="pwa-banner-info">
                    <div className="pwa-app-icon">
                        <img src="/logo.svg" alt="Logo" />
                    </div>
                    <div className="pwa-text">
                        <h3>College Date App</h3>
                        <p>Install for the best experience</p>
                    </div>
                </div>
                <div className="pwa-banner-actions">
                    <button className="btn-install-pwa" onClick={handleInstall}>
                        Install
                    </button>
                    <button className="btn-close-pwa" onClick={handleDismiss}>
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
