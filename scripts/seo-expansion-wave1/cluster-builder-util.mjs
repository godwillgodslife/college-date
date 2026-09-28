import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Clean meta text (avoid raw unescaped single quotes in HTML attributes)
export function sanitizeMeta(text) {
  return text.replace(/'/g, '').replace(/"/g, '&quot;').trim();
}

// Generate a rich, compliant page object for renderSeoPage
export function createWave1Page({
  num,
  slug,
  title,
  description,
  kicker,
  h1,
  lede,
  quickTake,
  date = '2026-09-28',
  ctaHeading = 'Meet Verified Students on Your Campus',
  ctaText = 'Connect with ambitious, verified students across all faculties, halls of residence, and tertiary institutions on The College Date.',
  ctaHref = '/signup',
  ctaButtonText = 'Join The College Date Free',
  section1Heading,
  section1Content,
  section2Heading,
  section2Content,
  tableHeading,
  tableIntro,
  col1Header,
  col2Header,
  tableRows, // Array of [dimension, col1Val, col2Val]
  section4Heading,
  section4Content,
  section5Heading,
  section5Content,
  faqs, // Array of { question, answer }
  relatedGuides, // Array of { href, label }
}) {
  const tableHtml = `
          <p>${tableIntro || 'Compare the core operational and psychological dimensions of this campus dynamic:'}</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Evaluation Dimension</th>
                  <th>${col1Header}</th>
                  <th>${col2Header}</th>
                </tr>
              </thead>
              <tbody>
${tableRows
  .map(
    ([dim, val1, val2]) => `                <tr>
                  <td><strong>${dim}</strong></td>
                  <td>${val1}</td>
                  <td>${val2}</td>
                </tr>`
  )
  .join('\n')}
              </tbody>
            </table>
          </div>
  `;

  return {
    num,
    slug,
    file: `public/${slug}.html`,
    lang: 'en',
    title: sanitizeMeta(title),
    description: sanitizeMeta(description),
    kicker: sanitizeMeta(kicker),
    h1: sanitizeMeta(h1),
    lede: sanitizeMeta(lede),
    date,
    ctaHeading: sanitizeMeta(ctaHeading),
    ctaText: sanitizeMeta(ctaText),
    ctaHref,
    ctaButtonText: sanitizeMeta(ctaButtonText),
    sections: [
      {
        id: 'the-campus-standard-and-context',
        heading: section1Heading,
        content: `
          <p><strong>Quick-Take Standard:</strong> ${quickTake}</p>
          ${section1Content}
        `,
      },
      {
        id: 'lived-realities-and-daily-friction',
        heading: section2Heading,
        content: section2Content,
      },
      {
        id: 'structured-comparative-framework',
        heading: tableHeading,
        content: tableHtml,
      },
      {
        id: 'psychological-and-academic-dynamics',
        heading: section4Heading,
        content: section4Content,
      },
      {
        id: 'actionable-rules-and-campus-framework',
        heading: section5Heading,
        content: section5Content,
      },
    ],
    faqs: faqs.map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
    relatedGuides: relatedGuides.map((r) => ({
      href: r.href,
      label: r.label,
    })),
  };
}
