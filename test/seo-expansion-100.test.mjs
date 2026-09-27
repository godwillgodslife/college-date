import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { seoPages } from '../scripts/seo-pages.mjs';
import { PUBLIC_SEO_SLUGS } from '../src/constants/publicSeoRoutes.js';
import { expected100Slugs } from '../scripts/verify-100-pages.mjs';

const root = process.cwd();

test('SEO Expansion (100 Topics Master Expansion): All 100 slugs registered in seo-pages.mjs', () => {
  const registeredPaths = new Set(seoPages.map((p) => p.path));
  for (const slug of expected100Slugs) {
    assert.equal(registeredPaths.has(`/${slug}`), true, `Missing /${slug} in seoPages`);
  }
  assert.equal(seoPages.length >= 224, true, `Expected >= 224 canonical URLs, got ${seoPages.length}`);
});

test('SEO Expansion (100 Topics Master Expansion): All 100 slugs registered in publicSeoRoutes.js', () => {
  const registeredSlugs = new Set(PUBLIC_SEO_SLUGS);
  for (const slug of expected100Slugs) {
    assert.equal(registeredSlugs.has(slug), true, `Missing ${slug} in PUBLIC_SEO_SLUGS`);
  }
});

test('SEO Expansion (100 Topics Master Expansion): All 100 HTML files exist and meet core SEO criteria', () => {
  for (const slug of expected100Slugs) {
    const filePath = join(root, 'public', `${slug}.html`);
    assert.equal(existsSync(filePath), true, `File missing: public/${slug}.html`);

    const content = readFileSync(filePath, 'utf8');

    // Body word count > 1000
    const bodyWithoutScripts = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    const words = bodyWithoutScripts.trim().split(/\s+/).filter(Boolean).length;
    assert.equal(words >= 1000, true, `${slug} has only ${words} words (expected >= 1000)`);

    // Title length 20-70
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    assert.ok(titleMatch, `${slug} missing <title>`);
    assert.equal(titleMatch[1].length >= 20 && titleMatch[1].length <= 70, true, `${slug} title length out of bounds: ${titleMatch[1].length}`);

    // Meta description 80-180 and no single quotes
    const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    assert.ok(descMatch, `${slug} missing meta description`);
    assert.equal(descMatch[1].length >= 80 && descMatch[1].length <= 180, true, `${slug} desc length out of bounds: ${descMatch[1].length}`);
    assert.equal(descMatch[1].includes("'"), false, `${slug} meta description contains raw single quote`);

    // Canonical tag without .html
    const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
    assert.ok(canonicalMatch, `${slug} missing canonical`);
    assert.equal(canonicalMatch[1], `https://www.thecollegedate.com/${slug}`, `${slug} canonical mismatch`);

    // JSON-LD @graph schema
    assert.equal(content.includes('"@type": "FAQPage"'), true, `${slug} missing FAQPage schema`);
    assert.equal(content.includes('"@type": "BreadcrumbList"'), true, `${slug} missing BreadcrumbList schema`);
  }
});
