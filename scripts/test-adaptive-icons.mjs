import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SQUIRCLE_SRC_SIZE = 572;
const SRC_RADIUS = 118;

// 1. Extract masked squircle from assets/icon.png
const squircleRaw = await sharp('assets/icon.png')
  .extract({ left: 226, top: 226, width: SQUIRCLE_SRC_SIZE, height: SQUIRCLE_SRC_SIZE })
  .png()
  .toBuffer();

const maskSvg = `
  <svg width="${SQUIRCLE_SRC_SIZE}" height="${SQUIRCLE_SRC_SIZE}">
    <rect x="0" y="0" width="${SQUIRCLE_SRC_SIZE}" height="${SQUIRCLE_SRC_SIZE}" rx="${SRC_RADIUS}" ry="${SRC_RADIUS}" fill="#fff"/>
  </svg>
`;
const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();
const maskedSquircle = await sharp(squircleRaw)
  .composite([{ input: maskBuffer, blend: 'dest-in' }])
  .png()
  .toBuffer();

// Generate an adaptive icon foreground at 432x432 (xxxhdpi)
async function generateAdaptiveForeground() {
  const CANVAS = 432;
  const ICON_SIZE = 280; // safe area is 288px (72dp / 108dp * 432)
  const RADIUS = Math.round(ICON_SIZE * (SRC_RADIUS / SQUIRCLE_SRC_SIZE)); // ~58px
  const OFFSET = (CANVAS - ICON_SIZE) / 2; // 76px

  const resizedSquircle = await sharp(maskedSquircle)
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toBuffer();

  const glowSvg = `
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.45"/>
          <stop offset="50%" stop-color="#a855f7" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.45"/>
        </linearGradient>
        <filter id="blurWide" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur"/>
        </filter>
        <filter id="blurTight" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4.5" result="blur"/>
        </filter>
      </defs>
      <!-- Wide soft ambient aura -->
      <rect x="${OFFSET}" y="${OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${RADIUS}" ry="${RADIUS}"
            fill="none" stroke="url(#edgeGlow)" stroke-width="18" filter="url(#blurWide)" opacity="0.65"/>
      <!-- Tight defined rim glow -->
      <rect x="${OFFSET}" y="${OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${RADIUS}" ry="${RADIUS}"
            fill="none" stroke="url(#edgeGlow)" stroke-width="6" filter="url(#blurTight)" opacity="0.85"/>
    </svg>
  `;

  const overlaySvg = `
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="glassStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.50"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="#ffffff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.25"/>
        </linearGradient>
        <linearGradient id="liquidReflect" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="bottomReflect" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0"/>
        </linearGradient>
        <clipPath id="squircleClip">
          <rect x="${OFFSET}" y="${OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${RADIUS}" ry="${RADIUS}"/>
        </clipPath>
      </defs>
      <!-- Liquid-glass reflection inside squircle -->
      <g clip-path="url(#squircleClip)">
        <ellipse cx="${OFFSET + ICON_SIZE / 2}" cy="${OFFSET + 20}" rx="${ICON_SIZE * 0.48}" ry="${ICON_SIZE * 0.28}"
                 fill="url(#liquidReflect)"/>
        <rect x="${OFFSET}" y="${OFFSET + ICON_SIZE * 0.6}" width="${ICON_SIZE}" height="${ICON_SIZE * 0.4}"
              fill="url(#bottomReflect)"/>
      </g>
      <!-- Glass bevel border -->
      <rect x="${OFFSET + 0.75}" y="${OFFSET + 0.75}" width="${ICON_SIZE - 1.5}" height="${ICON_SIZE - 1.5}" rx="${RADIUS - 0.75}" ry="${RADIUS - 0.75}"
            fill="none" stroke="url(#glassStroke)" stroke-width="1.8"/>
    </svg>
  `;

  const glowBuf = await sharp(Buffer.from(glowSvg)).png().toBuffer();
  const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

  const result = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: glowBuf, left: 0, top: 0 },
    { input: resizedSquircle, left: OFFSET, top: OFFSET },
    { input: overlayBuf, left: 0, top: 0 }
  ])
  .png()
  .toBuffer();

  return result;
}

