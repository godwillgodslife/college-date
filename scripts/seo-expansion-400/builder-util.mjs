// Shared Builder Utility for SEO Expansion 400 (Topics 201 to 600)

export function sanitizeTitle(title) {
  let t = title.replace(/&quot;/g, '').replace(/"/g, '').replace(/'/g, '').trim();
  if (t.length > 68) {
    if (t.includes(':')) {
      const parts = t.split(':');
      t = parts[0].trim();
      if (t.length < 32 && parts[1]) {
        t = `${parts[0]}: ${parts[1].trim()}`.slice(0, 65).trim();
      }
    } else {
      t = t.slice(0, 65).trim();
    }
  }
  if (t.length < 25) {
    t = `${t}: Campus Student Guide`;
  }
  return t;
}

export function sanitizeDescription(desc) {
  let d = desc.replace(/'/g, '').replace(/"/g, '').trim();
  if (d.length > 175) {
    const periodIdx = d.lastIndexOf('.', 175);
    if (periodIdx > 90) {
      d = d.slice(0, periodIdx + 1);
    } else {
      const spaceIdx = d.lastIndexOf(' ', 170);
      d = `${d.slice(0, spaceIdx)}.`;
    }
  }
  if (d.length < 90) {
    d = `${d} Learn actionable campus dating advice, relationship strategies, and student guidance.`;
    if (d.length > 175) {
      d = d.slice(0, 170) + '.';
    }
  }
  return d;
}

export function buildTableHtml({ tableIntro, col1Header, col2Header, rows }) {
  return `
          <p>${tableIntro || 'Compare the core operational and psychological dimensions of this campus dynamic:'}</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Evaluation Dimension</th>
                  <th>${col1Header || 'Recommended Best Practice'}</th>
                  <th>${col2Header || 'Common High-Risk Pitfall'}</th>
                </tr>
              </thead>
              <tbody>
${rows
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
}

export function createSeoPageData({
  num,
  slug,
  title,
  description,
  kicker,
  h1,
  lede,
  quickTake,
  date = '2026-09-30',
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
  tableRows,
  section4Heading,
  section4Content,
  section5Heading,
  section5Content,
  faqs,
  relatedGuides,
}) {
  const cleanT = sanitizeTitle(title);
  const cleanD = sanitizeDescription(description);

  const tableHtml = buildTableHtml({
    tableIntro,
    col1Header,
    col2Header,
    rows: tableRows,
  });

  return {
    num,
    slug,
    file: `public/${slug}.html`,
    lang: 'en',
    title: cleanT,
    description: cleanD,
    kicker: kicker.replace(/'/g, '').trim(),
    h1: h1.replace(/'/g, '').trim(),
    lede: lede.replace(/'/g, '').trim(),
    date,
    ctaHeading,
    ctaText,
    ctaHref,
    ctaButtonText,
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
      question: f.question.replace(/'/g, '').trim(),
      answer: f.answer.replace(/'/g, '').trim(),
    })),
    relatedGuides: relatedGuides.map((r) => ({
      href: r.href,
      label: r.label,
    })),
  };
}
