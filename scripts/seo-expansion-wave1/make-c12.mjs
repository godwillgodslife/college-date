import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWave1Page } from './cluster-builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));

// Topic-specific definitions for Cluster 12 (121 to 140)
// Theme: Inter-Faculty Dynamics & Departmental Matchups
const c12Defs = [
  {
    num: 121,
    slug: 'dating-an-engineering-student-handling-busy-schedules',
    title: 'Dating an Engineering Student: Handling Heavy Workshop Schedules',
    kicker: 'Engineering Dating Realities',
    desc: 'How to date an engineering student in university. Learn how to navigate demanding workshop practicals, drawing boards, math sets, and busy lecture schedules.',
    quickTake: 'Dating an engineering student requires understanding that demanding workshop hours, technical drawing deadlines, and continuous assessment sprints leave limited daytime leisure. Supportive partners establish synchronized evening study routines and celebrate practical milestones.',
    colA: 'Supportive Engineering Partner',
    colB: 'Frustrated Relationship Mistakes',
    rows: [
      ['Workshop Respect', 'Acknowledges exhausting physical lab and foundry sessions.', 'Demanding constant WhatsApp texting while partner operates machine tools.'],
      ['Study Scheduling', 'Syncing evening library revision hours around calculus assignments.', 'Complaining that partner loves engineering textbooks more than romance.'],
      ['Project Deadlines', 'Offering quiet encouragement during final-year design project builds.', 'Guilt-tripping partner for spending late nights in fabrication studios.'],
      ['Communication Cadence', 'Appreciating short, meaningful check-ins between heavy practicals.', 'Starting relationship arguments over delayed replies during 5-hour labs.'],
      ['Academic Partnership', 'Building shared academic discipline that raises mutual CGPAs.', 'Derailing study schedules and triggering carryovers in technical math.']
    ],
    topicDilemma: 'heavy engineering workshop practicals, exhausting timetables, and dating balance',
    ruleList: [
      'The Workshop Blackout Rule: Respect that heavy machinery and lab safety require total phone-free focus.',
      'The Drawing Board Sanctuary: Allow uninterrupted concentration during technical drawing deadlines.',
      'The Co-Working Routine: Transform library study sessions into quiet, productive dates.',
      'The Practical Encouragement: Celebrate completed lab manuals and design prototypes together.',
      'The Verified Match Advantage: Connect on The College Date with ambitious peers across all faculties.'
    ]
  },
  {
    num: 122,
    slug: 'dating-medical-nursing-student-clinical-rotations',
    title: 'Dating a Medical or Nursing Student: Surviving Clinical Rotations',
    kicker: 'Healthcare Romance Dynamics',
    desc: 'Complete guide to dating medical and nursing students during hospital clinicals. Master shift work schedules, emotional fatigue, and relationship resilience.',
    quickTake: 'Dating a medical or nursing student demands extraordinary patience with irregular hospital ward shifts, clinical rotation exams, and emotional fatigue from patient care. Providing a calm emotional sanctuary and respecting night-shift recovery preserves deep intimacy.',
    colA: 'Empathetic Healthcare Partner',
    colB: 'High-Friction Relationship Traps',
    rows: [
      ['Clinical Shift Awareness', 'Understands 24-hour call duty and exhausting hospital ward rounds.', 'Accusing partner of emotional neglect when exhausted after ward duty.'],
      ['Emotional Sanctuary', 'Provides a listening ear when partner encounters distressing patient cases.', 'Demanding high-energy entertainment when partner needs mental rest.'],
      ['Exam Preparation', 'Respects rigorous professional MBBS and nursing council board exams.', 'Pressuring partner to attend parties on the eve of clinical vivas.'],
      ['Communication Flexibility', 'Embraces asynchronous voice notes during long emergency room shifts.', 'Insisting on rigid phone call times during unpredictable hospital hours.'],
      ['Long-Term Perspective', 'Recognizes healthcare training as an investment in a noble profession.', 'Resenting the multi-year sacrifice required for medical qualification.']
    ],
    topicDilemma: 'unpredictable clinical rotations, emotional healthcare exhaustion, and romance',
    ruleList: [
      'The Post-Call Sleep Rule: Ensure your partner gets undisturbed rest after 24-hour hospital calls.',
      'The Gentle Ear Policy: Create a judgment-free space to decompress from hospital ward stress.',
      'The Board Exam Protocol: Shift relationship demands into low gear during professional council diets.',
      'The Healthy Meal Gesture: Surprise your busy partner with nutritious meals during clinical rotations.',
      'The Professional Network: Discover dedicated healthcare and student peers on The College Date.'
    ]
  },
  {
    num: 123,
    slug: 'dating-between-law-students-and-creative-arts-majors',
    title: 'Dating Between Law Students and Creative Arts Majors: Opposites Attract',
    kicker: 'Inter-Faculty Chemistry',
    desc: 'Explore the fascinating relationship dynamic between structured law students and expressive creative arts majors. Discover communication harmony and mutual growth.',
    quickTake: 'Romance between law and creative arts students thrives when analytical discipline balances spontaneous creative expression. Respecting the law students heavy legal case reading while appreciating the arts majors rehearsals fosters rich intellectual and emotional harmony.',
    colA: 'Harmonious Cross-Faculty Pair',
    colB: 'Faculty Stereotyping Clashes',
    rows: [
      ['Intellectual Balance', 'Appreciates analytical legal reasoning and vibrant creative expression.', 'Dismissing theatre as unserious or mocking law as rigid and boring.'],
      ['Timetable Harmony', 'Balancing moot court trials with theatre rehearsals and art exhibits.', 'Resenting the unconventional rehearsal hours of creative projects.'],
      ['Debating Style', 'Discussing ideas with warm playfulness rather than courtroom litigation.', 'Treating private relationship arguments like cross-examinations in court.'],
      ['Event Attendance', 'Attending law dinners and art gallery showcases with mutual pride.', 'Refusing to enter partners faculty space out of pretension or shame.'],
      ['Growth Trajectory', 'Broadening worldview through exposure to completely different disciplines.', 'Retreating into faculty echo chambers and intellectual arrogance.']
    ],
    topicDilemma: 'balancing analytical legal rigor with expressive artistic lifestyles on campus',
    ruleList: [
      'The Courtroom Ban: Never cross-examine your romantic partner during private disagreements.',
      'The Rehearsal Respect: Understand that artistic performances require intensive physical practice.',
      'The Mutual Showcase Rule: Proudly attend each others departmental exhibitions and law banquets.',
      'The Synthesis Advantage: Combine structured strategic thinking with creative problem-solving.',
      'The Broad Network: Discover diverse students across all academic disciplines on The College Date.'
    ]
  },
  {
    num: 124,
    slug: 'should-you-date-a-coursemate-in-the-same-department',
    title: 'Should You Date a Coursemate in the Same Department? Pros and Cons',
    kicker: 'Intra-Departmental Dating',
    desc: 'Is dating a coursemate in your department a good idea? Discover academic collaboration benefits, class gossip risks, breakup fallout, and survival ground rules.',
    quickTake: 'Dating a departmental coursemate offers unmatched academic collaboration, shared lecture notes, and synchronized schedules, but carries severe risks of class gossip, academic jealousy, and inescapable post-breakup contact. Establishing strict professional boundaries in class protects personal dignity.',
    colA: 'Discreet Coursemate Romance',
    colB: 'High-Drama Departmental Flops',
    rows: [
      ['Lecture Hall Decorum', 'Sitting respectfully as dedicated scholars; keeping romance private.', 'Holding hands and whispering in front row during core lectures.'],
      ['Grade Transparency', 'Celebrating each others test scores without toxic academic rivalry.', 'Secretly resenting partner when they achieve higher Continuous Assessment marks.'],
      ['Group Project Etiquette', 'Collaborating professionally without excluding other team members.', 'Refusing to work with others or turning group meetings into flirting sessions.'],
      ['Breakup Preparedness', 'Maintaining mature, civil professional interactions if romance ends.', 'Creating public lecture hall scenes and fracturing departmental friendship groups.'],
      ['Gossip Protection', 'Keeping relationship status low-key and off class WhatsApp forums.', 'Broadcasting romantic disputes on departmental announcement channels.']
    ],
    topicDilemma: 'shared daily lectures, peer scrutiny, academic collaboration, and breakup fallout',
    ruleList: [
      'The Professional Class Rule: Treat lecture halls and labs as professional study spaces.',
      'The No-Rivalry Pact: Genuinely celebrate each others academic honors without envy.',
      'The Group Work Boundary: Work equitably with all assigned group project coursemates.',
      'The Post-Split Civility: Agree in advance to remain courteous coursemates if you ever part ways.',
      'The Intentional Community: Connect with focused, ambitious student singles on The College Date.'
    ]
  },
  {
    num: 125,
    slug: 'dating-a-computer-science-tech-student-in-university',
    title: 'Dating a Computer Science or Tech Student in University: Complete Guide',
    kicker: 'Tech-Student Romance',
    desc: 'How to date a computer science student or campus tech-bro. Master hackathon schedules, debugging frustration, remote freelancing, and quality time.',
    quickTake: 'Dating a computer science or tech student requires patience with intensive coding marathons, hackathons, and bug-hunting mental absorption. Encouraging offline walks, tech-free dinners, and celebrating software deployments builds deep, fulfilling connection.',
    colA: 'Tech-Aware Romantic Partner',
    colB: 'Common Tech Dating Pitfalls',
    rows: [
      ['Debugging Patience', 'Understands that fixing stubborn bugs requires deep uninterrupted focus.', 'Interrupting coding flow and accusing partner of staring blankly at screens.'],
      ['Hackathon Support', 'Cheering on partner during 48-hour weekend coding hackathons.', 'Starting relationship fights when weekend development sprints occur.'],
      ['Offline Boundaries', 'Scheduling dedicated laptop-closed dates to reconnect in person.', 'Allowing coding work and tech Twitter to dominate every shared dinner.'],
      ['Freelance Income Grace', 'Supporting remote tech gigs while maintaining healthy financial clarity.', 'Demanding luxury dates whenever partner closes a foreign remote client.'],
      ['Balanced Conversation', 'Engaging in diverse topics beyond software development frameworks.', 'Forcing partner to talk only about coding or completely dismissing their craft.']
    ],
    topicDilemma: 'screen addiction, intense coding deadlines, remote freelancing, and offline romance',
    ruleList: [
      'The Laptop-Down Rule: Institute phone-free, laptop-closed meal dates to nourish face-to-face intimacy.',
      'The Bug-Hunt Grace Period: Give your partner space to solve difficult software problems without guilt.',
      'The Fresh-Air Walking Habit: Take regular campus strolls to refresh mental energy away from monitors.',
      'The Genuine Interest: Celebrate software product launches and coding milestones with enthusiasm.',
      'The Tech & Creative Network: Meet ambitious student developers and creators on The College Date.'
    ]
  }
];

