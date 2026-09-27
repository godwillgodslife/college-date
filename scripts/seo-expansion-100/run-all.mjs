import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

import { cluster1Pages } from './cluster1.mjs';
import { cluster2Pages } from './cluster2.mjs';
import { cluster3Pages } from './cluster3.mjs';
import { cluster4Pages } from './cluster4.mjs';
import { cluster5Pages } from './cluster5.mjs';
import { cluster6Pages } from './cluster6.mjs';
import { cluster7Pages } from './cluster7.mjs';
import { cluster8Pages } from './cluster8.mjs';
import { cluster9Pages } from './cluster9.mjs';
import { cluster10Pages } from './cluster10.mjs';

const root = process.cwd();

const allClusters = [
  { name: 'Cluster 1: Polytechnic & Vocational Realities', pages: cluster1Pages },
  { name: 'Cluster 2: Campus Cohabitation & Living Dynamics', pages: cluster2Pages },
  { name: 'Cluster 3: Gen-Z Terminology & Grey Zones', pages: cluster3Pages },
  { name: 'Cluster 4: Economic Pressure & Inflation Dating', pages: cluster4Pages },
  { name: 'Cluster 5: Academics, CGPA & Ethics', pages: cluster5Pages },
  { name: 'Cluster 6: Mental Health, Insecurity & Healing', pages: cluster6Pages },
  { name: 'Cluster 7: Campus Safety & Harassment Protection', pages: cluster7Pages },
  { name: 'Cluster 8: City & Campus Regional Hub Guides', pages: cluster8Pages },
  { name: 'Cluster 9: Digital Dating & Texting Psychology', pages: cluster9Pages },
  { name: 'Cluster 10: Special Demographics & Niche Circumstances', pages: cluster10Pages },
];

console.log('====================================================');
console.log('Generating All 100 High-Intent Student SEO & GEO Pages');
console.log('====================================================\n');

let totalGenerated = 0;

for (const cluster of allClusters) {
  console.log(`Processing ${cluster.name} (${cluster.pages.length} pages)...`);
  for (const page of cluster.pages) {
    const html = renderSeoPage(page);
    const targetPath = join(root, page.file);
    writeFileSync(targetPath, html, 'utf8');
    totalGenerated++;
  }
}

console.log(`\n Successfully generated ${totalGenerated} / 100 high-intent pages in public/!`);
