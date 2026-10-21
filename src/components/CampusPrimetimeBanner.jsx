import React, { useState, useEffect } from 'react';
import { getCampusPrimetimeStatus } from '../utils/campusPrimetime';
import { triggerLightHaptic } from '../utils/haptics';
import CampusMysteryMatchModal from './CampusMysteryMatchModal';
import './CampusPrimetimeBanner.css';

export default function CampusPrimetimeBanner({ 
    onBannerClick,
    onMysteryMatchClick,
    currentUserId,
    currentUserProfile,
    onNavigateToChat
}) {
    const [status, setStatus] = useState(() => getCampusPrimetimeStatus());
    const [internalModalOpen, setInternalModalOpen] = useState(false);

    useEffect(() => {
        const tick = () => setStatus(getCampusPrimetimeStatus());
        const interval = setInterval(tick, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleClick = () => {
        triggerLightHaptic();
        if (typeof onBannerClick === 'function') {
            onBannerClick(status);
        } else {
            setInternalModalOpen(true);
        }
    };

    const handleMysteryClick = (e) => {
        e.stopPropagation();
        triggerLightHaptic();
        if (typeof onMysteryMatchClick === 'function') {
            onMysteryMatchClick(status);
        } else {
            setInternalModalOpen(true);
        }
    };

    return (
        <>
            <div
                className={`campus-primetime-banner ${status.isLive ? 'is-live' : 'is-scheduled'}`}
                onClick={handleClick}
                role="button"
                tabIndex={0}
                aria-label={`${status.headline}: ${status.countdown}`}
            >
                <div className="primetime-left">
                    <div className="primetime-badge-row">
                        <span className={`primetime-status-pill ${status.isLive ? 'live-pulse' : ''}`}>
                            {status.label}
                        </span>
                        <span className="primetime-countdown">{status.countdown}</span>
                    </div>
                    <div className="primetime-headline-row">
                        <span className="primetime-headline">{status.headline}</span>
                        <span className="primetime-surge-tag">{status.badge}</span>
                    </div>
                </div>

                <div className="primetime-right">
                    <button 
                        type="button" 
                        className="primetime-mystery-btn"
                        onClick={handleMysteryClick}
                        title="Enter Primetime Mystery Blind Date"
                    >
                        🎭 Speed Date
                    </button>
                </div>
            </div>

            <CampusMysteryMatchModal
                isOpen={internalModalOpen}
                onClose={() => setInternalModalOpen(false)}
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
                onNavigateToChat={onNavigateToChat}
            />
        </>
    );
}

