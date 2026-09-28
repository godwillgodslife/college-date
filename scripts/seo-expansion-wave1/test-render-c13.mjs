import { renderSeoPage } from '../seo-expansion/template.mjs';
import { cluster13Pages } from './cluster13.mjs';

console.log('Testing Cluster 13 render...');
let pass = 0;
let minWords = Infinity;
let maxWords = 0;

for (const page of cluster13Pages) {
  const html = renderSeoPage(page);
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(' ').length;
  if (wordCount < minWords) minWords = wordCount;
  if (wordCount > maxWords) maxWords = wordCount;

  if (
    wordCount >= 1000 &&
    html.includes('table class="data-table"') &&
    html.includes('"@type": "FAQPage"') &&
    html.includes('Quick-Take Standard:')
  ) {
    pass++;
  } else {
    console.error(`FAIL: ${page.slug} (words: ${wordCount})`);
  }
}

console.log(`Cluster 13 Audit: ${pass} / ${cluster13Pages.length} PASSED`);
console.log(`Word Count Range: ${minWords} to ${maxWords} words/page`);
