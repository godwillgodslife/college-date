import React, { useState, useEffect } from 'react';
import './RequestsDiscoveryHighlight.css';

/**
 * RequestsDiscoveryHighlight
 * 
 * Elegant, non-intrusive educational coachmark that wraps the existing
 * Likes circle in Chat.jsx for new students who have not yet discovered
 * the Connection Requests page.
 * 
 * Restrained: Animates 3 subtle cycles and settles. Dismisses on click.
 */
export default function RequestsDiscoveryHighlight({
    isActive = false,
    hasRequests = false,
    cue = '💡 Requests are here',
    onClick,
    children,
    className = ''
}) {
    const [isDismissed, setIsDismissed] = useState(false);

    // Auto-settle the visual emphasis after 8.4 seconds without being permanent
    const [isSettled, setIsSettled] = useState(false);

    useEffect(() => {
        if (!isActive) return;

        const settleTimer = setTimeout(() => {
            setIsSettled(true);
        }, 8400);

        return () => clearTimeout(settleTimer);
    }, [isActive]);

    const handleClick = (e) => {
        setIsDismissed(true);
        if (onClick) onClick(e);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e);
        }
    };

    const showHighlight = isActive && !isDismissed && !isSettled;
    const showCoachmark = isActive && !isDismissed;

    return (
        <div
            className={`requests-discovery-wrapper ${showHighlight ? 'has-highlight' : ''} ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
        >
            {children}

            {showCoachmark && (
                <div 
                    className={`requests-discovery-coachmark ${hasRequests ? 'has-pending-requests' : ''}`}
                    role="status"
                    aria-live="polite"
                >
                    <span className="requests-discovery-cue-text">{cue}</span>
                </div>
            )}
        </div>
    );
}
