import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWave1Page } from './cluster-builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));

// Topic-specific definitions for Cluster 14 (161 to 180)
// Theme: University Strikes (ASUU/NASU) Relocations & Long Shutdowns
const c14Defs = [
  {
    num: 161,
    slug: 'how-to-keep-relationship-alive-during-asuu-strikes',
    title: 'How to Keep Your Relationship Alive During ASUU Academic Strikes',
    kicker: 'Campus Strike Realities',
    desc: 'Complete survival guide for dating during indefinite ASUU strikes. Learn communication routines, virtual date ideas, managing distance, and keeping love alive.',
    quickTake: 'Keeping a campus relationship alive during indefinite ASUU academic strikes requires establishing scheduled communication rituals, pursuing productive personal skill bootcamps, and providing mutual emotional encouragement against strike fatigue. Proactive teamwork transforms uncertain shutdowns into character-building seasons.',
    colA: 'Resilient Strike Dating Strategy',
    colB: 'Common Strike Breakup Traps',
    rows: [
      ['Communication Cadence', 'Scheduled daily evening voice notes and weekend video dates.', 'Sporadic, unpredictable texting leading to paranoia and suspicion.'],
      ['Time Utilization', 'Enrolling in tech bootcamps, internships, or side-hustles together.', 'Wallowing in chronic boredom and blaming partner for lack of excitement.'],
      ['Financial Management', 'Budgeting responsibly for data bundles and occasional visitation.', 'Demanding expensive interstate trips that strain family finances.'],
      ['Emotional Support', 'Validating academic frustration and encouraging future focus.', 'Projecting strike anxiety and career hopelessness onto the relationship.'],
      ['Post-Strike Readiness', 'Anticipating sudden resumption with synchronized reading plans.', 'Drifting completely apart and suffering awkward post-resumption estrangement.']
    ],
    topicDilemma: 'indefinite academic shutdowns, sudden relocation home, and prolonged geographical separation',
    ruleList: [
      'The Daily Anchor Rule: Establish a consistent 20-minute evening check-in time after family dinner.',
      'The Productivity Pact: Challenge each other to learn valuable digital skills during the shutdown.',
      'The Compassionate Ear: Listen patiently to your partner venting about delayed graduation.',
      'The Transparent Routine: Share daily schedules openly to maintain security and eliminate jealousy.',
      'The Long-Distance Lifeline: Connect on The College Date to discover rich interactive couple features.'
    ]
  },
  {
    num: 162,
    slug: 'relocating-to-strict-parents-during-university-strikes',
    title: 'Relocating to Strict Parents During Strikes: Dating Boundary Rules',
    kicker: 'Family & Long Distance',
    desc: 'How to date when forced back home to strict parents during campus strikes. Master covert communication, parental surveillance, and preserving romance.',
    quickTake: 'Relocating to strict family homes during academic strikes requires respecting household curfews, timing private phone calls during chores or evening walks, and avoiding confrontational parental battles over phone use. Diplomatic discretion preserves family peace while protecting romantic intimacy.',
    colA: 'Diplomatic Discretion Strategy',
    colB: 'High-Friction Family Clashes',
    rows: [
      ['Call Scheduling', 'Timing calls during afternoon errands or private evening walks.', 'Taking loud romantic calls in family living rooms, triggering conflict.'],
      ['Parental Respect', 'Fulfilling household chores diligently before seeking private phone time.', 'Neglecting family duties, causing parents to confiscate devices.'],
      ['Partner Empathy', 'Partner patiently understands home restrictions and curfews.', 'Partner demanding instant video calls while family members are present.'],
      ['Emotional Composure', 'Maintaining calm maturity and reassuring partner of your love.', 'Accusing parents of tyranny and venting bitter anger at partner.'],
      ['Digital Security', 'Locking phones with passcodes to protect personal romantic privacy.', 'Leaving intimate text previews open to nosy siblings and parents.']
    ],
    topicDilemma: 'parental surveillance, loss of campus freedom, and managing long-distance dating at home',
    ruleList: [
      'The Family-First Chores Rule: Complete household duties early so your free time is earned and peaceful.',
      'The Stroll & Call Habit: Take quiet evening neighborhood walks to enjoy relaxed phone calls.',
      'The Code Word Compact: Agree on simple text signals when parents enter the room unexpectedly.',
      'The Patience Principle: Reassure your partner that family restrictions are temporary adaptations.',
      'The Secure Vault: Protect your romantic chats and privacy with The College Date secure messaging.'
    ]
  }
];

