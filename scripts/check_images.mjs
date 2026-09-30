import fs from 'fs';

const html = fs.readFileSync('c:/college-date/public/pitch-deck-printable.html', 'utf8');
let count = 0;
let pos = 0;

while ((pos = html.indexOf('<img', pos)) !== -1) {
  count++;
  const end = html.indexOf('>', pos);
  const tag = html.substring(pos, end + 1);
  const altMatch = tag.match(/alt="([^"]+)"/);
  const srcLenMatch = tag.match(/src="([^"]+)"/);
  const src = srcLenMatch ? srcLenMatch[1] : '';
  const isDataUri = src.startsWith('data:image');
  console.log(`Img ${count}: alt="${altMatch ? altMatch[1] : 'none'}" isDataUri=${isDataUri} length=${src.length}`);
  pos = end + 1;
}

console.log('Total images found in printable HTML:', count);
