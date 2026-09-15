import { generateBatch1 } from './batch1.mjs';
import { generateBatch2 } from './batch2.mjs';
import { generateBatch3 } from './batch3.mjs';
import { runPillarsAndUpdates } from './pillars-and-updates.mjs';

console.log('========================================');
console.log('Starting Complete 12-Page SEO Expansion');
console.log('========================================');

generateBatch1();
generateBatch2();
generateBatch3();
runPillarsAndUpdates();

console.log('========================================');
console.log('All 12 pages and updates generated successfully!');
console.log('========================================');
