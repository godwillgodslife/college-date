import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave2Batch2Pages = [
  {
    slug: 'how-to-ask-someone-out-in-university',
    file: 'public/how-to-ask-someone-out-in-university.html',
    lang: 'en',
    title: 'How to Ask Someone Out in University - Scripts & Low-Pressure Tips',
    description: 'Learn how to ask someone out in university without awkwardness. Low-pressure scripts for coursemates, campus crushes, coffee dates, and handling rejection.',
    kicker: 'Campus Dating Advice',
    h1: 'How to Ask Someone Out in University',
    lede: 'You have been chatting with a coursemate or campus crush, exchanged smiles in the library, or matched on a dating app—now comes the big hurdle: actually asking them out. Here is a practical, step-by-step guide with low-pressure scripts to transition from friendly banter to an enjoyable first date.',
    date: '2026-09-16',
    ctaHeading: 'Ready to Meet Campus Matches?',
    ctaText: 'Join The College Date to discover classmates and campus crushes who are already looking for connection on your campus.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-golden-rule-lower-the-stakes',
        heading: 'The Golden Rule: Lower the Stakes Completely',
        content: `
          <p>Asking someone out at university can feel terrifying because of proximity: you worry that if they decline, you will face unbearable awkwardness in Monday morning lectures, at the cafeteria, or in mutual student group chats.</p>
          <p>The secret to eliminating that fear is lowering the stakes. Never ask someone for a high-intensity, expensive three-course dinner as a first meetup. Instead, reframe the invitation into a casual, daytime, low-pressure micro-interaction with a built-in time limit—like a 20-minute coffee between classes or grabbing a quick snack after a tutorial.</p>
        `,
      },
      {
        id: 'coursemate-and-study-scripts',
        heading: 'Script Set 1: Asking Out a Coursemate or Study Partner',
        content: `
          <p>When asking out someone in your class, use situational context so the invitation feels completely natural:</p>
          <ul>
            <li><strong>The Post-Lecture Break:</strong> <em>"That two-hour chemistry lecture was intense. I'm heading to grab a smoothie / coffee at the student centre—do you want to come with me for 20 minutes?"</em></li>
            <li><strong>The Revision Reward:</strong> <em>"We've been staring at this assignment for two hours. Let's take a break and grab lunch at the campus canteen."</em></li>
            <li><strong>The Advance Invitation:</strong> <em>"Hey, I really enjoy chatting after class! Are you free to grab coffee tomorrow around 1 PM before our afternoon lab?"</em></li>
          </ul>
        `,
      },
      {
        id: 'online-dating-app-scripts',
        heading: 'Script Set 2: Moving from Dating App Chat to an In-Person Meetup',
        content: `
          <p>If you matched on The College Date or connected via social media, do not linger in endless messaging for weeks. After 3 to 4 days of good conversation, initiate the in-person meetup:</p>
          <ul>
            <li><em>"I've really enjoyed chatting with you on here! Are you around campus on Thursday? Let's grab coffee at the library cafe before your 2 PM class."</em></li>
            <li><em>"You mentioned you love the pastries at the student union bakery—I'm grabbing one tomorrow afternoon, want to join me?"</em></li>
          </ul>
          <p>Notice that these invitations suggest a specific place, day, and time, making it easy for them to say yes or suggest an alternative day.</p>
        `,
      },
      {
        id: 'anatomy-of-a-great-campus-first-date',
        heading: 'The Anatomy of a Great Campus First Date',
        content: `
          <p>A successful campus first date follows three core principles:</p>
          <ol>
            <li><strong>Daylight & Public Space:</strong> Always meet in a bustling campus hub—the student centre, a campus coffee shop, or an outdoor courtyard bench.</li>
            <li><strong>Defined Time Limit:</strong> Knowing the date has a natural endpoint (e.g. <em>"I have a tutorial at 2 PM"</em>) takes away performance anxiety for both of you. If the vibe is amazing, you can extend it; if it is neutral, you part ways smoothly.</li>
            <li><strong>Student Budget Friendly:</strong> A coffee, smoothie, or campus pastry keeps things relaxed and avoids awkward bill-splitting stress.</li>
          </ol>
        `,
      },
      {
        id: 'handling-rejection-gracefully',
        heading: 'How to Handle a "No" with Class, Dignity & Zero Drama',
        content: `
          <p>If they say they are busy and don't offer an alternative time, or gently let you know they are seeing someone else, handle it with poise:</p>
          <p>Smile, nod, and say: <em>"No worries at all! See you in class on Friday."</em></p>
          <p>Handling rejection calmly and politely proves your emotional maturity, ensures there is zero awkwardness in future classes, and earns massive respect across campus.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'How long should you chat before asking someone out in university?',
        answer: 'Aim to ask them out after 3 to 5 days of consistent, engaging chat. Waiting longer often causes momentum to stall and builds unrealistic expectations.',
      },
      {
        question: 'What is the best time to ask a coursemate out?',
        answer: 'Immediately after class or during a study break when you are already talking naturally. Avoid cornering them before an exam when stress levels are high.',
      },
      {
        question: 'What if they say they are busy but do not suggest another time?',
        answer: 'Take it as a polite decline. Step back gracefully, treat them with cordial friendliness in class, and redirect your energy toward other connections.',
      },
      {
        question: 'Can I find people on my campus who want to date on The College Date?',
        answer: 'Yes! The College Date lets you discover students filtered by your university and faculty, allowing you to match with mutual interest.',
      },
    ],
    relatedGuides: [
      { label: 'How to Talk to Your Campus Crush', href: '/how-to-talk-to-your-campus-crush' },
      { label: 'First Message Examples for Dating Apps', href: '/first-message-examples-dating-apps' },
      { label: 'Campus Date Ideas for Students', href: '/campus-date-ideas-students' },
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
    ],
  },
  {
    slug: 'dating-as-an-introvert-in-university',
    file: 'public/dating-as-an-introvert-in-university.html',
    lang: 'en',
    title: 'Dating as an Introvert in University - Practical Campus Guide',
    description: 'Master dating as an introvert in university. Learn how to protect your social battery, build genuine connections, choose low-anxiety dates, and use student apps.',
    kicker: 'Introvert Campus Life',
    h1: 'Dating as an Introvert in University',
    lede: 'University campus culture is often loud, extroverted, and fast-paced. But you don\'t need to be the loudest person in the room or attend every campus party to build a deeply fulfilling romantic and social life. Here is how introverts can navigate campus dating on their own terms.',
    date: '2026-09-16',
    ctaHeading: 'Dating on Your Own Terms',
    ctaText: 'Join The College Date to connect with students who appreciate depth, quiet humor, and genuine 1-on-1 connection.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-introverts-campus-advantage',
        heading: 'The Introvert\'s Secret Superpower in Dating',
        content: `
          <p>In university, extroverted socialising—clubbing, crowded hostel parties, and loud dining hall banter—often takes center stage. For introverted students, this environment can lead to quick social battery depletion and feeling like you don't fit the campus dating mold.</p>
          <p>However, introverts possess profound dating advantages that partners deeply value: you are a genuine listener, you prefer deep 1-on-1 conversations over superficial small talk, and you are thoughtful and observant. Once you stop trying to perform like an extrovert, dating becomes far more rewarding and natural.</p>
        `,
      },
      {
        id: 'protecting-your-social-battery',
        heading: 'Protecting Your Social Battery on Campus',
        content: `
          <p>Your social energy is a finite resource. Follow these habits to prevent dating burnout:</p>
          <ul>
            <li><strong>Don't Schedule Dates After Heavy Presentation Days:</strong> If you have six hours of lectures and a class presentation on Wednesday, do not schedule a first date for Wednesday evening. Plan meetups on days when you have mental space.</li>
            <li><strong>Schedule Recharging Time:</strong> Block out solo downtime before and after social outings to read, listen to music, or relax in your room without guilt.</li>
            <li><strong>Embrace Shorter Date Formats:</strong> A 45-minute coffee meetup allows you to be at your sharpest, most attentive self without hitting the exhaustion wall.</li>
          </ul>
        `,
      },
      {
        id: 'low-anxiety-date-ideas',
        heading: 'Low-Anxiety, High-Connection Date Ideas',
        content: `
          <p>Choose dates that allow for relaxed conversation without intense sensory bombardment:</p>
          <ul>
            <li><strong>Quiet Library Cafe or Bookshop Hangout:</strong> Browse books or share a corner table with tea or hot chocolate.</li>
            <li><strong>Scenic Campus Walks or Botanical Gardens:</strong> Walking side-by-side naturally lowers eye-contact pressure and sparks comfortable, flowing conversation.</li>
            <li><strong>Study Dates with Snacks:</strong> Review lecture notes together in a study pavilion, taking breaks to share a quick snack.</li>
            <li><strong>Campus Art Galleries or Cultural Exhibits:</strong> The art provides built-in conversation topics, eliminating awkward pauses.</li>
          </ul>
        `,
      },
      {
        id: 'optimizing-dating-profiles-for-introverts',
        heading: 'Crafting an Authentic Introvert Dating Profile',
        content: `
          <p>Your dating profile should attract people who appreciate your genuine vibe:</p>
          <ul>
            <li><strong>Highlight Specific Passions:</strong> Instead of generic lines like <em>"I love music,"</em> mention your favorite indie artists, favorite podcasts, or books that moved you.</li>
            <li><strong>State Your Vibe Clearly:</strong> <em>"More likely to be found in a quiet corner with headphones than at a club. Looking for someone to share good conversation, laughter, and low-key campus coffee walks."</em></li>
            <li><strong>Use The College Date's "Find Friends" Mode:</strong> If dating feels too intense initially, connect platonically for study partnerships and campus camaraderie.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'How do introverts start conversations on dating apps?',
        answer: 'Reference something specific and thoughtful from their profile—a book, an interesting hobby, or a quirky photo detail—rather than opening with generic small talk.',
      },
      {
        question: 'Is it okay to tell your date you are introverted?',
        answer: 'Yes, absolutely! Being self-aware and comfortable with your personality is attractive and helps set comfortable expectations for both of you.',
      },
      {
        question: 'How do I handle date anxiety as a shy student?',
        answer: 'Pick a familiar campus venue, keep the meetup short (30–45 minutes), and remember that your date is likely nervous too.',
      },
      {
        question: 'Can I use The College Date to meet other quiet students?',
        answer: 'Yes. Profile bios and interest tags make it easy to find fellow students who value quiet coffee hangouts, shared study sessions, and thoughtful conversation.',
      },
    ],
    relatedGuides: [
      { label: 'How to Make Friends in University', href: '/how-to-make-friends-in-university' },
      { label: 'Dating Bio Examples for Students', href: '/dating-bio-examples-students' },
      { label: 'How to Talk to Your Campus Crush', href: '/how-to-talk-to-your-campus-crush' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
    ],
  },
  {
    slug: 'how-to-handle-ghosting-in-university',
    file: 'public/how-to-handle-ghosting-in-university.html',
    lang: 'en',
    title: 'How to Handle Ghosting in University - Campus Coping & Etiquette',
    description: 'What to do when someone ghosts you in university. How to handle running into them on campus, maintain your dignity, avoid drama, and move on with confidence.',
    kicker: 'Campus Relationship Advice',
    h1: 'How to Handle Ghosting in University',
    lede: 'Ghosting hurts in any scenario, but when it happens at university—where you might run into the person outside the library, in a shared lecture hall, or in the campus cafeteria—the awkwardness can feel overwhelming. Here is how to handle on-campus ghosting with maturity, dignity, and zero drama.',
    date: '2026-09-16',
    ctaHeading: 'Find Students Who Value Real Communication',
    ctaText: 'Connect with verified students on The College Date who state their relationship intentions clearly from day one.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'why-campus-ghosting-stings',
        heading: 'Why Ghosting on Campus Stings Differently',
        content: `
          <p>In the outside world, being ghosted usually means the person vanishes into the ether—you rarely, if ever, cross paths again. But at university, your lives are intertwined by campus geography. You might share an 8:00 AM lecture, see them walking past your hostel, or bump into them at the student union.</p>
          <p>The sudden cut of communication leaves you with unanswered questions, awkward tension, and the temptation to overanalyze what went wrong. Understanding how to navigate this situation protects your emotional peace and your campus reputation.</p>
        `,
      },
      {
        id: 'what-ghosting-really-means',
        heading: 'What Ghosting Actually Says About the Other Person',
        content: `
          <p>When someone stops replying abruptly without explanation, the instinct is often to blame yourself: <em>"Did I say something weird? Was I not interesting enough?"</em></p>
          <p>In reality, ghosting is almost never about your worth. It is a direct reflection of their communication deficits. Many young adults simply lack the maturity to have a brief, respectful conversation saying: <em>"Hey, I've really enjoyed chatting, but I don't feel a romantic connection."</em> They choose avoidance because it is easier for them, even if it is inconsiderate to you.</p>
        `,
      },
      {
        id: 'four-golden-rules-surviving-ghosting',
        heading: 'The 4 Golden Rules for Handling Campus Ghosting',
        content: `
          <p>Protect your self-respect and eliminate drama by following these four rules:</p>
          <ol>
            <li><strong>Do Not Double-Text or Demand Answers:</strong> If you sent a clear, friendly message and they left you on delivered or read for days, accept the silence as an answer. Sending paragraphs demanding an explanation will not bring them back and will only make you feel smaller.</li>
            <li><strong>Never Vent in Shared Class Chats or Mutual Circles:</strong> Keep your personal life out of departmental WhatsApp groups or friend circles. Gossiping about them invites unnecessary campus drama.</li>
            <li><strong>Do Not Change Your Routine or Skip Lectures:</strong> Never sit in a dark corner or miss valuable class time because of someone who lacked the courtesy to text you back. Walk into lecture halls with your head held high.</li>
            <li><strong>Resist Subtweeting or Passive-Aggressive Stories:</strong> Posting cryptic quotes about loyalty or betrayal on your WhatsApp Status or Instagram only signals that they still occupy your headspace. Silence and moving on are far more powerful.</li>
          </ol>
        `,
      },
      {
        id: 'the-polite-nod-technique',
        heading: 'What to Do When You Bump into Them on Campus',
        content: `
          <p>When you inevitably cross paths in the hallway or cafeteria, execute the <strong>"Polite Nod & Keep Walking"</strong> technique:</p>
          <p>Make brief eye contact, give a neutral, polite head nod, and continue walking to your destination. You don't need to scowl, look down at your phone, or run away. Showing calm composure signals that you are completely unfazed, emotionally mature, and focused on your own life.</p>
          <p>If you are assigned to work together on a group project, maintain complete professional courtesy. Focus strictly on the assignment deliverables, communicate politely, and keep all personal matters aside.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it okay to ask someone why they ghosted you?',
        answer: 'Generally, no. If they lacked the respect to communicate honestly the first time, asking for closure rarely produces a truthful answer and only prolongs emotional frustration.',
      },
      {
        question: 'What if they message weeks later pretending nothing happened?',
        answer: 'This is known as "zombieing." If you want an explanation, you can calmly ask, but you have zero obligation to resume conversation with someone who treats your time as disposable.',
      },
      {
        question: 'How do I stop feeling embarrassed when I see them in class?',
        answer: 'Remind yourself that you acted with honesty and vulnerability; they are the ones who acted with avoidance. Hold your head high and focus on your academic goals.',
      },
      {
        question: 'How does The College Date encourage respectful communication?',
        answer: 'The platform promotes clear intentions, mutual matching, and easy unmatching/blocking tools to ensure student interactions remain polite and safe.',
      },
    ],
    relatedGuides: [
      { label: 'How to Reject Someone Politely', href: '/how-to-reject-someone-politely' },
      { label: 'Breakup Recovery for College Students', href: '/breakup-recovery-college-students' },
      { label: 'Talking Stage Tips for Students', href: '/talking-stage-students' },
      { label: 'Situationship vs Relationship', href: '/situationship-vs-relationship' },
    ],
  },
  {
    slug: 'dating-someone-at-another-university',
    file: 'public/dating-someone-at-another-university.html',
    lang: 'en',
    title: 'Dating Someone at Another University - Cross-Campus Survival Guide',
    description: 'Essential guide to dating someone at another university. Practical tips for managing transit, conflicting exam schedules, hostel visits, and staying connected.',
    kicker: 'Inter-University Relationships',
    h1: 'Dating Someone at Another University',
    lede: 'Falling in love with someone studying at another university—whether across town or in a neighbouring city—brings a thrilling mix of independence and anticipation. Here is how to navigate inter-university relationships, balance conflicting exam timetables, manage travel logistics, and keep your connection thriving.',
    date: '2026-09-16',
    ctaHeading: 'Connect with Students Across Campuses',
    ctaText: 'Discover students on your campus and neighboring universities with verified profiles on The College Date.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'cross-campus-relationship-dynamics',
        heading: 'The Unique Dynamics of Cross-Campus Romance',
        content: `
          <p>Dating a student from another university occupies a sweet spot between local campus dating and long-distance relationships. You get the privacy of having a partner outside your immediate lecture hall and faculty gossip, plus the excitement of visiting another campus on weekends.</p>
          <p>However, cross-campus relationships also bring concrete challenges: coordinating different academic calendars, coping with exam period isolation, and managing transit costs (bus fares, matatus, cabs) on a student budget.</p>
        `,
      },
      {
        id: 'managing-conflicting-academic-calendars',
        heading: 'Navigating Mismatched Timetables and Exam Seasons',
        content: `
          <p>One of the biggest hurdles in inter-university dating is that universities rarely operate on identical academic calendars. One campus may be on semester break while the other is in the middle of grueling final examinations. In some regions, industrial actions or semester delays create even larger gaps.</p>
          <p>Success requires mutual patience:</p>
          <ul>
            <li><strong>Respect the Exam Lockdown:</strong> When your partner is preparing for continuous assessment tests or finals, respect their need for quiet study. Don't demand long phone calls or unannounced weekend visits.</li>
            <li><strong>Share Academic Timetables Early:</strong> Map out each other's test weeks, assignment deadlines, and break dates at the start of the semester so you can plan visits around realistic schedules.</li>
          </ul>
        `,
      },
      {
        id: 'communication-without-digital-suffocation',
        heading: 'Healthy Communication Without Digital Suffocation',
        content: `
          <p>When you don't see each other every day in class, it is tempting to spend hours texting back and forth all day. However, excessive texting during lecture hours can harm academic focus and create unnecessary relationship anxiety when one person doesn't reply immediately.</p>
          <p>Shift toward quality over quantity: send encouraging morning and evening voice notes, and schedule a 30-minute video or voice call at the end of the day to catch up properly on each other's campus news.</p>
        `,
      },
      {
        id: 'weekend-visits-and-hostel-etiquette',
        heading: 'Planning Weekend Visits and Hostel Etiquette',
        content: `
          <p>Visiting your partner's campus is the highlight of an inter-university relationship. Keep visits smooth and respectful:</p>
          <ol>
            <li><strong>Plan Logistics in Advance:</strong> Arrange safe, daylight transport to and from their campus. Never travel late at night or rely on unreliable rides.</li>
            <li><strong>Respect Roommate Boundaries:</strong> If staying in university halls or student digs, ensure your partner's roommates are fully informed and comfortable with the visit. Keep noise low and clean up after yourself.</li>
            <li><strong>Explore Their Campus World:</strong> Take a walk around their campus, meet their coursemates, and enjoy experiencing university life from a fresh perspective.</li>
          </ol>
        `,
      },
      {
        id: 'staying-invested-in-your-own-campus',
        heading: 'Stay Active in Your Own Campus Community',
        content: `
          <p>The most common mistake in cross-campus relationships is living solely through your phone and neglecting your own campus life. Continue attending student societies, playing campus sports, studying with classmates, and building close friends on your own campus.</p>
          <p>A relationship thrives when both partners have full, rich lives on their respective campuses and choose to share that happiness together.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'How often should couples at different universities visit each other?',
        answer: 'Every 2 to 3 weeks is typically a healthy rhythm that balances quality in-person time with academic commitments and student travel budgets.',
      },
      {
        question: 'What if our universities have different break schedules?',
        answer: 'Use the break differences to your advantage! When you are on break and they are in class, you can plan a weekend visit or use the time to focus on personal projects and family.',
      },
      {
        question: 'How do we handle jealousy about campus parties we cannot attend together?',
        answer: 'Open, transparent communication and trust are key. Celebrate each other having fun with friends, send quick check-in texts, and avoid controlling or guilt-tripping your partner.',
      },
      {
        question: 'Can I use The College Date to meet students at nearby campuses?',
        answer: 'Yes! The College Date allows you to discover students from your own university as well as explore students from neighboring institutions in your metropolitan area.',
      },
    ],
    relatedGuides: [
      { label: 'Long Distance Relationships for Students', href: '/long-distance-relationship-students' },
      { label: 'Healthy Relationships for Students', href: '/healthy-relationship-university-students' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'Student Dating Etiquette', href: '/student-dating-etiquette' },
    ],
  },
];

export function generateWave2Batch2() {
  console.log('Generating Wave 2 Batch 2 SEO Pages (4 pages)...');
  for (const page of wave2Batch2Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`  ✓ Generated ${page.file}`);
  }
}

if (process.argv[1]?.endsWith('batch2.mjs')) {
  generateWave2Batch2();
}
