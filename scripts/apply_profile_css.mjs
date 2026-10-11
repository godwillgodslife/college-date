import fs from 'fs';

const cssPath = 'src/pages/Profile.css';
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Replace .live-badge, .verified-badge-pill, .premium-badge-pill
const oldBadges = `.live-badge {
    background: #ff4b4b;
    color: white;
    font-size: 0.6em;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    vertical-align: middle;
    margin-left: 0.5rem;
    text-transform: uppercase;
    display: inline-block;
    animation: pulse 2s infinite;
}

.verified-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.16);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #10b981;
    font-size: 0.62em;
    font-weight: 700;
    margin-left: 0.5rem;
    vertical-align: middle;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.premium-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.22), rgba(245, 158, 11, 0.15));
    border: 1px solid rgba(245, 158, 11, 0.5);
    color: #fbbf24;
    font-size: 0.62em;
    font-weight: 800;
    margin-left: 0.5rem;
    vertical-align: middle;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
}`;

const newBadges = `.live-badge {
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 6px;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    display: inline-flex;
    align-items: center;
}

.verified-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #059669;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.2;
}

html[data-theme="dark"] .verified-badge-pill,
.theme-dark .verified-badge-pill {
    background: rgba(16, 185, 129, 0.18);
    border-color: rgba(16, 185, 129, 0.4);
    color: #10b981;
}

/* Subtle, refined, non-flashy Premium Elite Pill */
.premium-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.32);
    color: #d97706;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    box-shadow: none;
    line-height: 1.2;
}

html[data-theme="dark"] .premium-badge-pill,
.theme-dark .premium-badge-pill {
    background: rgba(245, 158, 11, 0.18);
    border-color: rgba(245, 158, 11, 0.4);
    color: #fbbf24;
}

.premium-pill-icon {
    font-size: 10px;
    line-height: 1;
}

.premium-pill-text {
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1;
}`;

// Normalize line breaks for matching
const normCss = css.replace(/\r\n/g, '\n');
const normOldBadges = oldBadges.replace(/\r\n/g, '\n');

if (normCss.includes(normOldBadges)) {
    css = normCss.replace(normOldBadges, newBadges);
    console.log('✓ Updated badge styles in Profile.css');
} else {
    console.error('Could not find oldBadges in Profile.css');
    process.exit(1);
}

// 2. Append YouTube bridge and profile-badges-row CSS
const ytBridgeCss = `

/* =========================================================================
   Profile Name Layout & Badges Alignment
   ========================================================================= */
.profile-name {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 0.25rem;
}

.profile-name-text {
    line-height: 1.2;
}

.profile-badges-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
}

/* =========================================================================
   YouTube-Style Clean Navigation Bridge to Dashboard & Balance
   ========================================================================= */
.profile-yt-bridge-wrap {
    margin: 0.75rem 0 1.1rem;
    width: 100%;
}

.profile-yt-bridge-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.profile-yt-bridge-btn:active {
    transform: scale(0.99);
    background: var(--bg-hover, rgba(0, 0, 0, 0.04));
}

html[data-theme="dark"] .profile-yt-bridge-btn,
.theme-dark .profile-yt-bridge-btn {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.09);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

html[data-theme="dark"] .profile-yt-bridge-btn:active,
.theme-dark .profile-yt-bridge-btn:active {
    background: rgba(255, 255, 255, 0.07);
}

.profile-yt-bridge-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
}

.profile-yt-bridge-icon {
    font-size: 1.25rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--bg-secondary, rgba(0, 0, 0, 0.04));
    flex-shrink: 0;
}

html[data-theme="dark"] .profile-yt-bridge-icon,
.theme-dark .profile-yt-bridge-icon {
    background: rgba(255, 255, 255, 0.08);
}

.profile-yt-bridge-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.profile-yt-bridge-title {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
}

.profile-yt-bridge-sub {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    line-height: 1.2;
}

.profile-yt-bridge-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.profile-yt-bridge-balance {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--accent-primary, #6366f1);
    background: rgba(99, 102, 241, 0.08);
    padding: 3px 8px;
    border-radius: 8px;
    border: 1px solid rgba(99, 102, 241, 0.2);
    letter-spacing: -0.2px;
}

html[data-theme="dark"] .profile-yt-bridge-balance,
.theme-dark .profile-yt-bridge-balance {
    color: #818cf8;
    background: rgba(99, 102, 241, 0.16);
    border-color: rgba(99, 102, 241, 0.3);
}

.profile-yt-bridge-arrow {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-secondary);
    line-height: 1;
}
`;

css += ytBridgeCss;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✓ Successfully appended YouTube bridge and name alignment CSS to Profile.css');
