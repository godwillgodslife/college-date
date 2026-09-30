import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-400', 'topics400.json'), 'utf8'));

console.log('Auditing 400 Generated HTML Pages...');
let totalWords = 0;
let minWords = Infinity;
let maxWords = -Infinity;
let minSlug = '';
const issues = [];

for (const t of topics) {
  const filePath = join(root, 'public', `${t.slug}.html`);
  if (!existsSync(filePath)) {
    issues.push({ slug: t.slug, error: 'File does not exist' });
    continue;
  }

  const content = readFileSync(filePath, 'utf8');

  // Word count >= 1000
  const bodyWithoutScripts = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  const words = bodyWithoutScripts.trim().split(/\s+/).filter(Boolean).length;
  totalWords += words;
  if (words < minWords) {
    minWords = words;
    minSlug = t.slug;
  }
  if (words > maxWords) {
    maxWords = words;
  }
  if (words < 1000) {
    issues.push({ slug: t.slug, error: `Word count too low: ${words}` });
  }

  // Title 20-70
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (!titleMatch) {
    issues.push({ slug: t.slug, error: 'Missing title' });
  } else {
    const titleLen = titleMatch[1].length;
    if (titleLen < 20 || titleLen > 70) {
      issues.push({ slug: t.slug, error: `Title length out of bounds: ${titleLen} ("${titleMatch[1]}")` });
    }
  }

  // Meta description 80-180 and no single quotes
  const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!descMatch) {
    issues.push({ slug: t.slug, error: 'Missing description' });
  } else {
    const descLen = descMatch[1].length;
    if (descLen < 80 || descLen > 180) {
      issues.push({ slug: t.slug, error: `Desc length out of bounds: ${descLen}` });
    }
    if (descMatch[1].includes("'")) {
      issues.push({ slug: t.slug, error: 'Desc contains single quote' });
    }
  }

  // Canonical tag without .html
  const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (!canonicalMatch) {
    issues.push({ slug: t.slug, error: 'Missing canonical' });
  } else if (canonicalMatch[1] !== `https://www.thecollegedate.com/${t.slug}`) {
    issues.push({ slug: t.slug, error: `Canonical mismatch: ${canonicalMatch[1]}` });
  }

  // GEO elements
  if (!content.includes('Quick-Take Standard:')) {
    issues.push({ slug: t.slug, error: 'Missing Quick-Take Standard' });
  }
  if (!content.includes('table class="data-table"')) {
    issues.push({ slug: t.slug, error: 'Missing data-table' });
  }

  // Schema.org
  if (!content.includes('"@type": "Article"')) {
    issues.push({ slug: t.slug, error: 'Missing Article schema' });
  }
  if (!content.includes('"@type": "FAQPage"')) {
    issues.push({ slug: t.slug, error: 'Missing FAQPage schema' });
  }
  if (!content.includes('"@type": "BreadcrumbList"')) {
    issues.push({ slug: t.slug, error: 'Missing BreadcrumbList schema' });
  }
}

console.log('\n===========================================================');
console.log('Audit Results for Topics 201-600:');
console.log(`Total Pages: ${topics.length}`);
console.log(`Min Word Count: ${minWords} (${minSlug})`);
console.log(`Max Word Count: ${maxWords}`);
console.log(`Average Word Count: ${Math.round(totalWords / topics.length)} words/page`);
console.log(`Total Plain Body Words: ${totalWords}`);
console.log(`Issues Found: ${issues.length}`);
console.log('===========================================================\n');

if (issues.length > 0) {
  console.error('Audit failed with issues:');
  console.error(JSON.stringify(issues.slice(0, 10), null, 2));
  process.exit(1);
} else {
  console.log('✓ All 400 pages passed 100% of SEO, GEO, and quality benchmarks!');
}
