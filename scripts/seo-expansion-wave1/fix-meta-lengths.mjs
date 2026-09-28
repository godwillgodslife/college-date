import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const clusters = [
  { num: 11, file: 'cluster11.mjs', exportName: 'cluster11Pages' },
  { num: 12, file: 'cluster12.mjs', exportName: 'cluster12Pages' },
  { num: 13, file: 'cluster13.mjs', exportName: 'cluster13Pages' },
  { num: 14, file: 'cluster14.mjs', exportName: 'cluster14Pages' },
  { num: 15, file: 'cluster15.mjs', exportName: 'cluster15Pages' },
];

function cleanTitle(title) {
  let t = title.replace(/&quot;/g, '').replace(/"/g, '').replace(/'/g, '').trim();
  if (t.length > 68) {
    // Trim before colon or at word boundary
    if (t.includes(':')) {
      const parts = t.split(':');
      t = parts[0].trim();
      if (t.length < 30 && parts[1]) {
        t = `${parts[0]}: ${parts[1].trim()}`.slice(0, 65).trim();
      }
    } else {
      t = t.slice(0, 65).trim();
    }
  }
  return t;
}

function cleanDesc(desc) {
  let d = desc.replace(/'/g, '').replace(/"/g, '').trim();
  
  // If too long, prune common trailer sentences
  if (d.length > 175) {
    d = d.replace(/ Discover long-distance survival tips, communication frameworks, and emotional resilience\./, '');
    d = d.replace(/ Discover financial tips, career support, and relationship advice\./, '');
    d = d.replace(/ Discover practical dating advice, faith frameworks, and boundary strategies\./, '');
    d = d.replace(/ Discover practical advice, communication frameworks, and relationship strategies\./, '');
    d = d.replace(/ Discover roommate diplomacy, campus dating rules, and residential survival strategies\./, '');
  }

  // If still too long (> 175), slice at last punctuation or word before 170
  if (d.length > 175) {
    const periodIdx = d.lastIndexOf('.', 175);
    if (periodIdx > 90) {
      d = d.slice(0, periodIdx + 1);
    } else {
      const spaceIdx = d.lastIndexOf(' ', 170);
      d = `${d.slice(0, spaceIdx)}.`;
    }
  }

  // If too short (< 85), append standard helpful trailer
  if (d.length < 85) {
    d = `${d} Learn actionable campus dating advice, student strategies, and practical relationship guidance.`;
    if (d.length > 175) {
      d = d.slice(0, 170) + '.';
    }
  }

  return d;
}

async function fixMetaLengths() {
  console.log('Fixing meta lengths across Clusters 11-15...');

  for (const c of clusters) {
    const filePath = join(root, 'scripts', 'seo-expansion-wave1', c.file);
    const { pathToFileURL } = await import('node:url');
    const mod = await import(pathToFileURL(filePath).href);
    const pages = mod[c.exportName];

    for (const page of pages) {
      page.title = cleanTitle(page.title);
      page.description = cleanDesc(page.description);
    }

    const fileContent = `// Auto-generated Cluster ${c.num}: Enriched Deep Content (Topics ${c.num === 11 ? '101 to 120' : c.num === 12 ? '121 to 140' : c.num === 13 ? '141 to 160' : c.num === 14 ? '161 to 180' : '181 to 200'})
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const ${c.exportName} = ${JSON.stringify(pages, null, 2)};
`;
    writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✓ Cleaned meta for ${c.file}`);
  }

  console.log('All metadata lengths sanitized!');
}

fixMetaLengths().catch((err) => {
  console.error('Failed to fix meta lengths:', err);
  process.exit(1);
});
