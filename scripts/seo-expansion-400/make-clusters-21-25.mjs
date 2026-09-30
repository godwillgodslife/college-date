import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSeoPageData, sanitizeTitle, sanitizeDescription } from './builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-400', 'topics400.json'), 'utf8'));

// Filter Topics 301 to 400
const batch2Topics = topics.filter((t) => t.num >= 301 && t.num <= 400);

const clusterContexts = {
  21: {
    kicker: 'Campus Nightlife & Social Events',
    leadSubject: 'campus parties, faculty raves, and nightlife safety',
    sec1Theme: `
      <p>Campus nightlife—including departmental award dinners, hall week parties, off-campus club raves, and private lodge sound systems—constitutes a high-energy social ecosystem within tertiary institutions. In energetic student hubs like Lagos, Benin, Ibadan, Ekpoma, and Port Harcourt, evening entertainment offers a welcome release from relentless academic pressure, allowing students to celebrate milestones and socialize.</p>
      <p>However, navigating romantic relationships within party environments introduces acute interpersonal vulnerabilities. Alcohol consumption, loud music, late-night transit, and peer pressure can easily distort judgment, sparking sudden jealousy or leading to dangerous safety situations. High-maturity couples approach campus nightlife with clear mutual agreements, prioritizing personal safety, emotional security, and mutual dignity above fleeting party euphoria.</p>
    `,
    sec2Theme: `
      <p>The practical ground rules for enjoying campus social events center on mutual protective instincts and clear boundaries. When attending crowded raves or faculty dinners, couples must establish a buddy system, ensuring that neither partner is left unattended in unfamiliar environments or pressured into compromising situations. Practicing strict drink surveillance and arranging trusted return transit before midnight prevents serious safety hazards.</p>
      <p>Navigating flirtatious party crowds requires unshakeable emotional trust and clear social decorum. When partners celebrate together in public, introducing each other with pride and maintaining considerate physical presence eliminates unspoken insecurity. Reserving intimate, quiet time after social events allows couples to decompress without letting party drama spill into their living sanctuaries.</p>
    `,
    sec4Theme: `
      <p>Excessive nightlife participation poses an immediate threat to cognitive stamina and academic progression. Undergraduates who succumb to weekend partying marathons frequently struggle with sleep deprivation, missed Monday morning lectures, and brain fog during continuous assessment tests. Relationship arguments erupting from party misunderstandings drain the mental clarity needed for challenging coursework.</p>
      <p>Successful student partners view nightlife as an occasional reward rather than a continuous lifestyle. By anchoring their calendars in rigorous study goals and supporting each other during examination seasons, couples ensure that their social lives enhance rather than jeopardize their Cumulative Grade Point Averages (CGPA). Cultivating balanced leisure habits fosters lifelong discipline and mutual pride.</p>
    `,
    sec5Takeaway: `
      <p>Enjoying campus nightlife responsibly while building a meaningful relationship demonstrates high personal character. By watching out for each other's safety, refusing toxic peer pressure, and prioritizing your academic future, you create a dynamic, fun, and safe relationship that enriches your university memories.</p>
    `,
    faqSuffix: ' Establishing clear party boundaries, arranging trusted return transit, and maintaining mutual protective care keeps your campus relationship safe and fulfilling.',
    dimensions: [
      ['Party Safety', 'Maintains strict drink awareness and reliable buddy transit.', 'Leaves partner unattended in rowdy or intoxicated crowds.'],
      ['Peer Pressure', 'Sets firm personal boundaries against excessive alcohol and risks.', 'Succumbs to reckless dares or irresponsible party spending.'],
      ['Public Decorum', 'Introduces partner with pride and shows considerate respect.', 'Flirts carelessly with partygoers or causes public drama.'],
      ['Academic Balance', 'Treats partying as a rare celebration after completed exams.', 'Parties through test weeks and skips vital morning lectures.'],
      ['Morning-After Care', 'Supports partner with hydration, rest, and peaceful care.', 'Starts bitter arguments over trivial party misunderstandings.']
    ]
  },
  22: {
    kicker: 'Fresher Dynamics & Campus Adjustment',
    leadSubject: 'first-year student adjustment, orientation traps, and pacing',
    sec1Theme: `
      <p>Entering tertiary education as a first-year student ('fresher') is a monumental transition marked by unprecedented personal freedom, academic disorientation, and intense social vulnerability. Arriving on sprawling campuses—from huge federal institutions to vibrant state colleges—freshers must navigate departmental clearance lines, hostel hunting, lecture theater sprints, and an overwhelming influx of social attention from senior undergraduates and campus socialites.</p>
      <p>In this high-pressure environment, new students often face intense romantic overtures from older peers who leverage their campus familiarity, vehicle access, or executive status. Rushing into high-stakes dating before understanding university academic expectations or developing emotional discernment is a primary cause of early academic derailment and personal heartbreak among first-year undergraduates.</p>
    `,
    sec2Theme: `
      <p>The daily challenges of the fresher experience demand strategic pacing and strong personal boundaries. Managing heavy 100-level general study courses (such as GST, introductory calculus, and biology practicals) requires undistracted focus and time management. When romantic pursuits consume early morning study hours or interfere with lecture seat reservations, students quickly fall behind on foundational syllabi.</p>
      <p>Healthy campus dating for freshers begins with prioritizing self-orientation and genuine peer friendships. Resisting aggressive advances, taking time to understand a potential partner's true character over several months, and keeping family members or trusted mentors informed provides essential emotional safety. Grounding your social life in authentic, verified peer networks eliminates exploitation and builds self-confidence.</p>
    `,
    sec4Theme: `
      <p>First-year academic performance establishes the foundation of your entire university degree. In Nigerian grading systems, building a high Grade Point Average in 100-level (aiming for First Class or Strong Second Class Upper) provides a vital statistical cushion for demanding upper-level engineering, clinical, or law courses. Early relationship trauma or coercive partner demands can shatter a fresher's confidence and trigger immediate academic probation.</p>
      <p>Smart undergraduates protect their intellectual future by prioritizing academic mastery during their first two semesters. Viewing romantic interests through the lens of mutual academic encouragement—such as forming study pacts and sharing lecture notes—transforms attraction into positive academic momentum. Building solid grades first creates the emotional equilibrium necessary for mature, long-term love.</p>
    `,
    sec5Takeaway: `
      <p>Mastering your first year on campus requires self-respect, academic dedication, and patient emotional discernment. By refusing to rush into predatory relationships, focusing on building a stellar foundational CGPA, and choosing partners who respect your growth, you pave the way for an extraordinary collegiate journey.</p>
    `,
    faqSuffix: ' Pacing your romantic choices, setting firm personal boundaries, and prioritizing your foundational 100-level grades protects your emotional peace and university success.',
    dimensions: [
      ['Dating Pacing', 'Takes several months to evaluate partner character and values.', 'Rushes into high-intensity dating during orientation week.'],
      ['Senior Advances', 'Sets firm boundaries and avoids transactional campus perks.', 'Trades personal boundaries for academic favors or lodge rides.'],
      ['Academic Priority', 'Focuses on securing a high 100-level CGPA and study routine.', 'Skips foundational lectures and tutorials for romantic dates.'],
      ['Peer Support', 'Cultivates genuine coursemate friendships and study circles.', 'Isolates exclusively with a partner and ignores campus friends.'],
      ['Personal Autonomy', 'Maintains independence, finances, and personal agency.', 'Allows an older partner to dictate personal decisions and style.']
    ]
  },
  23: {
    kicker: 'Final-Year Pressures & Exit Horizons',
    leadSubject: 'project defense stress, graduation anxiety, and transition',
    sec1Theme: `
      <p>The final year of undergraduate education represents an intense pressure cooker of academic milestones, administrative hurdles, and looming existential dread. Students in 400-level, 500-level, or final-year polytechnic streams must simultaneously balance heavy seminar presentations, complex laboratory research or data collection for their final-year thesis, departmental clearance bureaucracy, and imminent exit into the uncertain post-graduation economy.</p>
      <p>Within campus relationships, the final year is the ultimate stress test. Demanding project supervisors, erratic data outcomes, and financial strain from printing and binding costs create acute emotional irritability. Furthermore, the ticking clock toward convocation forces couples to confront difficult questions about future viability, geographic separation, and career divergence.</p>
    `,
    sec2Theme: `
      <p>The daily operational friction of final-year dating centers on conflicting deadlines and intense research commitments. When one partner is stuck in a biochemistry laboratory running chromatography assays until midnight while the other is sprinting between questionnaire survey locations, simple dates become nearly impossible without intentional coordination.</p>
      <p>Supportive final-year couples survive this gauntlet by transforming their relationship into a mutual academic command center. Proofreading each other's project chapters, organizing research references, preparing mock presentation defenses, and sharing nutritious meals during grueling all-night library sessions strengthens intimacy through tangible teamwork. Practicing emotional patience when a supervisor demands major rewrites prevents project stress from damaging romantic warmth.</p>
    `,
    sec4Theme: `
      <p>The psychological weight of the final year is exacerbated by exit anxiety—fears regarding NYSC call-up postings, job hunt prospects, and the sudden loss of campus community. When students experience anxiety about their future, they may inadvertently project fear onto their partner, leading to sudden emotional withdrawal or premature breakups.</p>
      <p>Couples protect their mental health by engaging in calm, transparent conversations about post-graduation realities. Acknowledging future uncertainties without demanding rigid lifelong guarantees allows partners to support each other's transition into adulthood. By anchoring each other in optimism and resilience, student couples navigate project defenses with high honors and their relationship intact.</p>
    `,
    sec5Takeaway: `
      <p>Navigating final-year project stress as a united team transforms academic pressure into profound relational intimacy. By supporting each other's research, managing graduation fears with mature empathy, and honoring each individual's career ambitions, you build an enduring partnership ready for adulthood.</p>
    `,
    faqSuffix: ' Supporting each other through project research deadlines, practicing patience with supervisor stress, and discussing future plans openly ensures relationship resilience.',
    dimensions: [
      ['Project Support', 'Assists with proofreading, survey logistics, and moral support.', 'Complains that partner research thesis steals date time.'],
      ['Supervisor Stress', 'Offers a listening ear and emotional sanctuary after critiques.', 'Takes supervisor-induced frustration personally and starts fights.'],
      ['Financial Empathy', 'Helps budget for printing, binding, and graduation expenses.', 'Demands costly celebratory outings during tight project seasons.'],
      ['Exit Realism', 'Discusses NYSC relocations and career transitions maturely.', 'Panics and demands unrealistic immediate marriage promises.'],
      ['Academic Focus', 'Pushes partner across the finish line with First-Class honors.', 'Distracts from thesis defense preparation with trivial drama.']
    ]
  },
  24: {
    kicker: 'Digital Dating & DM Etiquette',
    leadSubject: 'direct messaging psychology, voice note etiquette, and online courting',
    sec1Theme: `
      <p>In modern tertiary life, digital communication channels—primarily WhatsApp, Instagram Direct Messages, and student community chat rooms—serve as the front porch of romantic connection. Before a student ever walks across campus for a cafeteria date, attraction is sparked, tested, and evaluated through text messages, voice note tonality, emoji selections, and status updates.</p>
      <p>However, digital courting is fraught with psychological ambiguity and communication traps. Dry texting, delayed read receipts, misinterpreting emotional intent in brief texts, and aggressive 'sliding into DMs' without social context frequently lead to misunderstandings or embarrassing rejections. Mastering digital etiquette requires emotional nuance, respectful humor, and clear intentionality.</p>
    `,
    sec2Theme: `
      <p>The practical guidelines for high-impact digital communication center on authenticity, respect, and seamless escalation to real-world connection. Opening a conversation with a personalized observation regarding shared campus experiences—such as a memorable departmental lecture, a funny campus meme, or a student event—generates far higher engagement than generic, low-effort greetings.</p>
      <p>Voice notes represent a powerful bridge between text and in-person interaction, conveying warmth, authentic tone, and playful cadence without the rigid pressure of a phone call. However, digital communication should never remain an endless virtual loop. Successful student daters use engaging digital interactions to establish mutual comfort, quickly transitioning to a relaxed, public daytime meetup on campus.</p>
    `,
    sec4Theme: `
      <p>Digital courting can easily trigger severe cognitive distraction and emotional insecurity if boundaries are not respected. Constantly obsessing over when a campus crush last updated their status, over-analyzing reply delays, or curating superficial online personas drains mental bandwidth needed for coursework and revision.</p>
      <p>Healthy undergraduates approach digital communication with detached confidence and self-assurance. Recognizing that university peers have heavy laboratory practicals, library study shifts, and domestic responsibilities prevents unnecessary anxiety over response times. Cultivating direct, honest conversational habits fosters genuine self-esteem and attracts emotionally mature partners.</p>
    `,
    sec5Takeaway: `
      <p>Mastering digital communication is about cultivating authentic charisma, respectful boundaries, and clear purpose. By communicating with wit and warmth online while prioritizing real-world campus interaction, you build deep, genuine relationships that thrive far beyond a smartphone screen.</p>
    `,
    faqSuffix: ' Using engaging, respectful conversation openers, keeping voice notes authentic, and moving promptly to real-world campus meetups ensures digital courting success.',
    dimensions: [
      ['Conversation Openers', 'Shares personalized, witty campus observations or questions.', 'Sends lazy, repetitive greetings like Hey, wyd, or emojis.'],
      ['Response Cadence', 'Respects busy academic schedules and replies with composure.', 'Sends angry follow-ups or spam texts when replies are delayed.'],
      ['Voice Note Usage', 'Sends warm, concise 30-second voice notes to build rapport.', 'Sends rambling 10-minute audio monologues without context.'],
      ['Real-World Bridge', 'Invites crush for a brief daytime campus coffee or walk.', 'Traps partner in endless, aimless texting for months.'],
      ['Privacy & Respect', 'Keeps private conversations and voice notes completely secure.', 'Screenshots chats to mock or dissect in hostel gossip groups.']
    ]
  },
  25: {
    kicker: 'Campus Side Hustles & Hustle Romance',
    leadSubject: 'student entrepreneurship, tech freelancing, and financial dynamics',
    sec1Theme: `
      <p>The economic landscape of African higher education has transformed dramatically, with tens of thousands of undergraduates actively managing side hustles—including software engineering, UI/UX design, cryptocurrency trading, e-commerce, pastry baking, photography, and digital marketing—alongside their academic coursework. On modern campuses, student entrepreneurs balance laptops and lecture notebooks, working tirelessly to achieve financial independence.</p>
      <p>Dating a student entrepreneur—or managing romance when both partners have active side businesses—introduces complex dynamics around time scarcity, financial inequality, and stress management. When one partner begins earning substantial income in foreign currency or client retainers while the other relies on a modest parental stipend, unspoken financial insecurity or unrealistic lifestyle demands can easily disrupt relational harmony.</p>
    `,
    sec2Theme: `
      <p>The daily operational realities of hustle-driven relationships require structured calendar management and mutual respect for professional deadlines. Late-night client sprint deadlines, volatile crypto market tracking, and weekend photography shoots leave limited hours for spontaneous romance. Demanding non-stop physical attention from a partner building an enterprise creates deep resentment.</p>
      <p>Collaborative student couples thrive by integrating their ambitions into their relationship. Scheduling co-working dates where both partners work quietly in campus cafes or tech hubs transforms professional labor into shared bonding. Furthermore, maintaining absolute financial humility, rejecting transactional expectations, and supporting each other through dry business seasons builds unshakeable partnership trust.</p>
    `,
    sec4Theme: `
      <p>Balancing entrepreneurship, university continuous assessments, and romance creates acute mental burnout if self-care boundaries are ignored. Undergraduates who sacrifice sleep to meet freelance client milestones while trying to appease a demanding partner suffer from severe exhaustion, impaired mental health, and plunging semester CGPAs.</p>
      <p>Protecting well-being requires viewing your relationship as a sanctuary from the relentless hustle culture. Dedicated partners encourage each other to take restorative breaks, disconnect from digital screens on date nights, and keep graduation as the paramount objective. Supporting each other's financial independence while prioritizing emotional peace creates a resilient foundation for the future.</p>
    `,
    sec5Takeaway: `
      <p>Building a romance amidst campus entrepreneurship is a testament to shared drive and mutual ambition. By respecting each other's hustle, maintaining financial equality and humility, and protecting sacred downtime together, you cultivate a dynamic, inspiring partnership that achieves both personal and financial milestones.</p>
    `,
    faqSuffix: ' Respecting each other business work hours, establishing co-working study routines, and maintaining financial transparency ensures your campus hustle romance thrives.',
    dimensions: [
      ['Work Schedule Respect', 'Respects client deadlines and creates space for focus.', 'Guilt-trips partner for working late on freelance projects.'],
      ['Income Disparity', 'Practices humility and maintains equitable lifestyle sharing.', 'Flaunts side-hustle earnings or expects partner submission.'],
      ['Financial Realism', 'Budgets transparently and supports partner through slow months.', 'Demands lavish date nights funded by partner business capital.'],
      ['Academic Integrity', 'Ensures side business never derails graduation and exams.', 'Abandons lectures and tests to chase temporary freelance gigs.'],
      ['Mutual Encouragement', 'Celebrates business milestones and assists with client ideas.', 'Resents partner financial success or feels threatened by ambition.']
    ]
  }
};

