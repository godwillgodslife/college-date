import React from 'react';
import OfficialAccountBadge from './OfficialAccountBadge';
import brandIcon from '../assets/landing-brand-icon.webp';

/**
 * OfficialChannelCard
 * Pinned official channel card rendered at the top of the Chat conversation list.
 * Mimics WhatsApp's official verified announcement channel card.
 */
export default function OfficialChannelCard({
    onClick,
    latestPostTitle = 'How Matching, Swiping & Quota Work',
    totalGuides = 6,
    className = '',
}) {
    return (
        <div
            className={`official-channel-card ${className}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                margin: '4px 8px 8px 8px',
                background: 'var(--bg-secondary, #131318)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
                userSelect: 'none',
            }}
            aria-label="Official The College Date Guides Channel"
        >
            {/* Avatar with official brand logo & Shield */}
            <div
                style={{
                    position: 'relative',
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--bg-tertiary, #18181f)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: 'none',
                }}
            >
                <img
                    src={brandIcon}
                    alt="The College Date"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '11px',
                        display: 'block',
                    }}
                />
                {/* Official mini check in bottom right of avatar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-3px',
                        right: '-3px',
                        background: 'var(--bg-secondary, #090d16)',
                        borderRadius: '50%',
                        padding: '1px',
                        display: 'flex',
                    }}
                >
                    <OfficialAccountBadge size="small" />
                </div>
            </div>

            {/* Info column */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span
                            style={{
                                color: 'var(--text-primary, #ffffff)',
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            The College Date
                        </span>
                        <OfficialAccountBadge size="small" />
                    </div>
                    <span
                        style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-secondary, #94a3b8)',
                            background: 'var(--bg-tertiary, rgba(255, 255, 255, 0.06))',
                            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}
                    >
                        PINNED
                    </span>
                </div>

                <div
                    style={{
                        color: 'var(--text-secondary, #94a3b8)',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>▶</span>
                    <span>{latestPostTitle}</span>
                </div>
            </div>

            {/* Total guides badge */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        background: 'var(--bg-tertiary, rgba(255, 255, 255, 0.08))',
                        color: 'var(--text-primary, #ffffff)',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '10px',
                        boxShadow: 'none',
                    }}
                >
                    {totalGuides} Guides
                </span>
            </div>
        </div>
    );
}
