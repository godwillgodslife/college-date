import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave4Batch2Pages = [
  {
    slug: 'dating-someone-who-is-not-a-student',
    file: 'public/dating-someone-who-is-not-a-student.html',
    lang: 'en',
    title: 'Dating Someone Who Is Not a Student - University Guide',
    description: 'How to navigate dating someone who is not a student in university. Tips on schedule differences, financial balances, roommate dynamics, and lifestyle.',
    kicker: 'Campus Relationships & Outside Life',
    h1: 'Dating Someone Who Is Not a Student - University Guide',
    lede: 'Dating a working professional, artisan, or someone outside higher education while studying for your degree? Here is your complete guide to managing schedule clashes, financial imbalances, roommate perceptions, and building a thriving relationship.',
    date: '2026-09-19',
    ctaHeading: 'Find Genuine Campus Connections',
    ctaText: 'Whether you want campus friends or intentional romance, The College Date connects you with verified students who share your academic journey.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-student-non-student-dynamic',
        heading: 'The Unique Realities of Dating Outside Higher Education',
        content: `
          <p>While many undergraduates date coursemates or hall peers, thousands of tertiary students across Nigeria, Ghana, Kenya, and South Africa are in relationships with partners who are not university students. Your partner might be a corporate professional, an entrepreneur, an artisan, a trade specialist, or someone living in your hometown.</p>
          <p>This dynamic offers wonderful stability and grounded perspective away from campus politics. However, it also introduces structural differences that university couples rarely face: contrasting timetables, disparate financial resources, and divergent social priorities.</p>
        `,
      },
      {
        id: 'managing-schedule-and-lifestyle-differences',
        heading: 'Managing Timetable Clashes: Academic Cycles vs. 9-to-5 Work',
        content: `
          <p>The rhythm of an undergraduate's life—late-night assignment deadlines, erratic lecture schedules, semester breaks, and high-intensity examination weeks—rarely matches the structured routine of a working adult:</p>
          <ul>
            <li><strong>Communicate Academic Cycles Early:</strong> Working partners may not instinctively understand why you cannot talk for hours on a Wednesday evening during midterm week. Proactively sharing your academic calendar (exam weeks, project deadlines, lecture timetable) prevents resentment.</li>
            <li><strong>Protect Your Study Hours:</strong> If your partner works standard weekday hours, they may want your full attention on weekends or evenings when you need to research in the library. Set loving, firm study boundaries: <em>"I would love to see you on Saturday evening, but I have to finish this laboratory report between 1 PM and 5 PM."</em></li>
            <li><strong>Avoid Taking Academic Drama Out on Them:</strong> Your partner may not relate to the nuances of departmental faculty politics or a difficult lecturer. Keep your academic debriefs constructive rather than overwhelming them with campus complaints.</li>
          </ul>
        `,
      },
      {
        id: 'navigating-financial-disparities',
        heading: 'Navigating Financial Imbalances Gracefully',
        content: `
          <p>One of the most sensitive aspects of dating someone outside university is the financial gap between an earning adult and a student on an allowance:</p>
          <ul>
            <li><strong>Beware of Subtle Control Dynamics:</strong> If an earning partner pays for fancy dinners, weekend trips, or gifts, ensure this does not come with unspoken entitlement or emotional control. Healthy partners give freely without expecting obedience or subservience.</li>
            <li><strong>Contribute Non-Monetary Value:</strong> You do not need to match an earning partner's spending. Thoughtful gestures—cooking a special meal, hand-written notes, helping with creative projects, or planning meaningful low-cost dates—demonstrate deep care.</li>
            <li><strong>Maintain Fiscal Independence:</strong> Avoid relying entirely on a non-student partner for essential university costs like hostel rent or school fees unless in a formalized, long-term commitment. Preserving financial independence protects your self-esteem and academic focus.</li>
          </ul>
        `,
      },
      {
        id: 'hostel-roommates-and-campus-integration',
        heading: 'Integrating Your Partner with Campus Friends & Roommates',
        content: `
          <p>Bringing a non-student into close-knit campus spaces requires consideration for your peers:</p>
          <ul>
            <li><strong>Respect Hostel Roommate Etiquette:</strong> Avoid having a non-student partner linger in your shared hostel room for days at a time. Roommates who paid for their space deserve privacy and comfort without feeling displaced by an unfamiliar adult.</li>
            <li><strong>Bridge the Conversational Gap:</strong> When introducing your partner to university friends, steer conversations toward universal topics (music, sports, current affairs, movies) rather than insular departmental inside jokes that leave your partner feeling excluded.</li>
            <li><strong>Don't Be Ashamed of Their Background:</strong> Whether your partner is an office executive, tech specialist, or tradesperson, introduce them with pride. True maturity means valuing character and mutual respect over superficial campus prestige.</li>
          </ul>
        `,
      },
      {
        id: 'long-term-growth-and-intellectual-connection',
        heading: 'Fostering Long-Term Growth and Shared Vision',
        content: `
          <p>A thriving relationship between a student and non-student requires mutual intellectual curiosity and shared long-term values:</p>
          <ul>
            <li><strong>Celebrate Each Other's Milestones:</strong> Support their workplace promotions and career achievements just as they attend your faculty presentations and convocation ceremony.</li>
            <li><strong>Ensure Shared Core Values:</strong> Differences in education level matter far less than alignment on integrity, family values, work ethic, and communication styles.</li>
            <li><strong>Plan for the Post-Graduation Phase:</strong> Discuss how your dynamic will evolve when you graduate, enter the workforce, or relocate for mandatory national service.</li>
          </ul>
        `,
      },
      {
        id: 'red-flags-dating-non-students',
        heading: 'Red Flags When Dating Someone Outside University',
        content: `
          <p>Protect your future and emotional health by watching out for these warning behaviors:</p>
          <ul>
            <li><strong>Dismissing Your Academic Ambition:</strong> If your partner trivializes your degree, claiming university is "a waste of time" or discouraging you from studying, they are trying to limit your growth.</li>
            <li><strong>Demanding Priority Over Examinations:</strong> Anyone who creates dramatic scenes when you must prepare for midterms or project defenses does not respect your future.</li>
            <li><strong>Financial Entitlement and Control:</strong> Using gifts or money to control where you go, who you talk to, or when you study is an immediate relationship dealbreaker.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it bad for a university student to date someone who is already working?',
        answer: 'Not at all. It can be a very grounding and emotionally mature relationship. The key is ensuring that the financial difference does not create a power imbalance and that your partner respects your study timetable.',
      },
      {
        question: 'How do I explain to a working partner that I am busy during university exams?',
        answer: 'Be proactive. Two weeks before exams start, explain that your revision schedule will temporarily limit your availability. Propose short, scheduled daily check-ins so they feel loved without disrupting your study routine.',
      },
      {
        question: 'What if my non-student partner feels insecure about my university friends?',
        answer: 'Reassure them of your feelings and avoid comparing them to coursemates. Include them in social gatherings where they feel comfortable, but maintain firm boundaries against irrational jealousy.',
      },
      {
        question: 'Can I use The College Date if I am looking to meet fellow students instead?',
        answer: 'Yes. The College Date is built specifically for tertiary students who want to date or build friendships with peers who share their exact academic life and campus culture.',
      },
    ],
    relatedGuides: [
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
      { label: 'Dating a Senior Student in University', href: '/dating-a-senior-student-in-university' },
      { label: 'How to Balance Dating and Studies in University', href: '/how-to-balance-dating-and-studies-in-university' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
    ],
  },
  {
    slug: 'dating-in-off-campus-student-accommodation',
    file: 'public/dating-in-off-campus-student-accommodation.html',
    lang: 'en',
    title: 'Dating in Off-Campus Student Accommodation - Lodges & Safety',
    description: 'Guide to dating in off-campus student accommodation and private lodges. Tips on avoiding accidental cohabitation, landlord rules, and roommate respect.',
    kicker: 'Campus Housing & Relationship Boundaries',
    h1: 'Dating in Off-Campus Student Accommodation - Lodges & Safety',
    lede: 'Living in a private student lodge, off-campus apartment, or rented room? Here is your essential guide to dating outside university walls—avoiding unintended cohabitation, managing landlord rules, respecting roommates, and staying safe after dark.',
    date: '2026-09-19',
    ctaHeading: 'Date Safely on and off Campus',
    ctaText: 'The College Date helps students connect with verified campus peers. Explore safe student dating with human portrait screening and transparent intentions.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'off-campus-housing-reality',
        heading: 'The Freedom and Friction of Private Student Lodges',
        content: `
          <p>After their first year, millions of undergraduates across Africa transition from strictly regulated on-campus halls to private off-campus accommodation: student lodges in Yaba or Akoka (Unilag), Ayeduase and Kotei (KNUST), Kikoni and Wandegeya (Makerere), Juja (JKUAT), Braamfontein (Wits), or Observatory (UCT).</p>
          <p>Off-campus accommodation brings unprecedented personal freedom: no hall porters, no 10 PM lockouts, and no strict visitation curfews. However, this unchecked freedom often leads students into complicated relationship dynamics, landlord disputes, and accidental live-in commitments before they are emotionally ready.</p>
        `,
      },
      {
        id: 'the-accidental-cohabitation-trap',
        heading: 'The "Accidental Cohabitation" Trap: How to Prevent It',
        content: `
          <p>One of the most frequent mistakes student couples make in off-campus housing is "sliding" into living together without a conscious decision:</p>
          <ol>
            <li><strong>The Gradual Creep:</strong> What starts as staying over on Friday night turns into leaving a toothbrush, storing a change of clothes, keeping study notes, and suddenly one partner has effectively moved in by mid-semester.</li>
            <li><strong>Loss of Personal Academic Space:</strong> When your partner is always in your self-contained room, your personal sanctuary disappears. You lose the quiet hours needed for revision, rest, and independent friendships.</li>
            <li><strong>Premature Domestic Responsibilities:</strong> Undergraduates suddenly find themselves arguing over grocery bills, cooking rotations, dishwashing, and electricity tariffs instead of focusing on their GPA and campus societies.</li>
            <li><strong>Set the "Three-Night Rule":</strong> Establish a healthy personal boundary: maintain your own room and limit sleepovers to 2 or 3 agreed nights per week. Protecting separate living spaces preserves romantic excitement and academic discipline.</li>
          </ol>
        `,
      },
      {
        id: 'roommate-and-compound-etiquette',
        heading: 'Roommate Courtesy and Off-Campus Compound Etiquette',
        content: `
          <p>If you share a flat, kitchen, or bathroom with other students in an off-campus compound, strict consideration is vital:</p>
          <ul>
            <li><strong>Roommates Did Not Sign Up for a Third Tenant:</strong> Having your partner constantly occupy shared living rooms, monopolize the kitchenette, or take hour-long showers creates legitimate anger. Always check with roommates before inviting guests over.</li>
            <li><strong>Keep Noise and Arguments Contained:</strong> Thin lodge walls mean late-night arguments, loud music, or intimate noise disrupt your neighbors' sleep and revision. Practice basic community courtesy.</li>
            <li><strong>Contribute to Consumables:</strong> If a partner visits frequently, they should contribute toward shared cooking gas, drinking water, and cleaning supplies rather than consuming utilities paid for by your roommates.</li>
          </ul>
        `,
      },
      {
        id: 'safety-and-security-off-campus',
        heading: 'Security Rules for Off-Campus Student Accommodation',
        content: `
          <p>Unlike on-campus halls with 24/7 security guards and gate turnstiles, off-campus student communities can be vulnerable to theft and intrusions after dark:</p>
          <ul>
            <li><strong>Never Walk Unaccompanied After Dark:</strong> Commuting between student lodges late at night across unlit campus feeder roads carries real risks. If visiting a partner's lodge, travel in daylight or arrange verified student transport.</li>
            <li><strong>Keep Your Door Locked During Private Visits:</strong> Always lock security gates and room doors, even when resting inside your lodge.</li>
            <li><strong>Verify Before First Private Visits:</strong> Never invite a match from a dating app to your private off-campus apartment on the first or second meeting. Always meet in populated daytime campus cafes first and verify their identity with voice notes or video calls.</li>
          </ul>
        `,
      },
      {
        id: 'handling-breakups-off-campus',
        heading: 'Handling Breakups When You Live in the Same Lodge',
        content: `
          <p>Dating someone living in the same off-campus compound requires foresight in case things do not work out:</p>
          <ul>
            <li><strong>Establish Clean Closure:</strong> If the connection ends, return keys, personal clothes, and shared items immediately to avoid lingering excuses for confrontation.</li>
            <li><strong>Maintain Compound Peace:</strong> Do not recruit compound neighbors or landlords into personal relationship arguments. Treat your ex with calm, polite distance in shared corridors.</li>
          </ul>
        `,
      },
      {
        id: 'off-campus-lodge-checklist',
        heading: 'The 5-Point Off-Campus Lodge Relationship Checklist',
        content: `
          <p>Protect your boundaries and living environment with this simple 5-point checklist:</p>
          <ol>
            <li><strong>Separate Rent Obligations:</strong> Never co-sign an off-campus lease or rely on a partner to pay your housing rent during university.</li>
            <li><strong>Respect Flatmate Comfort:</strong> Always ensure roommates have full, comfortable access to shared kitchens, bathrooms, and living areas.</li>
            <li><strong>Protect Your Academic Sanctuary:</strong> Designate specific hours where your private room remains a distraction-free study zone.</li>
            <li><strong>Maintain Independent Social Lives:</strong> Continue participating in campus sports, fellowships, and clubs outside your housing compound.</li>
            <li><strong>Clean Security Habits:</strong> Never lend gate keys or access codes to unregistered visitors without landlord and roommate agreement.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it a good idea to move in with your boyfriend or girlfriend in university?',
        answer: 'Generally, no. Most student relationship experts advise maintaining separate living spaces throughout university. Separate rooms protect your academic focus, prevent domestic burnout, and safeguard your independence.',
      },
      {
        question: 'What should I do if my roommate\'s partner spends every day in our lodge?',
        answer: 'Have a calm, respectful house meeting. Explain that while guests are welcome occasionally, having a permanent guest violates your agreement and shared space. Agree on clear weekly guest limits and utility contributions.',
      },
      {
        question: 'How do I stay safe when visiting someone\'s off-campus lodge for the first time?',
        answer: 'Only visit after meeting several times in public campus spaces. Inform a trusted friend of the exact lodge name, room number, and address, and keep your phone charged and location sharing active.',
      },
      {
        question: 'How does The College Date promote safe dating off campus?',
        answer: 'The College Date encourages public first meetups, verifies human portraits via Vision AI, and lets students exchange audio notes and secure messages before deciding to meet in person.',
      },
    ],
    relatedGuides: [
      { label: 'University Hostel Dating Etiquette', href: '/university-hostel-dating-etiquette' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'How to Spot a Catfish in University', href: '/how-to-spot-a-catfish-in-university' },
    ],
  },
  {
    slug: 'how-to-date-during-university-exams',
    file: 'public/how-to-date-during-university-exams.html',
    lang: 'en',
    title: 'How to Date During University Exams - Finals Season Guide',
    description: 'How to date during university exams without hurting your GPA. Practical rules for revision dates, communication pauses, and managing finals stress.',
    kicker: 'Campus Academics & Relationship Survival',
    h1: 'How to Date During University Exams - Finals Season Guide',
    lede: 'Finals season is the ultimate test of a campus relationship. Here is how to navigate the high-stress 3-week semester examination period with your partner without tanking your GPA, triggering toxic arguments, or burning out.',
    date: '2026-09-19',
    ctaHeading: 'Maintain Balance with The College Date',
    ctaText: 'Connect with students who respect your academic ambition. Join The College Date today for low-pressure campus dating and authentic friendship.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-finals-season-pressure',
        heading: 'Why Exam Season Strains Campus Relationships',
        content: `
          <p>Semester examinations (midterms, UE in East Africa, or finals weeks across Nigeria, Ghana, and South Africa) represent a 3-to-4-week pressure cooker. Students manage sleep deprivation, overwhelming syllabi, past-question cramming, and the sheer anxiety of maintaining GPA standards or passing prerequisite courses.</p>
          <p>Under this intense cognitive load, patience wears thin. Minor misunderstandings that would be laughed off during mid-semester suddenly trigger explosive fights. Understanding that exam stress is temporary helps you protect both your academic transcript and your romantic connection.</p>
        `,
      },
      {
        id: 'the-pre-exam-alignment-chat',
        heading: 'The Pre-Exam Alignment Talk: Setting Rules Before Finals',
        content: `
          <p>One week before examinations commence, schedule a deliberate 20-minute alignment conversation to set ground rules:</p>
          <ul>
            <li><strong>Agree on Lower Communication Frequency:</strong> Explicitly agree that neither partner will expect instant text replies during daytime revision hours. A text unread for 4 hours is not neglect; it is academic discipline.</li>
            <li><strong>Establish the Morning & Night Check-in:</strong> Replace exhausting all-day back-and-forth texting with two brief, supportive check-ins: a 2-minute encouraging morning voice note and a 10-minute bedtime call to decompress.</li>
            <li><strong>Declare a "Zero Drama" Truce:</strong> Agree that serious relationship discussions, deep insecurity dissecting, or long-term commitment debates are paused until the last paper is submitted.</li>
          </ul>
        `,
      },
      {
        id: 'productive-study-dates-rules',
        heading: 'How to Have Study Dates That Actually Involve Studying',
        content: `
          <p>"Study dates" often degenerate into 3 hours of chatting, snacking, and scrolling TikTok, leaving both partners stressed. Make library sessions genuinely productive with these rules:</p>
          <ol>
            <li><strong>The 50/10 Pomodoro Sprint:</strong> Work in complete silence for 50 minutes with phones face down, then take a 10-minute break to stretch, grab water, or whisper encouragement.</li>
            <li><strong>Sit Side-by-Side, Not Face-to-Face:</strong> Sitting directly across from a romantic crush invites constant eye contact, smiling, and playful distraction. Sitting side-by-side naturally focuses your eyes forward on your textbooks and lecture notes.</li>
            <li><strong>Separate When Necessary:</strong> If being in the same room makes focus impossible, have the maturity to say: <em>"I love you, but I really need to memorize this anatomy module alone today. Let's meet at 6 PM for dinner."</em></li>
          </ol>
        `,
      },
      {
        id: 'managing-different-exam-timetables',
        heading: 'When One Partner Finishes Exams Days Before the Other',
        content: `
          <p>One of the most dangerous flashpoints occurs when one partner finishes their exams early while the other still has difficult papers remaining:</p>
          <ul>
            <li><strong>Don't Be the Distraction:</strong> If you have finished, do not pressure your partner to go to parties, lounges, or watch movies while they are cramming for a final paper. Respect their academic pressure.</li>
            <li><strong>Serve as Their Support System:</strong> Show your care by bringing them a fresh snack at the library, packing a quick meal, or handling small errands so they can focus entirely on revision.</li>
            <li><strong>Save Celebrations for After Both Finish:</strong> Wait until both partners have turned in their final examination papers before planning your convocation or semester-end celebration.</li>
          </ul>
        `,
      },
      {
        id: 'exam-stress-relief-rituals',
        heading: '5 Quick 15-Minute Stress-Relief Rituals for Student Couples',
        content: `
          <p>You don't need three-hour dinner dates to maintain closeness during finals. Integrate these short, low-pressure rituals into your revision schedule:</p>
          <ul>
            <li><strong>The Campus Lawn Reset:</strong> Meet for 15 minutes between afternoon lectures to sit on a quiet campus lawn or bench without phones, simply breathing fresh air and decompressing.</li>
            <li><strong>Hydration and Snack Drop-Offs:</strong> Drop off a chilled bottle of water, fresh fruit, or study snacks at their library carrel or hostel desk with a sticky note saying <em>"You've got this!"</em>.</li>
            <li><strong>The Evening Decompression Walk:</strong> Take a brisk 10-minute walk around the sports field or residential quad before bedtime to loosen muscle tension and clear exam anxiety.</li>
            <li><strong>Shared Study Playlists:</strong> Listen to the same lofi study beats or instrumental focus tracks while working at separate tables or in different campus libraries.</li>
            <li><strong>Affirmation Voice Notes:</strong> Send a 30-second audio message before their morning exam wishing them clarity and confidence, reminding them their worth is not defined by grades.</li>
          </ul>
        `,
      },
      {
        id: 'post-exam-reconnection-rituals',
        heading: 'Post-Exam Reconnection: Celebrating Semester Freedom',
        content: `
          <p>Once the final papers are submitted, celebrate your survival and rebuild connection:</p>
          <ul>
            <li><strong>Plan a Relaxed Day Trip:</strong> Take a scenic campus walk, visit an off-campus nature park, or enjoy a long meal without textbook stress.</li>
            <li><strong>Express Gratitude for Support:</strong> Thank your partner for their patience and understanding during high-stress study weeks. Mutual appreciation deepens your bond for upcoming semesters.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'Should you break up during university exam season?',
        answer: 'Never initiate a breakup during exam season unless there is abuse or a safety emergency. Emotional shock can cause a student to fail exams and repeat a semester. Agree to pause contact and discuss relationship status calmly after exams finish.',
      },
      {
        question: 'How do I tell my boyfriend or girlfriend I need space to study?',
        answer: 'Use affirming, clear communication: "I really care about you, and because I want to pass this exam, I need to focus completely on studying for the next 4 days. Let\'s have dinner together on Friday once my paper is done."',
      },
      {
        question: 'Do study dates with a romantic partner actually work?',
        answer: 'Yes, if you set clear boundaries: work in timed silent sprints (Pomodoro technique), sit side-by-side, and save talking for scheduled study breaks.',
      },
      {
        question: 'How can The College Date help students balance campus romance and academics?',
        answer: 'The College Date lets students see academic levels and faculty backgrounds upfront, connect with peers who share their study commitments, and communicate via asynchronous voice notes that don\'t disrupt revision.',
      },
    ],
    relatedGuides: [
      { label: 'How to Balance Dating and Studies in University', href: '/how-to-balance-dating-and-studies-in-university' },
      { label: 'Dating in Final Year of University', href: '/dating-in-final-year-of-university' },
      { label: 'How to Date on a Student Budget', href: '/how-to-date-on-a-student-budget' },
      { label: 'Healthy Relationships for University Students', href: '/healthy-relationship-university-students' },
    ],
  },
  {
    slug: 'how-to-handle-jealousy-in-university-relationships',
    file: 'public/how-to-handle-jealousy-in-university-relationships.html',
    lang: 'en',
    title: 'How to Handle Jealousy in University Relationships - Campus Guide',
    description: 'How to handle jealousy and insecurity in university relationships. Distinguish healthy boundaries from controlling habits, social media triggers, and gossip.',
    kicker: 'Campus Emotional Intelligence & Trust',
    h1: 'How to Handle Jealousy in University Relationships - Campus Guide',
    lede: 'Surrounded by charismatic coursemates, departmental WhatsApp groups, and campus parties? Here is how to master jealousy, overcome social insecurity, and build unshakeable trust in your university relationship.',
    date: '2026-09-19',
    ctaHeading: 'Build Healthy Trust on Campus',
    ctaText: 'The College Date promotes transparent, intentional student dating. Connect with verified university peers for authentic relationships built on mutual respect.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-campus-jealousy-trigger',
        heading: 'Why University Life Is a Breeding Ground for Jealousy',
        content: `
          <p>Tertiary institutions are social pressure cookers. Undergraduates live, study, and socialize in high-density environments where partners constantly interact with attractive peers: lab partners, course representatives, executive committee members, and hall neighbors. Add constant WhatsApp status updates, Instagram stories, and campus gossip, and it is easy to see why jealousy is the leading trigger for university relationship breakdowns.</p>
          <p>Feeling occasional jealousy is a normal human emotion signaling that you value your connection. However, when jealousy morphs into suspicion, phone snooping, interrogation, and controlling behavior, it rapidly destroys the very bond you are trying to protect.</p>
        `,
      },
      {
        id: 'healthy-boundaries-vs-controlling-behavior',
        heading: 'Healthy Boundaries vs. Toxic Controlling Habits',
        content: `
          <p>Many students confuse toxic possessiveness with "caring deeply". Distinguish between real boundaries and controlling abuse:</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Healthy Boundary</th>
                  <th>Toxic Controlling Behavior</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Discussing comfort levels regarding late-night one-on-one visits.</td>
                  <td>Demanding passwords to personal phones, WhatsApp, or Instagram.</td>
                </tr>
                <tr>
                  <td>Openly expressing discomfort when a coursemate flirts disrespectfully.</td>
                  <td>Forbidding your partner from having opposite-gender friends or study partners.</td>
                </tr>
                <tr>
                  <td>Expecting mutual honesty about where you are going on weekends.</td>
                  <td>Demanding continuous live location tracking and instant photo proof.</td>
                </tr>
                <tr>
                  <td>Addressing relationship concerns through calm, direct dialogue.</td>
                  <td>Screaming, staging public scenes at campus eateries, or giving silent treatment.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'root-causes-of-campus-insecurity',
        heading: 'Unpacking the Real Roots of Campus Insecurity',
        content: `
          <p>Jealousy is rarely about the other person; it is almost always about internal insecurity:</p>
          <ul>
            <li><strong>Comparison Traps:</strong> Comparing your fashion, pocket money, or background to wealthy or socially prominent students on campus breeds fear that your partner will find someone "better".</li>
            <li><strong>Past Betrayal Trauma:</strong> If you were cheated on in secondary school or early university years, you may project past wounds onto your current partner, treating innocent interactions as threats.</li>
            <li><strong>Lack of an Independent Identity:</strong> If your entire social life, hobbies, and validation depend solely on your partner, any interaction they have with others feels like an existential threat.</li>
          </ul>
        `,
      },
      {
        id: 'actionable-steps-to-overcome-jealousy',
        heading: 'Actionable Steps to Tame Jealousy and Rebuild Trust',
        content: `
          <p>When you feel an acute spike of jealousy, follow this emotional regulation framework:</p>
          <ol>
            <li><strong>Pause and Name the Emotion:</strong> Before sending an angry accusation or accusatory voice note, pause for 15 minutes. Ask yourself: <em>"Do I have hard evidence of disloyalty, or am I reacting to my own internal insecurity?"</em></li>
            <li><strong>Use "I Feel" Statements:</strong> Never attack with accusations (<em>"You are always flirting with your project partner!"</em>). Instead, express vulnerability calmly: <em>"When you stay out late with your study group without checking in, I feel anxious and disconnected. Can we agree on a quick check-in text?"</em></li>
            <li><strong>Stop the Surveillance Habit:</strong> Cease checking their status view timestamps, scrutinizing who liked their photos, or asking mutual friends for updates. Digital stalking magnifies paranoia.</li>
            <li><strong>Invest in Your Own Campus Life:</strong> Join a faculty club, excel in your academics, spend time with your hostel friends, and pursue your personal goals. A confident, fulfilled student naturally radiates security.</li>
          </ol>
        `,
      },
      {
        id: 'when-jealousy-is-justified',
        heading: 'When Jealousy Is a Genuine Warning Sign',
        content: `
          <p>While managing irrational jealousy is important, never gaslight yourself if real red flags are present:</p>
          <ul>
            <li>Your partner actively hides their screen or flips their phone face down whenever you enter the room.</li>
            <li>They gaslight you, calling you "crazy" or "paranoid" whenever you calmly raise legitimate concerns.</li>
            <li>They maintain secret, late-night emotional intimacies with an ex or a coursemate while dismissing your boundaries.</li>
          </ul>
        `,
      },
      {
        id: 'building-trust-and-digital-transparency',
        heading: 'Building Trust and Healthy Digital Habits in Modern Campus Romance',
        content: `
          <p>Overcoming jealousy in an era of constant notifications requires establishing healthy digital boundaries together:</p>
          <ol>
            <li><strong>No Surveillance Testing:</strong> Avoid creating fake secondary accounts or sending friends to "test" your partner's fidelity. Campus loyalty tests reflect poor self-esteem and permanently damage relational goodwill.</li>
            <li><strong>Normalize Open Presence:</strong> Mention your partner naturally among coursemates and friends so there is never ambiguity about your relationship status on campus.</li>
            <li><strong>Respect Private Downtime:</strong> A partner taking an hour to reply while in a laboratory practical, lecture hall, or gym does not signify infidelity. Foster emotional security that does not require constant reassurance pings.</li>
            <li><strong>Direct and Honest Reconnection:</strong> When doubts arise, speak in person rather than arguing over WhatsApp text threads where tone and context are easily misinterpreted.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is jealousy a sign of true love in university?',
        answer: 'No. While caring about someone naturally creates a desire to protect the relationship, intense jealousy, possessiveness, and control stem from insecurity and fear, not healthy love. True love fosters trust and mutual freedom.',
      },
      {
        question: 'How do I stop feeling jealous of my partner\'s attractive coursemates?',
        answer: 'Remind yourself that your partner chose you for your unique personality, intelligence, and connection. Focus on deepening your emotional bond rather than comparing yourself to people in their lecture hall.',
      },
      {
        question: 'Should I give my boyfriend or girlfriend my phone password to prove trust?',
        answer: 'No. Demanding or sharing phone passwords creates a false sense of security and erodes healthy personal privacy. Trust is built through consistent, honest behavior in real life, not digital surveillance.',
      },
      {
        question: 'How does The College Date encourage healthy relationship habits?',
        answer: 'The College Date emphasizes transparent communication, intention badges, and peer verification, giving students the tools to build respectful relationships without toxicity.',
      },
    ],
    relatedGuides: [
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'Red Flags in Student Relationships', href: '/red-flags-student-relationships' },
      { label: 'Green Flags in Student Relationships', href: '/green-flags-student-relationships' },
      { label: 'Healthy Relationships for University Students', href: '/healthy-relationship-university-students' },
    ],
  },
];

export function generateWave4Batch2() {
  console.log('Generating Wave 4 Batch 2 SEO Pages (Living & Relational Dynamics)...');
  for (const page of wave4Batch2Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`✓ Generated ${page.file} (${page.slug})`);
  }
}