// Helper to auto-complete the rest of Cluster 14 (Topics 163 to 180)
const c14Remainder = [
  { num: 163, slug: 'when-partner-starts-working-during-campus-strike', title: 'When One Partner Starts Working During Campus Strikes: Managing Changes', focus: 'lifestyle divergence when one partner works, income disparities, and adapting to corporate schedules' },
  { num: 164, slug: 'financial-strain-on-student-couples-during-academic-strikes', title: 'Financial Strain on Student Couples Caused by Extended School Halts', focus: 'lost student allowances, data bundle costs, inflation during strikes, and mutual financial empathy' },
  { num: 165, slug: 'virtual-date-ideas-for-campus-couples-during-strikes', title: 'Virtual Date Ideas for Campus Couples Separated by School Shutdowns', focus: 'creative long-distance dates, watch parties, online game nights, and shared virtual cooking' },
  { num: 166, slug: 'managing-jealousy-during-strike-relocations', title: 'Managing Jealousy When Your Partner Is in a Different City on Break', focus: 'hometown exes, social media anxiety, building authentic trust across state lines, and transparency' },
  { num: 167, slug: 'why-campus-couples-break-up-during-academic-strikes', title: 'The "Strike Breakup" Phenomenon: Why So Many Campus Couples Split', focus: 'prolonged separation, drifting apart, loss of campus proximity, and how to prevent strike splits' },
  { num: 168, slug: 'travel-safety-rules-visiting-partner-during-strikes', title: 'Traveling Across State Lines to Visit Your Campus Partner During Strikes', focus: 'interstate road travel safety, budgeting transport fares, verified boarding parks, and emergency check-ins' },
  { num: 169, slug: 'when-your-partner-wants-to-drop-out-during-strikes', title: 'What to Do When Your Partner Considers Dropping Out During Strikes', focus: 'strike depression, academic despair, providing grounded counsel, and exploring dual pathways' },
  { num: 170, slug: 'reconnecting-emotionally-after-classes-resume-post-strike', title: 'Resuming Classes After a 6-Month Strike: Reconnecting Emotionally', focus: 'post-strike awkwardness, re-acclimating to campus life, syllabus crunch, and rekindling intimacy' },
  { num: 171, slug: 'resisting-hometown-temptations-during-campus-strikes', title: 'Staying Loyal When Old High School Exes Reappear Back Home', focus: 'hometown nostalgia, old secondary school crushes, setting firm boundaries, and relationship fidelity' },
  { num: 172, slug: 'balancing-tech-bootcamps-and-relationship-during-strikes', title: 'Balancing Skill Acquisition Bootcamps and Relationship Time on Strike', focus: 'coding bootcamps, UI/UX courses, intense learning schedules, and carving out romantic quality time' },
  { num: 173, slug: 'coping-with-strike-induced-mental-fatigue-together', title: 'Coping with Strike-Induced Mental Fatigue in Your Relationship', focus: 'academic uncertainty depression, collective emotional exhaustion, and mindfulness routines for couples' },
  { num: 174, slug: 'dating-between-federal-and-private-university-students-strikes', title: 'When One Goes to a Private University That Never Strikes: Bridging Gaps', focus: 'differing academic timelines, private school continuity versus federal halts, and avoiding resentment' },
  { num: 175, slug: 'avoiding-video-call-burnout-during-long-distance-strikes', title: 'The Shared Netflix and WhatsApp Call Routine: Avoiding Monotony', focus: 'screen fatigue, phone call boredom, refreshing long-distance routines, and asynchronous love' },
  { num: 176, slug: 'budgeting-for-visitation-travel-during-university-strikes', title: 'Setting Financial Expectations for Strike Visits: Fare Sharing Rules', focus: 'interstate bus ticket costs, equitable expense splitting, and avoiding financial resentment' },
  { num: 177, slug: 'visiting-partners-hometown-without-family-gossip', title: 'How to Prevent Gossip When You Hang Out in Your Partner’s Hometown', focus: 'hometown etiquette, meeting parents with dignity, avoiding neighborhood rumors, and respectful presence' },
  { num: 178, slug: 'maintaining-intimacy-safely-during-strike-distance', title: 'Keeping the Physical Spark Alive Across Months of Distance', focus: 'emotional intimacy, verbal affection, thoughtful letters, and protecting digital privacy across distance' },
  { num: 179, slug: 'planning-your-campus-reunion-after-strike-resumption', title: 'Making Joint Plans for When Resumption Is Finally Announced', focus: 'coordinating return travel, packing out lodges, syllabus preparation, and celebrating campus reunion' },
  { num: 180, slug: 'managing-graduation-delays-and-dating-age-anxiety', title: 'When You Graduate Late Because of Strikes: Managing Age Anxiety', focus: 'overcoming age pressure, delayed convocation dates, career timelines, and grounded self-worth' }
];

