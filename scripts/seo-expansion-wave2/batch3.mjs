import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave2Batch3Pages = [
  {
    slug: 'how-to-balance-dating-and-studies-in-university',
    file: 'public/how-to-balance-dating-and-studies-in-university.html',
    lang: 'en',
    title: 'How to Balance Dating and Studies in University - GPA & Love Guide',
    description: 'Master how to balance dating and studies in university. Practical time management, study dates that work, exam boundaries, and protecting your GPA while in love.',
    kicker: 'Academic & Relationship Balance',
    h1: 'How to Balance Dating and Studies in University',
    lede: 'You came to university to earn your degree, build your career, and discover yourself. But falling in love or actively dating can quickly consume all your hours if you aren\'t disciplined. Here is a battle-tested blueprint on how to balance romantic relationships with academic excellence without sacrificing your GPA or your connection.',
    date: '2026-09-16',
    ctaHeading: 'Connect with Motivated Students',
    ctaText: 'Join The College Date to meet ambitious students across your faculty who value academic success and genuine connection.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-university-balancing-act',
        heading: 'The University Balancing Act: Love vs Academic Success',
        content: `
          <p>University life throws immense demands at you: 8:00 AM lectures, heavy reading lists, continuous assessment tests, practical labs, and final exams. When you enter a romantic relationship, the emotional excitement and desire to spend time together can easily crowd out study time.</p>
          <p>Too many students experience the "fresher drop"—a sudden collapse in semester GPA caused by skipping lectures, staying up late chatting every night, or prioritizing dating over revision. But academic success and fulfilling romance are not mutually exclusive. With intentional boundaries, a healthy relationship actually enhances your academic focus by providing emotional stability and mutual accountability.</p>
        `,
      },
      {
        id: 'the-70-30-campus-energy-rule',
        heading: 'The 70/30 Campus Time & Energy Rule',
        content: `
          <p>A practical mental model for university life is the <strong>70/30 Energy Rule</strong>:</p>
          <ul>
            <li><strong>70% for Core Academic and Personal Growth:</strong> Attending classes, completing assignments, studying in the library, physical fitness, personal sleep, and participating in career-building societies.</li>
            <li><strong>30% for Social and Romantic Life:</strong> Date nights, casual coffee meetups, chatting, and socialising with campus friends.</li>
          </ul>
          <p>When you allocate dedicated, distraction-free study blocks during the day, your evening dates become guilt-free and far more enjoyable because you aren't silently stressing about unfinished assignments.</p>
        `,
      },
      {
        id: 'productive-study-dates',
        heading: 'How to Turn Study Dates into Real Academic Productivity',
        content: `
          <p>Many couples use "study dates" as an excuse to hang out, only to spend three hours talking, scrolling on phones, and accomplishing zero revision. Make study dates genuinely productive with these rules:</p>
          <ol>
            <li><strong>Choose Public Academic Spaces:</strong> Study in the main university library, departmental computer lab, or quiet campus study pavilion. Avoid studying on comfortable beds in private hostel rooms where focus naturally dissolves.</li>
            <li><strong>Use the Pomodoro Technique:</strong> Set a timer for 45 minutes of complete silent study, followed by a 10-minute break to chat, stretch, or share a quick snack. Repeat for three cycles.</li>
            <li><strong>Quiz Each Other:</strong> Review each other's flashcards or test questions before wrapping up. Teaching a concept to your partner reinforces your own understanding.</li>
          </ol>
        `,
      },
      {
        id: 'exam-season-lockdown-agreement',
        heading: 'The Exam Season Lockdown Agreement',
        content: `
          <p>During the two to three weeks of continuous assessments and semester final exams, dating dynamics must temporarily shift. Establish a clear mutual understanding with your partner:</p>
          <ul>
            <li>Agree that study comes first without feeling neglected or insecure.</li>
            <li>Replace long evening hangouts with brief, encouraging check-ins (e.g. a 15-minute dinner together at the cafeteria or sending motivating voice notes).</li>
            <li>Plan a fun, rewarding celebration date together after both of you have submitted your final papers.</li>
          </ul>
        `,
      },
      {
        id: 'signs-relationship-hurts-academics',
        heading: 'Warning Signs That a Relationship Is Damaging Your Degree',
        content: `
          <p>Be honest with yourself about the impact of your relationship. Watch out for these red flags:</p>
          <ul>
            <li>Your partner makes you feel guilty for attending tutorials, studying for tests, or doing group projects.</li>
            <li>You are consistently missing assignment deadlines or skipping morning lectures because of late-night relationship drama.</li>
            <li>Your partner is jealous or resentful of your academic achievements, high test scores, or study groups.</li>
          </ul>
          <p>A healthy university partner supports your ambitions, celebrates your academic milestones, and wants to see you graduate with top honors.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'Can you maintain a high GPA while in a university relationship?',
        answer: 'Yes! With clear time management, scheduled study blocks, and an understanding partner, relationships can provide emotional stability that supports your academic focus.',
      },
      {
        question: 'How do you tell your partner you need space to study?',
        answer: 'Be loving, clear, and proactive: "I really care about you, but I have a major test on Friday that requires all my focus. Let\'s pause hanging out until Friday evening so I can crush this exam, and then we will celebrate together!"',
      },
      {
        question: 'What should I do if my partner distracts me during lectures?',
        answer: 'Sit in different rows or with other coursemates during class time. Reserve romance and private conversations for outside lecture halls.',
      },
      {
        question: 'How does The College Date help students find like-minded peers?',
        answer: 'The platform lets you filter profiles by university, faculty, and study level, helping you connect with ambitious peers who understand your academic rhythm.',
      },
    ],
    relatedGuides: [
      { label: 'Healthy Relationships for Students', href: '/healthy-relationship-university-students' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
      { label: 'Red Flags in Student Relationships', href: '/red-flags-student-relationships' },
    ],
  },
  {
    slug: 'how-to-spot-a-catfish-in-university',
    file: 'public/how-to-spot-a-catfish-in-university.html',
    lang: 'en',
    title: 'How to Spot a Catfish in University - Campus Safety & Red Flags',
    description: 'Learn how to spot a catfish in university. 7 essential warning signs of fake dating profiles, stolen photos, video call excuses, and Vision AI verification.',
    kicker: 'Online Safety & Verification',
    h1: 'How to Spot a Catfish in University',
    lede: 'Online dating and campus social apps are great for meeting new people, but fake profiles, stolen pictures, and malicious catfishes still lurk across unmoderated networks. Here is how to spot a catfish in university, protect your identity and money, and verify who you are really talking to.',
    date: '2026-09-16',
    ctaHeading: 'Protect Yourself on Campus',
    ctaText: 'The College Date uses automated Vision AI to screen profile photos, ensuring you connect with verified human portraits on your campus.',
    ctaHref: '/safety',
    ctaButtonText: 'Visit Campus Safety Center',
    sections: [
      {
        id: 'the-reality-of-campus-catfishing',
        heading: 'The Reality of Campus Catfishing',
        content: `
          <p>Catfishing—creating a deceptive online profile using someone else\'s photos and a fabricated identity—is not just an issue for celebrities. Across university campuses, catfishing happens frequently for several reasons:</p>
          <ul>
            <li><strong>Financial Cybercrime:</strong> Scammers targeting students with fabricated romance stories to solicit "urgent 2k," M-Pesa, MoMo transfers, or transport fare.</li>
            <li><strong>Insecurity & Social Anxiety:</strong> Students who feel self-conscious about their appearance and steal influencer photos to experience online validation.</li>
            <li><strong>Campus Malice or Spying:</strong> Ex-partners or acquaintances creating fake accounts to spy on classmates, monitor romantic interests, or gather screenshots.</li>
          </ul>
        `,
      },
      {
        id: 'seven-warning-signs-catfish',
        heading: '7 Warning Signs of a Campus Catfish',
        content: `
          <p>Watch out for these telltale indicators of a fake dating profile:</p>
          <ol>
            <li><strong>Influencer / Model Photos with Zero Campus Context:</strong> Their profile features high-fashion studio modeling photos, but not a single casual picture on campus, in a lecture hall, or with student friends.</li>
            <li><strong>Persistent Excuses to Avoid In-Person Meetups:</strong> They always have an elaborate excuse why they cannot meet for a 20-minute coffee on campus—illness, travel, sudden hostel lockdowns, or family emergencies.</li>
            <li><strong>Refusing a Quick Video Call:</strong> When you suggest a brief 2-minute video call in-app, their camera is suddenly "broken," their connection is "too poor," or they claim to be camera shy.</li>
            <li><strong>Rushing Conversations Off-Platform:</strong> They try to move you immediately away from the app to unmoderated messaging channels before you have established trust.</li>
            <li><strong>Vague Details About Their University Life:</strong> They cannot name specific lecturers, campus buildings, or departmental landmarks that any genuine student at that institution would know.</li>
            <li><strong>Sudden Financial Solicitations:</strong> Any request for emergency funds, exam registration fees, airtime, or transport fare is an immediate red flag.</li>
            <li><strong>Excessive Love-Bombing:</strong> Professing intense emotional attachment, declaring you their "soulmate," or making grand romantic promises within days of matching.</li>
          </ol>
        `,
      },
      {
        id: 'forensic-verification-tactics',
        heading: 'Actionable Steps to Verify a Match\'s Identity',
        content: `
          <p>Before investing your heart or agreeing to meet, verify authenticity with these simple tactics:</p>
          <ul>
            <li><strong>The 2-Minute Video Call Rule:</strong> Before meeting in person, request a brief 2-minute video call. If someone refuses to show their face live on video, do not meet them.</li>
            <li><strong>Ask About Common Campus Landmarks:</strong> Ask casual, localized questions: <em>"Which lecture theatre do you usually have your economics classes in?"</em> or <em>"Do you prefer the coffee at the student union or the library cafeteria?"</em> A scammer from another city will trip over basic campus details.</li>
            <li><strong>Search Their Social Footprint:</strong> Look for consistent, active campus social profiles with mutual student friends.</li>
          </ul>
        `,
      },
      {
        id: 'how-vision-ai-protects-students',
        heading: 'How The College Date\'s Vision AI Defends Against Fake Accounts',
        content: `
          <p>Unlike unmoderated platforms that allow blank avatars, stock images, and cartoon graphics, <strong>The College Date</strong> incorporates automated Vision AI during onboarding:</p>
          <ul>
            <li>Every uploaded photo is evaluated to confirm a clear, authentic single human face.</li>
            <li>Images featuring cartoons, memes, inanimate objects, landscapes, or celebrity stock photos are automatically rejected.</li>
            <li>Students declare their institution and faculty during setup, creating an authentic community of peers.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'What should I do if I suspect a profile is a catfish?',
        answer: 'Cease communication immediately, do not send money or sensitive photos, take screenshots for evidence, and report the profile using the in-app reporting button.',
      },
      {
        question: 'Why do catfishes refuse video calls?',
        answer: 'Because a live video call instantly shatters the illusion by revealing that the real person behind the camera does not match the photos on the profile.',
      },
      {
        question: 'Should I confront a catfish before blocking them?',
        answer: 'No. Confrontation rarely yields a truthful confession and can lead to verbal abuse. Simply report and block the account quietly.',
      },
      {
        question: 'How does The College Date verify student profile photos?',
        answer: 'The platform scans uploaded pictures with automated Vision AI to confirm an authentic single human portrait, weeding out bots and fake graphics.',
      },
    ],
    relatedGuides: [
      { label: 'Romance Scams and Students', href: '/romance-scams-nigerian-students' },
      { label: 'What Not to Share on Dating Apps', href: '/what-not-to-share-on-dating-apps' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
      { label: 'Campus Safety Center', href: '/safety' },
    ],
  },
  {
    slug: 'dating-in-final-year-of-university',
    file: 'public/dating-in-final-year-of-university.html',
    lang: 'en',
    title: 'Dating in Final Year of University - The Graduation Romance Guide',
    description: 'Thinking of dating in your final year of university? Navigate project stress, graduation countdown, post-grad relocations, and making mature relationship choices.',
    kicker: 'Graduation & Life Transitions',
    h1: 'Dating in Final Year of University',
    lede: 'Entering your final year of university (400L / senior year) brings a turbulent cocktail of emotions: thesis deadlines, project defenses, job applications, national service, and the looming reality of graduation. Can romance survive or thrive during this high-stakes period? Here is what you need to know.',
    date: '2026-09-16',
    ctaHeading: 'Connect with Fellow Final Year Students',
    ctaText: 'Discover mature, career-focused students across your campus with verified profiles on The College Date.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-final-year-dilemma',
        heading: 'The Final Year Romance Dilemma: The Graduation Timer',
        content: `
          <p>Final year is unlike any other year of university. You are no longer navigating the initial social excitement of being a fresher; instead, you are facing the finish line of your degree. Alongside final year projects, seminars, and intensive revisions, the "graduation timer" is ticking down.</p>
          <p>Many students ask themselves: <em>"Does it make sense to start a relationship now when we might move to different cities in eight months?"</em> While final year romance carries unique pressures, it can also produce some of the most mature, meaningful connections of your young adult life if approached with honesty.</p>
        `,
      },
      {
        id: 'managing-project-defense-stress',
        heading: 'Managing Thesis & Project Defense Stress Together',
        content: `
          <p>Final year coursework is intellectually and emotionally demanding. Project supervision meetings, data collection, and thesis defenses can cause immense stress. A supportive partner acts as an emotional sanctuary during this period:</p>
          <ul>
            <li><strong>Proofread & Practice Defenses:</strong> Listen to each other rehearse thesis presentations or offer a fresh pair of eyes to proofread seminar chapters.</li>
            <li><strong>Respect Deadlines:</strong> When your partner has an upcoming project submission, respect their late-night study hours. Be their cheerleader, not an additional source of stress.</li>
            <li><strong>Avoid Petty Arguments:</strong> Recognize that irritability during final year is often displaced academic exhaustion. Practice patience and emotional grace.</li>
          </ul>
        `,
      },
      {
        id: 'the-post-graduation-conversation',
        heading: 'The Crucial Post-Graduation Conversation',
        content: `
          <p>The biggest mistake final year couples make is avoiding the future until the day of convocation. By the second semester, have a calm, transparent conversation about what comes next:</p>
          <ul>
            <li><strong>National Service & Relocation:</strong> In countries like Nigeria with NYSC, what happens if one person is posted to Lagos and the other to Abuja or Port Harcourt? Are you prepared to navigate long-distance?</li>
            <li><strong>Job Hunting & Master\'s Programs:</strong> Are your career trajectories leading you to different cities or countries?</li>
            <li><strong>Defining Intentions Early:</strong> Are you enjoying the relationship as a sweet final-year chapter, or are you both committed to building a long-term future after graduation?</li>
          </ul>
        `,
      },
      {
        id: 'golden-rules-senior-year-dating',
        heading: 'The Golden Rules of Final Year Dating',
        content: `
          <p>Navigate your senior year with poise by following these rules:</p>
          <ol>
            <li><strong>Never Sacrifice Your Degree for a Relationship:</strong> You have worked for three or four years for this qualification. Do not jeopardize your graduation honors or delay your thesis for relationship drama.</li>
            <li><strong>Be Honest About Your Career Ambitions:</strong> Never downplay your professional goals or turn down job opportunities to keep someone happy. The right partner supports your career elevation.</li>
            <li><strong>Celebrate Every Milestone:</strong> From finishing your last exam to submitting your final bound project and dressing up for convocation, celebrate your shared journey.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it wise to start dating someone in your final year of university?',
        answer: 'It can be very rewarding if both partners are mature, transparent about post-graduation plans, and committed to supporting each other\'s academic deliverables.',
      },
      {
        question: 'Can university relationships survive after graduation?',
        answer: 'Yes! Many couples transition successfully into adulthood by maintaining open communication, planning visits, and supporting each other through early career adjustments.',
      },
      {
        question: 'What if my partner gets a job in another city?',
        answer: 'Discuss whether you are willing to try long-distance. With consistent communication, planned visits, and trust, distance is entirely manageable.',
      },
      {
        question: 'Can final year students use The College Date to find mature matches?',
        answer: 'Yes. Profile setup allows you to specify your academic level (such as 400L / 500L / Final Year), making it easy to connect with peers in your exact life stage.',
      },
    ],
    relatedGuides: [
      { label: 'Dating as a Fresher', href: '/dating-as-a-fresher-nigeria' },
      { label: 'Long Distance Relationships for Students', href: '/long-distance-relationship-students' },
      { label: 'Healthy Relationships for Students', href: '/healthy-relationship-university-students' },
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
    ],
  },
  {
    slug: 'university-hostel-dating-etiquette',
    file: 'public/university-hostel-dating-etiquette.html',
    lang: 'en',
    title: 'University Hostel Dating Etiquette - Roommates, Visits & Digs Rules',
    description: 'Essential university hostel dating etiquette. Practical rules for roommate boundaries, boyfriend/girlfriend visits, sleepovers, noise, and shared digs courtesy.',
    kicker: 'Hostel & Residence Etiquette',
    h1: 'University Hostel Dating Etiquette',
    lede: 'University hostels, campus residence halls, and off-campus student digs are the heartbeat of student life. But when dating enters communal living, tensions can escalate rapidly between roommates. Here is the definitive guide to hostel dating etiquette, respecting shared spaces, and avoiding roommate conflicts.',
    date: '2026-09-16',
    ctaHeading: 'Discover Students Around Your Campus',
    ctaText: 'Join The College Date to connect with verified students living around your campus community and student residences.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'reality-of-communal-living',
        heading: 'The Reality of Communal Student Living',
        content: `
          <p>Living in university hostels, halls of residence, or off-campus student digs (such as in Akoka, Braamfontein, Roysambu, or Kikoni) is a foundational rite of passage. You share bedrooms, communal kitchens, bathrooms, and study spaces with roommates from different backgrounds and routines.</p>
          <p>When you start dating someone, bringing your romantic life into this shared environment requires tact and sensitivity. A romantic partner who essentially moves into your hostel room without your roommates\' consent is one of the quickest ways to destroy domestic peace and cause bitter roommate feuds.</p>
        `,
      },
      {
        id: 'the-golden-roommate-rule',
        heading: 'The Golden Roommate Rule: Notice, Communication & Consent',
        content: `
          <p>Your roommates pay equal rent and have an absolute right to feel comfortable, relaxed, and uninhibited in their own living quarters. Follow these baseline etiquette principles:</p>
          <ul>
            <li><strong>Always Give Advance Notice:</strong> Never let your partner walk in unannounced while your roommate is changing, sleeping, or studying in pajamas. Send a quick WhatsApp text: <em>"Hey, my partner is coming over for an hour around 4 PM—let me know if you need anything!"</em></li>
            <li><strong>Respect the Sleepover Boundary:</strong> Agree on a maximum number of overnight stays per week (the standard courtesy rule is no more than two nights per week). Your roommate signed up to live with you, not your partner.</li>
            <li><strong>Never Kick Your Roommate Out:</strong> Never ask your roommate to leave their own room or lock them out so you can have private romantic time.</li>
          </ul>
        `,
      },
      {
        id: 'shared-space-and-cleanliness',
        heading: 'Shared Space Courtesy: Kitchens, Bathrooms & Noise',
        content: `
          <p>Minor friction points in hostels quickly snowball into major roommate resentments:</p>
          <ol>
            <li><strong>Clean Up Immediately:</strong> If you and your partner cook in the shared kitchen or eat takeout in the room, clean all plates, pots, and food containers immediately. Never leave dirty dishes for roommates to clean.</li>
            <li><strong>Keep Bathroom Usage Reasonable:</strong> In hostels with communal or en-suite bathrooms, your partner should not monopolize the shower in the morning when roommates are rushing for 8 AM lectures.</li>
            <li><strong>Keep Noise and PDA In Check:</strong> Keep television, music, and conversation volumes low during quiet study hours. Save intense physical affection for private, exclusive settings.</li>
          </ol>
        `,
      },
      {
        id: 'navigating-hall-rules-and-curfews',
        heading: 'Navigating Hall Wardens and Security Rules',
        content: `
          <p>Many traditional university hostels maintain strict security protocols: sign-in registers, curfew hours, and gender-separated floor rules. Respecting these regulations protects you from disciplinary probation, room forfeiture, or fines by the university housing department.</p>
          <p>If your campus hall has strict visiting hours, use campus public spaces—student union cafes, library pavilions, or campus parks—for your daytime hangouts instead of risking disciplinary trouble.</p>
        `,
      },
      {
        id: 'what-to-do-when-roommate-crosses-line',
        heading: 'What to Do if Your Roommate\'s Partner Overstays',
        content: `
          <p>If your roommate\'s partner has essentially moved in, eaten your food, or made you feel like an intruder in your own room, handle it with calm assertiveness:</p>
          <p>Do not leave passive-aggressive sticky notes. Pick a neutral moment when the partner is not in the room and say: <em>"Hey, I really like your partner, but lately having an extra person here constantly has made it hard for me to study and relax. Can we agree on a limit of two nights a week so our room stays comfortable for both of us?"</em></p>
          <p>Clear, direct communication resolves 90% of hostel conflicts before they boil over.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'How often is it okay for a boyfriend or girlfriend to sleep over in a hostel?',
        answer: 'One to two nights per week is the widely accepted standard, provided your roommates are informed and agree in advance.',
      },
      {
        question: 'Is it rude to bring a date to a shared hostel room without asking?',
        answer: 'Yes, 100%. Walking into a shared room without notice violates your roommate\'s privacy and personal space.',
      },
      {
        question: 'What should we do if our hostel has strict visitation hours?',
        answer: 'Meet in campus public spaces like student union cafes, library courtyards, or campus parks rather than risking disciplinary sanctions from hall wardens.',
      },
      {
        question: 'Can I use The College Date to connect with students living in off-campus hostels?',
        answer: 'Yes! The College Date helps you discover students across campus and off-campus student residential communities.',
      },
    ],
    relatedGuides: [
      { label: 'Student Dating Etiquette', href: '/student-dating-etiquette' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
    ],
  },
];

export function generateWave2Batch3() {
  console.log('Generating Wave 2 Batch 3 SEO Pages (4 pages)...');
  for (const page of wave2Batch3Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`  ✓ Generated ${page.file}`);
  }
}

if (process.argv[1]?.endsWith('batch3.mjs')) {
  generateWave2Batch3();
}
