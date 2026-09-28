import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWave1Page } from './cluster-builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));

// Topic-specific definitions for Cluster 15 (181 to 200)
// Theme: NYSC Orientation Camp, PPA & Post-Graduation Divergence
const c15Defs = [
  {
    num: 181,
    slug: 'do-nysc-orientation-camp-relationships-last',
    title: 'The "Camp Romance" Reality: Do NYSC Camp Relationships Last?',
    kicker: 'National Service Romance',
    desc: 'Do NYSC orientation camp relationships last after the 3-week camp? Discover camp romance psychology, passing out parade realities, and building real love.',
    quickTake: 'NYSC orientation camp romances rarely survive the transition to primary assignments due to the artificial high-intensity environment, military drill euphoria, and subsequent geographic dispersion. Couples who succeed transition consciously from temporary camp novelty to grounded, values-based long-term partnership.',
    colA: 'Sustainable Post-Camp Relationship',
    colB: 'Fleeting NYSC Camp Romance Traps',
    rows: [
      ['Emotional Foundation', 'Grounded in authentic values, character, and long-term vision.', 'Fueled purely by camp euphoria, white shorts nostalgia, and drill bonding.'],
      ['PPA Transition', 'Proactively planning communication routines across different towns.', 'Assuming intense 3-week camp intimacy automatically sustains distance.'],
      ['Financial Reality', 'Navigating the corper alawee budget transparently and realistically.', 'Making extravagant financial promises during orientation camp week.'],
      ['Career Alignment', 'Aligning professional goals and post-service relocation plans.', 'Discovering total career incompatibility once civilian reality resumes.'],
      ['Long-Term Longevity', 'Evolving into enduring marriage or mature adult partnership.', 'Abrupt ghosting immediately following the Passing Out Parade (POP).']
    ],
    topicDilemma: 'the 3-week orientation camp bubble, white-shorts romance, and post-camp dispersion',
    ruleList: [
      'The Camp Bubble Awareness: Recognize that high-intensity drill environments amplify superficial infatuation.',
      'The Post-Camp Reality Check: Have candid discussions about career ambitions and geographical postings.',
      'The Alawee Budget Compact: Base dating expectations on the reality of the monthly corper stipend.',
      'The Clear Intent Standard: Differentiate between a fun 3-week camp companion and a lifelong partner.',
      'The Verified Corper Network: Discover genuine, ambitious graduate peers on The College Date.'
    ]
  },
  {
    num: 182,
    slug: 'when-your-campus-partner-is-posted-to-a-different-state',
    title: 'When Your Campus Partner Gets Posted to a Different State for NYSC',
    kicker: 'NYSC Postings & Distance',
    desc: 'How to manage relationship distance when NYSC call-up letters post you and your partner to different states. Master redeployment rules and long-distance intimacy.',
    quickTake: 'When NYSC call-up letters post partners to different states, survival requires exploring legitimate redeployment options, establishing structured virtual communication rituals, and budgeting travel funds wisely. Clear long-term commitment transforms national service into an emotional bonding milestone.',
    colA: 'Proactive Service Year Adaptation',
    colB: 'High-Stress Distance Pitfalls',
    rows: [
      ['Redeployment Strategy', 'Pursuing legitimate medical or marital redeployment channels.', 'Falling victim to fraudulent redeployment agents and losing savings.'],
      ['Communication Cadence', 'Scheduled daily evening voice notes and weekend video check-ins.', 'Irregular, anxious texting resulting in constant suspicion and jealousy.'],
      ['Visitation Budgeting', 'Planning quarterly visits to major transit hubs between states.', 'Impulsive travel across insecure road corridors without proper planning.'],
      ['Local Integration', 'Serving diligently at primary assignment while staying faithful.', 'Isolating from PPA community or flirting carelessly with local residents.'],
      ['Post-Service Vision', 'Coordinating job search and shared relocation to major cities post-POP.', 'Allowing distance to trigger gradual emotional detachment and breakup.']
    ],
    topicDilemma: 'arbitrary national service postings, interstate relocation, and relationship maintenance',
    ruleList: [
      'The Legitimate Redeployment Rule: Follow official NYSC guidelines for relocation without cutting corners.',
      'The Evening Anchor Habit: Keep in touch through dedicated evening voice calls after PPA duties.',
      'The Road Safety Compact: Only embark on interstate travel during daylight via accredited transport parks.',
      'The Career Focus: Use your service year to build professional experience and portfolio assets.',
      'The Verified Connection: Use The College Date to maintain secure, private connection across states.'
    ]
  }
];

