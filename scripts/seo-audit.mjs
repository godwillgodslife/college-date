import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');

const expectedPublicFiles = [
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'humans.txt',
  'og-image.png',
  'about.html',
  'the-college-date.html',
  'what-is-the-college-date.html',
  'faq.html',
  'download.html',
  'college-date.html',
  'cd-app.html',
  'press.html',
  'campus-dating.html',
  'student-dating.html',
  'college-dating-app.html',
  'dating-app-for-students.html',
  'nigeria-dating-app.html',
  'dating-app-in-nigeria.html',
  'university-dating-nigeria.html',
  'dating-app-for-university-students-nigeria.html',
  'safe-dating-app-nigeria.html',
  'campus-dating-app-lagos.html',
  'serious-relationship-app-nigeria-students.html',
  'best-dating-site-for-students-nigeria.html',
  'online-dating-app-for-undergraduates.html',
  'blog.html',
  'blog/best-dating-apps-nigeria-students.html',
  'blog/online-dating-for-nigerian-students.html',
  'blog/how-to-date-safely-on-campus-nigeria.html',
  'campus-dating-safety.html',
  'safety.html',
  'support.html',
  'privacy.html',
  'terms.html',
  'delete-account.html',
  'child-safety-standards.html',
];

const htmlPages = expectedPublicFiles.filter((file) => file.endsWith('.html'));

function readPublic(file) {
  return readFileSync(join(publicDir, file), 'utf8');
}

function has(content, pattern) {
  return pattern.test(content);
}

const findings = [];

for (const file of expectedPublicFiles) {
  if (!existsSync(join(publicDir, file))) {
    findings.push({ level: 'error', file, message: 'Missing expected public SEO file.' });
  }
}

const sitemap = existsSync(join(publicDir, 'sitemap.xml')) ? readPublic('sitemap.xml') : '';
const robots = existsSync(join(publicDir, 'robots.txt')) ? readPublic('robots.txt') : '';
const llms = existsSync(join(publicDir, 'llms.txt')) ? readPublic('llms.txt') : '';

for (const file of htmlPages) {
  if (!sitemap.includes(`https://www.thecollegedate.com/${file}`)) {
    findings.push({ level: 'error', file: 'sitemap.xml', message: `Missing sitemap entry for ${file}.` });
  }
}

if (!robots.includes('Sitemap: https://www.thecollegedate.com/sitemap.xml')) {
  findings.push({ level: 'error', file: 'robots.txt', message: 'Missing sitemap reference.' });
}

for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User']) {
  if (!robots.includes(`User-agent: ${bot}`)) {
    findings.push({ level: 'warning', file: 'robots.txt', message: `Missing explicit allow rule for ${bot}.` });
  }
}

if (!llms.includes('The College Date') || !llms.includes('https://www.thecollegedate.com/')) {
  findings.push({ level: 'warning', file: 'llms.txt', message: 'AI crawler summary is missing brand or homepage context.' });
}

if (!llms.includes('Nigeria dating app') || !llms.includes('Online dating for Nigerian students')) {
  findings.push({ level: 'warning', file: 'llms.txt', message: 'AI crawler summary is missing Nigeria dating topic context.' });
}

for (const topic of [
  'Dating app for university students in Nigeria',
  'Safe dating app in Nigeria',
  'Campus dating app in Lagos',
  'Serious relationship app in Nigeria',
  'Best dating site for students in Nigeria',
  'Online dating app for undergraduates',
  'Download The College Date app',
]) {
  if (!llms.includes(topic)) {
    findings.push({ level: 'warning', file: 'llms.txt', message: `AI crawler summary is missing topic: ${topic}.` });
  }
}

for (const file of htmlPages) {
  if (!existsSync(join(publicDir, file))) continue;

  const html = readPublic(file);
  const checks = [
    ['title', /<title>[^<]{20,70}<\/title>/i],
    ['meta description', /<meta\s+name=["']description["']\s+content=["'][^"']{80,180}["']/i],
    ['canonical URL', /<link\s+rel=["']canonical["']\s+href=["']https:\/\/www\.thecollegedate\.com\/[^"']+["']/i],
    ['Open Graph title', /<meta\s+property=["']og:title["']\s+content=["'][^"']+["']/i],
    ['Open Graph image', /<meta\s+property=["']og:image["']\s+content=["']https:\/\/www\.thecollegedate\.com\/og-image\.png["']/i],
    ['JSON-LD structured data', /<script\s+type=["']application\/ld\+json["']>/i],
    ['H1', /<h1>[^<]+<\/h1>/i],
    ['internal CTA link', /href=["']\/(?:signup|support|safety|about\.html|campus-dating\.html|student-dating\.html)/i],
  ];

  for (const [label, pattern] of checks) {
    if (!has(html, pattern)) {
      findings.push({ level: 'warning', file, message: `Missing or weak ${label}.` });
    }
  }
}

if (findings.length === 0) {
  console.log('SEO audit passed. Public pages have the expected crawl, metadata, sitemap, and AI-discovery basics.');
} else {
  console.log(`SEO audit found ${findings.length} item(s):`);
  for (const finding of findings) {
    console.log(`- [${finding.level}] ${finding.file}: ${finding.message}`);
  }
}

const hasErrors = findings.some((finding) => finding.level === 'error');
process.exit(hasErrors ? 1 : 0);
