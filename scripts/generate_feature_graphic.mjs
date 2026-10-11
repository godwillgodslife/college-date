import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createFeatureGraphic() {
    const width = 1024;
    const height = 500;
    
    // Read the logo
    const logoBuffer = await sharp('public/logo-512.png')
        .resize(220, 220)
        .toBuffer();
    
    const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0b0816" />
                <stop offset="50%" stop-color="#180f2d" />
                <stop offset="100%" stop-color="#2e0c20" />
            </linearGradient>
            <radialGradient id="glowPink" cx="20%" cy="45%" r="50%">
                <stop offset="0%" stop-color="#ff2d55" stop-opacity="0.32" />
                <stop offset="100%" stop-color="#ff2d55" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="glowPurple" cx="80%" cy="45%" r="50%">
                <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.30" />
                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="65%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#ff7597" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.6" />
            </filter>
        </defs>

        <!-- Base Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
        <rect width="${width}" height="${height}" fill="url(#glowPink)" />
        <rect width="${width}" height="${height}" fill="url(#glowPurple)" />

        <!-- Subtle Circular Accents -->
        <circle cx="850" cy="250" r="230" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5" />
        <circle cx="850" cy="250" r="330" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1.5" />

        <!-- Content Left: Typography & Value Props -->
        <g transform="translate(70, 0)">
            <!-- Campus Category Pill -->
            <rect x="0" y="80" width="290" height="34" rx="17" fill="rgba(255, 45, 85, 0.16)" stroke="rgba(255, 45, 85, 0.45)" stroke-width="1.2" />
            <text x="16" y="102" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#ff6b8b" letter-spacing="1">
                🎓 NIGERIAN CAMPUS COMMUNITY
            </text>

            <!-- Main Title -->
            <text x="0" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="url(#titleGrad)" letter-spacing="-1">
                The College Date
            </text>

            <!-- Subtitle -->
            <text x="0" y="214" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="rgba(255, 255, 255, 0.88)">
                Verified Student Dating, Social &amp; Anonymous Q&amp;A
            </text>

            <!-- Campus Tags -->
            <text x="0" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="rgba(255, 255, 255, 0.55)">
                UNILAG • UI • OAU • LASU • UNIBEN • FUTA • COVENANT • ABU
            </text>

            <!-- Feature Pills Row -->
            <g transform="translate(0, 296)">
                <!-- Pill 1: Verified -->
                <rect x="0" y="0" width="168" height="38" rx="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                <text x="16" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#38ef7d">
                    ✓ Verified Profiles
                </text>

                <!-- Pill 2: Secrets & Asks -->
                <rect x="180" y="0" width="176" height="38" rx="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                <text x="196" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#f59e0b">
                    🤫 Anonymous Q&amp;A
                </text>

                <!-- Pill 3: Realtime Chat -->
                <rect x="368" y="0" width="160" height="38" rx="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                <text x="384" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#60a5fa">
                    💬 Real-Time Chat
                </text>
            </g>

            <!-- Security Footnote -->
            <text x="0" y="405" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="rgba(255, 255, 255, 0.45)">
                🔒 NDPA 2023 Compliant • 100% Identity Shield • 18+ Verified Students Only
            </text>
        </g>
    </svg>
    `);

    const destDir = path.resolve('release/playstore-assets');
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const outputPath = path.join(destDir, 'feature_graphic_1024x500.png');

    // Compose SVG with Logo
    await sharp(svgOverlay)
        .composite([
            {
                input: logoBuffer,
                top: 140,
                left: 740
            }
        ])
        .png({ quality: 95 })
        .toFile(outputPath);

    console.log('Feature graphic successfully saved to:', outputPath);
}

createFeatureGraphic().catch(err => {
    console.error('Failed to create feature graphic:', err);
    process.exit(1);
});
