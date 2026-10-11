import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const master = sharp('assets/icon.png');
// Crop the dark squircle region: x: 226, y: 226, w: 572, h: 572
const cropped = await master
  .extract({ left: 226, top: 226, width: 572, height: 572 })
  .png()
  .toBuffer();

writeFileSync('test/cropped_squircle.png', cropped);
console.log('Cropped squircle saved, size:', cropped.length);
