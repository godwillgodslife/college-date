import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const pages = [
  'dating-apps-for-students-south-africa',
  'how-to-make-friends-in-university',
  'dating-apps-for-students-kenya',
  'anonymous-ask-app-for-students',
  'dating-apps-for-students-ghana',
  'how-to-talk-to-your-campus-crush',
  'dating-a-coursemate-in-university',
  'campus-confessions-guide',
  'how-to-date-safely-at-university',
  'best-dating-apps-for-students-south-africa',
  'how-to-meet-people-in-a-new-university',
  'student-dating-apps-africa',
];

console.log('Validating 12 New SEO Pages:');
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
  console.log('\n✓ ALL 12 PAGES PASSED COMPREHENSIVE VALIDATION!');
} else {
  console.error('\n✗ VALIDATION FAILED!');
  process.exit(1);
}
