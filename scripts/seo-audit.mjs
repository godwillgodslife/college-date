import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appShellRoutes, privateNoindexRoutes, seoPages, siteOrigin } from './seo-pages.mjs';

const root = process.cwd();
const publicDir = join(root, 'public');
const findings = [];

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function publicFile(file) {
  return join(publicDir, file);
}

function canonicalUrl(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

function htmlForSource(source) {
  return source === 'index.html' ? read('index.html') : read(source);
}

function add(level, file, message) {
  findings.push({ level, file, message });
}

for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'humans.txt', 'og-image.png', '404.html', '_redirects', '_headers']) {
  if (!existsSync(publicFile(file))) {
    add('error', `public/${file}`, 'Missing required SEO infrastructure file.');
  }
}

for (const page of seoPages) {
  if (!existsSync(join(root, page.source))) {
    add('error', page.source, 'Missing sitemap source file.');
  }
}

const sitemap = existsSync(publicFile('sitemap.xml')) ? read('public/sitemap.xml') : '';
const robots = existsSync(publicFile('robots.txt')) ? read('public/robots.txt') : '';
const redirects = existsSync(publicFile('_redirects')) ? read('public/_redirects') : '';
const headers = existsSync(publicFile('_headers')) ? read('public/_headers') : '';
const llms = existsSync(publicFile('llms.txt')) ? read('public/llms.txt') : '';

for (const page of seoPages) {
  const url = canonicalUrl(page.path);
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    add('error', 'public/sitemap.xml', `Missing canonical URL ${url}.`);
  }
  if (page.path !== '/' && sitemap.includes(`${url}.html`)) {
    add('error', 'public/sitemap.xml', `Sitemap still contains non-canonical .html URL for ${page.path}.`);
  }
}

for (const blocked of ['/login', '/signup', '/dashboard', '/auth/callback', '/admin']) {
  if (sitemap.includes(`<loc>${siteOrigin}${blocked}</loc>`)) {
    add('error', 'public/sitemap.xml', `Private or auth URL should not be in sitemap: ${blocked}.`);
  }
}

if (!robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
  add('error', 'public/robots.txt', 'Missing sitemap reference.');
}

for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot']) {
  if (!robots.includes(`User-agent: ${bot}`)) {
    add('warning', 'public/robots.txt', `Missing explicit allow rule for ${bot}.`);
  }
}

for (const page of seoPages.filter((item) => item.path !== '/')) {
  const htmlPath = `${page.path}.html`;
  if (!redirects.includes(`${htmlPath}  ${page.path}  301!`)) {
    add('error', 'public/_redirects', `Missing .html to extensionless 301 for ${page.path}.`);
  }
  const rewriteTarget = `/${page.source.replace(/^public\//, '')}`;
  if (!redirects.includes(`${page.path}  ${rewriteTarget}  200`)) {
    add('error', 'public/_redirects', `Missing extensionless rewrite for ${page.path}.`);
  }
}

for (const route of appShellRoutes) {
  if (!redirects.includes(`${route}  /index.html  200`)) {
    add('error', 'public/_redirects', `Missing known app route rewrite for ${route}.`);
  }
}

if (!redirects.includes('/*  /404.html  404')) {
  add('error', 'public/_redirects', 'Missing real 404 fallback.');
}

for (const route of privateNoindexRoutes) {
  const block = `${route}\n  X-Robots-Tag: noindex, nofollow`;
  if (!headers.includes(block)) {
    add('error', 'public/_headers', `Missing noindex header for ${route}.`);
  }
}

if (!headers.includes('/assets/*\n  Cache-Control: public, max-age=31536000, immutable')) {
  add('error', 'public/_headers', 'Missing immutable caching for fingerprinted assets.');
}

for (const expectedHeader of ['Content-Security-Policy:', 'Permissions-Policy:', 'Strict-Transport-Security:', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY']) {
  if (!headers.includes(expectedHeader)) {
    add('error', 'public/_headers', `Missing security header ${expectedHeader}`);
  }
}

for (const page of seoPages) {
  const file = page.source;
  const html = htmlForSource(file);
  const url = canonicalUrl(page.path);
  const checks = [
    ['title', /<title>[^<]{20,70}<\/title>/i],
    ['meta description', /<meta\s+name=["']description["']\s+content=["'][^"']{80,180}["']/i],
    ['canonical URL', new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*/?>`, 'i')],
    ['Open Graph URL', new RegExp(`<meta\\s+property=["']og:url["']\\s+content=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i')],
    ['Open Graph image', /<meta\s+property=["']og:image["']\s+content=["']https:\/\/www\.thecollegedate\.com\/og-image\.png["']/i],
    ['Twitter card', /<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']/i],
    ['JSON-LD structured data', /<script\s+type=["']application\/ld\+json["']>/i],
    ['BreadcrumbList schema', /"@type":\s*"BreadcrumbList"/i],
    ['H1', /<h1[^>]*>[^<]+<\/h1>/i],
  ];

  for (const [label, pattern] of checks) {
    if (!pattern.test(html)) {
      add('warning', file, `Missing or weak ${label}.`);
    }
  }

  if (file !== 'index.html' && /https:\/\/www\.thecollegedate\.com\/[^"'\s?#]+\.html/i.test(html)) {
    add('error', file, 'Contains absolute non-canonical .html URL.');
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of jsonLdBlocks) {
    try {
      JSON.parse(json);
    } catch (error) {
      add('error', file, `Invalid JSON-LD: ${error.message}`);
    }
  }
}

if (/https:\/\/www\.thecollegedate\.com\/[^\s),]+\.html/i.test(llms)) {
  add('error', 'public/llms.txt', 'AI summary still contains non-canonical .html URLs.');
}

if (findings.length === 0) {
  console.log('SEO audit passed. Canonicals, sitemap, redirects, headers, noindex rules, and structured data basics are aligned.');
} else {
  console.log(`SEO audit found ${findings.length} item(s):`);
  for (const finding of findings) {
    console.log(`- [${finding.level}] ${finding.file}: ${finding.message}`);
  }
}

const hasErrors = findings.some((finding) => finding.level === 'error');
process.exit(hasErrors ? 1 : 0);
