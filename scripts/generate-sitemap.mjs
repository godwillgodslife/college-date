import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seoPages, siteOrigin } from './seo-pages.mjs';

const root = process.cwd();

function lastModifiedDate(source) {
  const file = join(root, source);
  if (!existsSync(file)) {
    throw new Error(`Sitemap source does not exist: ${source}`);
  }

  return statSync(file).mtime.toISOString().slice(0, 10);
}

function loc(pathname) {
  return pathname === '/' ? `${siteOrigin}/` : `${siteOrigin}${pathname}`;
}

const urls = seoPages.map((page) => `  <url>
    <loc>${loc(page.path)}</loc>
    <lastmod>${lastModifiedDate(page.source)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(root, 'public', 'sitemap.xml'), sitemap);
console.log(`Generated sitemap.xml with ${seoPages.length} canonical URL(s).`);
