import React from 'react';
import OfficialAccountBadge from './OfficialAccountBadge';

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
                padding: '12px 16px',
                margin: '4px 8px 8px 8px',
                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(235, 47, 150, 0.08) 100%)',
                border: '1px solid rgba(0, 210, 255, 0.22)',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                userSelect: 'none',
            }}
            aria-label="Official The College Date Guides Channel"
        >
            {/* Avatar with gradient & Shield */}
            <div
                style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00d2ff 0%, #7928ca 50%, #eb2f96 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 10px rgba(0, 210, 255, 0.3)',
                }}
            >
                <span style={{ fontSize: '1.4rem' }}>🎓</span>
                {/* Official mini check in bottom right of avatar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: '#090d16',
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
                                color: '#ffffff',
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
                            color: '#00d2ff',
                            background: 'rgba(0, 210, 255, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}
                    >
                        📌 PINNED
                    </span>
                </div>

                <div
                    style={{
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <span style={{ color: '#38bdf8' }}>▶</span>
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
                        background: 'linear-gradient(135deg, #00d2ff, #0072ff)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 6px rgba(0, 114, 255, 0.35)',
                    }}
                >
                    {totalGuides} Guides
                </span>
            </div>
        </div>
    );
}
