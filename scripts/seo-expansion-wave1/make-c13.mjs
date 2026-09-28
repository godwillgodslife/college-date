import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWave1Page } from './cluster-builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));

// Topic-specific definitions for Cluster 13 (141 to 160)
// Theme: Campus Fellowship, Faith Conflicts & Moral Dilemmas
const c13Defs = [
  {
    num: 141,
    slug: 'dating-within-campus-fellowships-navigating-faith-codes',
    title: 'Dating Within Campus Fellowships: Navigating Faith Codes and Romance',
    kicker: 'Campus Ministry Dynamics',
    desc: 'How to date within campus fellowships and student ministries. Learn spiritual boundaries, leadership scrutiny, courting etiquette, and emotional clarity.',
    quickTake: 'Dating within campus fellowships requires balancing personal spiritual convictions with community expectations, establishing clear emotional and physical boundaries, and avoiding performative piety. Genuine shared values and open communication foster wholesome, lasting courtship.',
    colA: 'Wholesome Faith-Based Courtship',
    colB: 'Common Fellowship Relationship Pitfalls',
    rows: [
      ['Spiritual Foundation', 'Grounding romance in shared character, mutual respect, and prayer.', 'Using spiritual buzzwords or manipulation to rush emotional intimacy.'],
      ['Community Scrutiny', 'Conducting relationship with quiet dignity and clear integrity.', 'Obsessing over fellowship gossip or hiding behind secrecy.'],
      ['Physical Boundaries', 'Establishing mutually agreed, inviolable physical boundaries.', 'Ignoring boundaries leading to private moral guilt and anxiety.'],
      ['Ministry Balance', 'Balancing fellowship service with personal academic and date time.', 'Allowing ministry activities to crowd out basic relationship care.'],
      ['Future Vision', 'Aligning on core long-term values, family beliefs, and career goals.', 'Assuming identical denominations automatically guarantee compatibility.']
    ],
    topicDilemma: 'navigating spiritual convictions, fellowship leadership scrutiny, and campus courting',
    ruleList: [
      'The Values-First Rule: Ensure emotional connection is rooted in character rather than religious performance.',
      'The Sovereign Boundary Pact: Agree on physical intimacy boundaries before private dates begin.',
      'The Discretion Standard: Keep private relationship discussions between the two of you.',
      'The Fellowship Service Balance: Honor church commitments without neglecting your partner.',
      'The Values-Aligned Network: Connect on The College Date where you can filter matches by spiritual values.'
    ]
  },
  {
    num: 142,
    slug: 'purity-culture-and-celibacy-boundaries-in-university',
    title: 'Navigating Purity Culture, Celibacy & Physical Boundaries in University',
    kicker: 'Personal Values & Boundaries',
    desc: 'How to practice celibacy and maintain personal physical boundaries in university dating. Discover boundary communication, avoiding temptation, and mutual respect.',
    quickTake: 'Practicing celibacy in university dating requires defining personal physical boundaries with absolute clarity early in the relationship, avoiding high-risk secluded environments, and partnering with someone who wholeheartedly respects your values without coercion.',
    colA: 'Healthy Values-Based Boundaries',
    colB: 'Compromised Boundary Patterns',
    rows: [
      ['Boundary Clarity', 'Explicitly stating physical limits during early dating stages.', 'Relying on unspoken assumptions that collapse in private moments.'],
      ['Partner Respect', 'Partner actively honors and supports chosen physical boundaries.', 'Partner constantly negotiates, tests, or guilt-trips boundaries.'],
      ['Environment Strategy', 'Meeting in public campus cafes, parks, and daylight venues.', 'Regularly spending late nights alone in secluded private lodges.'],
      ['Emotional Freedom', 'Experiencing deep emotional intimacy free from fear or moral guilt.', 'Chronic psychological conflict and anxiety over compromised values.'],
      ['Self-Worth Anchor', 'Recognizing that personal dignity is never up for negotiation.', 'Sacrificing long-held convictions to keep someone interested.']
    ],
    topicDilemma: 'maintaining sexual boundaries, resisting campus peer pressure, and upholding convictions',
    ruleList: [
      'The Early Declaration Rule: State your physical boundaries clearly before emotional attachment deepens.',
      'The Daytime Date Strategy: Plan engaging daytime activities that eliminate late-night isolation.',
      'The Zero-Coercion Rule: Never tolerate a partner who makes your boundaries feel like an obstacle.',
      'The Wholeness Mindset: Cultivate deep emotional intimacy through shared intellect, humor, and values.',
      'The Respectful Community: Discover partners who share your moral standards on The College Date.'
    ]
  }
];

