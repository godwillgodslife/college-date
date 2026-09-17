import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const pagesToVerify = [
  'public/best-dating-apps-for-students-uganda.html',
  'public/dating-apps-for-students-tanzania.html',
  'public/dating-apps-for-students-zambia.html',
  'public/how-to-date-on-a-student-budget.html',
  'public/how-to-keep-your-relationship-private-on-campus.html',
  'public/how-to-handle-seeing-your-ex-on-campus.html',
  'public/dating-a-senior-student-in-university.html',
  'public/dating-in-a-campus-fellowship.html',
  'public/low-data-dating-apps-for-students-africa.html',
];

let hasErrors = false;

console.log('========================================');
console.log('Verifying Wave 3 (9 Pages) Quality & SEO');
console.log('========================================');

for (const file of pagesToVerify) {
  const filePath = join(root, file);
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${file}`);
    hasErrors = true;
    continue;
  }

  const html = readFileSync(filePath, 'utf8');

  // Title check
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (title.length < 20 || title.length > 70) {
    console.error(`❌ ${file}: Title length ${title.length} invalid (must be 20–70 chars). Title: "${title}"`);
    hasErrors = true;
  }

  // Meta description check
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const desc = descMatch ? descMatch[1].trim() : '';
  if (desc.length < 80 || desc.length > 180) {
    console.error(`❌ ${file}: Description length ${desc.length} invalid (must be 80–180 chars). Desc: "${desc}"`);
    hasErrors = true;
  }

  // H1 check
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/g);
  if (!h1Matches || h1Matches.length !== 1) {
    console.error(`❌ ${file}: Expected exactly 1 <h1>, found ${h1Matches ? h1Matches.length : 0}`);
    hasErrors = true;
  }

  // Word count check
  const textOnly = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textOnly.split(' ').length;
  if (wordCount < 1000) {
    console.error(`❌ ${file}: Word count ${wordCount} < 1,000 words`);
    hasErrors = true;
  }

  // JSON-LD Structured Data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) {
    console.error(`❌ ${file}: Missing JSON-LD script tag`);
    hasErrors = true;
  } else {
    try {
      const json = JSON.parse(jsonLdMatch[1]);
      const graph = json['@graph'] || [];
      const types = graph.map((item) => item['@type']);
      const requiredTypes = ['Organization', 'WebPage', 'BreadcrumbList', 'FAQPage'];
      for (const req of requiredTypes) {
        if (!types.includes(req)) {
          console.error(`❌ ${file}: Missing JSON-LD @type "${req}"`);
          hasErrors = true;
        }
      }
    } catch (e) {
      console.error(`❌ ${file}: Invalid JSON-LD format: ${e.message}`);
      hasErrors = true;
    }
  }

  // CTA Link check
  if (html.includes('href="/explore"') || html.includes('href="/match"') || html.includes('href="/chat"')) {
    console.error(`❌ ${file}: Found auth-gated links in public page!`);
    hasErrors = true;
  }

  // Clean links check (no .html in href)
  const htmlHrefMatch = html.match(/href="\/[a-z0-9_/-]+\.html"/i);
  if (htmlHrefMatch) {
    console.error(`❌ ${file}: Found .html in href links: ${htmlHrefMatch[0]}`);
    hasErrors = true;
  }

  console.log(`✓ ${file}: Validated (${wordCount} words, Title: ${title.length}c, Desc: ${desc.length}c, Schema: OK)`);
}

if (hasErrors) {
  console.error('\n❌ Wave 3 verification failed with errors.');
  process.exit(1);
} else {
  console.log('\n========================================');
  console.log('✓ All 9 Wave 3 pages passed verification!');
  console.log('========================================');
}
