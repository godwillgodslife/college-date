import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

import { clusters16to20Pages } from './clusters-16-20.mjs';
import { clusters21to25Pages } from './clusters-21-25.mjs';
import { clusters26to30Pages } from './clusters-26-30.mjs';
import { clusters31to35Pages } from './clusters-31-35.mjs';

const root = process.cwd();

const batches = [
  { name: 'Batch 1: Clusters 16-20', pages: clusters16to20Pages },
  { name: 'Batch 2: Clusters 21-25', pages: clusters21to25Pages },
  { name: 'Batch 3: Clusters 26-30', pages: clusters26to30Pages },
  { name: 'Batch 4: Clusters 31-35', pages: clusters31to35Pages },
];

console.log('===========================================================');
console.log('Generating 400 High-Intent Student SEO & GEO Pages (201-600)');
console.log('===========================================================\n');

let totalGenerated = 0;

for (const batch of batches) {
  console.log(`Processing ${batch.name} (${batch.pages.length} pages)...`);
  for (const page of batch.pages) {
    const html = renderSeoPage(page);
    const targetPath = join(root, page.file);
    writeFileSync(targetPath, html, 'utf8');
    totalGenerated++;
  }
}

console.log(`\n Successfully generated ${totalGenerated} / 400 high-intent pages in public/!`);
