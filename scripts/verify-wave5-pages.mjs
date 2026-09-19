import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const wave5Pages = [
  'public/dating-a-medical-student-in-university.html',
  'public/dating-a-law-student-in-university.html',
  'public/soft-launching-your-relationship-in-university.html',
  'public/how-to-text-your-campus-crush.html',
  'public/splitting-the-bill-on-campus-dates.html',
  'public/dating-your-best-friend-in-university.html',
  'public/dating-during-university-strikes-and-holidays.html',
  'public/student-gift-ideas-on-a-budget.html',
  'public/dating-apps-for-students-mauritius.html',
];

let hasError = false;

console.log('========================================');
console.log('Verifying Wave 5 (9 Pages / 100-URL Milestone) Quality & SEO');
console.log('========================================');

for (const file of wave5Pages) {
  const fullPath = join(root, file);
  if (!existsSync(fullPath)) {
    console.error(`❌ Missing file: ${file}`);
    hasError = true;
    continue;
  }

  const html = readFileSync(fullPath, 'utf8');

  // Title check
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (title.length < 20 || title.length > 70) {
    console.error(`❌ ${file}: Title length ${title.length} not between 20-70 chars: "${title}"`);
    hasError = true;
  }

  // Meta description check
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const desc = descMatch ? descMatch[1].trim() : '';
  if (desc.length < 80 || desc.length > 180) {
    console.error(`❌ ${file}: Meta description length ${desc.length} not between 80-180 chars: "${desc}"`);
    hasError = true;
  }

  // Word count check (body text without tags)
  const bodyText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = bodyText.split(/\s+/).length;
  if (wordCount < 1000) {
    console.error(`❌ ${file}: Word count ${wordCount} < 1,000 words`);
    hasError = true;
  }

  // H1 check
  const h1Matches = html.match(/<h1\b[^>]*>/gi);
  if (!h1Matches || h1Matches.length !== 1) {
    console.error(`❌ ${file}: Found ${h1Matches ? h1Matches.length : 0} H1 elements, expected exactly 1`);
    hasError = true;
  }

  // JSON-LD schema check
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) {
    console.error(`❌ ${file}: Missing JSON-LD structured data`);
    hasError = true;
  } else {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      const graph = schema['@graph'] || [];
      const types = graph.map((node) => node['@type']);
      const requiredTypes = ['Organization', 'WebPage', 'BreadcrumbList', 'FAQPage'];
      for (const req of requiredTypes) {
        if (!types.includes(req)) {
          console.error(`❌ ${file}: JSON-LD missing @type ${req}`);
          hasError = true;
        }
      }
    } catch (e) {
      console.error(`❌ ${file}: Invalid JSON in JSON-LD script: ${e.message}`);
      hasError = true;
    }
  }

  // Internal link check (.html leaks)
  const leakMatches = html.match(/href="\/[^"]+\.html"/gi);
  if (leakMatches) {
    console.error(`❌ ${file}: Found uncanonical .html internal links:`, leakMatches);
    hasError = true;
  }

  if (!hasError) {
    console.log(`✓ ${file}: Validated (${wordCount} words, Title: ${title.length}c, Desc: ${desc.length}c, Schema: OK)`);
  }
}

if (hasError) {
  console.error('\n❌ Wave 5 verification failed with errors.');
  process.exit(1);
} else {
  console.log('\n========================================');
  console.log('✓ All 9 Wave 5 pages passed verification!');
  console.log('========================================');
}
