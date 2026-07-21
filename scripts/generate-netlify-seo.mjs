import { writeFileSync } from 'node:fs';
import { appShellRoutes, privateNoindexRoutes, seoPages } from './seo-pages.mjs';

const hostRedirects = [
  'https://thecollegedate.com/*  https://www.thecollegedate.com/:splat  301!',
  'http://thecollegedate.com/*  https://www.thecollegedate.com/:splat  301!',
  'http://www.thecollegedate.com/*  https://www.thecollegedate.com/:splat  301!',
];

const htmlRedirects = seoPages
  .filter((page) => page.path !== '/' && page.source.endsWith('.html'))
  .map((page) => `${page.path}.html  ${page.path}  301!`);

const prettyRewrites = seoPages
  .filter((page) => page.path !== '/' && page.source.startsWith('public/') && page.source.endsWith('.html'))
  .map((page) => `${page.path}  /${page.source.replace(/^public\//, '')}  200`);

const appRewrites = appShellRoutes.map((route) => `${route}  /index.html  200`);

const redirects = [
  '# Canonical host redirects',
  ...hostRedirects,
  '',
  '# Canonical extensionless public SEO URLs',
  ...htmlRedirects,
  '',
  '# Static SEO page rewrites for canonical extensionless URLs',
  ...prettyRewrites,
  '',
  '# Known React application routes',
  ...appRewrites,
  '',
  '# Unknown URLs should be real 404s, not app-shell soft 404s',
  '/*  /404.html  404',
  '',
].join('\n');

writeFileSync('public/_redirects', redirects);

const commonSecurityHeaders = [
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: DENY',
  "  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.onesignal.com https://cdn.jsdelivr.net https://js.paystack.co; connect-src 'self' https: wss:; media-src 'self' blob: https:; worker-src 'self' blob:; manifest-src 'self'; frame-src 'self' https:; form-action 'self' https://checkout.paystack.com; upgrade-insecure-requests",
  '  Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(self "https://checkout.paystack.com"), fullscreen=(self)',
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
];

const headers = [
  '/*',
  ...commonSecurityHeaders,
  '',
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
  '/sitemap.xml',
  '  Content-Type: application/xml; charset=utf-8',
  '  Cache-Control: public, max-age=3600',
  '',
  '/robots.txt',
  '  Content-Type: text/plain; charset=utf-8',
  '  Cache-Control: public, max-age=3600',
  '',
  '/llms.txt',
  '  Content-Type: text/plain; charset=utf-8',
  '  Cache-Control: public, max-age=3600',
  '',
  '/humans.txt',
  '  Content-Type: text/plain; charset=utf-8',
  '  Cache-Control: public, max-age=3600',
  '',
  '/og-image.png',
  '  Cache-Control: public, max-age=604800',
  '',
  '/404',
  '  X-Robots-Tag: noindex, nofollow',
  '',
  '/404.html',
  '  X-Robots-Tag: noindex, nofollow',
  '',
  '/google4792f9f70f65bd59.html',
  '  X-Robots-Tag: noindex, nofollow',
  '',
  '# Private and application-only routes must not enter search indexes',
  ...privateNoindexRoutes.flatMap((route) => [route, '  X-Robots-Tag: noindex, nofollow', '']),
].join('\n');

writeFileSync('public/_headers', headers);
console.log('Generated Netlify SEO redirects and headers.');
