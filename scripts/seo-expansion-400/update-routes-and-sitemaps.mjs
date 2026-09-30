import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-400', 'topics400.json'), 'utf8'));
const slugs400 = topics.map((t) => t.slug);

console.log(`Updating platform routes and sitemaps for 400 topics (${slugs400.length} topics)...`);

// 1. Update scripts/seo-pages.mjs
console.log('1. Updating scripts/seo-pages.mjs...');
const seoPagesPath = join(root, 'scripts', 'seo-pages.mjs');
let seoPagesContent = readFileSync(seoPagesPath, 'utf8');

const newSeoPagesEntries = slugs400
  .filter((slug) => !seoPagesContent.includes(`'/${slug}'`))
  .map((slug) => `  { path: '/${slug}', source: 'public/${slug}.html', changefreq: 'monthly', priority: '0.8' },`)
  .join('\n');

if (newSeoPagesEntries.length > 0) {
  // Find the last wave 1 entry: how-to-know-if-your-campus-relationship-survived-nysc
  seoPagesContent = seoPagesContent.replace(
    /(\n\s*\{\s*path:\s*'\/how-to-know-if-your-campus-relationship-survived-nysc'[^}]+\},\n)/,
    `$1  // Master SEO Expansion: Topics 201 to 600 (Clusters 16-35 / 724-URL Milestone)\n${newSeoPagesEntries}\n`
  );
  writeFileSync(seoPagesPath, seoPagesContent, 'utf8');
  console.log('✓ scripts/seo-pages.mjs updated with 400 new entries.');
} else {
  console.log('• scripts/seo-pages.mjs already contains these entries.');
}

// 2. Update src/constants/publicSeoRoutes.js
console.log('2. Updating src/constants/publicSeoRoutes.js...');
const publicRoutesPath = join(root, 'src', 'constants', 'publicSeoRoutes.js');
let publicRoutesContent = readFileSync(publicRoutesPath, 'utf8');

const newPublicSlugs = slugs400
  .filter((slug) => !publicRoutesContent.includes(`'${slug}'`))
  .map((slug) => `  '${slug}',`)
  .join('\n');

if (newPublicSlugs.length > 0) {
  publicRoutesContent = publicRoutesContent.replace(
    /(\n\s*'how-to-know-if-your-campus-relationship-survived-nysc',\n)/,
    `$1  // Master SEO Expansion: Topics 201 to 600 (Clusters 16-35)\n${newPublicSlugs}\n`
  );
  writeFileSync(publicRoutesPath, publicRoutesContent, 'utf8');
  console.log('✓ src/constants/publicSeoRoutes.js updated with 400 new slugs.');
} else {
  console.log('• src/constants/publicSeoRoutes.js already contains these slugs.');
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
    .replace(/\bVs\b/g, 'vs')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bOr\b/g, 'or')
    .replace(/\bIn\b/g, 'in')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bTo\b/g, 'to')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bA\b/g, 'a')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bAsuu\b/g, 'ASUU')
    .replace(/\bNysc\b/g, 'NYSC')
    .replace(/\bPpa\b/g, 'PPA')
    .replace(/\bPop\b/g, 'POP')
    .replace(/\bCds\b/g, 'CDS')
    .replace(/\bLdr\b/g, 'LDR')
    .replace(/\bPda\b/g, 'PDA')
    .replace(/\bCgpa\b/g, 'CGPA')
    .replace(/\bGpa\b/g, 'GPA')
    .replace(/\bSug\b/g, 'SUG')
    .replace(/\bDm\b/g, 'DM')
    .replace(/\bDms\b/g, 'DMs')
    .replace(/\bSti\b/g, 'STI')
    .replace(/\bUnilag\b/g, 'UNILAG')
    .replace(/\bUniben\b/g, 'UNIBEN')
    .replace(/\bUi\b/g, 'UI')
    .replace(/\bOau\b/g, 'OAU')
    .replace(/\bAbu\b/g, 'ABU')
    .replace(/\bUnn\b/g, 'UNN');
}

const newLlmsCanonicalEntries = slugs400
  .filter((slug) => !llmsContent.includes(`https://www.thecollegedate.com/${slug}`))
  .map((slug) => `- ${formatHumanTitle(slug)}: https://www.thecollegedate.com/${slug}`)
  .join('\n');

if (newLlmsCanonicalEntries.length > 0) {
  llmsContent = llmsContent.replace(
    /(- How To Know If Your Campus Relationship Survived NYSC: https:\/\/www\.thecollegedate\.com\/how-to-know-if-your-campus-relationship-survived-nysc\n)/,
    `$1${newLlmsCanonicalEntries}\n`
  );
  writeFileSync(llmsPath, llmsContent, 'utf8');
  console.log('✓ public/llms.txt updated with 400 new canonical URLs.');
} else {
  console.log('• public/llms.txt already contains these URLs.');
}

// 4. Regenerate sitemap.xml and Netlify SEO files
console.log('4. Regenerating sitemap.xml and Netlify SEO files via npm run seo:generate...');
execSync('npm run seo:generate', { stdio: 'inherit' });

console.log('\n✓ Platform routing, sitemap.xml, and Netlify SEO files synchronized successfully!');
