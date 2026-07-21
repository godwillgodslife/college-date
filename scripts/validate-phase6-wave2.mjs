import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { seoPages, siteOrigin, appShellRoutes } from './seo-pages.mjs';

const root = process.cwd();
const wave2Paths = [
  '/safe-dating-app-nigeria',
  '/dating-app-for-students',
  '/online-dating-app-for-undergraduates',
  '/how-to-meet-people-on-campus',
  '/dating-as-a-fresher-nigeria',
  '/dating-profile-picture-tips-students',
  '/first-message-examples-dating-apps',
  '/romance-scams-nigerian-students',
  '/what-not-to-share-on-dating-apps',
  '/campus-date-ideas-students',
  '/relationship-boundaries-for-students',
  '/green-flags-student-relationships',
];

const affectedWave1Paths = [
  '/dating-app-for-university-students-nigeria',
  '/dating-app-in-nigeria',
  '/campus-dating',
  '/student-dating',
  '/safety',
  '/campus-dating-safety',
  '/dating-bio-examples-students',
  '/conversation-starters-dating-app',
  '/first-date-ideas-students',
];

const requiredWave2Links = new Map([
  ['/safe-dating-app-nigeria', ['/safety', '/campus-dating-safety', '/romance-scams-nigerian-students', '/download']],
  ['/dating-app-for-students', ['/student-dating', '/dating-app-for-university-students-nigeria', '/safety']],
  ['/online-dating-app-for-undergraduates', ['/student-dating', '/dating-bio-examples-students', '/conversation-starters-dating-app']],
  ['/how-to-meet-people-on-campus', ['/campus-dating', '/conversation-starters-dating-app', '/dating-as-a-fresher-nigeria']],
  ['/dating-as-a-fresher-nigeria', ['/student-dating', '/campus-dating-safety', '/how-to-meet-people-on-campus']],
  ['/dating-profile-picture-tips-students', ['/dating-bio-examples-students', '/tools/dating-bio-generator', '/safety']],
  ['/first-message-examples-dating-apps', ['/conversation-starters-dating-app', '/campus-dating', '/safety']],
  ['/romance-scams-nigerian-students', ['/safety', '/what-not-to-share-on-dating-apps', '/support']],
  ['/what-not-to-share-on-dating-apps', ['/privacy', '/safety', '/romance-scams-nigerian-students']],
  ['/campus-date-ideas-students', ['/first-date-ideas-students', '/campus-dating', '/campus-dating-safety']],
  ['/relationship-boundaries-for-students', ['/student-dating', '/green-flags-student-relationships', '/safety']],
  ['/green-flags-student-relationships', ['/relationship-boundaries-for-students', '/student-dating']],
]);

const seoByPath = new Map(seoPages.map((page) => [page.path, page]));
const seoPathSet = new Set(seoPages.map((page) => page.path));
const errors = [];
const warnings = [];

