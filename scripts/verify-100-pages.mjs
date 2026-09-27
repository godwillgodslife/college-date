import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();

export const expected100Slugs = [
  // Cluster 1 (1-10)
  'dating-in-polytechnics-vs-universities-differences',
  'dating-during-nd-and-hnd-transitions',
  'how-to-survive-industrial-training-it-siwes-in-a-relationship',
  'dating-a-full-time-vs-part-time-polytechnic-student',
  'dating-as-a-college-of-education-student',
  'polytechnic-hostel-dating-rules-and-lodge-life',
  'polytechnic-student-dating-on-a-budget',
  'navigating-the-nd-final-year-breakup-trend',
  'dating-between-university-and-polytechnic-students',
  'how-to-date-safely-around-satellite-campuses',
  // Cluster 2 (11-20)
  'campus-marriage-in-nigerian-universities-pros-and-cons',
  'how-cohabitation-affects-cgpa-in-university',
  'splitting-bills-when-cohabiting-in-university',
  'how-to-exit-a-campus-marriage-safely',
  'hiding-cohabitation-from-parents-during-campus-visits',
  'cohabiting-off-campus-vs-staying-in-hostel-relationship-impact',
  'managing-household-chores-when-living-together-on-campus',
  'unintended-pregnancy-risks-and-prevention-when-cohabiting',
  'what-happens-to-campus-marriages-after-graduation',
  'dealing-with-nosy-landlords-and-caretakers-when-dating',
  // Cluster 3 (21-30)
  'how-to-end-a-situationship-in-university-without-awkwardness',
  'the-talking-stage-expiration-date-in-university',
  'how-to-have-the-define-the-relationship-dtr-talk-on-campus',
  'how-to-spot-love-bombing-in-university-relationships',
  'micro-cheating-on-campus-what-counts-and-what-does-not',
  'breadcrumbing-in-college-dating-signs-and-how-to-respond',
  'roaching-and-sneaky-links-in-university',
  'zombieing-and-ghosting-recovery-in-university',
  'why-university-students-fear-labels-in-dating',
  'how-to-transition-from-casual-hookup-to-committed-relationship',
  // Cluster 4 (31-40)
  'dating-during-economic-hardship-and-inflation-in-university',
  'the-urgent-2k-culture-in-campus-dating-healthy-vs-toxic',
  'dating-a-student-entrepreneur-or-side-hustler-in-university',
  'how-to-say-no-to-financial-demands-from-a-campus-partner',
  'dating-when-neither-of-you-has-money-in-college',
  'peer-pressure-to-live-the-soft-life-in-campus-relationships',
  'dating-someone-with-a-campus-car-vs-trekking-together',
  'borrowing-money-from-your-partner-in-university-rules',
  'how-to-exchange-valuable-skills-with-your-campus-partner',
  'budget-friendly-weekend-getaways-for-university-students',
  // Cluster 5 (41-50)
  'how-heartbreak-affects-cgpa-and-how-to-prevent-carryovers',
  'dating-your-tutorial-master-or-campus-tutor',
  'the-dangers-of-dating-a-lecturer-or-teaching-assistant',
  'what-to-do-when-you-and-your-partner-are-on-academic-probation',
  'dating-someone-who-is-smarter-or-has-higher-grades-than-you',
  'how-to-handle-group-assignments-with-an-ex-coursemate',
  'dating-in-departments-with-heavy-practical-assessments',
  'academic-sabotage-in-campus-relationships-warning-signs',
  'how-to-study-for-professional-exams-while-in-a-relationship',
  'dating-across-different-levels-100-level-fresher-and-400-level-finalist',
  // Cluster 6 (51-60)
  'anxious-avoidant-trap-in-university-relationships',
  'how-to-heal-from-campus-gaslighting-and-manipulation',
  'body-image-insecurity-and-dating-in-university',
  'dealing-with-loneliness-when-everyone-around-you-is-dating',
  'how-to-date-when-you-have-social-anxiety-in-college',
  'imposter-syndrome-in-campus-relationships',
  'trauma-bonding-in-toxic-university-relationships',
  'how-to-support-a-campus-partner-battling-depression',
  'forgiving-yourself-after-a-bad-campus-relationship',
  'building-emotional-resilience-as-a-single-student',
  // Cluster 7 (61-70)
  'drink-spiking-prevention-at-campus-parties-and-clubs',
  'how-to-conduct-a-pre-date-safety-check-on-campus',
  'campus-stalking-and-harassment-what-to-do-and-who-to-tell',
  'blackmail-and-leaked-nudes-prevention-for-students',
  'understanding-enthusiastic-consent-in-campus-dating',
  'safest-public-places-for-a-first-date-on-and-near-campus',
  'dating-safely-when-staying-in-unfenced-off-campus-lodges',
  'how-to-deal-with-a-possessive-or-controlling-campus-partner',
  'campus-date-rape-prevention-and-survivor-resources',
  'handling-unwanted-attention-from-campus-cultists-or-gangs',
  // Cluster 8 (71-80)
  'student-dating-in-lagos-unilag-lasu-and-yabatech-guide',
  'student-dating-in-ibadan-ui-lead-city-and-poly-ibadan',
  'student-dating-in-abuja-uniabuja-and-baze-university',
  'student-dating-in-benin-city-uniben-and-biu-campus-guide',
  'student-dating-in-enugu-unn-and-esut-campus-guide',
  'student-dating-in-port-harcourt-uniport-and-rsu-guide',
  'student-dating-in-kumasi-knust-campus-social-guide',
  'student-dating-in-nairobi-uon-and-strathmore-guide',
  'student-dating-in-cape-town-uct-and-cput-campus-guide',
  'student-dating-in-johannesburg-wits-and-uj-campus-guide',
  // Cluster 9 (81-90)
  'how-to-create-a-standout-dating-profile-for-college-students',
  'why-swiping-fatigue-happens-and-how-students-can-beat-it',
  'how-to-move-from-dating-app-chat-to-whatsapp-smoothly',
  'voice-note-etiquette-in-campus-dating-when-and-how-to-send',
  'dry-texters-in-university-how-to-tell-if-they-are-shy-or-disinterested',
  'first-date-questions-that-spark-deep-chemistry-not-job-interviews',
  'how-to-flirt-on-whatsapp-status-without-being-cringe',
  'using-ai-to-improve-your-student-dating-bio-ethically',
  'why-verified-student-dating-apps-are-safer-than-instagram-dms',
  'how-to-resuscitate-a-dying-conversation-with-your-campus-crush',
  // Cluster 10 (91-100)
  'dating-as-a-pre-degree-or-remedial-student',
  'dating-as-an-international-or-exchange-student-in-africa',
  'dating-as-a-student-parent-in-university',
  'dating-as-a-student-with-disabilities-on-campus',
  'dating-when-you-are-a-commuter-student-living-with-parents',
  'dating-your-secondary-school-sweetheart-in-different-universities',
  'dating-an-alumnus-who-recently-graduated',
  'dating-as-a-direct-entry-student-in-university',
  'how-to-date-when-you-are-naturally-shy-and-soft-spoken-on-campus',
  'how-to-re-enter-the-dating-scene-after-a-long-campus-dry-spell',
];

