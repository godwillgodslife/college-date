import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

async function generateEnhancedMaster() {
  const SQUIRCLE_SIZE = 572;
  const RADIUS = 118;
  const CANVAS_SIZE = 640; // allows padding for outer edge glow
  const OFFSET = (CANVAS_SIZE - SQUIRCLE_SIZE) / 2; // 34px

  // 1. Extract and mask the authentic squircle from assets/icon.png
  const squircleRaw = await sharp('assets/icon.png')
    .extract({ left: 226, top: 226, width: SQUIRCLE_SIZE, height: SQUIRCLE_SIZE })
    .png()
    .toBuffer();

  // Create an SVG mask for the squircle with smooth corners
  const maskSvg = `
    <svg width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}">
      <rect x="0" y="0" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/>
    </svg>
  `;
  const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  const maskedSquircle = await sharp(squircleRaw)
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. Create the Netflix-style subtle edge glow + liquid-glass highlights SVG
  const effectsSvg = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Ambient outer edge glow gradients -->
        <linearGradient id="edgeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.45"/>
          <stop offset="50%" stop-color="#a855f7" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.45"/>
        </linearGradient>

        <linearGradient id="glassStrokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
          <stop offset="30%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="#ffffff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0.22"/>
        </linearGradient>

        <linearGradient id="liquidReflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="40%" stop-color="#ffffff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
        </linearGradient>

        <linearGradient id="bottomBounce" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0"/>
        </linearGradient>

        <!-- Glow blur filters -->
        <filter id="wideGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" result="blur"/>
        </filter>
        <filter id="tightGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
        </filter>

        <!-- Clip path to keep internal glass highlights inside the squircle -->
        <clipPath id="squircleClip">
          <rect x="${OFFSET}" y="${OFFSET}" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}" rx="${RADIUS}" ry="${RADIUS}"/>
        </clipPath>
      </defs>

      <!-- LAYER 1: Outer ambient glow (Netflix-style edge glow) -->
      <!-- Wide soft ambient aura -->
      <rect x="${OFFSET}" y="${OFFSET}" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}" rx="${RADIUS}" ry="${RADIUS}"
            fill="none" stroke="url(#edgeGlowGrad)" stroke-width="24" filter="url(#wideGlow)" opacity="0.6"/>

      <!-- Tighter defined rim glow -->
      <rect x="${OFFSET}" y="${OFFSET}" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}" rx="${RADIUS}" ry="${RADIUS}"
            fill="none" stroke="url(#edgeGlowGrad)" stroke-width="10" filter="url(#tightGlow)" opacity="0.8"/>
    </svg>
  `;

  const overlaySvg = `
    <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="glassStrokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.48"/>
          <stop offset="30%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="70%" stop-color="#ffffff" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.25"/>
        </linearGradient>

        <linearGradient id="liquidReflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
        </linearGradient>

        <linearGradient id="bottomBounce" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#ec4899" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.0"/>
        </linearGradient>

        <clipPath id="squircleClip">
          <rect x="${OFFSET}" y="${OFFSET}" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE}" rx="${RADIUS}" ry="${RADIUS}"/>
        </clipPath>
      </defs>

      <!-- LAYER 3: Liquid-Glass top highlight curve (clipped inside squircle) -->
      <g clip-path="url(#squircleClip)">
        <!-- Top liquid-glass reflection crescent -->
        <ellipse cx="${OFFSET + SQUIRCLE_SIZE / 2}" cy="${OFFSET + 40}" rx="${SQUIRCLE_SIZE * 0.48}" ry="${SQUIRCLE_SIZE * 0.28}"
                 fill="url(#liquidReflection)"/>

        <!-- Subtle bottom color bounce -->
        <rect x="${OFFSET}" y="${OFFSET + SQUIRCLE_SIZE * 0.6}" width="${SQUIRCLE_SIZE}" height="${SQUIRCLE_SIZE * 0.4}"
              fill="url(#bottomBounce)"/>
      </g>

      <!-- LAYER 4: Refined liquid-glass bevel / border stroke -->
      <rect x="${OFFSET + 1}" y="${OFFSET + 1}" width="${SQUIRCLE_SIZE - 2}" height="${SQUIRCLE_SIZE - 2}" rx="${RADIUS - 1}" ry="${RADIUS - 1}"
            fill="none" stroke="url(#glassStrokeGrad)" stroke-width="2.5"/>
    </svg>
  `;

  const glowBuffer = await sharp(Buffer.from(effectsSvg)).png().toBuffer();
  const overlayBuffer = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

  // Composite: Background glow -> Masked squircle -> Glass overlay
  const composite = await sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: glowBuffer, left: 0, top: 0 },
    { input: maskedSquircle, left: OFFSET, top: OFFSET },
    { input: overlayBuffer, left: 0, top: 0 }
  ])
  .png()
  .toBuffer();

  writeFileSync('test/enhanced_icon_prototype.png', composite);
  console.log('Saved enhanced icon prototype, size:', composite.length);
}

generateEnhancedMaster().catch(console.error);
