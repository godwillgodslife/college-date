import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const wave7Pages = [
  'public/dating-a-computer-science-student-in-university.html',
  'public/dating-as-a-postgraduate-student-in-university.html',
  'public/how-to-handle-a-roommates-relationship-in-hostel.html',
  'public/dating-when-your-partner-has-more-money-in-university.html',
  'public/dating-a-student-politician-or-campus-leader.html',
  'public/should-you-post-your-partner-on-social-media-in-university.html',
  'public/staying-together-after-university-graduation.html',
];

console.log('========================================');
console.log('Verifying Wave 7 (7 Pages / 115-URL Expansion) Quality & SEO');
console.log('========================================');

let allPassed = true;

for (const file of wave7Pages) {
  const fullPath = join(root, file);
  if (!existsSync(fullPath)) {
    console.error(`✗ Missing file: ${file}`);
    allPassed = false;
    continue;
  }

  const content = readFileSync(fullPath, 'utf8');

  // Word count check (>1,000 words excluding script & style tags)
  const bodyWithoutScripts = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  const words = bodyWithoutScripts.trim().split(/\s+/).filter(Boolean).length;

  if (words < 1000) {
    console.error(`✗ ${file}: Word count ${words} is less than 1,000 words!`);
    allPassed = false;
  }

  // Title check
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  if (title.length < 20 || title.length > 70) {
    console.error(`✗ ${file}: Title length ${title.length} is out of bounds (20-70)! "${title}"`);
    allPassed = false;
  }

  // Description check
  const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = descMatch ? descMatch[1] : '';
  if (desc.length < 80 || desc.length > 180) {
    console.error(`✗ ${file}: Description length ${desc.length} is out of bounds (80-180)! "${desc}"`);
    allPassed = false;
  }

  // H1 check (exactly 1)
  const h1Count = (content.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) {
    console.error(`✗ ${file}: Has ${h1Count} <h1> tags! Must have exactly 1.`);
    allPassed = false;
  }

  // Structured Data Schema check
  const schemaMatch = content.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!schemaMatch) {
    console.error(`✗ ${file}: Missing JSON-LD structured data schema!`);
    allPassed = false;
  } else {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      if (!schema['@graph'] || !Array.isArray(schema['@graph'])) {
        console.error(`✗ ${file}: Schema is missing @graph array!`);
        allPassed = false;
      }
    } catch (e) {
      console.error(`✗ ${file}: Invalid JSON in structured data schema!`, e.message);
      allPassed = false;
    }
  }

  // Canonical tag check (must not contain .html)
  const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (!canonicalMatch) {
    console.error(`✗ ${file}: Missing canonical link tag!`);
    allPassed = false;
  } else if (canonicalMatch[1].endsWith('.html')) {
    console.error(`✗ ${file}: Canonical URL contains .html! "${canonicalMatch[1]}"`);
    allPassed = false;
  }

  if (allPassed) {
    console.log(`✓ ${file}: Validated (${words} words, Title: ${title.length}c, Desc: ${desc.length}c, Schema: OK)`);
  }
}

console.log('========================================');
if (allPassed) {
  console.log('✓ All 7 Wave 7 pages passed verification!');
  process.exit(0);
} else {
  console.error('✗ Some pages failed quality or SEO criteria.');
  process.exit(1);
}
console.log('========================================');
