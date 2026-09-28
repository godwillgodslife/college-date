import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

import { cluster11Pages } from './cluster11.mjs';
import { cluster12Pages } from './cluster12.mjs';
import { cluster13Pages } from './cluster13.mjs';
import { cluster14Pages } from './cluster14.mjs';
import { cluster15Pages } from './cluster15.mjs';

const root = process.cwd();

const wave1Clusters = [
  { name: 'Cluster 11: Hostel & Hall of Residence Micro-Cultures', pages: cluster11Pages },
  { name: 'Cluster 12: Inter-Faculty Dynamics & Departmental Matchups', pages: cluster12Pages },
  { name: 'Cluster 13: Campus Fellowship, Faith Conflicts & Moral Dilemmas', pages: cluster13Pages },
  { name: 'Cluster 14: University Strikes (ASUU/NASU) Relocations & Long Shutdowns', pages: cluster14Pages },
  { name: 'Cluster 15: NYSC Orientation Camp, PPA & Post-Graduation Divergence', pages: cluster15Pages },
];

console.log('===========================================================');
console.log('Generating Wave 1: 100 High-Intent Student SEO & GEO Pages');
console.log('===========================================================\n');

let totalGenerated = 0;

for (const cluster of wave1Clusters) {
  console.log(`Processing ${cluster.name} (${cluster.pages.length} pages)...`);
  for (const page of cluster.pages) {
    const html = renderSeoPage(page);
    const targetPath = join(root, page.file);
    writeFileSync(targetPath, html, 'utf8');
    totalGenerated++;
  }
}

console.log(`\n Successfully generated ${totalGenerated} / 100 high-intent pages in public/!`);