// Helper to auto-complete the rest of Cluster 15 (Topics 183 to 200)
const c15Remainder = [
  { num: 183, slug: 'dating-on-the-corper-alawee-stipend-budget', title: 'Managing the Financial Reality of the Corper "Alawee" in Dating', focus: 'living on the monthly NYSC allowance, budget dates in corper lodges, and economic realism' },
  { num: 184, slug: 'dating-as-a-youth-corper-in-a-rural-ppa', title: 'Dating as a Youth Corper in a Rural Primary Place of Assignment (PPA)', focus: 'rural PPA postings, community relationships, social isolation, and finding wholesome connection' },
  { num: 185, slug: 'when-one-partner-graduates-and-one-is-left-behind', title: 'When One Partner Graduates and the Other Still Has Extra Years', focus: 'undergraduate dating a graduate, academic stage disparities, campus nostalgia, and patient support' },
  { num: 186, slug: 'overcoming-fear-of-infidelity-during-nysc-camp', title: 'The Fear of White Shorts: Camp Cheating and Loyalty Tests', focus: 'infidelity anxiety during orientation camp, building unbreakable trust, and handling camp rumors' },
  { num: 187, slug: 'dating-a-fellow-corper-vs-dating-a-local-resident', title: 'Dating a Fellow Youth Corper vs Dating a Local in Your PPA Community', focus: 'cultural differences, corper lodge relationships, local community courting, and social dynamics' },
  { num: 188, slug: 'avoiding-post-nysc-pop-breakups-and-ghosting', title: 'Ghosting After Passing Out Parade (POP): How to Avoid the Cut', focus: 'sudden post-POP breakups, navigating real-world unemployment, and honest future conversations' },
  { num: 189, slug: 'handling-job-hunt-stress-as-a-fresh-graduate-couple', title: 'Handling Job-Hunting Stress as a Fresh Graduate in a Relationship', focus: 'entry-level job hunt rejections, cv preparation, interview stress, and mutual emotional support' },
  { num: 190, slug: 'handling-inappropriate-advances-from-ppa-employers', title: 'Surviving the PPA Principal or Employer Inappropriate Advances', focus: 'workplace harassment during NYSC, reporting protocols, protecting personal safety, and legal rights' },
  { num: 191, slug: 'redeployment-and-relocation-for-couples-during-nysc', title: 'Managing NYSC Redeployment and Relocation for Relationship Reasons', focus: 'marriage redeployment procedures, state relocations, documentation, and staying close' },
  { num: 192, slug: 'moving-to-lagos-or-abuja-as-a-young-graduate-couple', title: 'Moving to Big Cities (Lagos/Abuja) for Post-NYSC Jobs Together', focus: 'high city rent, finding shared flats, navigating transit traffic, and young professional romance' },
  { num: 193, slug: 'when-one-partner-gets-a-job-first-after-graduation', title: 'When Your Partner Gets a Job First and the Dynamic Shifts: Salary Gaps', focus: 'income disparities among fresh graduates, overcoming male ego, handling bills, and mutual pride' },
  { num: 194, slug: 'navigating-nysc-cds-day-social-circles-and-flirting', title: 'The CDS (Community Development Service) Day Flirtations on Campus', focus: 'weekly CDS meetings, social networking among corpers, setting boundaries, and professional decorum' },
  { num: 195, slug: 'transitioning-from-campus-dating-to-formal-courtship', title: 'Breaking the News to Family: Transitioning Campus Dating to Marriage', focus: 'introducing partner to parents, formal courtship discussions, traditional rites, and future planning' },
  { num: 196, slug: 'dating-an-ex-corper-while-still-in-university', title: 'Dating an Ex-Corper While You Are Still an Undergraduate Student', focus: 'bridging student and corporate worldviews, managing evening calls, and mutual patience' },
  { num: 197, slug: 'communication-rules-during-the-3-week-nysc-orientation', title: 'Long-Distance Call Habits During 3-Week NYSC Orientation Drills', focus: 'morning parade curfews, mammy market phone windows, managing exhaustion, and daily check-ins' },
  { num: 198, slug: 'dealing-with-post-graduation-loneliness-and-isolation', title: 'Managing the Post-Graduation Friendship and Romance Vacuum', focus: 'loss of campus social circles, adjusting to civilian life, overcoming isolation, and staying connected' },
  { num: 199, slug: 'budgeting-for-first-apartment-and-romance-post-nysc', title: 'Balancing NYSC Savings, Rent in a New City, and Romance Budgeting', focus: 'first apartment costs, agency and caution fees, furniture budgeting, and realistic date nights' },
  { num: 200, slug: 'how-to-know-if-your-campus-relationship-survived-nysc', title: 'The 1-Year Post-NYSC Rule: How to Know If You Should Stay Together', focus: 'evaluating relationship endurance post-service, shared values audit, and committing to the future' }
];

