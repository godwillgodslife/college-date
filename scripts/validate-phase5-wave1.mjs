import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appShellRoutes, seoPages, siteOrigin } from './seo-pages.mjs';

const root = process.cwd();
const phase5Paths = [
  '/dating-app-for-university-students-nigeria',
  '/dating-app-in-nigeria',
  '/campus-dating',
  '/student-dating',
  '/safety',
  '/campus-dating-safety',
  '/blog/how-to-date-safely-on-campus-nigeria',
  '/blog/best-dating-apps-nigeria-students',
  '/dating-bio-examples-students',
  '/tools/dating-bio-generator',
  '/conversation-starters-dating-app',
  '/first-date-ideas-students',
];

const seoPathSet = new Set(seoPages.map((page) => page.path));
const sourceByPath = new Map(seoPages.map((page) => [page.path, page.source]));
const errors = [];
const warnings = [];

function canonical(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

function readSource(pathname) {
  const source = sourceByPath.get(pathname);
  if (!source) throw new Error(`No seoPages source for ${pathname}`);
  return readFileSync(join(root, source), 'utf8');
}

function appRouteAllows(href) {
  return appShellRoutes.some((route) => {
    if (route.endsWith('/*')) return href.startsWith(route.slice(0, -1));
    return href === route;
  });
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

for (const pathname of phase5Paths) {
  if (!seoPathSet.has(pathname)) errors.push(`${pathname}: missing from seoPages/sitemap source`);
  const html = readSource(pathname);
  const url = canonical(pathname);

  const h1s = [...html.matchAll(/<h1[^>]*>/gi)].length;
  if (h1s !== 1) errors.push(`${pathname}: expected one H1, found ${h1s}`);
  if (!html.includes(`<link rel="canonical" href="${url}"`)) errors.push(`${pathname}: missing self canonical`);
  if (!html.includes(`<meta property="og:url" content="${url}"`)) errors.push(`${pathname}: missing OG URL`);
  if (/\.html["'\s]/i.test(html.replace(/https:\/\/play\.google\.com\/[^"']+/g, ''))) {
    errors.push(`${pathname}: contains a .html internal URL candidate`);
  }
  if (/noindex/i.test(html)) errors.push(`${pathname}: should be indexable but contains noindex`);

  const descriptions = [...html.matchAll(/<meta name="description" content="([^"]+)"/gi)];
  if (descriptions.length !== 1) errors.push(`${pathname}: expected one meta description`);
  if (descriptions[0] && (descriptions[0][1].length < 80 || descriptions[0][1].length > 180)) {
    warnings.push(`${pathname}: description length ${descriptions[0][1].length}`);
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) errors.push(`${pathname}: missing JSON-LD`);
  for (const [, json] of jsonLdBlocks) {
    const parsed = JSON.parse(json);
    const graphTypes = new Set((parsed['@graph'] || []).map((item) => item['@type']));
    for (const required of ['BreadcrumbList', 'FAQPage', 'ImageObject']) {
      if (!graphTypes.has(required)) errors.push(`${pathname}: missing ${required} schema`);
    }
  }

  const internalLinks = [...html.matchAll(/href="(\/[^"#?]*)/gi)]
    .map((match) => match[1])
    .filter((href) => !/\.(css|js|png|jpg|jpeg|webp|svg|ico|txt|xml)$/i.test(href));
  const uniqueLinks = [...new Set(internalLinks)];
  if (uniqueLinks.length < 4) errors.push(`${pathname}: fewer than 4 internal links`);
  for (const href of uniqueLinks) {
    if (!seoPathSet.has(href) && !appRouteAllows(href)) {
      errors.push(`${pathname}: internal link target is not canonical/static/app route: ${href}`);
    }
  }
}

const titleMap = new Map();
const descriptionMap = new Map();
const pageTexts = new Map();
for (const pathname of phase5Paths) {
  const html = readSource(pathname);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  if (titleMap.has(title)) errors.push(`Duplicate title: ${title}`);
  if (descriptionMap.has(description)) errors.push(`Duplicate meta description: ${description}`);
  titleMap.set(title, pathname);
  descriptionMap.set(description, pathname);
  pageTexts.set(pathname, wordSet(textContent(html)));
}

let maxSimilarity = { pair: '', value: 0 };
for (let i = 0; i < phase5Paths.length; i += 1) {
  for (let j = i + 1; j < phase5Paths.length; j += 1) {
    const a = pageTexts.get(phase5Paths[i]);
    const b = pageTexts.get(phase5Paths[j]);
    const intersection = [...a].filter((word) => b.has(word)).length;
    const union = new Set([...a, ...b]).size;
    const similarity = union ? intersection / union : 0;
    if (similarity > maxSimilarity.value) {
      maxSimilarity = { pair: `${phase5Paths[i]} <> ${phase5Paths[j]}`, value: similarity };
    }
  }
}

if (maxSimilarity.value > 0.62) {
  errors.push(`Potential content duplication: ${maxSimilarity.pair} (${maxSimilarity.value.toFixed(2)})`);
}

const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
for (const pathname of phase5Paths) {
  const url = canonical(pathname);
  if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`Sitemap missing ${url}`);
}

const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8');
for (const pathname of phase5Paths.filter((path) => path !== '/')) {
  if (!redirects.includes(`${pathname}.html  ${pathname}  301!`)) {
    errors.push(`Redirect missing .html canonicalization for ${pathname}`);
  }
}

const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
for (const route of ['/login', '/signup', '/dashboard', '/chat', '/profile/*', '/auth/callback', '/admin']) {
  if (!headers.includes(`${route}\n  X-Robots-Tag: noindex, nofollow`)) {
    errors.push(`Private route noindex header missing for ${route}`);
  }
}

const toolFile = join(root, 'public/tools/dating-bio-generator.js');
if (!existsSync(toolFile)) errors.push('Missing dating bio generator script');
else {
  const module = await import(pathToFileURL(toolFile).href);
  const valid = module.generateBioSuggestions({
    tone: 'warm',
    interests: 'music, food, reading',
    intention: 'friendship',
    personality: 'quiet at first',
    length: 'medium'
  });
  if (valid.error || valid.suggestions.length !== 3) {
    errors.push('Tool valid-input test failed');
  }
  const invalid = module.generateBioSuggestions({
    tone: 'warm',
    interests: '',
    intention: 'friendship',
    personality: '',
    length: 'medium'
  });
  if (!invalid.error) errors.push('Tool empty-input failure-state test failed');
  const unsafe = module.generateBioSuggestions({
    tone: 'warm',
    interests: 'blackmail',
    intention: 'friendship',
    personality: 'catfish someone',
    length: 'medium'
  });
  if (!unsafe.error) errors.push('Tool prohibited-input test failed');
}

console.log(`Validated ${phase5Paths.length} Wave 1 pages.`);
console.log(`Max content word-set similarity: ${maxSimilarity.value.toFixed(2)} (${maxSimilarity.pair})`);
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.log('Errors:');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log('Phase 5 Wave 1 validation passed.');
