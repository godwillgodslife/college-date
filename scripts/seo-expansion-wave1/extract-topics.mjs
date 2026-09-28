import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const artifactPath = join(
  'C:',
  'Users',
  'DELL',
  '.gemini',
  'antigravity',
  'brain',
  '09b46b14-d685-4f2c-92c5-a7d1f35f56b5',
  'master_student_dating_seo_research_500_topics.md'
);

const content = readFileSync(artifactPath, 'utf8');
const lines = content.replace(/\r/g, '').split('\n');
const wave1 = [];

for (const line of lines) {
  if (!line.startsWith('| **')) continue;
  const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 5) {
    const num = parseInt(parts[0].replace(/\*/g, ''), 10);
    if (num >= 101 && num <= 200) {
      const slug = parts[2].replaceAll('`', '').replaceAll('/', '');
      const hook = parts[5].replace(/^"|"$/g, '');
      wave1.push({
        num,
        title: parts[1],
        slug,
        keywords: parts[3],
        intent: parts[4],
        hook,
      });
    }
  }
}

writeFileSync(
  join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'),
  JSON.stringify(wave1, null, 2),
  'utf8'
);

console.log(`Successfully extracted ${wave1.length} topics to scripts/seo-expansion-wave1/topics.json`);
