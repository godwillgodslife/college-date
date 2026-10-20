import React from 'react';
import { Link } from 'react-router-dom';
import {
    DashboardMatchIcon,
    DashboardChatIcon,
    DashboardExploreIcon,
    DashboardPremiumIcon,
    DashboardWalletIcon,
    DashboardRequestsIcon
} from './DashboardIcons';
import './FeatureCard.css';

/**
 * Maps known route patterns or titles to intuitive dashboard variants.
 */
function inferVariant(variant, to = '', title = '') {
    if (variant) return variant;
    const lowerTo = (to || '').toLowerCase();
    const lowerTitle = (title || '').toLowerCase();

    if (lowerTo === '/match' || lowerTitle.includes('match')) return 'match';
    if (lowerTo === '/chat' || lowerTitle.includes('message')) return 'chat';
    if (lowerTo === '/explore' || lowerTitle.includes('explore')) return 'explore';
    if (lowerTo.startsWith('/premium') || lowerTitle.includes('premium') || lowerTitle.includes('ultra')) return 'premium';
    if (lowerTo === '/wallet' || lowerTitle.includes('wallet')) return 'wallet';
    if (lowerTo === '/requests' || lowerTitle.includes('request')) return 'requests';
    return '';
}

/**
 * Returns a premium vector icon component based on the card variant
 */
function getIconForVariant(variant, isUltra = false) {
    switch (variant) {
        case 'match':
            return <DashboardMatchIcon />;
        case 'chat':
            return <DashboardChatIcon />;
        case 'explore':
            return <DashboardExploreIcon />;
        case 'premium':
            return <DashboardPremiumIcon isUltra={isUltra} />;
        case 'wallet':
            return <DashboardWalletIcon />;
        case 'requests':
            return <DashboardRequestsIcon />;
        default:
            return null;
    }
}

export default function FeatureCard({
    icon,
    title,
    description,
    to,
    comingSoon = false,
    variant = '',
    badge = null,
    featured = false,
    isUltra = false
}) {
    const effectiveVariant = inferVariant(variant, to, title);

    // If icon is a valid React element (not raw emoji string), use it directly.
    // If it's a string emoji or empty, upgrade seamlessly to the premium vector icon.
    let renderedIcon = icon;
    const isStringIcon = typeof icon === 'string';
    const fallbackVector = getIconForVariant(effectiveVariant, isUltra || Boolean(title?.includes('Ultra')));

    if ((!icon || isStringIcon) && fallbackVector) {
        renderedIcon = fallbackVector;
    }

    const content = (
        <div
            className={`feature-card ${effectiveVariant ? `feature-card-${effectiveVariant}` : ''} ${featured ? 'feature-card-featured' : ''} ${comingSoon ? 'coming-soon' : ''}`}
            data-variant={effectiveVariant || undefined}
        >
            <div className="feature-card-icon">
                <div className={`feature-icon-badge ${effectiveVariant ? `feature-icon-badge-${effectiveVariant}` : ''}`}>
                    {renderedIcon}
                </div>
            </div>
            <div className="feature-card-body">
                <div className="feature-card-title-row">
                    <h3 className="feature-card-title">{title}</h3>
                    {badge && <span className="feature-card-inline-badge">{badge}</span>}
                </div>
                <p className="feature-card-desc">{description}</p>
            </div>
            {comingSoon && <span className="feature-card-badge">Coming Soon</span>}
            {!comingSoon && (
                <span className="feature-card-arrow" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            )}
        </div>
    );

    if (comingSoon || !to) {
        return content;
    }

    return <Link to={to} className="feature-card-link">{content}</Link>;
}