// Helper to auto-complete the rest of Cluster 12 (Topics 126 to 140)
const c12Remainder = [
  { num: 126, slug: 'when-one-partner-has-exams-and-the-other-is-on-break', title: 'When One Partner Has Exams and the Other Is Already on Break', focus: 'asymmetrical exam calendars, semester break gaps, and respectful study space' },
  { num: 127, slug: 'dating-an-architecture-student-studio-deadlines', title: 'Architecture Students and Studio Life: Romance Around Deadlines', focus: 'studio model making, sleepless drafting nights, and architectural critique stress' },
  { num: 128, slug: 'dating-across-science-and-humanities-faculties', title: 'Science Faculty vs Arts Faculty: Bridging the Cultural Divide', focus: 'analytical empirical science versus creative philosophical humanities worldviews' },
  { num: 129, slug: 'dating-accounting-student-during-professional-exams', title: 'Dating Someone in Accounting or Finance During ICAN Diets', focus: 'ICAN professional diets, ATS exams, financial audit pressure, and study blackouts' },
  { num: 130, slug: 'dating-a-mass-communication-student-campus-visibility', title: 'Mass Communication Majors: Managing Public Profiles and Romance', focus: 'campus media visibility, broadcast studio assignments, and managing social attention' },
  { num: 131, slug: 'dating-across-distant-satellite-faculties', title: 'When Your Partner’s Faculty Is on the Other Side of Town', focus: 'distant satellite campuses, inter-faculty shuttles, and cross-campus commute fatigue' },
  { num: 132, slug: 'running-for-departmental-executive-office-as-a-couple', title: 'Departmental Association Politics: Running for Office as a Couple', focus: 'student association elections, departmental power dynamics, and campaign teamwork' },
  { num: 133, slug: 'dating-a-pharmacy-student-heavy-lab-demands', title: 'The Pharmacy Student’s Heavy Lab Manuals: Making Time for Dates', focus: 'pharmacology practicals, dispensing labs, heavy memorization, and date scheduling' },
  { num: 134, slug: 'dating-an-agriculture-student-field-practical-demands', title: 'Dating an Agriculture Major: Field Work, Farm Practical’s & Love', focus: 'farm practical years, field work exhaustion, agricultural projects, and down-to-earth romance' },
  { num: 135, slug: 'how-to-manage-coursemate-gossip-when-dating-in-class', title: 'When Coursemates Know Everything About Your Relationship', focus: 'managing class gossip, protecting academic standing, and setting privacy boundaries' },
  { num: 136, slug: 'how-to-run-productive-study-groups-with-your-campus-date', title: 'Balancing Joint Study Groups Without Flirting the Whole Time', focus: 'productive study sessions, academic discipline, syllabus coverage, and preventing distraction' },
  { num: 137, slug: 'competing-against-your-partner-for-academic-honors', title: 'Competing for the Same Departmental Award or Scholarship', focus: 'healthy academic rivalry, scholarship competition, overcoming jealousy, and mutual pride' },
  { num: 138, slug: 'how-to-date-when-your-lecture-timetables-completely-clash', title: 'Dating Someone Whose Timetable Completely Clashes with Yours', focus: 'opposite lecture schedules, asynchronous relationship rhythms, and micro-dating' },
  { num: 139, slug: 'handling-departmental-advisors-warning-against-romance', title: 'What to Do When Your Departmental Advisor Discourages Dating', focus: 'course advisor warnings, academic focus versus personal romance, and maintaining high CGPA' },
  { num: 140, slug: 'best-15-minute-micro-dates-between-lectures-on-campus', title: 'The Post-Lecture Hangout: Best 15-Minute Micro-Dates Between Classes', focus: 'quick campus quad dates, snack breaks between lectures, and intentional micro-connection' }
];

