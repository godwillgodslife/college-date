import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { seoPages } from '../scripts/seo-pages.mjs';
import { PUBLIC_SEO_SLUGS } from '../src/constants/publicSeoRoutes.js';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-400', 'topics400.json'), 'utf8'));
const slugs400 = topics.map((t) => t.slug);

test('SEO 400 Expansion: Exactly 400 new slugs registered in seo-pages.mjs (724 Total)', () => {
  const registeredPaths = new Set(seoPages.map((p) => p.path));
  for (const slug of slugs400) {
    assert.equal(registeredPaths.has(`/${slug}`), true, `Missing /${slug} in seoPages`);
  }
  assert.equal(seoPages.length >= 724, true, `Expected >= 724 canonical URLs, got ${seoPages.length}`);
});

test('SEO 400 Expansion: All 400 slugs registered in publicSeoRoutes.js', () => {
  const registeredSlugs = new Set(PUBLIC_SEO_SLUGS);
  for (const slug of slugs400) {
    assert.equal(registeredSlugs.has(slug), true, `Missing ${slug} in PUBLIC_SEO_SLUGS`);
  }
});

test('SEO 400 Expansion: All 400 HTML files exist and pass comprehensive SEO/GEO benchmarks', () => {
  for (const slug of slugs400) {
    const filePath = join(root, 'public', `${slug}.html`);
    assert.equal(existsSync(filePath), true, `File missing: public/${slug}.html`);

    const content = readFileSync(filePath, 'utf8');

    // Body word count >= 1000
    const bodyWithoutScripts = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    const words = bodyWithoutScripts.trim().split(/\s+/).filter(Boolean).length;
    assert.equal(words >= 1000, true, `${slug} has only ${words} words (expected >= 1000)`);

    // Title length 20-70
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    assert.ok(titleMatch, `${slug} missing <title>`);
    assert.equal(
      titleMatch[1].length >= 20 && titleMatch[1].length <= 70,
      true,
      `${slug} title length out of bounds: ${titleMatch[1].length} ("${titleMatch[1]}")`
    );

    // Meta description 80-180 and no single quotes
    const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    assert.ok(descMatch, `${slug} missing meta description`);
    assert.equal(
      descMatch[1].length >= 80 && descMatch[1].length <= 180,
      true,
      `${slug} desc length out of bounds: ${descMatch[1].length}`
    );
    assert.equal(descMatch[1].includes("'"), false, `${slug} meta description contains raw single quote`);

    // Canonical tag without .html
    const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
    assert.ok(canonicalMatch, `${slug} missing canonical`);
    assert.equal(canonicalMatch[1], `https://www.thecollegedate.com/${slug}`, `${slug} canonical mismatch`);

    // GEO quick-take and responsive table
    assert.equal(content.includes('Quick-Take Standard:'), true, `${slug} missing Quick-Take Standard`);
    assert.equal(content.includes('table class="data-table"'), true, `${slug} missing comparison table`);

    // JSON-LD @graph schema
    assert.equal(content.includes('"@type": "FAQPage"'), true, `${slug} missing FAQPage schema`);
    assert.equal(content.includes('"@type": "BreadcrumbList"'), true, `${slug} missing BreadcrumbList schema`);
    assert.equal(content.includes('"@type": "Article"'), true, `${slug} missing Article schema`);
  }
});

test('SEO 400 Expansion: sitemap.xml contains all 724 canonical URLs', () => {
  const sitemapPath = join(root, 'public', 'sitemap.xml');
  assert.equal(existsSync(sitemapPath), true, 'public/sitemap.xml does not exist');
  const sitemapContent = readFileSync(sitemapPath, 'utf8');
  const count = (sitemapContent.match(/<loc>/g) || []).length;
  assert.equal(count, 724, `Expected 724 <loc> tags in sitemap.xml, found ${count}`);
  for (const slug of slugs400) {
    assert.equal(
      sitemapContent.includes(`<loc>https://www.thecollegedate.com/${slug}</loc>`),
      true,
      `sitemap.xml missing https://www.thecollegedate.com/${slug}`
    );
  }
});
