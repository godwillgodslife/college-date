import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RES_DIR = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const DENSITIES = [
  { name: 'mdpi', legacy: 48, adaptive: 108 },
  { name: 'hdpi', legacy: 72, adaptive: 162 },
  { name: 'xhdpi', legacy: 96, adaptive: 216 },
  { name: 'xxhdpi', legacy: 144, adaptive: 324 },
  { name: 'xxxhdpi', legacy: 192, adaptive: 432 }
];

async function main() {
  console.log('Generating Premium Liquid-Glass Launcher Icons for The College Date...');

  // 1. Extract the authentic squircle artwork from assets/icon.png (572x572)
  const SQUIRCLE_SRC_SIZE = 572;
  const SRC_RADIUS = 118;
  const squircleRaw = await sharp(join(ROOT, 'assets', 'icon.png'))
    .extract({ left: 226, top: 226, width: SQUIRCLE_SRC_SIZE, height: SQUIRCLE_SRC_SIZE })
    .png()
    .toBuffer();

  // Create smooth squircle mask
  const maskSvg = `
    <svg width="${SQUIRCLE_SRC_SIZE}" height="${SQUIRCLE_SRC_SIZE}">
      <rect x="0" y="0" width="${SQUIRCLE_SRC_SIZE}" height="${SQUIRCLE_SRC_SIZE}" rx="${SRC_RADIUS}" ry="${SRC_RADIUS}" fill="#fff"/>
    </svg>
  `;
  const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();
  const maskedSquircleMaster = await sharp(squircleRaw)
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. High-res generator for Adaptive Icon Foreground (432x432 base)
  async function renderAdaptiveForeground(canvasSize) {
    // Safe area is 72dp out of 108dp canvas = ~65% of canvasSize
    const iconSize = Math.round(canvasSize * (280 / 432));
    const radius = Math.round(iconSize * (SRC_RADIUS / SQUIRCLE_SRC_SIZE));
    const offset = Math.round((canvasSize - iconSize) / 2);

    const resizedSquircle = await sharp(maskedSquircleMaster)
      .resize(iconSize, iconSize, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const glowSvg = `
      <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.50"/>
            <stop offset="50%" stop-color="#a855f7" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.50"/>
          </linearGradient>
          <filter id="blurWide" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="${canvasSize * 0.028}" result="blur"/>
          </filter>
          <filter id="blurTight" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${canvasSize * 0.010}" result="blur"/>
          </filter>
        </defs>
        <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"
              fill="none" stroke="url(#edgeGlow)" stroke-width="${Math.max(1, canvasSize * 0.042)}" filter="url(#blurWide)" opacity="0.65"/>
        <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"
              fill="none" stroke="url(#edgeGlow)" stroke-width="${Math.max(1, canvasSize * 0.014)}" filter="url(#blurTight)" opacity="0.85"/>
      </svg>
    `;

    const overlaySvg = `
      <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glassStroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.52"/>
            <stop offset="35%" stop-color="#ffffff" stop-opacity="0.20"/>
            <stop offset="70%" stop-color="#ffffff" stop-opacity="0.07"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.26"/>
          </linearGradient>
          <linearGradient id="liquidReflect" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.04"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="bottomReflect" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ec4899" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0"/>
          </linearGradient>
          <clipPath id="squircleClip">
            <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"/>
          </clipPath>
        </defs>
        <g clip-path="url(#squircleClip)">
          <ellipse cx="${offset + iconSize / 2}" cy="${offset + iconSize * 0.08}" rx="${iconSize * 0.48}" ry="${iconSize * 0.28}"
                   fill="url(#liquidReflect)"/>
          <rect x="${offset}" y="${offset + iconSize * 0.6}" width="${iconSize}" height="${iconSize * 0.4}"
                fill="url(#bottomReflect)"/>
        </g>
        <rect x="${offset + 0.75}" y="${offset + 0.75}" width="${iconSize - 1.5}" height="${iconSize - 1.5}" rx="${radius - 0.75}" ry="${radius - 0.75}"
              fill="none" stroke="url(#glassStroke)" stroke-width="${Math.max(1, canvasSize * 0.0045)}"/>
      </svg>
    `;

    const glowBuf = await sharp(Buffer.from(glowSvg)).png().toBuffer();
    const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

    return await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: glowBuf, left: 0, top: 0 },
      { input: resizedSquircle, left: offset, top: offset },
      { input: overlayBuf, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
  }

  // 3. High-res generator for Adaptive Icon Background (covers 108dp)
  async function renderAdaptiveBackground(canvasSize) {
    const bgSvg = `
      <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
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
        <rect width="${canvasSize}" height="${canvasSize}" fill="url(#bgGlow)"/>
        <circle cx="${canvasSize / 2}" cy="${canvasSize / 2}" r="${canvasSize * 0.45}" fill="url(#ambientViolet)"/>
      </svg>
    `;
    return await sharp(Buffer.from(bgSvg)).png().toBuffer();
  }

  // 4. Legacy Squircle Icon (e.g. 192x192)
  async function renderLegacySquircleIcon(size) {
    const iconSize = Math.round(size * (172 / 192));
    const radius = Math.round(iconSize * (SRC_RADIUS / SQUIRCLE_SRC_SIZE));
    const offset = Math.round((size - iconSize) / 2);

    const resizedSquircle = await sharp(maskedSquircleMaster)
      .resize(iconSize, iconSize, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const glowSvg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.55"/>
            <stop offset="50%" stop-color="#a855f7" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.55"/>
          </linearGradient>
          <filter id="blurWide" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="${size * 0.035}" result="blur"/>
          </filter>
          <filter id="blurTight" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${size * 0.012}" result="blur"/>
          </filter>
        </defs>
        <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"
              fill="none" stroke="url(#edgeGlow)" stroke-width="${Math.max(1, size * 0.045)}" filter="url(#blurWide)" opacity="0.7"/>
        <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"
              fill="none" stroke="url(#edgeGlow)" stroke-width="${Math.max(1, size * 0.015)}" filter="url(#blurTight)" opacity="0.85"/>
      </svg>
    `;

    const overlaySvg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glassStroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
            <stop offset="35%" stop-color="#ffffff" stop-opacity="0.20"/>
            <stop offset="70%" stop-color="#ffffff" stop-opacity="0.07"/>
            <stop offset="100%" stop-color="#ec4899" stop-opacity="0.26"/>
          </linearGradient>
          <linearGradient id="liquidReflect" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.04"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
          </linearGradient>
          <clipPath id="squircleClip">
            <rect x="${offset}" y="${offset}" width="${iconSize}" height="${iconSize}" rx="${radius}" ry="${radius}"/>
          </clipPath>
        </defs>
        <g clip-path="url(#squircleClip)">
          <ellipse cx="${offset + iconSize / 2}" cy="${offset + iconSize * 0.08}" rx="${iconSize * 0.48}" ry="${iconSize * 0.28}"
                   fill="url(#liquidReflect)"/>
        </g>
        <rect x="${offset + 0.75}" y="${offset + 0.75}" width="${iconSize - 1.5}" height="${iconSize - 1.5}" rx="${radius - 0.75}" ry="${radius - 0.75}"
              fill="none" stroke="url(#glassStroke)" stroke-width="${Math.max(1, size * 0.007)}"/>
      </svg>
    `;

    const glowBuf = await sharp(Buffer.from(glowSvg)).png().toBuffer();
    const overlayBuf = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: glowBuf, left: 0, top: 0 },
      { input: resizedSquircle, left: offset, top: offset },
      { input: overlayBuf, left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
  }

  // 5. Legacy Round Icon (e.g. 192x192)
  async function renderLegacyRoundIcon(size) {
    const center = size / 2;
    const radius = size / 2;
    const innerSize = Math.round(size * (146 / 192));
    const offset = Math.round((size - innerSize) / 2);

    const innerSquircle = await sharp(maskedSquircleMaster)
      .resize(innerSize, innerSize, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    const roundSvg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
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
            <circle cx="${center}" cy="${center}" r="${radius}"/>
          </clipPath>
        </defs>
        <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#roundBg)"/>
        <g clip-path="url(#circleClip)">
          <ellipse cx="${center}" cy="${offset + innerSize * 0.08}" rx="${innerSize * 0.48}" ry="${innerSize * 0.28}" fill="url(#liquidReflect)"/>
        </g>
        <circle cx="${center}" cy="${center}" r="${radius - Math.max(1, size * 0.01)}" fill="none" stroke="url(#rimGlow)" stroke-width="${Math.max(1, size * 0.022)}" opacity="0.75"/>
        <circle cx="${center}" cy="${center}" r="${radius - 0.75}" fill="none" stroke="url(#rimGlassStroke)" stroke-width="${Math.max(1, size * 0.01)}"/>
      </svg>
    `;

    const roundBase = await sharp(Buffer.from(roundSvg)).png().toBuffer();
    return await sharp(roundBase)
      .composite([{ input: innerSquircle, left: offset, top: offset }])
      .png()
      .toBuffer();
  }

  // 6. Generate across all densities
  for (const d of DENSITIES) {
    const targetDir = join(RES_DIR, `mipmap-${d.name}`);
    mkdirSync(targetDir, { recursive: true });

    console.log(`Generating mipmap-${d.name}: legacy ${d.legacy}x${d.legacy}, adaptive ${d.adaptive}x${d.adaptive}...`);

    const [fgBuf, bgBuf, legacyBuf, roundBuf] = await Promise.all([
      renderAdaptiveForeground(d.adaptive),
      renderAdaptiveBackground(d.adaptive),
      renderLegacySquircleIcon(d.legacy),
      renderLegacyRoundIcon(d.legacy)
    ]);

    writeFileSync(join(targetDir, 'ic_launcher_foreground.png'), fgBuf);
    writeFileSync(join(targetDir, 'ic_launcher_background.png'), bgBuf);
    writeFileSync(join(targetDir, 'ic_launcher.png'), legacyBuf);
    writeFileSync(join(targetDir, 'ic_launcher_round.png'), roundBuf);
  }

  // 7. Update web/PWA icons in public/
  const pwaIcon192 = await renderLegacySquircleIcon(192);
  const pwaIcon64 = await renderLegacySquircleIcon(64);
  const pwaTouch180 = await renderLegacySquircleIcon(180);

  writeFileSync(join(ROOT, 'public', 'favicon.png'), pwaIcon192);
  writeFileSync(join(ROOT, 'public', 'favicon-64.png'), pwaIcon64);
  writeFileSync(join(ROOT, 'public', 'apple-touch-icon.png'), pwaTouch180);

  // 8. Update adaptive XML definitions (removing 16.7% double insetting)
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

  const anydpiDir = join(RES_DIR, 'mipmap-anydpi-v26');
  mkdirSync(anydpiDir, { recursive: true });
  writeFileSync(join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
  writeFileSync(join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  console.log('✓ All Premium Liquid-Glass Launcher Icons successfully generated and saved.');
}

main().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
