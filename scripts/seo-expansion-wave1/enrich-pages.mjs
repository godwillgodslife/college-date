import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

// Cluster-specific rich enrichment modules
const clusterEnrichments = {
  11: {
    sec1Extra: `
        <p>Living within tertiary student residences—from federal collegiate halls like Moremi and Jaja at UNILAG, Mellanby and Queen Idia at the University of Ibadan, to Fajuyi at OAU, Dan Fodio at ABU Zaria, and Hall 2 at UNIBEN—is a profoundly communal experience. Because hostel rooms originally architected for two to four undergraduates frequently house eight to twelve occupants through informal squatting agreements, personal boundaries are razor-thin. Every interpersonal encounter, romantic visitor, or quiet telephone call reverberates across bunk beds and shared corridor spaces. Understanding the social architecture of your hall is essential for pursuing romance without alienating your roommates or attracting hostile scrutiny from hall porters and floor executives.</p>
        <p>Undergraduate relationships within high-density hostels operate under continuous peer observation. Privacy is an intentional creation rather than an environmental default. Successful campus couples understand that personal discretion, quiet self-possession, and mutual courtesy are indispensable virtues. When you treat your living quarters with domestic respect and manage romantic interactions with tact, you earn the goodwill of your peers while cultivating a mature, lasting bond that withstands the chaotic rhythms of collegiate residence life.</p>
    `,
    sec2Extra: `
        <p>Daily life in campus residences presents logistical hurdles that test any relationship. Unpredictable electrical blackouts, municipal water rationing requiring early-morning queueing with plastic buckets, shared hot plates, and rigid curfew inspections create continuous friction. In female halls, strict visiting hours (typically ending between 8:00 PM and 10:00 PM) enforced by vigilant hall porters mean that evening visits must be executed with military precision. Failing to coordinate arrival and departure times not only causes embarrassment at security checkpoints but can also lead to room searches and administrative penalties.</p>
        <p>To preserve domestic harmony, forward-thinking student couples relocate their romantic interactions away from crowded bunks. Utilizing campus botanical gardens, sports stadium bleachers, university cafeterias, and faculty quads after lecture hours provides scenic, tranquil spaces for intimate conversation without imposing on roommates who may be sleeping, studying, or resting after grueling lectures. Treating your shared dormitory as a quiet sanctuary rather than a private lounge maintains the domestic peace necessary for academic success.</p>
    `,
    sec4Extra: `
        <p>Undergraduate academic performance is intimately tied to residential calm. In an educational environment where continuous assessment (CA) tests contribute up to 40% of final grades and semester examination timetables are unforgiving, residential turmoil is a primary catalyst for academic decline. When relationship misunderstandings or roommate disputes erupt in crowded quarters, students lose their sanctuary for rest and revision, resulting in acute mental fatigue, anxiety, and cratering Cumulative Grade Point Averages (CGPA).</p>
        <p>Maintaining emotional composure and academic ambition requires intentional boundary management. Dedicated partners view each other as intellectual teammates rather than sources of emotional distraction. By syncing study routines in the university library, sharing academic summaries, and giving each other uninterrupted focus during test cycles, student couples build an enduring partnership that elevates both their grades and their emotional connection.</p>
    `,
    sec5Extra: `
        <p>Mastering the social dynamics of campus hostels transforms a potentially suffocating environment into a powerful launchpad for personal growth. By honoring domestic agreements, treating fellow residents with steadfast consideration, and establishing relationship boundaries grounded in emotional maturity, you ensure that your university romance enriches your collegiate years without compromising your housing stability or your academic trajectory.</p>
    `,
    faqSuffix: " Always maintain transparent communication with your partner and living companions, and anchor your connection in mutual respect for academic commitments and personal boundaries."
  },
  12: {
    sec1Extra: `
        <p>Inter-faculty dating in higher education bridges starkly divergent academic subcultures. An undergraduate navigating the intensive laboratory sessions and technical drawing deadlines of Engineering operates on a fundamentally different rhythm than a partner immersed in the statutory case analysis of Law, the clinical hospital ward rounds of Medicine, or the creative critique juries of Environmental Sciences. These structural differences shape daily energy levels, conversational vocabulary, and available leisure hours, making empathy and mutual curiosity the cornerstone of romantic compatibility.</p>
        <p>When student couples fail to appreciate the rigor of their partner's discipline, misunderstandings easily arise. What appears to be emotional withdrawal is frequently intellectual exhaustion from solving complex thermodynamics equations or memorizing anatomical pathways. Recognizing that each faculty imposes its own unique mental and physical demands allows partners to offer tailored support rather than personalized grievance, transforming departmental differences into a source of mutual admiration.</p>
    `,
    sec2Extra: `
        <p>The practical logistics of inter-faculty relationships require deliberate schedule synchronization. Lecture halls are frequently situated at opposite ends of sprawling campuses, turning spontaneous afternoon meetups into exhausting sprints between distant complexes. Furthermore, while some disciplines feature flexible seminar formats, others enforce mandatory 8:00 AM to 5:00 PM workshop presence with strict attendance thresholds required to qualify for semester examinations.</p>
        <p>Successful inter-faculty couples establish predictable, low-pressure rituals that bridge the geographical and temporal distance. Coordinating lunch breaks at central campus eateries, scheduling shared study sessions in the main university library, and utilizing asynchronous communication channels ensure consistent connection without disrupting academic obligations. By respecting each other's professional deadlines, couples build a collaborative dynamic that enhances both individuals' productivity.</p>
    `,
    sec4Extra: `
        <p>Navigating differing faculty grading distributions and assessment tempos requires significant psychological maturity. A student enrolled in a department known for stringent grading curves may experience acute academic anxiety while their partner enjoys higher mark distributions. Without emotional maturity, these academic disparities can spark unspoken insecurity, competitive resentment, or dismissive attitudes that erode relationship goodwill.</p>
        <p>Protecting mental health and academic trajectory depends on viewing your relationship as a sanctuary from faculty competition. Cultivating an environment where both partners can celebrate project defenses, survive grueling continuous assessments, and decompress without judgment creates a resilient foundation. High-achieving undergraduates leverage their partner's distinct perspective to broaden their intellectual horizons and maintain equilibrium during high-stakes examination diets.</p>
    `,
    sec5Extra: `
        <p>Thriving in an inter-faculty relationship demonstrates high emotional intelligence and adaptability—traits that serve students far beyond graduation. By celebrating your partner's unique academic discipline, establishing synchronized study routines, and respecting professional demands, you build a balanced, intellectually stimulating partnership that enriches your university experience.</p>
    `,
    faqSuffix: " Prioritizing asynchronous communication during heavy laboratory or clinical shifts and establishing scheduled co-working sessions ensures both partners thrive academically while deepening their bond."
  },
  13: {
    sec1Extra: `
        <p>Campus faith communities—including the Joint Christian Campus Fellowship (JCCF), Muslim Students' Society of Nigeria (MSSN), and prominent evangelical organizations such as Believers LoveWorld, CASOR, NIFES, RCF, and Winners Campus Fellowship—constitute the primary social, moral, and spiritual anchors for hundreds of thousands of undergraduates. Within these vibrant assemblies, romantic relationships exist within a matrix of executive governance, spiritual mentorship, worker conduct codes, and doctrinal expectations. Navigating attraction while maintaining spiritual integrity requires wisdom, discretion, and transparent personal values.</p>
        <p>For student believers, romantic pursuits are deeply intertwined with purpose, character evaluation, and divine guidance. However, the ambiguous 'brother/sister' dynamic common in campus fellowships frequently creates emotional confusion, unspoken expectations, and vulnerability to spiritual guilt. Establishing clear intentions early prevents emotional manipulation and preserves fellowship harmony, ensuring that personal devotion and romantic interest complement rather than contradict each other.</p>
    `,
    sec2Extra: `
        <p>Balancing spiritual service with academic coursework and relationship development presents intense logistical demands. Weekly schedules packed with mid-week prayer meetings, choir rehearsals, evangelism outreaches, departmental fellowship tutorials, and multi-hour Sunday services leave limited discretionary hours for private dates. When couples fail to coordinate their calendars, church fatigue and academic backlog quickly accumulate, sparking avoidable tension.</p>
        <p>Healthy faith-based couples establish non-negotiable boundaries around time, physical touch, and privacy. Selecting public campus venues—such as serene university lawns, student cafeterias, and faculty reading parks—enables intimate, spiritually aligned discussions while eliminating moral compromise. Furthermore, aligning on financial expectations regarding campus offerings, fellowship dues, and modest date outings ensures domestic peace and financial stewardship.</p>
    `,
    sec4Extra: `
        <p>The psychological friction of dating within faith communities often stems from the fear of peer gossip, executive reprimand, or personal spiritual inadequacy. When young adults experience natural romantic attraction within environments that heavily police social interactions, internal conflict and moral anxiety can derail emotional well-being and academic focus. Unresolved spiritual dilemmas frequently manifest as sudden emotional coldness or unexplained relationship breaks.</p>
        <p>True spiritual maturity balances deep moral convictions with authenticity, emotional honesty, and grace. Couples who cultivate open, non-judgmental communication can address spiritual doubts, personal boundaries, and academic pressures constructively. By supporting each other's spiritual growth while remaining focused on academic excellence, student believers develop resilient character and enduring relational foundations.</p>
    `,
    sec5Extra: `
        <p>Pursuing romance within a campus faith framework offers a rare opportunity to build a partnership anchored in shared values, moral integrity, and mutual respect. By establishing clear physical boundaries, maintaining transparent communication, and keeping academic and spiritual priorities in balance, you build an honorable, fulfilling relationship that honors your convictions.</p>
    `,
    faqSuffix: " Upholding mutual respect for each other's moral convictions and maintaining open, honest communication with trusted spiritual mentors ensures a healthy, transparent campus courtship."
  },
  14: {
    sec1Extra: `
        <p>Academic disruptions triggered by nationwide union industrial actions—such as strikes by the Academic Staff Union of Universities (ASUU), Non-Academic Staff Union (NASU), and Senior Staff Association of Nigerian Universities (SSANU)—represent one of the most volatile disruptions to collegiate life. In a matter of hours, buzzing campus ecosystems dissolve as university authorities issue mandatory hostel vacation notices, forcing hundreds of thousands of students to pack their belongings and disperse across the country to family homes.</p>
        <p>The sudden transition from daily physical companionship to abrupt long-distance separation introduces immense emotional friction. Couples who spent hours walking between lecture quads and library reading rooms are suddenly separated by hundreds of kilometers, varying regional electrical grid reliability, and differing domestic expectations. Navigating this disruption requires conscious dedication, structural adaptability, and sustained empathy to prevent emotional drift.</p>
    `,
    sec2Extra: `
        <p>The day-to-day realities of maintaining romance during an indefinite academic shutdown differ drastically from campus life. At home, undergraduates often contend with parental surveillance, heavy domestic chores, unstable electrical power, and the rising cost of internet mobile data required for WhatsApp calls and video check-ins. Furthermore, disparities in activity levels—such as one partner securing a lucrative tech internship or creative side-hustle while the other remains idle at home—can breed unspoken resentment and conversational disconnect.</p>
        <p>Resilient couples establish realistic communication cadences tailored to home constraints. Rather than demanding constant virtual availability, partners agree on dedicated evening call times and embrace thoughtful asynchronous voice notes. Actively supporting each other's personal development—whether learning digital skills, pursuing vocational crafts, or preparing for professional certifications—transforms an unwanted academic hiatus into a season of collective maturity and empowerment.</p>
    `,
    sec4Extra: `
        <p>The psychological toll of prolonged academic strikes is profound. Watching graduation dates slip away, witnessing peers at private or foreign universities advance, and enduring the stagnation of indefinite waiting triggers chronic anxiety, depressive episodes, and existential dread. When personal morale is shattered, relationships frequently bear the brunt of misdirected frustration and emotional withdrawal.</p>
        <p>Maintaining emotional wellness during university shutdowns requires proactive mental health habits and mutual encouragement. Partners must serve as emotional anchors, celebrating small personal wins and reminding each other of their long-term potential. Crucially, anticipating the inevitable shock of sudden resumption—where university administrations compress an entire semester's curriculum and examinations into four frantic weeks—enables couples to prepare intellectually and emotionally for the academic sprint ahead.</p>
    `,
    sec5Extra: `
        <p>Enduring the crucible of university strikes together is one of the ultimate tests of romantic resilience. By maintaining consistent communication, investing in personal growth during forced downtime, and providing unwavering emotional support, you and your partner forge a bond capable of surmounting any real-world challenge.</p>
    `,
    faqSuffix: " Establishing regular communication routines and offering mutual encouragement during uncertain shutdowns keeps relationships resilient, grounded, and emotionally vibrant."
  },
  15: {
    sec1Extra: `
        <p>The transition from undergraduate completion to the National Youth Service Corps (NYSC) represents the most definitive demographic inflection point in higher education. The whirlwind progression from final-year project defenses, clearance procedures, and convocation celebrations to receiving the official NYSC Call-Up Letter plunges young graduates into an entirely new social, geographic, and financial reality. Arriving at three-week orientation camps—from Keffi, Iyana Ipaja, and Ede to Kubwa, Nonwa Gbam, and orientation camps across the 36 states—sparks intense, fast-paced social interactions under rigorous paramilitary discipline.</p>
        <p>Within orientation camps, the high-energy environment—characterized by early morning bugles, physical drills, platoon competitions, and lively Mammy Market evenings—creates ideal conditions for intense 'camp romances.' However, differentiating between situational infatuation fueled by novelty and enduring relational compatibility is critical. Graduates must navigate these social pressures with clear-eyed foresight to protect existing commitments and make grounded choices about their future.</p>
    `,
    sec2Extra: `
        <p>Following the closing parade of orientation camp, corps members face the sobering realities of their Place of Primary Assignment (PPA). Assigned to rural secondary schools, local government councils, healthcare centers, or urban private corporations, corpers must adapt to unfamiliar local dialects, communal housing, and the modest economic reality of the federal government monthly stipend (allawee). For couples deployed to different states, the sudden reality of cross-country long-distance dating imposes significant logistical and financial strain.</p>
        <p>Sustaining intimacy across distant postings demands disciplined financial planning and creative communication. Managing interstate travel costs amidst fluctuating transport fares requires couples to prioritize virtual connection and schedule intentional reunion trips during public holidays or quarterly leave windows. Supporting each other through local adaptation, community development service (CDS) projects, and workplace hurdles deepens mutual trust and demonstrates real-world partnership.</p>
    `,
    sec4Extra: `
        <p>The post-graduation service year is characterized by acute existential and psychological pressures. As the completion of NYSC approaches, young adults confront the looming realities of the competitive corporate job market, graduate trainee aptitude tests, foreign postgraduate scholarship applications, and mounting parental pressure regarding career viability and marriage timelines. When partners advance along divergent professional paths—one securing corporate employment while the other searches for opportunities—insecurity and status anxiety can strain the relationship.</p>
        <p>Overcoming post-graduation divergence requires absolute transparency, emotional security, and shared long-term alignment. High-achieving partners celebrate each other's career milestones without jealousy and offer constructive assistance with resume reviews, interview preparations, and professional networking. Viewing the service year and early career phase as an investment in a shared future transforms potential anxiety into collaborative strength.</p>
    `,
    sec5Extra: `
        <p>Successfully transitioning from collegiate dating to post-graduation adulthood is a rare and rewarding achievement. By maintaining transparent career communication, managing financial expectations with integrity, and supporting each other through professional challenges, you lay the cornerstone for a lifelong, equitable partnership.</p>
    `,
    faqSuffix: " Transparent conversations regarding career aspirations, geographic relocations, and financial timelines provide the clarity needed to transition smoothly from university dating to lifelong partnership."
  }
};

