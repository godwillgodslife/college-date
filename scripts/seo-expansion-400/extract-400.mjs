import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dossierPath = 'C:/Users/DELL/.gemini/antigravity/brain/09b46b14-d685-4f2c-92c5-a7d1f35f56b5/master_student_dating_seo_research_500_topics.md';
const content = readFileSync(dossierPath, 'utf8');
const lines = content.split('\n');

const topics = [];
let currentClusterNum = 0;
let currentClusterName = '';

for (const line of lines) {
  const clusterMatch = line.match(/^##\s+Cluster\s+(\d+):\s+([^\n(]+)/i);
  if (clusterMatch) {
    currentClusterNum = parseInt(clusterMatch[1]);
    currentClusterName = clusterMatch[2].trim();
  }
  const match = line.match(/^\|\s*\*\*(\d+)\*\*\s*\|\s*([^|]+)\|\s*`\/([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 201 && num <= 600) {
      topics.push({
        num,
        clusterNum: currentClusterNum,
        clusterName: currentClusterName,
        title: match[2].trim(),
        slug: match[3].trim(),
        keywords: match[4].trim(),
        intent: match[5].trim(),
        hook: match[6].trim().replace(/^"|"$/g, ''),
      });
    }
  }
}

console.log(`Extracted ${topics.length} topics (Topics ${topics[0]?.num} to ${topics[topics.length - 1]?.num}).`);

const outPath = join(root, 'scripts', 'seo-expansion-400', 'topics400.json');
writeFileSync(outPath, JSON.stringify(topics, null, 2), 'utf8');
console.log(`Wrote ${outPath}`);