const allC15Pages = [];

// 1. Process explicit c15Defs
for (const m of c15Defs) {
  const t = topics.find((x) => x.num === m.num);
  allC15Pages.push(
    createWave1Page({
      num: m.num,
      slug: t.slug,
      title: t.title,
      description: m.desc,
      kicker: m.kicker,
      h1: t.title,
      lede: `Navigating ${m.topicDilemma} demands practical adaptability, emotional maturity, and mutual commitment. Here is the definitive guide to building a lasting partnership during national service.`,
      quickTake: m.quickTake,
      section1Heading: `The ${m.kicker} Paradigm: Transitioning Beyond Campus Walls`,
      section1Content: `
        <p>The National Youth Service Corps (NYSC) year represents the ultimate test of relationship endurance for Nigerian graduates. From the regimented drills of the 3-week orientation camp to disparate state postings, young adults transition overnight from university comfort into the realities of national service.</p>
        <p>Couples who survive this high-stakes transition recognize that national service is not an obstacle, but an essential crucible that refines character, proves emotional loyalty, and prepares partners for adulthood.</p>
      `,
      section2Heading: 'Daily Friction Points and Post-Graduation Environmental Stresses',
      section2Content: `
        <p>Modest monthly allowances (alawee), rural primary assignment locations, and job market anxieties can create acute stress if couples do not communicate openly.</p>
        <p>Resilient couples establish transparent financial expectations, support each other through entry-level job applications, and coordinate long-term city relocation plans post-POP.</p>
      `,
      tableHeading: `Comparative Analysis: Sustainable Graduate Partnership vs Common Service Traps`,
      tableIntro: 'Examine the operational contrasts between mature, values-based graduate dating and common post-graduation relationship mistakes:',
      col1Header: m.colA,
      col2Header: m.colB,
      tableRows: m.rows,
      section4Heading: 'Overcoming Unemployment Stress, Career Anxiety, and Future Uncertainty',
      section4Content: `
        <p>The post-service job hunt is notoriously demanding. Supporting your partner through corporate interview rejections and economic uncertainty is a foundational test of true love.</p>
        <p>By celebrating small professional milestones and maintaining steadfast belief in each other’s potential, young graduate couples lay the groundwork for enduring prosperity and marital happiness.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for NYSC and Graduate Romance',
      section5Content: `
        <p>Follow these five strategic rules to maintain a thriving relationship during national service and beyond:</p>
        <ol>
${m.ruleList.map((rule) => `          <li><strong>${rule.split(':')[0]}:</strong> ${rule.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: [
        {
          question: `Do relationships formed during the 3-week NYSC orientation camp actually last?`,
          answer: 'While most camp romances fade after physical separation, relationships grounded in shared values, character, and aligned career goals can successfully evolve into lasting adult marriages with intentional effort and clear post-service plans.'
        },
        {
          question: 'How can young couples survive dating on the modest NYSC corper allowance?',
          answer: 'Transparency is vital. Plan low-cost dates like cooking together at the corper lodge, exploring local community markets, and taking nature walks. Mutual financial honesty eliminates the pressure to perform fake luxury.'
        },
        {
          question: 'What should you do if your partner gets a well-paying job while you are still searching?',
          answer: 'Celebrate their victory with genuine joy. A healthy partnership views one partners success as a win for the team. Keep actively applying, upskilling, and trusting that your own professional breakthrough will follow.'
        },
        {
          question: 'Why is The College Date valuable for graduates and national service corps members?',
          answer: 'The College Date provides verified student and graduate networks, allowing corpers and fresh alumni across all 36 states and the FCT to connect safely with ambitious, educated peers.'
        }
      ],
      relatedGuides: [
        { href: '/do-nysc-orientation-camp-relationships-last', label: 'Do NYSC Camp Romances Last?' },
        { href: '/when-your-campus-partner-is-posted-to-a-different-state', label: 'NYSC Postings in Different States' },
        { href: '/dating-on-the-corper-alawee-stipend-budget', label: 'Dating on the Corper Alawee' },
        { href: '/campus-dating-safety', label: 'Campus Dating Safety Standards' },
      ],
    })
  );
}

// 2. Process c15Remainder (183 to 200)
for (const r of c15Remainder) {
  const t = topics.find((x) => x.num === r.num);
  allC15Pages.push(
    createWave1Page({
      num: r.num,
      slug: t.slug,
      title: r.title,
      description: `Complete guide to ${r.focus} during the NYSC service year and post-graduation transitions. Discover financial tips, career support, and relationship advice.`,
      kicker: 'Graduate Life & NYSC Realities',
      h1: r.title,
      lede: `Navigating ${r.focus} requires practical tact, mature boundaries, and clear communication. Here is the definitive graduate guide to thriving in your career and relationship.`,
      quickTake: `Navigating ${r.focus} demands transparent communication, financial realism, and mutual career support. Prioritizing character, long-term vision, and scheduled check-ins keeps love strong through post-graduation transitions.`,
      section1Heading: `Understanding the Lived Reality of ${r.title.split(':')[0]}`,
      section1Content: `
        <p>Graduation and national service mark a dramatic turning point in student romance. The familiar structures of lecture halls, continuous assessments, and campus hostels give way to corporate shifts, PPA assignments, and financial independence.</p>
        <p>When partners navigate these changes with patience and mutual respect, their relationship evolves into a mature, resilient adult partnership capable of weathering any challenge.</p>
      `,
      section2Heading: 'Daily Friction Points and Post-Graduation Realities',
      section2Content: `
        <p>Entry-level salary limitations, long commutes in major commercial cities, and unequal job hunting progress can test emotional equilibrium if not managed with care.</p>
        <p>Couples who succeed replace comparison with collaboration. They pool resources wisely, encourage each other through professional setbacks, and build shared dreams for the future.</p>
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs High-Risk Errors`,
      tableIntro: 'Examine the operational contrasts between considerate, mature graduate behavior and common post-service relationship pitfalls:',
      col1Header: 'Mature Graduate Best Practices',
      col2Header: 'High-Risk Relationship Mistakes',
      tableRows: [
        ['Financial Expectations', 'Living within actual monthly stipend and entry-level wages.', 'Accumulating debt to fund performative dates in expensive city clubs.'],
        ['Career Support', 'Reviewing CVs, sharing job leads, and celebrating interviews.', 'Fostering bitter resentment when one partner secures employment first.'],
        ['Long-Distance Travel', 'Daylight travel using registered interstate transit companies.', 'Embarking on dangerous nighttime journeys along insecure highway corridors.'],
        ['Family Transparency', 'Communicating future intentions with parents with calm maturity.', 'Concealing relationship or bowing to petty parental tribal objections.'],
        ['Vision Alignment', 'Agreeing on target cities, career goals, and marriage timelines.', 'Drifting indefinitely without clear shared milestones or commitments.']
      ],
      section4Heading: 'Building Financial Autonomy and Lifelong Security Together',
      section4Content: `
        <p>The first years after university lay the financial and emotional foundation for your entire adult life. Making prudent lifestyle choices early protects your peace of mind and strengthens your relationship.</p>
        <p>By living within your means, investing in high-value skills, and supporting your partner’s career ambitions, you transform young love into an unstoppable life partnership.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Graduate Relationship Success',
      section5Content: `
        <p>Follow these five strategic rules to maintain a thriving, peaceful partnership after graduation:</p>
        <ol>
          <li><strong>The Financial Honesty Rule:</strong> Never conceal economic limitations; build transparent budgets together.</li>
          <li><strong>The Career Cheerleader Compact:</strong> Celebrate your partner’s job offers and promotions with unreserved joy.</li>
          <li><strong>The Post-Service Timeline:</strong> Agree on shared geographic targets and living plans after passing out.</li>
          <li><strong>The Family Diplomacy Standard:</strong> Handle family introductions and expectations with dignified poise.</li>
          <li><strong>The Verified Network Advantage:</strong> Use The College Date to discover like-minded graduate achievers.</li>
        </ol>
      `,
      faqs: [
        {
          question: `Do relationships formed during the 3-week NYSC orientation camp actually last?`,
          answer: 'While most camp romances fade after physical separation, relationships grounded in shared values, character, and aligned career goals can successfully evolve into lasting adult marriages with intentional effort and clear post-service plans.'
        },
        {
          question: 'How can young couples survive dating on the modest NYSC corper allowance?',
          answer: 'Transparency is vital. Plan low-cost dates like cooking together at the corper lodge, exploring local community markets, and taking nature walks. Mutual financial honesty eliminates the pressure to perform fake luxury.'
        },
        {
          question: 'What should you do if your partner gets a well-paying job while you are still searching?',
          answer: 'Celebrate their victory with genuine joy. A healthy partnership views one partners success as a win for the team. Keep actively applying, upskilling, and trusting that your own professional breakthrough will follow.'
        },
        {
          question: 'Why is The College Date valuable for graduates and national service corps members?',
          answer: 'The College Date provides verified student and graduate networks, allowing corpers and fresh alumni across all 36 states and the FCT to connect safely with ambitious, educated peers.'
        }
      ],
      relatedGuides: [
        { href: '/do-nysc-orientation-camp-relationships-last', label: 'Do NYSC Camp Romances Last?' },
        { href: '/when-your-campus-partner-is-posted-to-a-different-state', label: 'NYSC Postings in Different States' },
        { href: '/dating-on-the-corper-alawee-stipend-budget', label: 'Dating on the Corper Alawee' },
        { href: '/campus-dating-safety', label: 'Campus Dating Safety Standards' },
      ],
    })
  );
}

// Write Cluster 15 module
const c15Output = `// Auto-generated Cluster 15: NYSC Orientation Camp, PPA & Post-Graduation Divergence (Topics 181 to 200)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster15Pages = ${JSON.stringify(allC15Pages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster15.mjs'), c15Output, 'utf8');
console.log(`✓ Successfully compiled scripts/seo-expansion-wave1/cluster15.mjs (${allC15Pages.length} topics)`);