const allC12Pages = [];

// 1. Process explicit c12Defs (121 to 125)
for (const m of c12Defs) {
  const t = topics.find((x) => x.num === m.num);
  allC12Pages.push(
    createWave1Page({
      num: m.num,
      slug: t.slug,
      title: t.title,
      description: m.desc,
      kicker: m.kicker,
      h1: t.title,
      lede: `Navigating ${m.topicDilemma} demands practical adaptability, emotional maturity, and mutual academic respect. Here is the definitive guide to building a strong relationship.`,
      quickTake: m.quickTake,
      section1Heading: `The ${m.kicker} Paradigm: Understanding Academic Rhythms`,
      section1Content: `
        <p>Across university campuses—from federal universities like UNILAG, UI, and OAU to state and private institutions—academic departments operate with radically divergent demands. What constitutes a busy week for an arts student looks completely different from the non-stop laboratory immersion of a medical, engineering, or science major.</p>
        <p>Recognizing and respecting these structural academic variations prevents unnecessary relationship friction. When partners understand the syllabus demands and assessment pressures of each other's faculties, emotional support replaces accusations of neglect.</p>
      `,
      section2Heading: 'Daily Friction Points and Departmental Workload Realities',
      section2Content: `
        <p>Relationship challenges across faculties rarely arise from lack of love. Instead, they stem from mismatched academic calendars, clashing timetables, and physical exhaustion from intensive practicals.</p>
        <p>Couples who succeed learn to sync their schedules proactively. Rather than fighting against heavy workloads, they turn study revision into shared quality time and celebrate each other's academic achievements.</p>
      `,
      tableHeading: `Comparative Analysis: Effective Partnership vs High-Friction Mistakes`,
      tableIntro: 'Examine the operational contrasts between considerate, supportive student behavior and common academic relationship traps:',
      col1Header: m.colA,
      col2Header: m.colB,
      tableRows: m.rows,
      section4Heading: 'Protecting Cumulative Grade Point Averages and Professional Aspirations',
      section4Content: `
        <p>Your degree is the primary reason you are in higher education. A healthy relationship must act as an academic accelerator rather than a liability. When both partners respect study hours and continuous assessment prep, cumulative grade points rise together.</p>
        <p>Empathetic partners motivate each other during revision sprints, hold each other accountable to lecture attendance, and ensure romance enhances rather than derails future career ambitions.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Inter-Faculty Harmony',
      section5Content: `
        <p>Follow these five strategic rules to build a thriving relationship across different academic departments:</p>
        <ol>
${m.ruleList.map((rule) => `          <li><strong>${rule.split(':')[0]}:</strong> ${rule.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: [
        {
          question: `How can student couples manage completely different lecture and exam timetables?`,
          answer: 'Couples should establish scheduled study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
        },
        {
          question: 'What should you do if your partner is stressed and overwhelmed by academic deadlines?',
          answer: 'Provide quiet, practical support. Bring them snacks, run small campus errands, and offer gentle encouragement without demanding emotional entertainment. Respecting their academic focus builds lasting trust.'
        },
        {
          question: 'Can academic competition between partners harm a campus relationship?',
          answer: 'Yes, if viewed as a zero-sum rivalry. Healthy couples view academic honors as collective wins, sharing study strategies and celebrating each others distinctions with genuine pride.'
        },
        {
          question: 'Why is verified student matching beneficial for academic dating?',
          answer: 'Platforms like The College Date verify student status and faculty affiliation, allowing you to discover peers who genuinely understand your study demands and respect your academic schedule.'
        }
      ],
      relatedGuides: [
        { href: '/dating-an-engineering-student-handling-busy-schedules', label: 'Dating Engineering Students' },
        { href: '/dating-medical-nursing-student-clinical-rotations', label: 'Medical & Nursing Romance' },
        { href: '/should-you-date-a-coursemate-in-the-same-department', label: 'Dating a Coursemate' },
        { href: '/campus-dating-safety', label: 'Campus Safety Guide' },
      ],
    })
  );
}

// 2. Process c12Remainder (126 to 140)
for (const r of c12Remainder) {
  const t = topics.find((x) => x.num === r.num);
  allC12Pages.push(
    createWave1Page({
      num: r.num,
      slug: t.slug,
      title: r.title,
      description: `Complete guide to ${r.focus} across university faculties and departments. Discover academic balance, timetable synchronization, and practical dating frameworks.`,
      kicker: 'Faculty Dating Dynamics',
      h1: r.title,
      lede: `Navigating ${r.focus} requires practical tact, mature boundaries, and clear communication. Here is the definitive student guide to thriving in your academic environment.`,
      quickTake: `Navigating ${r.focus} demands transparent communication, respect for differing faculty workloads, and disciplined study habits. Prioritizing academic excellence and mutual support turns inter-faculty dating into a powerful partnership.`,
      section1Heading: `Understanding the Lived Reality of ${r.title.split(':')[0]}`,
      section1Content: `
        <p>Across university faculties, students experience wildly different academic tempos. Balancing romance alongside intense coursework requires recognizing that academic commitments must always be honored.</p>
        <p>When partners communicate openly about practicals, continuous assessments, and revision deadlines, emotional misunderstandings vanish. Mutual respect for academic schedules is the foundation of enduring student romance.</p>
      `,
      section2Heading: 'Daily Friction Points and Departmental Timetable Pressures',
      section2Content: `
        <p>Clashing lecture schedules, distant satellite campuses, and heavy project deadlines can create feelings of disconnection if not addressed proactively.</p>
        <p>Successful student couples embrace micro-dates between lectures, study together in libraries, and celebrate academic milestones as shared victories.</p>
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs Common Pitfalls`,
      tableIntro: 'Examine the operational contrasts between considerate, supportive student behavior and common academic relationship mistakes:',
      col1Header: 'Supportive Academic Behavior',
      col2Header: 'High-Friction Relationship Mistakes',
      tableRows: [
        ['Timetable Management', 'Proactively syncing free study windows and scheduling dates.', 'Complaining about clashing lecture hours and demanding instant replies.'],
        ['Exam Support', 'Providing emotional encouragement and quiet study space during tests.', 'Guilt-tripping partner for prioritizing revision and syllabus coverage.'],
        ['Academic Pride', 'Celebrating partners academic honors and distinctions genuinely.', 'Fostering toxic academic jealousy or petty score comparisons.'],
        ['Campus Integration', 'Respecting partners departmental commitments and study circles.', 'Attempting to isolate partner from their coursemates and faculty projects.'],
        ['Grade Impact', 'Mutual accountability that elevates both partners cumulative GPAs.', 'Allowing romantic drama to trigger carryovers and academic probation.']
      ],
      section4Heading: 'Balancing Academic Excellence with Fulfilling Romantic Intimacy',
      section4Content: `
        <p>Your degree represents years of sacrifice and investment. True romantic partners champion your intellectual development and push you toward academic excellence.</p>
        <p>By establishing sacred study windows and turning library hours into collaborative teamwork, student couples build relationships that outlast campus life.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Departmental Harmony',
      section5Content: `
        <p>Follow these five strategic rules to maintain high academic standing while enjoying fulfilling romance:</p>
        <ol>
          <li><strong>The Academic Sanctuary Rule:</strong> Keep continuous assessment test weeks and exam periods strictly sacred for studying.</li>
          <li><strong>The Timetable Sync Protocol:</strong> Compare lecture schedules at the start of each semester to identify mutual free windows.</li>
          <li><strong>The Micro-Date Strategy:</strong> Maximize 15-minute coffee or snack breaks between lectures for focused connection.</li>
          <li><strong>The Professional Decorum Standard:</strong> Maintain dignified, mature conduct in all shared departmental classes and laboratories.</li>
          <li><strong>The Verified Connection Advantage:</strong> Join The College Date to meet ambitious, verified students across all university faculties.</li>
        </ol>
      `,
      faqs: [
        {
          question: `How can student couples manage completely different lecture and exam timetables?`,
          answer: 'Couples should establish scheduled study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
        },
        {
          question: 'What should you do if your partner is stressed and overwhelmed by academic deadlines?',
          answer: 'Provide quiet, practical support. Bring them snacks, run small campus errands, and offer gentle encouragement without demanding emotional entertainment. Respecting their academic focus builds lasting trust.'
        },
        {
          question: 'Can academic competition between partners harm a campus relationship?',
          answer: 'Yes, if viewed as a zero-sum rivalry. Healthy couples view academic honors as collective wins, sharing study strategies and celebrating each others distinctions with genuine pride.'
        },
        {
          question: 'Why is verified student matching beneficial for academic dating?',
          answer: 'Platforms like The College Date verify student status and faculty affiliation, allowing you to discover peers who genuinely understand your study demands and respect your academic schedule.'
        }
      ],
      relatedGuides: [
        { href: '/dating-an-engineering-student-handling-busy-schedules', label: 'Dating Engineering Students' },
        { href: '/dating-medical-nursing-student-clinical-rotations', label: 'Medical & Nursing Romance' },
        { href: '/should-you-date-a-coursemate-in-the-same-department', label: 'Dating a Coursemate' },
        { href: '/campus-dating-safety', label: 'Campus Safety Standards' },
      ],
    })
  );
}

// Write Cluster 12 module
const c12Output = `// Auto-generated Cluster 12: Inter-Faculty Dynamics & Departmental Matchups (Topics 121 to 140)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster12Pages = ${JSON.stringify(allC12Pages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster12.mjs'), c12Output, 'utf8');
console.log(`✓ Successfully compiled scripts/seo-expansion-wave1/cluster12.mjs (${allC12Pages.length} topics)`);