const allC14Pages = [];

// 1. Process explicit c14Defs
for (const m of c14Defs) {
  const t = topics.find((x) => x.num === m.num);
  allC14Pages.push(
    createWave1Page({
      num: m.num,
      slug: t.slug,
      title: t.title,
      description: m.desc,
      kicker: m.kicker,
      h1: t.title,
      lede: `Navigating ${m.topicDilemma} demands practical adaptability, emotional maturity, and mutual commitment. Here is the definitive guide to keeping love alive through extended school shutdowns.`,
      quickTake: m.quickTake,
      section1Heading: `The ${m.kicker} Paradigm: Prolonged Distance and Campus Shutdowns`,
      section1Content: `
        <p>In public tertiary institutions across Nigeria—including federal and state universities under ASUU, NASU, and SSANU—indefinite strikes represent sudden, unpredictable interruptions. Academic calendars grind to a halt, dormitories are evacuated within 48 hours, and student couples who lived in daily proximity are scattered across different states.</p>
        <p>The sudden shift from daily lodge visits and library study dates to months of inter-state separation places severe strain on romantic bonds. Couples who lack structured communication habits often drift into silence, misunderstanding, and painful breakups.</p>
      `,
      section2Heading: 'Daily Friction Points and Long-Distance Environmental Stresses',
      section2Content: `
        <p>Navigating long-distance relationship dynamics while living under parental rules introduces friction: expensive data subscriptions, poor mobile network coverage, and differing daily schedules.</p>
        <p>Resilient couples survive strikes by replacing spontaneous physical presence with disciplined communication anchors. They transform months of academic waiting into periods of personal skill building and shared future planning.</p>
      `,
      tableHeading: `Comparative Analysis: Resilient Strike Strategy vs Common Pitfalls`,
      tableIntro: 'Examine the operational contrasts between proactive, resilient couple habits and common strike-induced relationship mistakes:',
      col1Header: m.colA,
      col2Header: m.colB,
      tableRows: m.rows,
      section4Heading: 'Overcoming Strike Fatigue, Mental Anxiety, and Career Uncertainty',
      section4Content: `
        <p>Extended strikes trigger profound emotional fatigue as students watch private university peers graduate and corporate job timelines advance. Supporting your partner during moments of despair is a vital test of romantic maturity.</p>
        <p>Encouraging each other to acquire valuable professional certifications, launch online enterprises, and maintain academic discipline ensures you return to campus stronger and more united.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Strike Survival',
      section5Content: `
        <p>Follow these five strategic rules to maintain unbreakable connection during indefinite university shutdowns:</p>
        <ol>
${m.ruleList.map((rule) => `          <li><strong>${rule.split(':')[0]}:</strong> ${rule.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: [
        {
          question: `Why do so many campus relationships break up during ASUU strikes?`,
          answer: 'Strike breakups occur because couples accustomed to constant campus proximity struggle with the sudden shift to long-distance communication. Without shared lectures and daily routines, unresolved insecurities, lack of scheduled check-ins, and hometown distractions cause relationships to drift apart.'
        },
        {
          question: 'How often should student couples talk during extended strikes?',
          answer: 'Quality always trumps quantity. Rather than demanding non-stop WhatsApp texting throughout the day, agree on a dedicated 20-to-30-minute evening phone or video call. Scheduled, focused conversations prevent communication fatigue and respect family routines.'
        },
        {
          question: 'Is it safe to travel across state lines to visit a partner during strikes?',
          answer: 'Interstate travel requires strict safety precautions. Only travel during daylight hours using registered, well-known motor transport companies. Never travel without informing family or trusted roommates of your complete itinerary and estimated arrival time.'
        },
        {
          question: 'How can The College Date help couples stay connected across distances?',
          answer: 'The College Date provides verified student profiles, rich conversational prompt tools, and private in-app status sharing that help partners maintain engaging, safe communication regardless of geographic location.'
        }
      ],
      relatedGuides: [
        { href: '/how-to-keep-relationship-alive-during-asuu-strikes', label: 'Surviving ASUU Strikes in Love' },
        { href: '/relocating-to-strict-parents-during-university-strikes', label: 'Relocating to Strict Parents' },
        { href: '/virtual-date-ideas-for-campus-couples-during-strikes', label: 'Virtual Date Ideas on Strike' },
        { href: '/campus-dating-safety', label: 'Campus Safety Standards' },
      ],
    })
  );
}

// 2. Process c14Remainder (163 to 180)
for (const r of c14Remainder) {
  const t = topics.find((x) => x.num === r.num);
  allC14Pages.push(
    createWave1Page({
      num: r.num,
      slug: t.slug,
      title: r.title,
      description: `Complete guide to ${r.focus} during university shutdowns and ASUU strikes. Discover long-distance survival tips, communication frameworks, and emotional resilience.`,
      kicker: 'Campus Strike Survival',
      h1: r.title,
      lede: `Navigating ${r.focus} requires practical tact, mature boundaries, and clear communication. Here is the definitive student guide to keeping love alive through long academic strikes.`,
      quickTake: `Navigating ${r.focus} demands transparent communication, respect for differing home schedules, and proactive emotional support. Prioritizing patience, personal productivity, and scheduled check-ins keeps love strong across distance.`,
      section1Heading: `Understanding the Lived Reality of ${r.title.split(':')[0]}`,
      section1Content: `
        <p>Indefinite university strikes force student couples into sudden long-distance relationships. Coping with the disruption requires recognizing that physical separation does not mean emotional neglect.</p>
        <p>When partners establish consistent communication rhythms, support each other through academic frustration, and pursue constructive personal goals, their partnership emerges from the strike more resilient than ever.</p>
      `,
      section2Heading: 'Daily Friction Points and Long-Distance Realities',
      section2Content: `
        <p>Network challenges, data costs, and differing daily routines at home can trigger unnecessary anxiety if couples rely on sporadic, unpredictable texting.</p>
        <p>Couples who succeed replace chaotic digital habits with predictable check-in rituals. Open vulnerability and mutual patience bridge geographic miles and sustain romantic intimacy.</p>
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs High-Risk Errors`,
      tableIntro: 'Examine the operational contrasts between considerate, resilient student behavior and common strike-induced relationship mistakes:',
      col1Header: 'Resilient Strike Practices',
      col2Header: 'High-Risk Relationship Mistakes',
      tableRows: [
        ['Communication Habits', 'Scheduled daily evening check-ins and open schedule sharing.', 'Sporadic, silent days followed by accusations and passive-aggression.'],
        ['Personal Productivity', 'Learning high-income digital skills and pursuing internships.', 'Idling away months in boredom and resenting partner for working.'],
        ['Interstate Travel', 'Daylight journeys using registered transport with safety check-ins.', 'Hailing unverified roadside vehicles after dark to make surprise visits.'],
        ['Emotional Support', 'Encouraging partner through delayed convocation anxiety.', 'Projecting strike depression and hopelessness onto relationship.'],
        ['Reunion Planning', 'Coordinating return to campus and syncing revision plans.', 'Allowing emotional drift to cause estrangement upon resumption.']
      ],
      section4Heading: 'Overcoming Career Frustration and Delayed Graduation Stress',
      section4Content: `
        <p>Watching months slip by during prolonged academic halts tests emotional endurance. Maintaining personal self-worth outside university calendar timelines protects mental health.</p>
        <p>By treating the strike as a strategic window for self-improvement and mutual growth, couples build an enduring foundation for their post-graduation future.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Long-Distance Strike Romance',
      section5Content: `
        <p>Follow these five strategic rules to maintain a thriving relationship during prolonged school shutdowns:</p>
        <ol>
          <li><strong>The Evening Anchor Call:</strong> Schedule a focused 20-minute voice call every evening to review the day.</li>
          <li><strong>The Personal Development Pact:</strong> Dedicate daylight hours to skill acquisition, work, or online learning.</li>
          <li><strong>The Financial Prudence Rule:</strong> Never pressure your partner for interstate travel that strains tight student budgets.</li>
          <li><strong>The Transparent Routine:</strong> Keep your partner informed of your daily activities to cultivate effortless trust.</li>
          <li><strong>The Verified Connection Standard:</strong> Use The College Date to discover like-minded students committed to intentional romance.</li>
        </ol>
      `,
      faqs: [
        {
          question: `Why do so many campus relationships break up during ASUU strikes?`,
          answer: 'Strike breakups occur because couples accustomed to constant campus proximity struggle with the sudden shift to long-distance communication. Without shared lectures and daily routines, unresolved insecurities, lack of scheduled check-ins, and hometown distractions cause relationships to drift apart.'
        },
        {
          question: 'How often should student couples talk during extended strikes?',
          answer: 'Quality always trumps quantity. Rather than demanding non-stop WhatsApp texting throughout the day, agree on a dedicated 20-to-30-minute evening phone or video call. Scheduled, focused conversations prevent communication fatigue and respect family routines.'
        },
        {
          question: 'Is it safe to travel across state lines to visit a partner during strikes?',
          answer: 'Interstate travel requires strict safety precautions. Only travel during daylight hours using registered, well-known motor transport companies. Never travel without informing family or trusted roommates of your complete itinerary and estimated arrival time.'
        },
        {
          question: 'How can The College Date help couples stay connected across distances?',
          answer: 'The College Date provides verified student profiles, rich conversational prompt tools, and private in-app status sharing that help partners maintain engaging, safe communication regardless of geographic location.'
        }
      ],
      relatedGuides: [
        { href: '/how-to-keep-relationship-alive-during-asuu-strikes', label: 'Surviving ASUU Strikes in Love' },
        { href: '/relocating-to-strict-parents-during-university-strikes', label: 'Relocating to Strict Parents' },
        { href: '/virtual-date-ideas-for-campus-couples-during-strikes', label: 'Virtual Date Ideas on Strike' },
        { href: '/campus-dating-safety', label: 'Campus Dating Safety Standards' },
      ],
    })
  );
}

// Write Cluster 14 module
const c14Output = `// Auto-generated Cluster 14: University Strikes (ASUU/NASU) Relocations & Long Shutdowns (Topics 161 to 180)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster14Pages = ${JSON.stringify(allC14Pages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster14.mjs'), c14Output, 'utf8');
console.log(`✓ Successfully compiled scripts/seo-expansion-wave1/cluster14.mjs (${allC14Pages.length} topics)`);