function generateBatch2() {
  console.log(`Generating Batch 2: ${batch2Topics.length} topics (Topics 301 to 400)...`);
  const allPages = [];

  for (const t of batch2Topics) {
    const ctx = clusterContexts[t.clusterNum];
    const pageData = createSeoPageData({
      num: t.num,
      slug: t.slug,
      title: t.title,
      description: `Complete guide to ${t.title.toLowerCase()}. Master practical communication, campus boundaries, academic balance, and relationship strategies.`,
      kicker: ctx.kicker,
      h1: t.title,
      lede: `Navigating ${t.title.toLowerCase()} requires practical emotional intelligence, clear communication, and grounded boundaries. Here is the definitive student guide to thriving on campus.`,
      quickTake: `Navigating ${t.title.toLowerCase()} requires emotional maturity, clear communication of personal boundaries, and mutual respect for individual circumstances. By prioritizing transparent dialogue over superficial assumptions and aligning on shared academic and personal goals, campus partners cultivate an enduring relationship grounded in mutual trust and character.`,
      date: '2026-09-30',
      section1Heading: `The Paradigm of ${sanitizeTitle(t.title)}: Understanding Modern Campus Realities`,
      section1Content: `
        <p>In tertiary institutions across the country, handling challenges surrounding ${t.title.toLowerCase()} requires balancing personal affection with the structural realities of student life. When undergraduates confront this dynamic without clear principles, unnecessary friction easily disrupts both emotional peace and academic focus.</p>
        ${ctx.sec1Theme}
      `,
      section2Heading: `Daily Friction Points, Social Dynamics, and Environmental Hurdles`,
      section2Content: `
        <p>Day-to-day encounters on campus present subtle tests that determine whether a relationship flourishes or strains under pressure. From navigating crowded lecture theaters and shared lodge spaces to managing peer expectations, couples must coordinate their actions with intentional care.</p>
        ${ctx.sec2Theme}
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs High-Risk Relationship Pitfalls`,
      tableIntro: `Examine the operational contrasts between mature, considerate campus behaviors and common student mistakes regarding ${t.title.toLowerCase()}:`,
      col1Header: 'Recommended Best Practice',
      col2Header: 'Common High-Risk Pitfall',
      tableRows: ctx.dimensions,
      section4Heading: `Protecting Mental Bandwidth, Emotional Resilience, and Academic Priorities`,
      section4Content: `
        <p>Your Cumulative Grade Point Average (CGPA) remains your highest personal asset as an undergraduate. When interpersonal misunderstandings or emotional turmoil consume your attention, continuous assessments and examination results inevitably suffer.</p>
        ${ctx.sec4Theme}
      `,
      section5Heading: `Actionable Framework: Five Golden Principles for Campus Relationship Success`,
      section5Content: `
        <p>Implement these five core principles to manage ${t.title.toLowerCase()} with dignity, emotional maturity, and lasting success:</p>
        <ol>
          <li><strong>The Radical Transparency Principle:</strong> Communicate your expectations, living realities, and personal boundaries openly from the very start.</li>
          <li><strong>The Academic Sanctuary Rule:</strong> Protect your study hours and continuous assessment preparation from relationship distractions.</li>
          <li><strong>The Mutual Dignity Standard:</strong> Never embarrass your partner publicly or weaponize private disagreements in hostel or social circles.</li>
          <li><strong>The Proactive Boundaries Agreement:</strong> Align early on financial expectations, personal privacy, and healthy interpersonal boundaries.</li>
          <li><strong>The Verified Network Advantage:</strong> Connect with authentic, verified student peers on The College Date who share your values and ambitions.</li>
        </ol>
        ${ctx.sec5Takeaway}
      `,
      faqs: [
        {
          question: `What is the most frequent mistake students make regarding ${t.title.toLowerCase()}?`,
          answer: `The most common error is making assumptions without explicit, open communication. When students avoid honest conversations due to fear of awkwardness or conflict, minor friction compounds into major resentment. Establishing mutual expectations early prevents unnecessary misunderstandings.${ctx.faqSuffix}`
        },
        {
          question: `How can couples balance intense study schedules while dealing with ${t.title.toLowerCase()}?`,
          answer: `Successful student couples schedule focused revision dates in campus libraries rather than attempting to relax in noisy living areas. By turning academic preparation into collaborative quality time, partners strengthen both their grades and their emotional connection.${ctx.faqSuffix}`
        },
        {
          question: `How should you respond if friends or roommates criticize your approach to ${t.title.toLowerCase()}?`,
          answer: `Maintain calm, dignified composure and refuse to engage in defensive arguments. External opinions rarely account for the full context of your relationship. Focus your energy on your personal standards, trusted companions, and partner integrity.${ctx.faqSuffix}`
        },
        {
          question: `Why is connecting with verified students essential for a safe campus dating experience?`,
          answer: `Verified student platforms like The College Date eliminate catfishing, protect personal privacy under the Nigeria Data Protection Act (NDPA), and connect you with authentic peers from your faculty and university who value safety and respect.${ctx.faqSuffix}`
        }
      ],
      relatedGuides: [
        { href: '/dating-when-squatting-in-a-university-hostel', label: 'Hostel Dating Guide' },
        { href: '/dating-an-engineering-student-handling-busy-schedules', label: 'Faculty Dynamics Guide' },
        { href: '/dating-within-campus-fellowships-navigating-faith-codes', label: 'Campus Fellowship Guide' },
        { href: '/campus-dating-safety', label: 'Campus Safety Protocol' }
      ]
    });

    allPages.push(pageData);
  }

  const outContent = `// Auto-generated Batch 2: Clusters 21 to 25 (Topics 301 to 400)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const clusters21to25Pages = ${JSON.stringify(allPages, null, 2)};
`;

  const outPath = join(root, 'scripts', 'seo-expansion-400', 'clusters-21-25.mjs');
  writeFileSync(outPath, outContent, 'utf8');
  console.log(`✓ Successfully compiled ${outPath} (${allPages.length} topics)`);
}

generateBatch2();
