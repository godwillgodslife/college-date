import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { appShellRoutes, seoPages, siteOrigin } from './seo-pages.mjs';

const root = process.cwd();
const wave3Paths = [
  '/red-flags-student-relationships',
  '/healthy-relationship-university-students',
  '/signs-someone-likes-you-college',
  '/long-distance-relationship-students',
  '/talking-stage-students',
  '/situationship-vs-relationship',
  '/how-to-reject-someone-politely',
  '/breakup-recovery-college-students',
  '/student-dating-etiquette',
  '/questions-before-dating',
];

const existingComparisonPaths = [
  '/student-dating',
  '/campus-dating',
  '/safety',
  '/campus-dating-safety',
  '/conversation-starters-dating-app',
  '/first-date-ideas-students',
  '/relationship-boundaries-for-students',
  '/green-flags-student-relationships',
  '/romance-scams-nigerian-students',
  '/what-not-to-share-on-dating-apps',
];

const affectedHubPaths = [
  '/student-dating',
  '/campus-dating',
  '/safety',
  '/campus-dating-safety',
  '/green-flags-student-relationships',
  '/relationship-boundaries-for-students',
  '/conversation-starters-dating-app',
  '/first-date-ideas-students',
  '/campus-date-ideas-students',
  '/how-to-meet-people-on-campus',
];

const requiredLinks = new Map([
  ['/red-flags-student-relationships', ['/green-flags-student-relationships', '/relationship-boundaries-for-students', '/safety']],
  ['/healthy-relationship-university-students', ['/student-dating', '/relationship-boundaries-for-students', '/green-flags-student-relationships', '/questions-before-dating']],
  ['/signs-someone-likes-you-college', ['/campus-dating', '/conversation-starters-dating-app', '/talking-stage-students']],
  ['/long-distance-relationship-students', ['/student-dating', '/relationship-boundaries-for-students', '/questions-before-dating', '/red-flags-student-relationships']],
  ['/talking-stage-students', ['/conversation-starters-dating-app', '/first-message-examples-dating-apps', '/situationship-vs-relationship', '/questions-before-dating']],
  ['/situationship-vs-relationship', ['/talking-stage-students', '/relationship-boundaries-for-students', '/red-flags-student-relationships', '/questions-before-dating']],
  ['/how-to-reject-someone-politely', ['/student-dating-etiquette', '/relationship-boundaries-for-students', '/safety', '/red-flags-student-relationships']],
  ['/breakup-recovery-college-students', ['/student-dating', '/red-flags-student-relationships', '/relationship-boundaries-for-students', '/green-flags-student-relationships']],
  ['/student-dating-etiquette', ['/student-dating', '/first-date-ideas-students', '/relationship-boundaries-for-students', '/how-to-reject-someone-politely']],
  ['/questions-before-dating', ['/healthy-relationship-university-students', '/relationship-boundaries-for-students', '/talking-stage-students', '/situationship-vs-relationship']],
]);

const seoByPath = new Map(seoPages.map((page) => [page.path, page]));
const seoPathSet = new Set(seoPages.map((page) => page.path));
const errors = [];
const warnings = [];
const liveResults = [];

