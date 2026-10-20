import React from 'react';

/**
 * OfficialAccountBadge
 * Distinctive verified badge for "Official The College Date"
 * Features a gradient shield with an embedded verified checkmark.
 */
export default function OfficialAccountBadge({ size = 'medium', showLabel = false, className = '' }) {
    const sizePx = size === 'small' ? 14 : size === 'large' ? 22 : 18;
    const fontSize = size === 'small' ? '0.7rem' : size === 'large' ? '0.9rem' : '0.8rem';

    return (
        <span
            className={`official-account-badge ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                verticalAlign: 'middle',
            }}
            title="Official Verified Channel • The College Date"
            aria-label="Official Verified Channel"
        >
            <svg
                width={sizePx}
                height={sizePx}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
            >
                <defs>
                    <linearGradient id="officialShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                </defs>
                <path
                    d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
                    fill="url(#officialShieldGrad)"
                />
                <path
                    d="M10 15.5L6.5 12L7.91 10.59L10 12.67L16.09 6.59L17.5 8L10 15.5Z"
                    fill="#ffffff"
                />
            </svg>
            {showLabel && (
                <span
                    style={{
                        fontSize,
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary, #94a3b8)',
                    }}
                >
                    Official
                </span>
            )}
        </span>
    );
}
