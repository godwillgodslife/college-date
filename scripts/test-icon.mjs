import sharp from 'sharp';

const svg = `<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>`;
const buf = await sharp(Buffer.from(svg)).png().toBuffer();
console.log('Sharp SVG conversion succeeded:', buf.length);
