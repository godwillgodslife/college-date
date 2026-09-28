import { cluster11Pages } from './cluster11.mjs';
import { cluster12Pages } from './cluster12.mjs';
import { cluster13Pages } from './cluster13.mjs';
import { cluster14Pages } from './cluster14.mjs';
import { cluster15Pages } from './cluster15.mjs';

const all = [
  ...cluster11Pages,
  ...cluster12Pages,
  ...cluster13Pages,
  ...cluster14Pages,
  ...cluster15Pages,
];

console.log('Total pages to check:', all.length);
const issues = [];

for (const p of all) {
  if (p.title.length < 20 || p.title.length > 70) {
    issues.push({ slug: p.slug, type: 'title', len: p.title.length, val: p.title });
  }
  if (p.description.length < 80 || p.description.length > 180) {
    issues.push({ slug: p.slug, type: 'desc', len: p.description.length, val: p.description });
  }
  if (p.description.includes("'")) {
    issues.push({ slug: p.slug, type: 'desc_quote', val: p.description });
  }
}

console.log('Issues found:', issues.length);
for (const i of issues) {
  console.log(`[${i.type}] (${i.len} chars) ${i.slug}: "${i.val}"`);
}
