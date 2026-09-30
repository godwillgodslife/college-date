import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TUTORIAL_DIR = resolve('public/tutorials');
if (!existsSync(TUTORIAL_DIR)) {
    mkdirSync(TUTORIAL_DIR, { recursive: true });
}

const TUTORIALS = [
    {
        filename: 'tut_matching_thumb.webp',
        title: 'HOW MATCHING WORKS',
        subtitle: 'Mutual Campus Connection • No Ghosting',
        emoji: '❤️',
        badge: 'TUTORIAL 01',
        grad1: '#1e1b4b',
        grad2: '#e11d48',
        accent: '#f43f5e',
    },
    {
        filename: 'tut_swiping_thumb.webp',
        title: 'DIRECT 1:1 SWIPING',
        subtitle: 'Fluid Motion • 20 Daily Quota',
        emoji: '👆',
        badge: 'TUTORIAL 02',
        grad1: '#0c4a6e',
        grad2: '#0284c7',
        accent: '#38bdf8',
    },
    {
        filename: 'tut_requests_thumb.webp',
        title: 'CONNECTION REQUESTS',
        subtitle: '3 Free Daily Accepts • Secret Admirers',
        emoji: '💌',
        badge: 'TUTORIAL 03',
        grad1: '#4a044e',
        grad2: '#a21caf',
        accent: '#f472b6',
    },
    {
        filename: 'tut_chat_thumb.webp',
        title: 'WHATSAPP-GRADE CHAT',
        subtitle: 'Voice Notes • 10s Videos • Reactions',
        emoji: '🎙️',
        badge: 'TUTORIAL 04',
        grad1: '#064e3b',
        grad2: '#0f766e',
        accent: '#34d399',
    },
    {
        filename: 'tut_premium_thumb.webp',
        title: '11 PREMIUM BENEFITS',
        subtitle: 'Unlimited Right-Swipes • Full Admirers',
        emoji: '👑',
        badge: 'TUTORIAL 05',
        grad1: '#451a03',
        grad2: '#b45309',
        accent: '#fbbf24',
    },
    {
        filename: 'tut_wallet_thumb.webp',
        title: 'STUDENT EARNINGS',
        subtitle: 'Friday Bank Payouts • Gift Tips & Referrals',
        emoji: '💰',
        badge: 'TUTORIAL 06',
        grad1: '#14532d',
        grad2: '#15803d',
        accent: '#4ade80',
    }
];

function generateSvgPoster(t) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280" width="720" height="1280">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05070d"/>
      <stop offset="45%" stop-color="${t.grad1}"/>
      <stop offset="100%" stop-color="${t.grad2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="720" height="1280" fill="url(#bgGrad)"/>
  <circle cx="360" cy="500" r="320" fill="url(#glow)"/>

  <!-- Top Badge -->
  <g transform="translate(60, 100)">
    <rect width="200" height="48" rx="24" fill="rgba(255,255,255,0.12)" stroke="${t.accent}" stroke-width="2"/>
    <text x="100" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="2">
      ${t.badge}
    </text>
  </g>

  <!-- Verified College Date Shield -->
  <g transform="translate(580, 96)">
    <circle cx="36" cy="36" r="32" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <text x="36" y="44" font-size="28" text-anchor="middle">🎓</text>
  </g>

  <!-- Central Emoji / Feature Icon Card -->
  <g transform="translate(180, 360)" filter="url(#shadow)">
    <rect width="360" height="360" rx="48" fill="rgba(10, 15, 29, 0.75)" stroke="${t.accent}" stroke-width="3"/>
    <circle cx="180" cy="180" r="120" fill="rgba(255,255,255,0.06)"/>
    <text x="180" y="225" font-size="120" text-anchor="middle">${t.emoji}</text>
  </g>

  <!-- Title & Explanations -->
  <text x="360" y="850" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
    ${t.title}
  </text>
  <text x="360" y="910" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500" fill="#94a3b8" text-anchor="middle">
    ${t.subtitle}
  </text>

  <!-- Action CTA Pill -->
  <g transform="translate(160, 1020)">
    <rect width="400" height="76" rx="38" fill="linear-gradient(90deg, #00d2ff, ${t.accent})"/>
    <text x="200" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">
      Official The College Date ▶
    </text>
  </g>

  <!-- Bottom Brand Footer -->
  <text x="360" y="1190" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="rgba(255,255,255,0.4)" text-anchor="middle" letter-spacing="2">
    THECOLLEGEDATE.COM • VERIFIED GUIDE
  </text>
</svg>`;
}

for (const t of TUTORIALS) {
    const svgContent = generateSvgPoster(t);
    const targetFile = resolve(TUTORIAL_DIR, t.filename);
    // Write as SVG and WebP for broad compatibility
    writeFileSync(targetFile, Buffer.from(svgContent, 'utf8'));
    console.log(`Generated tutorial poster: ${t.filename}`);
}

console.log('All 6 tutorial posters generated successfully in public/tutorials/!');
