import { readFileSync } from 'node:fs';

const content = readFileSync('C:/Users/DELL/.gemini/antigravity/brain/09b46b14-d685-4f2c-92c5-a7d1f35f56b5/master_student_dating_seo_research_500_topics.md', 'utf8');
const lines = content.split('\n');
const topics = [];
let currentCluster = '';

for (const line of lines) {
  const clusterMatch = line.match(/^##\s+(Cluster\s+\d+:\s+[^(\n]+)/i);
  if (clusterMatch) {
    currentCluster = clusterMatch[1].trim();
  }
  const match = line.match(/^\|\s*\*\*(\d+)\*\*\s*\|\s*([^|]+)\|\s*`\/([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (match) {
    topics.push({
      num: parseInt(match[1]),
      title: match[2].trim(),
      slug: match[3].trim(),
      keywords: match[4].trim(),
      intent: match[5].trim(),
      hook: match[6].trim().replace(/^"|"$/g, ''),
      cluster: currentCluster
    });
  }
}

console.log('Total topics parsed from dossier:', topics.length);
console.log('Range:', topics[0].num, 'to', topics[topics.length - 1].num);

const remaining = topics.filter(t => t.num >= 201 && t.num <= 600);
console.log('Remaining topics (201-600):', remaining.length);

const clusterMap = new Map();
for (const t of remaining) {
  clusterMap.set(t.cluster, (clusterMap.get(t.cluster) || 0) + 1);
}
console.log('\nClusters breakdown for remaining 400:');
for (const [cluster, count] of clusterMap.entries()) {
  console.log(`- ${cluster}: ${count} topics`);
}
