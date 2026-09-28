export function renderSeoPage({
  lang = 'en',
  slug,
  title,
  description,
  kicker,
  h1,
  lede,
  date = '2026-09-15',
  sections,
  faqs,
  relatedGuides,
  ctaHeading = 'Get Started on Campus',
  ctaText = 'Connect with verified students, share confessions anonymously, or find campus friends today.',
  ctaHref = '/signup',
  ctaButtonText = 'Join The College Date Free',
  additionalGraphItems = [],
}) {
  const canonicalUrl = `https://www.thecollegedate.com/${slug}`;
  const ogImage = 'https://www.thecollegedate.com/og-image.png';

  // Primary navigation - MUST NOT contain .html
  const primaryNav = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Campus Dating', href: '/campus-dating' },
    { label: 'Safety', href: '/safety' },
    { label: 'Blog', href: '/blog' },
    { label: 'Download', href: '/download' },
  ];

  const tocHtml = sections
    .map((s) => `<a href="#${s.id}">${s.heading}</a>`)
    .join('');

  const sectionsHtml = sections
    .map(
      (s) => `
    <section class="panel" id="${s.id}">
      <h2>${s.heading}</h2>
      ${s.content}
    </section>`
    )
    .join('\n');

  const faqsHtml = faqs
    .map(
      (f) => `
      <h3>${f.question}</h3>
      <p>${f.answer}</p>`
    )
    .join('\n');

  const relatedHtml = relatedGuides
    .map((r) => `<a href="${r.href}">${r.label}</a>`)
    .join('');

  // Structured data JSON-LD Graph
  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.thecollegedate.com/#organization',
        name: 'The College Date',
        url: 'https://www.thecollegedate.com',
        logo: 'https://www.thecollegedate.com/logo-512.png',
        sameAs: [
          'https://play.google.com/store/apps/details?id=com.collegedate.app',
          'https://www.instagram.com/thecollegedate',
        ],
      },
      {
        '@type': 'ImageObject',
        '@id': `${canonicalUrl}#primaryimage`,
        url: ogImage,
        contentUrl: ogImage,
        caption: title,
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        headline: h1,
        description: description,
        image: {
          '@id': `${canonicalUrl}#primaryimage`,
        },
        datePublished: date,
        dateModified: date,
        author: {
          '@type': 'Organization',
          name: 'The College Date Editorial Team',
        },
        publisher: {
          '@id': 'https://www.thecollegedate.com/#organization',
        },
        mainEntityOfPage: canonicalUrl,
        inLanguage: lang,
        isPartOf: {
          '@id': 'https://www.thecollegedate.com/#website',
        },
      },
      {
        '@type': 'Article',
        '@id': `${canonicalUrl}#article`,
        isPartOf: {
          '@id': `${canonicalUrl}#webpage`,
        },
        headline: h1,
        description: description,
        inLanguage: lang,
        mainEntityOfPage: canonicalUrl,
        datePublished: date,
        dateModified: date,
        author: {
          '@type': 'Organization',
          name: 'The College Date Editorial Team',
        },
        publisher: {
          '@id': 'https://www.thecollegedate.com/#organization',
        },
        image: {
          '@id': `${canonicalUrl}#primaryimage`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://www.thecollegedate.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
      ...additionalGraphItems,
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="The College Date Editorial Team" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="stylesheet" href="/seo-page.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLdGraph, null, 2)}</script>
</head>
<body>
  <main>
    <nav aria-label="Primary">${primaryNav.map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}</nav>
    <p class="kicker">${kicker}</p>
    <h1>${h1}</h1>
    <p class="lede">${lede}</p>
    <p class="muted">Published by The College Date Editorial Team on <time datetime="${date}">${date}</time>. Updated <time datetime="${date}">${date}</time>.</p>
    <nav class="panel toc" aria-label="Table of contents">${tocHtml}</nav>
${sectionsHtml}
    <section class="panel">
      <h2>Related Guides</h2>
      <div class="related-grid">${relatedHtml}</div>
    </section>
    <section class="panel">
      <h2>Frequently Asked Questions</h2>
${faqsHtml}
    </section>
    <section class="panel">
      <h2>${ctaHeading}</h2>
      <p>${ctaText}</p>
      <a class="cta" href="${ctaHref}">${ctaButtonText}</a>
    </section>
    <footer>
      <p>The College Date publishes student-focused dating, campus life, relationship, and safety guidance for adults 18+.</p>
      <p><a href="/privacy">Privacy</a> <a href="/terms">Terms</a> <a href="/support">Support</a></p>
    </footer>
  </main>
</body>
</html>
`;
}