export function audit100Pages() {
  console.log('===========================================================');
  console.log(`Auditing & Validating All ${expected100Slugs.length} High-Intent Pages`);
  console.log('===========================================================\n');

  let allPassed = true;
  let totalWords = 0;

  for (let i = 0; i < expected100Slugs.length; i++) {
    const slug = expected100Slugs[i];
    const file = `public/${slug}.html`;
    const fullPath = join(root, file);

  if (!existsSync(fullPath)) {
    console.error(`✗ [${i + 1}/100] Missing file: ${file}`);
    allPassed = false;
    continue;
  }

  const content = readFileSync(fullPath, 'utf8');

  // Word count check (>1,000 words excluding script & style tags)
  const bodyWithoutScripts = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  const words = bodyWithoutScripts.trim().split(/\s+/).filter(Boolean).length;
  totalWords += words;

  if (words < 1000) {
    console.error(`✗ [${i + 1}/100] ${slug}: Word count ${words} is less than 1,000 words!`);
    allPassed = false;
  }

  // Title check (20-70 characters)
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  if (title.length < 20 || title.length > 70) {
    console.error(`✗ [${i + 1}/100] ${slug}: Title length ${title.length} is out of bounds (20-70)! "${title}"`);
    allPassed = false;
  }

  // Description check (80-180 characters, NO single quotes)
  const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = descMatch ? descMatch[1] : '';
  if (desc.length < 80 || desc.length > 180) {
    console.error(`✗ [${i + 1}/100] ${slug}: Description length ${desc.length} is out of bounds (80-180)! "${desc}"`);
    allPassed = false;
  }
  if (desc.includes("'")) {
    console.error(`✗ [${i + 1}/100] ${slug}: Description contains raw single quote! "${desc}"`);
    allPassed = false;
  }

  // H1 check (exactly 1)
  const h1Count = (content.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) {
    console.error(`✗ [${i + 1}/100] ${slug}: Has ${h1Count} <h1> tags! Must have exactly 1.`);
    allPassed = false;
  }

  // Schema check
  const schemaMatch = content.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!schemaMatch) {
    console.error(`✗ [${i + 1}/100] ${slug}: Missing JSON-LD structured data schema!`);
    allPassed = false;
  } else {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      if (!schema['@graph'] || !Array.isArray(schema['@graph'])) {
        console.error(`✗ [${i + 1}/100] ${slug}: Schema is missing @graph array!`);
        allPassed = false;
      }
    } catch (e) {
      console.error(`✗ [${i + 1}/100] ${slug}: Invalid JSON in structured data schema!`, e.message);
      allPassed = false;
    }
  }

  // Canonical tag check (must not contain .html)
  const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  if (!canonicalMatch) {
    console.error(`✗ [${i + 1}/100] ${slug}: Missing canonical link tag!`);
    allPassed = false;
  } else if (canonicalMatch[1].endsWith('.html')) {
    console.error(`✗ [${i + 1}/100] ${slug}: Canonical URL contains .html! "${canonicalMatch[1]}"`);
    allPassed = false;
  }
  }

  if (allPassed) {
    console.log(`\n ALL 100 PAGES PASSED AUDIT! Total words written: ${totalWords.toLocaleString()} (Average: ${Math.round(totalWords / expected100Slugs.length)} words/page)`);
    return true;
  } else {
    console.error('\n Some pages failed audit checks. See details above.');
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      process.exit(1);
    }
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  audit100Pages();
}