// Generate an adaptive icon background at 432x432 (xxxhdpi)
async function generateAdaptiveBackground() {
  const CANVAS = 432;
  const bgSvg = `
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#141e34"/>
          <stop offset="60%" stop-color="#0b101d"/>
          <stop offset="100%" stop-color="#05070d"/>
        </radialGradient>
        <radialGradient id="ambientViolet" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0"/>
        </radialGradient>
      </defs>
      <rect width="${CANVAS}" height="${CANVAS}" fill="url(#bgGlow)"/>
      <circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${CANVAS * 0.45}" fill="url(#ambientViolet)"/>
    </svg>
  `;
  return await sharp(Buffer.from(bgSvg)).png().toBuffer();
}

// Generate a round icon at 192x192 (xxxhdpi)
async function generateRoundIcon() {
  const SIZE = 192;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2;

  // The inner heart & cap icon sized nicely inside the circle
  const INNER_SIZE = 146;
  const OFFSET = (SIZE - INNER_SIZE) / 2;
  const innerSquircle = await sharp(maskedSquircle)
    .resize(INNER_SIZE, INNER_SIZE)
    .png()
    .toBuffer();

  const roundSvg = `
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="roundBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#162038"/>
          <stop offset="65%" stop-color="#0c111e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <linearGradient id="rimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="#a855f7" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.55"/>
        </linearGradient>
        <linearGradient id="rimGlassStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="#ffffff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.25"/>
        </linearGradient>
        <linearGradient id="liquidReflect" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="55%" stop-color="#ffffff" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
        </linearGradient>
        <clipPath id="circleClip">
          <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}"/>
        </clipPath>
      </defs>

      <!-- Background disk -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="url(#roundBg)"/>

      <!-- Liquid-glass reflection inside circle -->
      <g clip-path="url(#circleClip)">
        <ellipse cx="${CENTER}" cy="${OFFSET + 12}" rx="${INNER_SIZE * 0.48}" ry="${INNER_SIZE * 0.28}" fill="url(#liquidReflect)"/>
      </g>

      <!-- Outer ambient edge glow hugging the circle rim -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS - 2}" fill="none" stroke="url(#rimGlow)" stroke-width="4" opacity="0.7"/>

      <!-- Delicate glass bevel stroke -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS - 1}" fill="none" stroke="url(#rimGlassStroke)" stroke-width="1.8"/>
    </svg>
  `;

  const roundBaseBuf = await sharp(Buffer.from(roundSvg)).png().toBuffer();

  const finalRound = await sharp(roundBaseBuf)
    .composite([
      { input: innerSquircle, left: OFFSET, top: OFFSET }
    ])
    .png()
    .toBuffer();

  return finalRound;
}

const [fg, bg, round] = await Promise.all([
  generateAdaptiveForeground(),
  generateAdaptiveBackground(),
  generateRoundIcon()
]);

writeFileSync('test/test_adaptive_fg.png', fg);
writeFileSync('test/test_adaptive_bg.png', bg);
writeFileSync('test/test_round_icon.png', round);

// Also generate preview of what the adaptive icon looks like when masked to a circle by the launcher!
const maskedPreviewSvg = `
  <svg width="432" height="432">
    <circle cx="216" cy="216" r="180" fill="#fff"/>
  </svg>
`;
const maskBuf = await sharp(Buffer.from(maskedPreviewSvg)).png().toBuffer();
const combined = await sharp(bg)
  .composite([{ input: fg, left: 0, top: 0 }])
  .png()
  .toBuffer();
const circleMaskedLauncherPreview = await sharp(combined)
  .composite([{ input: maskBuf, blend: 'dest-in' }])
  .png()
  .toBuffer();

writeFileSync('test/test_launcher_circle_preview.png', circleMaskedLauncherPreview);
console.log('All test icon variations generated successfully!');
