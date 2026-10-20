import React from 'react';

/**
 * Premium Theme-Intuitive Dashboard Icons for TheCollegeDATE
 * Designed with precision geometric vectors, multi-depth layering,
 * and semantic styling for dark and light themes.
 */

export function DashboardMatchIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-match"
            aria-hidden="true"
        >
            {/* Background overlapping floating companion heart */}
            <path
                d="M17 3.8a3.2 3.2 0 0 0-2.6 1.3 3.2 3.2 0 0 0-2.6-1.3C10 3.8 8.6 5.2 8.6 7c0 2.2 1.9 4 4.8 6.6l1 1 1-1c2.9-2.6 4.8-4.4 4.8-6.6 0-1.8-1.4-3.2-3.2-3.2z"
                stroke="currentColor"
                strokeWidth="1.3"
                opacity="0.45"
            />
            {/* Main Primary Heart with glowing translucent fill */}
            <path
                d="M19.5 8.5c0-2.48-2.02-4.5-4.5-4.5-1.74 0-3.26.99-4 2.45C10.26 4.99 8.74 4 7 4 4.52 4 2.5 6.02 2.5 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21l.95-.96C18.1 15.36 21.5 12.28 21.5 8.5z"
                fill="currentColor"
                fillOpacity="0.22"
            />
            {/* Attraction Spark Center */}
            <circle cx="12" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function DashboardChatIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-chat"
            aria-hidden="true"
        >
            {/* Secondary companion chat bubble in background */}
            <path
                d="M16.5 7.5h1.5a3 3 0 0 1 3 3v3.5a3 3 0 0 1-3 3h-1l-2.5 2.5v-2.5"
                stroke="currentColor"
                strokeWidth="1.3"
                opacity="0.45"
            />
            {/* Main conversation bubble */}
            <path
                d="M4 5.5h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7.5L4 19V8.5a3 3 0 0 1 3-3z"
                fill="currentColor"
                fillOpacity="0.2"
            />
            {/* Active conversation typing dots */}
            <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="10.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="13.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function DashboardExploreIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-explore"
            aria-hidden="true"
        >
            {/* Outer precision compass ring */}
            <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.12" />
            {/* Cardinal axis markers */}
            <line x1="12" y1="2.5" x2="12" y2="5" strokeWidth="1.5" />
            <line x1="12" y1="19" x2="12" y2="21.5" strokeWidth="1.5" opacity="0.6" />
            <line x1="2.5" y1="12" x2="5" y2="12" strokeWidth="1.5" opacity="0.6" />
            <line x1="19" y1="12" x2="21.5" y2="12" strokeWidth="1.5" opacity="0.6" />
            {/* Directional compass needle */}
            <polygon
                points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"
                fill="currentColor"
                fillOpacity="0.45"
            />
            {/* Center navigation pivot */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
    );
}

export function DashboardPremiumIcon({ isUltra = false }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-premium"
            aria-hidden="true"
        >
            {/* Crown base band */}
            <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.45" />
            {/* Royal Crown peaks */}
            <path
                d="M3 17l1.5-8.5 4.5 3.5 3-6.5 3 6.5 4.5-3.5L21 17H3z"
                fill="currentColor"
                fillOpacity="0.22"
            />
            {/* Jewel orbs on peaks */}
            <circle cx="4.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="5.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
            {/* Center jewel facet */}
            <path
                d="M12 10.5l1.5 2.2-1.5 2.2-1.5-2.2L12 10.5z"
                fill="currentColor"
                fillOpacity="0.5"
            />
            {/* Ultra VIP Star Sparkle */}
            {isUltra && (
                <path
                    d="M19.5 2l.6 1.4L21.5 4l-1.4.6-.6 1.4-.6-1.4L17.5 4l1.4-.6.6-1.4z"
                    fill="currentColor"
                    stroke="none"
                />
            )}
        </svg>
    );
}

export function DashboardWalletIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-wallet"
            aria-hidden="true"
        >
            {/* Background card edge */}
            <rect x="4" y="4" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.3" opacity="0.4" />
            {/* Main card body */}
            <rect x="2" y="7" width="20" height="13" rx="3" fill="currentColor" fillOpacity="0.2" />
            {/* Card stripe */}
            <line x1="2" y1="11" x2="22" y2="11" strokeWidth="1.5" />
            {/* Chip */}
            <rect x="5.5" y="13.5" width="3.5" height="2.8" rx="0.6" fill="currentColor" fillOpacity="0.4" strokeWidth="1" />
            {/* Balance coin symbol */}
            <circle cx="16.5" cy="14.8" r="2.2" strokeWidth="1.3" />
            <path d="M16.5 13.6v2.4M15.4 14.8h2.2" strokeWidth="1" />
        </svg>
    );
}

export function DashboardRequestsIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feature-svg feature-svg-requests"
            aria-hidden="true"
        >
            {/* Envelope body */}
            <rect x="2.5" y="5.5" width="19" height="14" rx="3" fill="currentColor" fillOpacity="0.2" />
            {/* Envelope flap fold */}
            <path
                d="M3 6.5l7.8 5.8a2 2 0 0 0 2.4 0L21 6.5"
                strokeWidth="1.6"
            />
            {/* Heart wax seal badge */}
            <circle cx="12" cy="14.5" r="3.2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
            <path
                d="M12 16l-.4-.36C10.5 14.6 9.7 13.9 9.7 13.1c0-.65.5-1.15 1.15-1.15.36 0 .7.17.9.43.2-.26.54-.43.9-.43.65 0 1.15.5 1.15 1.15 0 .8-.8 1.5-1.9 2.54L12 16z"
                fill="currentColor"
                stroke="none"
            />
        </svg>
    );
}