async function enrichAllClusters() {
  console.log('Starting content enrichment for Wave 1 (Clusters 11-15)...');

  const clusters = [
    { num: 11, file: 'cluster11.mjs', exportName: 'cluster11Pages' },
    { num: 12, file: 'cluster12.mjs', exportName: 'cluster12Pages' },
    { num: 13, file: 'cluster13.mjs', exportName: 'cluster13Pages' },
    { num: 14, file: 'cluster14.mjs', exportName: 'cluster14Pages' },
    { num: 15, file: 'cluster15.mjs', exportName: 'cluster15Pages' },
  ];

  for (const c of clusters) {
    const filePath = join(root, 'scripts', 'seo-expansion-wave1', c.file);
    const mod = await import(pathToFileURL(filePath).href);
    const pages = mod[c.exportName];
    const enrich = clusterEnrichments[c.num];

    console.log(`Enriching ${c.file} (${pages.length} pages)...`);

    for (const page of pages) {
      // 1. Enrich Section 1 (index 0)
      if (page.sections[0] && !page.sections[0].content.includes('tertiary student residences') && !page.sections[0].content.includes('Inter-faculty dating') && !page.sections[0].content.includes('Campus faith communities') && !page.sections[0].content.includes('Academic disruptions triggered') && !page.sections[0].content.includes('transition from undergraduate completion')) {
        page.sections[0].content = `${page.sections[0].content.trim()}\n${enrich.sec1Extra.trim()}\n`;
      }

      // 2. Enrich Section 2 (index 1)
      if (page.sections[1] && !page.sections[1].content.includes('logistical hurdles that test') && !page.sections[1].content.includes('deliberate schedule synchronization') && !page.sections[1].content.includes('Balancing spiritual service') && !page.sections[1].content.includes('maintaining romance during an indefinite') && !page.sections[1].content.includes('Following the closing parade')) {
        page.sections[1].content = `${page.sections[1].content.trim()}\n${enrich.sec2Extra.trim()}\n`;
      }

      // 3. Enrich Section 4 (index 3)
      if (page.sections[3] && !page.sections[3].content.includes('intimately tied to residential calm') && !page.sections[3].content.includes('differing faculty grading distributions') && !page.sections[3].content.includes('The psychological friction of dating within faith') && !page.sections[3].content.includes('psychological toll of prolonged academic strikes') && !page.sections[3].content.includes('post-graduation service year is characterized')) {
        page.sections[3].content = `${page.sections[3].content.trim()}\n${enrich.sec4Extra.trim()}\n`;
      }

      // 4. Enrich Section 5 (index 4)
      if (page.sections[4] && !page.sections[4].content.includes('Mastering the social dynamics') && !page.sections[4].content.includes('Thriving in an inter-faculty') && !page.sections[4].content.includes('Pursuing romance within a campus faith') && !page.sections[4].content.includes('Enduring the crucible of university') && !page.sections[4].content.includes('Successfully transitioning from collegiate')) {
        page.sections[4].content = `${page.sections[4].content.trim()}\n${enrich.sec5Extra.trim()}\n`;
      }

      // 5. Enrich FAQs if needed
      for (const faq of page.faqs) {
        if (!faq.answer.endsWith(enrich.faqSuffix.trim())) {
          faq.answer = `${faq.answer.trim()}${enrich.faqSuffix}`;
        }
      }
    }

    // Write back the updated file
    const fileContent = `// Auto-generated Cluster ${c.num}: Enriched Deep Content (Topics ${c.num === 11 ? '101 to 120' : c.num === 12 ? '121 to 140' : c.num === 13 ? '141 to 160' : c.num === 14 ? '161 to 180' : '181 to 200'})
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const ${c.exportName} = ${JSON.stringify(pages, null, 2)};
`;
    writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✓ Enriched and wrote ${c.file}`);
  }

  console.log('\nAll cluster modules enriched successfully!');
}

enrichAllClusters().catch((err) => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
