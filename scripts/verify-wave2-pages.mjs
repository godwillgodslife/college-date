import { readFileSync, existsSync } from 'node:fs';

const pages = [
  'best-dating-apps-for-students-kenya',
  'best-dating-apps-for-students-ghana',
  'dating-apps-for-students-uganda',
  'dating-apps-for-students-rwanda',
  'how-to-ask-someone-out-in-university',
  'dating-as-an-introvert-in-university',
  'how-to-handle-ghosting-in-university',
  'dating-someone-at-another-university',
  'how-to-balance-dating-and-studies-in-university',
  'how-to-spot-a-catfish-in-university',
  'dating-in-final-year-of-university',
  'university-hostel-dating-etiquette',
];

console.log('Validating Wave 2 (12 New SEO Pages):');
let allOk = true;

for (const slug of pages) {
  const file = `public/${slug}.html`;
  if (!existsSync(file)) {
    console.error(`MISSING: ${file}`);
    allOk = false;
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const plain = html.replace(/<[^>]+>/g, ' ');
  const words = plain.trim().split(/\s+/).length;
  const hasH1 = /<h1[^>]*>/.test(html);
  const hasBreadcrumbs = /"@type":\s*"BreadcrumbList"/.test(html);
  const hasFaq = /"@type":\s*"FAQPage"/.test(html);
  const hasCta = /<a\s+class="cta"\s+href="\/[a-z0-9_-]+"/.test(html);
  const hasNoHtmlInLinks = !/href="\/[a-z0-9_/-]+\.html"/i.test(html);

  console.log(`- ${slug}: ${words} words | H1: ${hasH1} | BreadcrumbList: ${hasBreadcrumbs} | FAQ: ${hasFaq} | CTA: ${hasCta} | CleanLinks: ${hasNoHtmlInLinks}`);

  if (!hasH1 || !hasBreadcrumbs || !hasFaq || !hasCta || !hasNoHtmlInLinks || words < 800) {
    allOk = false;
  }
}

if (allOk) {
  console.log('\n✓ ALL 12 WAVE 2 PAGES PASSED COMPREHENSIVE VALIDATION!');
} else {
  console.error('\n✗ VALIDATION FAILED!');
  process.exit(1);
}
