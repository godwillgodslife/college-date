import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));
const wave1Slugs = topics.map((t) => t.slug);

console.log(`Updating platform routes and sitemaps for Wave 1 (${wave1Slugs.length} topics)...`);

// 1. Update scripts/seo-pages.mjs
console.log('1. Updating scripts/seo-pages.mjs...');
const seoPagesPath = join(root, 'scripts', 'seo-pages.mjs');
let seoPagesContent = readFileSync(seoPagesPath, 'utf8');

const newSeoPagesEntries = wave1Slugs
  .filter((slug) => !seoPagesContent.includes(`'/${slug}'`))
  .map((slug) => `  { path: '/${slug}', source: 'public/${slug}.html', changefreq: 'monthly', priority: '0.8' },`)
  .join('\n');

if (newSeoPagesEntries.length > 0) {
  seoPagesContent = seoPagesContent.replace(
    /(\n\s*\{\s*path:\s*'\/how-to-re-enter-the-dating-scene-after-a-long-campus-dry-spell'[^}]+\},\n)/,
    `$1  // Wave 1 Expansion: Topics 101 to 200 (Clusters 11-15 / 324-URL Milestone)\n${newSeoPagesEntries}\n`
  );
  writeFileSync(seoPagesPath, seoPagesContent, 'utf8');
  console.log('✓ scripts/seo-pages.mjs updated with Wave 1 entries.');
} else {
  console.log('• scripts/seo-pages.mjs already contains Wave 1 entries.');
}

// 2. Update src/constants/publicSeoRoutes.js
console.log('2. Updating src/constants/publicSeoRoutes.js...');
const publicRoutesPath = join(root, 'src', 'constants', 'publicSeoRoutes.js');
let publicRoutesContent = readFileSync(publicRoutesPath, 'utf8');

const newPublicSlugs = wave1Slugs
  .filter((slug) => !publicRoutesContent.includes(`'${slug}'`))
  .map((slug) => `  '${slug}',`)
  .join('\n');

if (newPublicSlugs.length > 0) {
  publicRoutesContent = publicRoutesContent.replace(
    /(\n\s*'how-to-re-enter-the-dating-scene-after-a-long-campus-dry-spell',\n)/,
    `$1  // Wave 1 Expansion: Topics 101 to 200 (Clusters 11-15)\n${newPublicSlugs}\n`
  );
  writeFileSync(publicRoutesPath, publicRoutesContent, 'utf8');
  console.log('✓ src/constants/publicSeoRoutes.js updated with Wave 1 slugs.');
} else {
  console.log('• src/constants/publicSeoRoutes.js already contains Wave 1 slugs.');
}

// 3. Update public/llms.txt
console.log('3. Updating public/llms.txt...');
const llmsPath = join(root, 'public', 'llms.txt');
let llmsContent = readFileSync(llmsPath, 'utf8');

function formatHumanTitle(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Vs', 'vs')
    .replace('And', 'and')
    .replace('Or', 'or')
    .replace('In', 'in')
    .replace('For', 'for')
    .replace('To', 'to')
    .replace('Of', 'of')
    .replace('A', 'a')
    .replace('The', 'the')
    .replace('Asuu', 'ASUU')
    .replace('Nysc', 'NYSC')
    .replace('Ppa', 'PPA')
    .replace('Pop', 'POP')
    .replace('Cds', 'CDS')
    .replace('Ldr', 'LDR')
    .replace('Pda', 'PDA')
    .replace('Cgpa', 'CGPA')
    .replace('Gpa', 'GPA')
    .replace('Unilag', 'UNILAG')
    .replace('Uniben', 'UNIBEN')
    .replace('Ui', 'UI')
    .replace('Oau', 'OAU')
    .replace('Abtr', 'ABU')
    .replace('Unn', 'UNN')
    .replace('Ican', 'ICAN')
    .replace('Adhd', 'ADHD');
}

const newLlmsCanonicalEntries = wave1Slugs
  .filter((slug) => !llmsContent.includes(`https://www.thecollegedate.com/${slug}`))
  .map((slug) => `- ${formatHumanTitle(slug)}: https://www.thecollegedate.com/${slug}`)
  .join('\n');

if (newLlmsCanonicalEntries.length > 0) {
  llmsContent = llmsContent.replace(
    /(- How to re-enter the dating scene after a long campus dry spell: https:\/\/www\.thecollegedate\.com\/how-to-re-enter-the-dating-scene-after-a-long-campus-dry-spell\n)/,
    `$1${newLlmsCanonicalEntries}\n`
  );
  writeFileSync(llmsPath, llmsContent, 'utf8');
  console.log('✓ public/llms.txt updated with Wave 1 canonical URLs.');
} else {
  console.log('• public/llms.txt already contains Wave 1 entries.');
}

// 4. Generate sitemap.xml and Netlify SEO files
console.log('4. Running seo:generate...');
execSync('node scripts/generate-sitemap.mjs && node scripts/generate-netlify-seo.mjs', {
  stdio: 'inherit',
});

console.log('\n✓ All routing, sitemap, and Netlify SEO files synchronized successfully!');