// Helper to auto-complete the rest of Cluster 13 (Topics 143 to 160)
const c13Remainder = [
  { num: 143, slug: 'interfaith-dating-in-african-tertiary-institutions', title: 'Interfaith Campus Dating: Christian-Muslim Relationships in College', focus: 'interfaith dating, religious diversity, navigating family objections, and cultural bridge-building' },
  { num: 144, slug: 'when-campus-fellowship-executives-interfere-in-dating', title: 'When Fellowship Leaders Interfere in Your Personal Dating Life', focus: 'fellowship leadership overreach, spiritual counseling boundaries, and defending personal autonomy' },
  { num: 145, slug: 'navigating-moral-guilt-and-relationship-boundaries-on-campus', title: 'Managing Moral Guilt After Compromising Personal Values in College', focus: 'healing from moral guilt, self-compassion, resetting boundaries, and emotional recovery' },
  { num: 146, slug: 'dating-a-campus-fellowship-executive-managing-scrutiny', title: 'Dating an Executive in Campus Ministry: Scrutiny and Expectations', focus: 'dating fellowship executives, high campus visibility, managing peer expectations, and privacy' },
  { num: 147, slug: 'dating-someone-with-different-spiritual-commitment-in-college', title: 'Unequally Yoked on Campus: Dating Someone Less Spiritual Than You', focus: 'differing levels of religious devotion, spiritual mismatch, and evaluating long-term compatibility' },
  { num: 148, slug: 'attending-different-campus-churches-as-a-student-couple', title: 'Attending Different Denominational Services Without Fighting', focus: 'inter-denominational relationships, alternating services, respecting traditions, and mutual growth' },
  { num: 149, slug: 'supporting-your-partner-during-campus-prayer-and-fasting-weeks', title: 'Fasting and Prayer Weeks: How to Support Your Partner Spiritually', focus: 'campus fasting programs, spiritual encouragement, managing physical energy, and prayer unity' },
  { num: 150, slug: 'ending-a-campus-relationship-over-spiritual-incompatibility', title: 'Breaking Up with Someone Because of Incompatible Faith Values', focus: 'spiritual incompatibility breakups, honorable closure, managing guilt, and emotional clarity' },
  { num: 151, slug: 'attending-campus-night-vigils-together-spiritual-etiquette', title: 'Navigating Night Vigils as Dates: Spiritual Etiquette and Purpose', focus: 'all-night prayer meetings, worship decorum, maintaining spiritual focus, and wholesome connection' },
  { num: 152, slug: 'hiding-your-relationship-from-strict-religious-circles-campus', title: 'Secret Campus Romance: Hiding Dating from Strict Religious Circles', focus: 'secret relationships in religious communities, avoiding unnecessary drama, and authentic timing' },
  { num: 153, slug: 'handling-unsolicited-prophecies-about-your-campus-crush', title: 'Handling Unsolicited Spiritual "Revelations" About Your Campus Crush', focus: 'spiritual manipulation, ' + 'handling unsolicited marital prophecies' + ', and exercising personal discernment' },
  { num: 154, slug: 'balancing-fellowship-commitments-and-dating-time-in-college', title: 'Balancing Spiritual Service Deadlines and Romantic Quality Time', focus: 'choir rehearsals, ushering duties, ministry workload, and carving out sacred couple time' },
  { num: 155, slug: 'when-your-campus-partner-starts-questioning-their-faith', title: 'When One Partner Questions Faith: Navigating Deconstruction Together', focus: 'faith deconstruction, intellectual religious doubts, offering compassionate support, and patience' },
  { num: 156, slug: 'the-pressure-to-get-engaged-after-final-year-fellowship', title: 'The Pressure to Get Engaged Right After Campus Graduation', focus: 'fellowship marriage pressure, post-convocation expectations, financial readiness, and realistic timing' },
  { num: 157, slug: 'halal-dating-and-courting-etiquette-in-african-universities', title: 'Muslim Student Society (MSSN) Dating Etiquette & Halal Courting', focus: 'halal courting principles, modesty, chaperone etiquette, and Islamic family values on campus' },
  { num: 158, slug: 'handling-parental-religious-objections-to-your-campus-partner', title: 'Dealing with Parental Religious Objections to Your Campus Match', focus: 'parental denominational bias, navigating inter-church tension, and respectful family diplomacy' },
  { num: 159, slug: 'thoughtful-gifts-for-spiritual-partners-in-university', title: 'Romantic Gifts That Respect Religious Convictions on Campus', focus: 'faith-conscious gift ideas, study bibles, daily devotionals, and wholesome expressions of care' },
  { num: 160, slug: 'healing-from-spiritual-shaming-in-campus-relationships', title: 'Rebuilding Self-Esteem After Spiritual Shaming in Campus Romance', focus: 'healing from religious shaming, recovering personal dignity, and discovering wholesome love' }
];