function canonical(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

function readSource(pathname) {
  const page = seoByPath.get(pathname);
  if (!page) throw new Error(`No seoPages entry for ${pathname}`);
  return readFileSync(join(root, page.source), 'utf8');
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

function appRouteAllows(href) {
  return appShellRoutes.some((route) => route.endsWith('/*') ? href.startsWith(route.slice(0, -1)) : href === route);
}

function record(condition, level, subject, message) {
  if (condition) return;
  const line = `${subject}: ${message}`;
  if (level === 'warning') warnings.push(line);
  else errors.push(line);
}

const titles = new Map();
const descriptions = new Map();
const texts = new Map();
const rows = [];

for (const pathname of wave3Paths) {
  const page = seoByPath.get(pathname);
  record(Boolean(page), 'error', pathname, 'missing from seoPages');
  if (!page) continue;
  record(existsSync(join(root, page.source)), 'error', pathname, 'source file missing');

  const html = readSource(pathname);
  const url = canonical(pathname);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  const h1 = html.match(/<h1>([^<]+)<\/h1>/i)?.[1] || '';
  const bodyText = textContent(html);
  const words = bodyText.split(/\W+/).filter((word) => word.length > 2);
  const links = internalLinks(html);

  rows.push({ pathname, source: page.source, title, description, h1, wordCount: words.length, linkCount: links.length });
  texts.set(pathname, wordSet(bodyText));

  record([...html.matchAll(/<h1\b/gi)].length === 1, 'error', pathname, 'expected exactly one H1');
  record(Boolean(title) && !titles.has(title), 'error', pathname, `duplicate or missing title: ${title}`);
  record(Boolean(description) && !descriptions.has(description), 'error', pathname, `duplicate or missing meta description: ${description}`);
  titles.set(title, pathname);
  descriptions.set(description, pathname);
  record(description.length >= 90 && description.length <= 180, 'warning', pathname, `meta description length ${description.length}`);
  record(words.length >= 625, 'warning', pathname, `visible content word count ${words.length}`);
  record(html.includes(`<link rel="canonical" href="${url}"`), 'error', pathname, 'missing self canonical');
  record(html.includes(`<meta property="og:url" content="${url}"`), 'error', pathname, 'missing OG URL');
  record(/<meta name="twitter:card" content="summary_large_image"/i.test(html), 'error', pathname, 'missing Twitter/X card');
  record(!/noindex/i.test(html), 'error', pathname, 'indexable page contains noindex');
  record(!/\.html["'\s]/i.test(html.replace(/https:\/\/play\.google\.com\/[^"']+/g, '')), 'error', pathname, 'contains .html URL candidate');
  record(!/(guaranteed safety|background checks|university endorsed|number one|#1 dating|success rate|verified by every university)/i.test(html), 'error', pathname, 'contains unsupported or prohibited claim');
  record(!/"@(type|Type)"\s*:\s*"(Review|AggregateRating)"/i.test(html), 'error', pathname, 'contains unsupported Review/AggregateRating schema');

  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  record(jsonLdBlocks.length > 0, 'error', pathname, 'missing JSON-LD');
  for (const [, json] of jsonLdBlocks) {
    const parsed = JSON.parse(json);
    const graph = parsed['@graph'] || [];
    const types = new Set(graph.map((item) => item['@type']));
    for (const required of ['Organization', 'ImageObject', 'BreadcrumbList', 'FAQPage']) {
      record(types.has(required), 'error', pathname, `missing ${required} schema`);
    }
    record(types.has('Article') || types.has('WebPage'), 'error', pathname, 'missing Article or WebPage schema');
    record(json.includes('"datePublished"') && json.includes('"dateModified"'), 'error', pathname, 'missing publication dates in schema');
  }

  record(links.length >= 6, 'error', pathname, 'fewer than 6 internal links');
  for (const required of requiredLinks.get(pathname) || []) {
    record(links.includes(required), 'error', pathname, `missing required internal link to ${required}`);
  }
  for (const href of links) {
    record(seoPathSet.has(href) || appRouteAllows(href), 'error', pathname, `internal link target is not registered: ${href}`);
  }
}

for (const pathname of existingComparisonPaths) {
  texts.set(pathname, wordSet(textContent(readSource(pathname))));
}

let maxSimilarity = { pair: '', value: 0 };
for (const pathname of wave3Paths) {
  for (const other of [...wave3Paths, ...existingComparisonPaths]) {
    if (pathname >= other) continue;
    const a = texts.get(pathname);
    const b = texts.get(other);
    if (!a || !b) continue;
    const intersection = [...a].filter((word) => b.has(word)).length;
    const union = new Set([...a, ...b]).size;
    const similarity = union ? intersection / union : 0;
    if (similarity > maxSimilarity.value) {
      maxSimilarity = { pair: `${pathname} <> ${other}`, value: similarity };
    }
  }
}
record(maxSimilarity.value <= 0.62, 'error', 'content similarity', `potential duplication: ${maxSimilarity.pair} (${maxSimilarity.value.toFixed(2)})`);

for (const pathname of affectedHubPaths) {
  const html = readSource(pathname);
  record(html.includes('phase8-links'), 'error', pathname, 'missing Wave 3 related links panel');
}

const blog = readSource('/blog');
for (const pathname of wave3Paths) {
  record(blog.includes(`href="${pathname}"`), 'error', '/blog', `missing Wave 3 card for ${pathname}`);
}

const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
for (const pathname of wave3Paths) {
  record(sitemap.includes(`<loc>${canonical(pathname)}</loc>`), 'error', 'sitemap', `missing ${pathname}`);
}

const redirects = readFileSync(join(root, 'public/_redirects'), 'utf8');
for (const pathname of wave3Paths) {
  const page = seoByPath.get(pathname);
  const source = page?.source?.replace(/^public\//, '');
  record(redirects.includes(`${pathname}.html  ${pathname}  301!`), 'error', 'redirects', `missing ${pathname}.html redirect`);
  record(source && redirects.includes(`${pathname}  /${source}  200`), 'error', 'redirects', `missing ${pathname} rewrite`);
}

const llms = readFileSync(join(root, 'public/llms.txt'), 'utf8');
for (const pathname of wave3Paths) {
  record(llms.includes(canonical(pathname)), 'error', 'llms.txt', `missing ${pathname}`);
}

const liveBaseArg = process.argv.find((arg) => arg.startsWith('--live-base='));
const allowPreviewNoindex = process.argv.includes('--allow-preview-noindex');
if (liveBaseArg) {
  const liveBase = liveBaseArg.split('=').slice(1).join('=').replace(/\/+$/, '');
  for (const pathname of wave3Paths) {
    const response = await fetch(`${liveBase}${pathname}`, { redirect: 'manual' });
    const html = await response.text().catch(() => '');
    const xRobots = response.headers.get('x-robots-tag') || '';
    const hasNoindex = /noindex/i.test(html) || /noindex/i.test(xRobots);
    liveResults.push(`${pathname}: ${response.status} ${xRobots || 'no x-robots-tag'}`);
    record(response.status === 200, 'error', `live ${pathname}`, `expected 200, got ${response.status}`);
    record(html.includes(`<link rel="canonical" href="${canonical(pathname)}"`), 'error', `live ${pathname}`, 'canonical mismatch');
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

  const missing = await fetch(`${liveBase}/phase8-nonexistent-${Date.now()}`, { redirect: 'manual' });
  liveResults.push(`/phase8-nonexistent: ${missing.status}`);
  record(missing.status === 404, 'error', 'live 404', `expected 404, got ${missing.status}`);
}

mkdirSync(join(root, 'docs/seo-phase-8'), { recursive: true });
writeFileSync(join(root, 'docs/seo-phase-8/wave3-validation-data.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  rows,
  maxSimilarity,
  warnings,
  errors,
  liveResults,
}, null, 2));

console.log(`Validated ${wave3Paths.length} Wave 3 pages and ${affectedHubPaths.length} affected hub pages.`);
console.log(`Max Wave 3 content word-set similarity: ${maxSimilarity.value.toFixed(2)} (${maxSimilarity.pair})`);
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

writeFileSync(join(root, 'docs/seo-phase-8/wave3-validation-report.md'), `# Phase 8 Wave 3 Validation Report

Validation date: 2026-07-23

Validated ${wave3Paths.length} Wave 3 pages and ${affectedHubPaths.length} affected hub pages.

## Result

Passed.

## Max Similarity

- ${maxSimilarity.pair}: ${maxSimilarity.value.toFixed(3)}

## Live Checks

${liveResults.length ? liveResults.map((item) => `- ${item}`).join('\n') : '- Not run in this invocation.'}

## Warnings

${warnings.length ? warnings.map((item) => `- ${item}`).join('\n') : '- None.'}
`);

console.log('Phase 8 Wave 3 validation passed.');
