import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appShellRoutes, privateNoindexRoutes, seoPages, siteOrigin } from './seo-pages.mjs';

const root = process.cwd();

const wave1Paths = [
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

const allWavePaths = [...wave1Paths, ...wave2Paths];
const seoByPath = new Map(seoPages.map((page) => [page.path, page]));
const seoPathSet = new Set(seoPages.map((page) => page.path));
const errors = [];
const warnings = [];
const liveResults = [];

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function exists(file) {
  return existsSync(join(root, file));
}

function size(file) {
  return statSync(join(root, file)).size;
}

function canonical(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

function pageSource(pathname) {
  const page = seoByPath.get(pathname);
  if (!page) throw new Error(`No seoPages entry for ${pathname}`);
  return page.source;
}

function pageHtml(pathname) {
  return read(pageSource(pathname));
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
  return [...new Set([...html.matchAll(/href=["'](\/[^"'#?]*)/gi)]
    .map((match) => match[1])
    .filter((href) => !/\.(css|js|png|jpg|jpeg|webp|svg|ico|txt|xml)$/i.test(href)))];
}

function appRouteAllows(href) {
  return appShellRoutes.some((route) => (route.endsWith('/*') ? href.startsWith(route.slice(0, -1)) : href === route));
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

function schemaTypes(parsed) {
  const graph = parsed['@graph'] || [parsed];
  return new Set(graph.flatMap((item) => Array.isArray(item['@type']) ? item['@type'] : [item['@type']]).filter(Boolean));
}

function record(condition, level, target, message) {
  if (condition) return;
  (level === 'error' ? errors : warnings).push(`${target}: ${message}`);
}

for (const required of [
  'public/robots.txt',
  'public/sitemap.xml',
  'public/llms.txt',
  'public/humans.txt',
  'public/404.html',
  'public/_redirects',
  'public/_headers',
  'public/favicon-64.png',
]) {
  record(exists(required), 'error', required, 'required file is missing');
}

if (exists('public/favicon-64.png')) {
  record(size('public/favicon-64.png') < 5000, 'error', 'public/favicon-64.png', 'favicon should remain below 5 KB');
}

const sitemap = exists('public/sitemap.xml') ? read('public/sitemap.xml') : '';
const redirects = exists('public/_redirects') ? read('public/_redirects') : '';
const headers = exists('public/_headers') ? read('public/_headers') : '';
const robots = exists('public/robots.txt') ? read('public/robots.txt') : '';
const llms = exists('public/llms.txt') ? read('public/llms.txt') : '';

record(robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`), 'error', 'public/robots.txt', 'missing sitemap reference');
record(!sitemap.includes('.html</loc>'), 'error', 'public/sitemap.xml', 'contains non-canonical .html URL entries');
record(redirects.includes('/*  /404.html  404'), 'error', 'public/_redirects', 'missing hard 404 fallback');
record(headers.includes('/assets/*\n  Cache-Control: public, max-age=31536000, immutable'), 'error', 'public/_headers', 'missing immutable asset caching');

for (const header of [
  'Content-Security-Policy:',
  'Permissions-Policy:',
  'Strict-Transport-Security:',
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
]) {
  record(headers.includes(header), 'error', 'public/_headers', `missing ${header}`);
}

for (const route of privateNoindexRoutes) {
  record(headers.includes(`${route}\n  X-Robots-Tag: noindex, nofollow`), 'error', 'public/_headers', `missing private noindex header for ${route}`);
}

for (const pathname of allWavePaths) {
  const source = seoByPath.get(pathname)?.source;
  record(Boolean(source), 'error', pathname, 'missing seoPages registry entry');
  record(source ? exists(source) : false, 'error', pathname, `missing source file ${source || '(unknown)'}`);
  if (!source || !exists(source)) continue;

  const html = pageHtml(pathname);
  const url = canonical(pathname);
  const sourceLabel = source;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const links = internalLinks(html);
  const wordCount = textContent(html).split(/\s+/).filter(Boolean).length;

  record(h1Count === 1, 'error', sourceLabel, `expected exactly one H1, found ${h1Count}`);
  record(title.length >= 20 && title.length <= 75, 'warning', sourceLabel, `title length is ${title.length}`);
  record(description.length >= 80 && description.length <= 180, 'warning', sourceLabel, `meta description length is ${description.length}`);
  record(html.includes(`<link rel="canonical" href="${url}"`), 'error', sourceLabel, 'missing self-referencing canonical');
  record(html.includes(`<meta property="og:url" content="${url}"`), 'error', sourceLabel, 'missing matching Open Graph URL');
  record(/<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']/i.test(html), 'error', sourceLabel, 'missing Twitter/X card');
  record(!/noindex/i.test(html), 'error', sourceLabel, 'public content page contains noindex');
  record(!/\.html["'\s]/i.test(html.replace(/https:\/\/play\.google\.com\/[^"']+/g, '')), 'error', sourceLabel, 'contains non-canonical .html internal URL candidate');
  record(wordCount >= 650, 'warning', sourceLabel, `visible content appears short at ${wordCount} words`);
  record(links.length >= 4, 'error', sourceLabel, `expected at least 4 internal links, found ${links.length}`);

  for (const href of links) {
    record(seoPathSet.has(href) || appRouteAllows(href), 'error', sourceLabel, `internal link target is not registered/canonical: ${href}`);
  }

  record(sitemap.includes(`<loc>${url}</loc>`), 'error', 'public/sitemap.xml', `missing ${url}`);
  record(llms.includes(url), 'warning', 'public/llms.txt', `missing ${url}`);
  record(redirects.includes(`${pathname}.html  ${pathname}  301!`), 'error', 'public/_redirects', `missing .html redirect for ${pathname}`);
  record(redirects.includes(`${pathname}  /${source.replace(/^public\//, '')}  200`), 'error', 'public/_redirects', `missing extensionless rewrite for ${pathname}`);

  const blocks = jsonLdBlocks(html);
  record(blocks.length > 0, 'error', sourceLabel, 'missing JSON-LD');
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      const types = schemaTypes(parsed);
      record(types.has('BreadcrumbList'), 'error', sourceLabel, 'missing BreadcrumbList schema');
      record(types.has('FAQPage'), 'error', sourceLabel, 'missing FAQPage schema');
      record(types.has('ImageObject'), 'error', sourceLabel, 'missing ImageObject schema');
      record([...types].some((type) => ['WebPage', 'Article', 'BlogPosting', 'WebApplication', 'SoftwareApplication'].includes(type)), 'error', sourceLabel, 'missing page/application/article schema');
      record(!types.has('Review') && !types.has('AggregateRating'), 'error', sourceLabel, 'contains unsupported Review/AggregateRating schema');
      record(block.includes('"datePublished"') && block.includes('"dateModified"'), 'error', sourceLabel, 'missing datePublished/dateModified schema');
    } catch (error) {
      errors.push(`${sourceLabel}: invalid JSON-LD (${error.message})`);
    }
  }
}

const titleOwners = new Map();
const descriptionOwners = new Map();
const pageWordSets = new Map();
for (const pathname of allWavePaths) {
  if (!seoByPath.has(pathname)) continue;
  const html = pageHtml(pathname);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  if (titleOwners.has(title)) errors.push(`duplicate title: ${title} (${titleOwners.get(title)} and ${pathname})`);
  if (descriptionOwners.has(description)) errors.push(`duplicate meta description: ${description} (${descriptionOwners.get(description)} and ${pathname})`);
  titleOwners.set(title, pathname);
  descriptionOwners.set(description, pathname);
  pageWordSets.set(pathname, wordSet(textContent(html)));
}

const highSimilarity = [];
let maxSimilarity = { value: 0, pair: '' };
for (let i = 0; i < allWavePaths.length; i += 1) {
  for (let j = i + 1; j < allWavePaths.length; j += 1) {
    const a = pageWordSets.get(allWavePaths[i]);
    const b = pageWordSets.get(allWavePaths[j]);
    const intersection = [...a].filter((word) => b.has(word)).length;
    const union = new Set([...a, ...b]).size;
    const similarity = union ? intersection / union : 0;
    if (similarity > maxSimilarity.value) maxSimilarity = { value: similarity, pair: `${allWavePaths[i]} <> ${allWavePaths[j]}` };
    if (similarity > 0.58) highSimilarity.push(`${allWavePaths[i]} <> ${allWavePaths[j]} (${similarity.toFixed(2)})`);
  }
}

for (const item of highSimilarity) warnings.push(`content similarity review suggested: ${item}`);
record(maxSimilarity.value < 0.72, 'error', 'content similarity', `max similarity too high: ${maxSimilarity.pair} (${maxSimilarity.value.toFixed(2)})`);

const indexHtml = read('index.html');
const landingJsx = read('src/pages/Landing.jsx');
const landingCss = read('src/pages/Landing.css');
const appJsx = read('src/App.jsx');
const swPwa = read('public/sw-pwa.js');
const manifest = read('public/manifest.webmanifest');

record(indexHtml.includes('/favicon-64.png'), 'error', 'index.html', 'optimized favicon link is missing');
record(!/maximum-scale|user-scalable/i.test(indexHtml), 'error', 'index.html', 'viewport still prevents zoom');
record(!/apple-touch-startup-image/i.test(indexHtml), 'error', 'index.html', 'startup image still eagerly references legacy logo');
record(indexHtml.includes('rel="preload"') && indexHtml.includes('fonts.googleapis.com'), 'error', 'index.html', 'Google Fonts stylesheet is not async preloaded');
record(!/OneSignalSDK\.page|cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.page|canvas-confetti/.test(indexHtml), 'error', 'index.html', 'global third-party script remains in app shell');

record(/landing-brand-icon\.webp/.test(landingJsx), 'error', 'src/pages/Landing.jsx', 'optimized brand icon import missing');
record(/landing-product-poster\.webp/.test(landingJsx), 'error', 'src/pages/Landing.jsx', 'optimized product poster import missing');
record(/loading="lazy"/.test(landingJsx), 'error', 'src/pages/Landing.jsx', 'below-fold product image is not lazy-loaded');
record(!/\.\.\/\.\.\/assets\/icon\.png|\/og-image\.png/.test(landingJsx), 'error', 'src/pages/Landing.jsx', 'landing page still imports heavy PNG media');
record(!/pexels\.com|background-image:\s*url/i.test(landingCss), 'error', 'src/pages/Landing.css', 'CSS still contains eager external background images');
record(/const AppLayout = lazyWithRetry/.test(appJsx), 'error', 'src/App.jsx', 'authenticated app shell is not lazy-loaded');
record(/const VoiceCallRoom = lazyWithRetry/.test(appJsx), 'error', 'src/App.jsx', 'call route is not lazy-loaded');
record(/import\('agora-rtc-sdk-ng'\)/.test(read('src/pages/VoiceCallRoom.jsx')), 'error', 'src/pages/VoiceCallRoom.jsx', 'Agora SDK is not isolated behind dynamic import');
record(!/\/logo\.png|\/favicon\.png/.test(swPwa), 'error', 'public/sw-pwa.js', 'service worker still pre-caches large legacy icons');
record(!/\/logo\.png/.test(manifest) && /\/logo-512\.png/.test(manifest) && /\/logo-192\.png/.test(manifest), 'error', 'public/manifest.webmanifest', 'manifest still points at the heavy legacy logo');

if (exists('dist/index.html')) {
  const distIndex = read('dist/index.html');
  record(!/modulepreload[^>]+framer-motion/i.test(distIndex), 'error', 'dist/index.html', 'framer-motion is preloaded on app shell');
  record(!/modulepreload[^>]+agora/i.test(distIndex), 'error', 'dist/index.html', 'Agora is preloaded on app shell');
  record(distIndex.includes('/favicon-64.png'), 'error', 'dist/index.html', 'dist is not using optimized favicon');
} else {
  warnings.push('dist/index.html is missing; run npm run build before deployment validation.');
}

const toolFile = join(root, 'public/tools/dating-bio-generator.js');
if (existsSync(toolFile)) {
  const module = await import(pathToFileURL(toolFile).href);
  const valid = module.generateBioSuggestions({
    tone: 'warm',
    interests: 'music, food, reading',
    intention: 'friendship',
    personality: 'quiet at first',
    length: 'medium',
  });
  record(!valid.error && valid.suggestions.length === 3, 'error', 'dating bio generator', 'valid-input test failed');

  const empty = module.generateBioSuggestions({
    tone: 'warm',
    interests: '',
    intention: 'friendship',
    personality: '',
    length: 'medium',
  });
  record(Boolean(empty.error), 'error', 'dating bio generator', 'empty-input error state failed');

  const unsafe = module.generateBioSuggestions({
    tone: 'warm',
    interests: 'blackmail',
    intention: 'friendship',
    personality: 'catfish someone',
    length: 'medium',
  });
  record(Boolean(unsafe.error), 'error', 'dating bio generator', 'unsafe-input guard failed');
} else {
  errors.push('dating bio generator: public/tools/dating-bio-generator.js is missing');
}

const liveBaseArg = process.argv.find((arg) => arg.startsWith('--live-base='));
const allowPreviewNoindex = process.argv.includes('--allow-preview-noindex');
if (liveBaseArg) {
  const liveBase = liveBaseArg.split('=').slice(1).join('=').replace(/\/+$/, '');
  for (const pathname of allWavePaths) {
    const response = await fetch(`${liveBase}${pathname}`, { redirect: 'manual' });
    const html = await response.text().catch(() => '');
    const xRobots = response.headers.get('x-robots-tag') || '';
    liveResults.push(`${pathname}: ${response.status} ${xRobots || 'no x-robots-tag'}`);
    record(response.status === 200, 'error', `live ${pathname}`, `expected 200, got ${response.status}`);
    record(html.includes(`<link rel="canonical" href="${canonical(pathname)}"`), 'error', `live ${pathname}`, 'canonical mismatch');
    const hasNoindex = /noindex/i.test(html) || /noindex/i.test(xRobots);
    if (allowPreviewNoindex && hasNoindex) {
      record(false, 'warning', `live ${pathname}`, 'public page has noindex on preview deployment');
    } else {
      record(!hasNoindex, 'error', `live ${pathname}`, 'indexable page has noindex');
    }
  }

  for (const privatePath of ['/login', '/signup', '/dashboard', '/chat', '/auth/callback', '/admin']) {
    const response = await fetch(`${liveBase}${privatePath}`, { redirect: 'manual' });
    liveResults.push(`${privatePath}: ${response.status} ${response.headers.get('x-robots-tag') || 'missing noindex header'}`);
    record(/noindex/i.test(response.headers.get('x-robots-tag') || ''), 'error', `live ${privatePath}`, 'missing noindex X-Robots-Tag');
  }

  const missing = await fetch(`${liveBase}/phase7-nonexistent-${Date.now()}`, { redirect: 'manual' });
  liveResults.push(`/phase7-nonexistent: ${missing.status}`);
  record(missing.status === 404, 'error', 'live 404', `expected 404, got ${missing.status}`);
}

console.log(`Validated ${allWavePaths.length} Wave 1+2 SEO pages.`);
console.log(`Max content word-set similarity: ${maxSimilarity.value.toFixed(2)} (${maxSimilarity.pair})`);
if (liveResults.length) {
  console.log('Live checks:');
  for (const result of liveResults) console.log(`- ${result}`);
}
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.log('Errors:');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}

console.log('Phase 7 performance and indexation validation passed.');