function canonical(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

function readSource(pathname) {
  const page = seoByPath.get(pathname);
  if (!page) throw new Error(`No seoPages entry for ${pathname}`);
  return readFileSync(join(root, page.source), 'utf8');
}

function appRouteAllows(href) {
  return appShellRoutes.some((route) => route.endsWith('/*') ? href.startsWith(route.slice(0, -1)) : href === route);
}

function textContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function wordSet(text) {
  return new Set(text.split(/\W+/).filter((word) => word.length > 4));
}

function internalLinks(html) {
  return [...new Set([...html.matchAll(/href="(\/[^"#?]*)/gi)]
    .map((match) => match[1])
    .filter((href) => !/\.(css|js|png|jpg|jpeg|webp|svg|ico|txt|xml)$/i.test(href)))];
}

for (const pathname of wave2Paths) {
  const page = seoByPath.get(pathname);
  if (!page) {
    errors.push(`${pathname}: missing from seoPages`);
    continue;
  }
  if (!existsSync(join(root, page.source))) errors.push(`${pathname}: source file missing`);
  const html = readSource(pathname);
  const url = canonical(pathname);

  const h1s = [...html.matchAll(/<h1\b/gi)].length;
  if (h1s !== 1) errors.push(`${pathname}: expected one H1, found ${h1s}`);
  if (!html.includes(`<link rel="canonical" href="${url}"`)) errors.push(`${pathname}: missing self canonical`);
  if (!html.includes(`<meta property="og:url" content="${url}"`)) errors.push(`${pathname}: missing OG URL`);
  if (!/<meta name="twitter:card" content="summary_large_image"/i.test(html)) errors.push(`${pathname}: missing Twitter/X card`);
  if (/noindex/i.test(html)) errors.push(`${pathname}: should be indexable but contains noindex`);
  if (/\.html["'\s]/i.test(html.replace(/https:\/\/play\.google\.com\/[^"']+/g, ''))) errors.push(`${pathname}: contains .html URL candidate`);

  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  if (description.length < 80 || description.length > 180) warnings.push(`${pathname}: meta description length ${description.length}`);

  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) errors.push(`${pathname}: missing JSON-LD`);
  for (const [, json] of jsonLdBlocks) {
    const parsed = JSON.parse(json);
    const types = new Set((parsed['@graph'] || []).map((item) => item['@type']));
    for (const required of ['BreadcrumbList', 'FAQPage', 'ImageObject']) {
      if (!types.has(required)) errors.push(`${pathname}: missing ${required} schema`);
    }
    if (!json.includes('"datePublished"') || !json.includes('"dateModified"')) {
      errors.push(`${pathname}: missing publication dates in schema`);
    }
  }

  const links = internalLinks(html);
  if (links.length < 5) errors.push(`${pathname}: fewer than 5 internal links`);
  for (const required of requiredWave2Links.get(pathname) || []) {
    if (!links.includes(required)) errors.push(`${pathname}: missing required internal link to ${required}`);
  }
  for (const href of links) {
    if (!seoPathSet.has(href) && !appRouteAllows(href)) errors.push(`${pathname}: internal link target is not registered: ${href}`);
  }
}

for (const pathname of affectedWave1Paths) {
  const html = readSource(pathname);
  if (!html.includes('phase6-links')) errors.push(`${pathname}: missing Wave 2 related links panel`);
}

const titleMap = new Map();
const descMap = new Map();
const texts = new Map();
for (const pathname of [...wave2Paths, ...affectedWave1Paths]) {
  const html = readSource(pathname);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const desc = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  if (titleMap.has(title)) errors.push(`Duplicate title: ${title}`);
  if (descMap.has(desc)) errors.push(`Duplicate meta description: ${desc}`);
  titleMap.set(title, pathname);
  descMap.set(desc, pathname);
  texts.set(pathname, wordSet(textContent(html)));
}

let maxSimilarity = { pair: '', value: 0 };
const comparePaths = [...wave2Paths];
for (let i = 0; i < comparePaths.length; i += 1) {
  for (let j = i + 1; j < comparePaths.length; j += 1) {
    const a = texts.get(comparePaths[i]);
    const b = texts.get(comparePaths[j]);
    const intersection = [...a].filter((word) => b.has(word)).length;
    const union = new Set([...a, ...b]).size;
    const similarity = union ? intersection / union : 0;
    if (similarity > maxSimilarity.value) {
      maxSimilarity = { pair: `${comparePaths[i]} <> ${comparePaths[j]}`, value: similarity };
    }
  }
}
if (maxSimilarity.value > 0.62) errors.push(`Potential Wave 2 duplication: ${maxSimilarity.pair} (${maxSimilarity.value.toFixed(2)})`);

const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
for (const pathname of wave2Paths) {
  if (!sitemap.includes(`<loc>${canonical(pathname)}</loc>`)) errors.push(`Sitemap missing ${pathname}`);
}

const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8');
for (const pathname of wave2Paths) {
  if (!redirects.includes(`${pathname}.html  ${pathname}  301!`)) errors.push(`Redirect missing for ${pathname}.html`);
  const source = seoByPath.get(pathname)?.source?.replace(/^public\//, '');
  if (source && !redirects.includes(`${pathname}  /${source}  200`)) errors.push(`Rewrite missing for ${pathname}`);
}

const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
for (const header of ['Content-Security-Policy:', 'Permissions-Policy:', 'Strict-Transport-Security:', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY']) {
  if (!headers.includes(header)) errors.push(`Security header missing: ${header}`);
}
for (const route of ['/login', '/signup', '/dashboard', '/chat', '/profile/*', '/auth/callback', '/admin']) {
  if (!headers.includes(`${route}\n  X-Robots-Tag: noindex, nofollow`)) errors.push(`Private noindex header missing for ${route}`);
}

const llms = readFileSync(join(root, 'public/llms.txt'), 'utf8');
for (const pathname of wave2Paths) {
  if (!llms.includes(canonical(pathname))) errors.push(`llms.txt missing ${pathname}`);
}

console.log(`Validated ${wave2Paths.length} Wave 2 pages and ${affectedWave1Paths.length} affected Wave 1 pages.`);
console.log(`Max Wave 2 content word-set similarity: ${maxSimilarity.value.toFixed(2)} (${maxSimilarity.pair})`);
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.log('Errors:');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}
console.log('Phase 6 Wave 2 validation passed.');
