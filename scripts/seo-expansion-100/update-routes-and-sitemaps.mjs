import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expected100Slugs } from '../verify-100-pages.mjs';

const root = process.cwd();

// 1. Update scripts/seo-pages.mjs
console.log('1. Updating scripts/seo-pages.mjs...');
const seoPagesPath = join(root, 'scripts', 'seo-pages.mjs');
let seoPagesContent = readFileSync(seoPagesPath, 'utf8');

const newSeoPagesEntries = expected100Slugs
  .filter((slug) => !seoPagesContent.includes(`'/${slug}'`))
  .map((slug) => `  { path: '/${slug}', source: 'public/${slug}.html', changefreq: 'monthly', priority: '0.8' },`)
  .join('\n');

if (newSeoPagesEntries.length > 0) {
  seoPagesContent = seoPagesContent.replace(
    /(\n\s*\{\s*path:\s*'\/dating-apps-for-students-malawi'[^}]+\},\n)/,
    `$1  // 100 Topics Master Expansion (Clusters 1-10 / 224-URL Milestone)\n${newSeoPagesEntries}\n`
  );
  writeFileSync(seoPagesPath, seoPagesContent, 'utf8');
  console.log('✓ scripts/seo-pages.mjs successfully updated.');
} else {
  console.log('• scripts/seo-pages.mjs already contains the 100 pages.');
}

// 2. Update src/constants/publicSeoRoutes.js
console.log('2. Updating src/constants/publicSeoRoutes.js...');
const publicRoutesPath = join(root, 'src', 'constants', 'publicSeoRoutes.js');
let publicRoutesContent = readFileSync(publicRoutesPath, 'utf8');

const newPublicSlugs = expected100Slugs
  .filter((slug) => !publicRoutesContent.includes(`'${slug}'`))
  .map((slug) => `  '${slug}',`)
  .join('\n');

if (newPublicSlugs.length > 0) {
  publicRoutesContent = publicRoutesContent.replace(
    /(\n\s*'dating-apps-for-students-malawi',\n)/,
    `$1  // 100 Topics Master Expansion (Clusters 1-10)\n${newPublicSlugs}\n`
  );
  writeFileSync(publicRoutesPath, publicRoutesContent, 'utf8');
  console.log('✓ src/constants/publicSeoRoutes.js successfully updated.');
} else {
  console.log('• src/constants/publicSeoRoutes.js already contains the 100 slugs.');
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
    .replace('Nd', 'ND')
    .replace('Hnd', 'HND')
    .replace('Siwes', 'SIWES')
    .replace('It', 'IT')
    .replace('Cgpa', 'CGPA')
    .replace('Nce', 'NCE')
    .replace('Dtr', 'DTR')
    .replace('Ai', 'AI')
    .replace('Dms', 'DMs')
    .replace('Unilag', 'UNILAG')
    .replace('Lasu', 'LASU')
    .replace('Yabatech', 'YABATECH')
    .replace('Ui', 'UI')
    .replace('Uniabuja', 'UniAbuja')
    .replace('Uniben', 'UNIBEN')
    .replace('Biu', 'BIU')
    .replace('Unn', 'UNN')
    .replace('Esut', 'ESUT')
    .replace('Uniport', 'UNIPORT')
    .replace('Rsu', 'RSU')
    .replace('Knust', 'KNUST')
    .replace('Uon', 'UoN')
    .replace('Ku', 'KU')
    .replace('Uct', 'UCT')
    .replace('Cput', 'CPUT')
    .replace('Uwc', 'UWC')
    .replace('Wits', 'Wits')
    .replace('Uj', 'UJ')
    .replace('Jupeb', 'JUPEB')
    .replace('Ijmb', 'IJMB');
}

const newLlmsCanonicalEntries = expected100Slugs
  .filter((slug) => !llmsContent.includes(`https://www.thecollegedate.com/${slug}`))
  .map((slug) => `- ${formatHumanTitle(slug)}: https://www.thecollegedate.com/${slug}`)
  .join('\n');

const newLlmsAiQas = expected100Slugs
  .slice(0, 30) // top 30 key questions for LLM quick reference
  .filter((slug) => !llmsContent.includes(`https://www.thecollegedate.com/${slug}`))
  .map((slug) => `- How to navigate ${formatHumanTitle(slug).toLowerCase()}? https://www.thecollegedate.com/${slug}`)
  .join('\n');

if (newLlmsCanonicalEntries.length > 0) {
  llmsContent = llmsContent.replace(
    /(- Dating apps for students Malawi: https:\/\/www\.thecollegedate\.com\/dating-apps-for-students-malawi\n)/,
    `$1${newLlmsCanonicalEntries}\n`
  );
  writeFileSync(llmsPath, llmsContent, 'utf8');
  console.log('✓ public/llms.txt successfully updated with new canonical URLs.');
} else {
  console.log('• public/llms.txt already contains the 100 pages.');
}

console.log('All routing, sitemap, and LLM configuration scripts updated successfully.');