const allC13Pages = [];

// 1. Process explicit c13Defs
for (const m of c13Defs) {
  const t = topics.find((x) => x.num === m.num);
  allC13Pages.push(
    createWave1Page({
      num: m.num,
      slug: t.slug,
      title: t.title,
      description: m.desc,
      kicker: m.kicker,
      h1: t.title,
      lede: `Navigating ${m.topicDilemma} demands practical adaptability, emotional maturity, and mutual spiritual respect. Here is the definitive guide to building a strong relationship.`,
      quickTake: m.quickTake,
      section1Heading: `The ${m.kicker} Paradigm: Faith and Romance in Tertiary Life`,
      section1Content: `
        <p>In African tertiary institutions—from premier federal universities like UI, UNILAG, and UNN to vibrant polytechnic campuses—campus fellowships and student religious societies serve as central social and spiritual hubs. For many undergraduates, their primary community revolves around church fellowships, choir rehearsals, and prayer meetings.</p>
        <p>When romance emerges within this deeply spiritual environment, students must reconcile personal romantic desires with fellowship codes, peer expectations, and core moral convictions. Navigating this intersection with integrity protects personal peace and spiritual growth.</p>
      `,
      section2Heading: 'Daily Friction Points and Lived Realities in Campus Ministries',
      section2Content: `
        <p>Tension often arises when fellowship culture imposes unspoken expectations or when couples experience guilt over the natural evolution of physical and emotional intimacy.</p>
        <p>Couples who thrive establish clear, personal communication early. They separate external church politics from their private relationship, ensuring their connection is grounded in authentic love and mutual respect.</p>
      `,
      tableHeading: `Comparative Analysis: Wholesome Spiritual Courtship vs Common Pitfalls`,
      tableIntro: 'Examine the operational contrasts between mature, values-based dating and common fellowship relationship mistakes:',
      col1Header: m.colA,
      col2Header: m.colB,
      tableRows: m.rows,
      section4Heading: 'Protecting Emotional Peace, Personal Dignity, and Academic Standing',
      section4Content: `
        <p>Spiritual well-being directly shapes mental health and academic performance. When religious guilt or fellowship drama consumes your energy, revision for Continuous Assessment tests and exams inevitably suffers.</p>
        <p>Approaching faith and romance with self-compassion, clear boundaries, and honest communication allows you to deepen your spiritual life while enjoying wholesome, inspiring companionship.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Faith-Based Dating Harmony',
      section5Content: `
        <p>Follow these five strategic rules to maintain a thriving, peaceful relationship grounded in values:</p>
        <ol>
${m.ruleList.map((rule) => `          <li><strong>${rule.split(':')[0]}:</strong> ${rule.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: [
        {
          question: `How can student couples balance intense church fellowship schedules with academic studying?`,
          answer: 'Couples should establish scheduled study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
        },
        {
          question: 'What should you do if your fellowship peers gossip about your relationship?',
          answer: 'Maintain calm, dignified composure and refuse to engage in defensive arguments. Gossip dies quickly when deprived of emotional fuel. Focus your energy on your studies, trusted friends, and verified partner.'
        },
        {
          question: 'Can a relationship between people of different denominations succeed on campus?',
          answer: 'Yes, absolutely. Successful inter-denominational couples focus on their core shared values of love, integrity, and character while respecting each others worship traditions.'
        },
        {
          question: 'Why is connecting with verified students beneficial for values-based dating?',
          answer: 'Platforms like The College Date verify student status, allowing you to discover peers who genuinely understand your faith values, respect personal boundaries, and seek intentional connection.'
        }
      ],
      relatedGuides: [
        { href: '/dating-within-campus-fellowships-navigating-faith-codes', label: 'Dating in Campus Fellowships' },
        { href: '/purity-culture-and-celibacy-boundaries-in-university', label: 'Celibacy & Purity Boundaries' },
        { href: '/interfaith-dating-in-african-tertiary-institutions', label: 'Interfaith Campus Dating' },
        { href: '/campus-dating-safety', label: 'Campus Dating Safety Standards' },
      ],
    })
  );
}

// 2. Process c13Remainder (143 to 160)
for (const r of c13Remainder) {
  const t = topics.find((x) => x.num === r.num);
  allC13Pages.push(
    createWave1Page({
      num: r.num,
      slug: t.slug,
      title: r.title,
      description: `Complete guide to ${r.focus} in university and college environments. Discover spiritual balance, moral clarity, and practical relationship advice.`,
      kicker: 'Faith & Campus Romance',
      h1: r.title,
      lede: `Navigating ${r.focus} requires practical tact, mature boundaries, and clear communication. Here is the definitive student guide to thriving in your spiritual and romantic life.`,
      quickTake: `Navigating ${r.focus} demands transparent communication, respect for spiritual convictions, and disciplined emotional maturity. Prioritizing character, personal autonomy, and mutual respect builds wholesome, drama-free love.`,
      section1Heading: `Understanding the Lived Reality of ${r.title.split(':')[0]}`,
      section1Content: `
        <p>Across university communities, student faith groups provide vital social and emotional anchorage. However, balancing personal romantic desires with spiritual convictions requires navigating delicate boundaries.</p>
        <p>When partners communicate openly about their beliefs, personal boundaries, and long-term values, emotional peace follows. True spiritual compatibility is demonstrated in daily kindness, integrity, and mutual respect.</p>
      `,
      section2Heading: 'Daily Friction Points and Spiritual Pressures on Campus',
      section2Content: `
        <p>Pressure from fellowship leadership, peer gossip, and differing religious practices can strain student relationships if not addressed proactively.</p>
        <p>Couples who build lasting bonds prioritize mutual understanding over rigid legalism, supporting each other through academic trials and spiritual seasons.</p>
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs High-Risk Errors`,
      tableIntro: 'Examine the operational contrasts between considerate, values-based student behavior and common relationship pitfalls:',
      col1Header: 'Values-Based Best Practices',
      col2Header: 'High-Risk Relationship Pitfalls',
      tableRows: [
        ['Conviction Alignment', 'Open, honest discussions regarding spiritual boundaries and beliefs.', 'Suppressing doubts or using religious pressure to coerce partner.'],
        ['Community Interaction', 'Maintaining quiet personal dignity and boundary respect in public.', 'Allowing fellowship gossip to dictate private relationship choices.'],
        ['Intimacy Standards', 'Mutually agreed physical and emotional limits respected by both.', 'Ambiguous limits leading to recurring guilt and emotional turmoil.'],
        ['Ministry Balance', 'Balancing fellowship commitments with study hours and couple time.', 'Exhausting all mental energy on church duties while ignoring partner.'],
        ['Long-Term Vision', 'Aligning on foundational values of honesty, love, and character.', 'Relying solely on external religious labels without true compatibility.']
      ],
      section4Heading: 'Nurturing Spiritual Peace and Mental Wholeness on Campus',
      section4Content: `
        <p>Healthy campus romance uplifts your spiritual walk and mental peace. When a relationship is grounded in mutual respect, it serves as an emotional sanctuary against academic stress.</p>
        <p>By protecting your personal boundaries and honoring your authentic self, you build a partnership that honors your convictions and strengthens your future.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Wholesome Faith-Based Romance',
      section5Content: `
        <p>Follow these five strategic rules to maintain personal integrity while building deep romantic intimacy:</p>
        <ol>
          <li><strong>The Character Test:</strong> Look for genuine fruits of kindness, humility, and patience rather than public piety.</li>
          <li><strong>The Early Boundary Compact:</strong> Establish non-negotiable physical and emotional boundaries from the start.</li>
          <li><strong>The Academic Sanctuary:</strong> Never let fellowship or dating activities displace revision for semester exams.</li>
          <li><strong>The Privacy Shield:</strong> Protect your relationship details from inquisitive church cliques.</li>
          <li><strong>The Verified Connection Standard:</strong> Use The College Date to discover like-minded students who share your values.</li>
        </ol>
      `,
      faqs: [
        {
          question: `How can student couples balance intense church fellowship schedules with academic studying?`,
          answer: 'Couples should establish scheduled study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
        },
        {
          question: 'What should you do if your fellowship peers gossip about your relationship?',
          answer: 'Maintain calm, dignified composure and refuse to engage in defensive arguments. Gossip dies quickly when deprived of emotional fuel. Focus your energy on your studies, trusted friends, and verified partner.'
        },
        {
          question: 'Can a relationship between people of different denominations succeed on campus?',
          answer: 'Yes, absolutely. Successful inter-denominational couples focus on their core shared values of love, integrity, and character while respecting each others worship traditions.'
        },
        {
          question: 'Why is connecting with verified students beneficial for values-based dating?',
          answer: 'Platforms like The College Date verify student status, allowing you to discover peers who genuinely understand your faith values, respect personal boundaries, and seek intentional connection.'
        }
      ],
      relatedGuides: [
        { href: '/dating-within-campus-fellowships-navigating-faith-codes', label: 'Dating in Campus Fellowships' },
        { href: '/purity-culture-and-celibacy-boundaries-in-university', label: 'Celibacy & Purity Boundaries' },
        { href: '/interfaith-dating-in-african-tertiary-institutions', label: 'Interfaith Campus Dating' },
        { href: '/campus-dating-safety', label: 'Campus Dating Safety Standards' },
      ],
    })
  );
}

// Write Cluster 13 module
const c13Output = `// Auto-generated Cluster 13: Campus Fellowship, Faith Conflicts & Moral Dilemmas (Topics 141 to 160)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster13Pages = ${JSON.stringify(allC13Pages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster13.mjs'), c13Output, 'utf8');
console.log(`✓ Successfully compiled scripts/seo-expansion-wave1/cluster13.mjs (${allC13Pages.length} topics)`);
