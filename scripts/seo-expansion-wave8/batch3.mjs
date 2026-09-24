import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave8Batch3Pages = [
  {
    slug: 'dating-a-student-athlete-in-university',
    file: 'public/dating-a-student-athlete-in-university.html',
    lang: 'en',
    title: 'Dating a Student Athlete in University - Varsity Romance Guide',
    description: 'Guide to dating a student athlete in university. Tips on handling intense varsity training, weekend tournament travel, fatigue, and sports season focus.',
    kicker: 'Faculty Personas & Varsity Sports',
    h1: 'Dating a Student Athlete in University - Varsity Romance Guide',
    lede: 'In a relationship with a varsity football, basketball, track, or rugby athlete on campus? From 5:30 AM morning conditioning and weekend tournament travel to physical exhaustion and campus sports admirers, here is your playbook for thriving with a student athlete.',
    date: '2026-09-24',
    ctaHeading: 'Discover Driven Campus Athletes & Peers',
    ctaText: 'The College Date helps university students find partners who respect your training discipline, share your fitness goals, and support your competitive passions.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-student-athlete-lifestyle',
        heading: 'The Student Athlete Reality: 5:30 AM Drills, Ice Baths & Classes',
        content: `
          <p>Student athletes on African university campuses carry a double full-time burden. Whether competing in the Nigerian University Games Association (NUGA), the East Africa University Games, the FASU Championships, or Varsity Cup competitions across South Africa, varsity athletes live lives governed by extreme physical discipline.</p>
          <p>Their daily routine begins while the rest of the campus is still asleep: 5:30 AM strength and conditioning drills, sprint intervals, tactical team meetings, followed by rushing across campus for 9:00 AM academic lectures, afternoon laboratory practicals, and another evening practice session. Understanding that physical exhaustion is a genuine bodily state—not an emotional slight—is the foundational secret to dating an athlete successfully.</p>
        `,
      },
      {
        id: 'navigating-tournament-travel-and-fatigue',
        heading: 'Surviving Season Sprints, Weekend Travel & Tournament Fatigue',
        content: `
          <p>When sports season arrives, an athlete’s calendar becomes exceptionally tight:</p>
          <ul>
            <li><strong>Weekend Away Games & Tournaments:</strong> Varsity athletes spend entire weekends traveling on team buses to rival universities for invitationals or tournament qualifiers. You must be comfortable with independence on weekends and skilled at maintaining connection across short travel windows.</li>
            <li><strong>The "8:30 PM Sleep Wall":</strong> When an athlete pushes their body through four hours of rigorous athletic exertion, their physical battery shuts down early. If they fall asleep midway through a phone call or prefer a quiet evening on the bed rather than a loud campus party, respect their recovery cycle. Athletic rest is non-negotiable.</li>
            <li><strong>Managing Pre-Game Tension:</strong> Before major championship matches, athletes experience intense mental focus and nerves. Be a steady source of peaceful encouragement rather than adding relationship drama before kickoff.</li>
          </ul>
        `,
      },
      {
        id: 'student-athlete-dating-matrix',
        heading: 'Dating a Campus Athlete: Supportive Habits vs. Straining Habits',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Supportive Partner Habits</th>
                  <th>Relationship-Damaging Habits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Showing up in the stands to cheer proudly during their home games and matches.</td>
                  <td>Guilt-tripping them for missing weekend parties due to mandatory team travel.</td>
                </tr>
                <tr>
                  <td>Planning relaxing, restorative dates that allow them to rest their sore muscles.</td>
                  <td>Demanding high-energy, physically exhausting late-night dates during game weeks.</td>
                </tr>
                <tr>
                  <td>Trusting their loyalty when other students cheer for them or ask for selfies.</td>
                  <td>Acting paranoid, possessive, or making public jealous scenes around fans.</td>
                </tr>
                <tr>
                  <td>Nurturing your own academic pursuits, campus clubs, and independent passions.</td>
                  <td>Making the athlete’s sports career the center of your entire personal identity.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'handling-campus-groupies-and-admirers',
        heading: 'Navigating Sports Visibility, Groupies & Admirers with Poise',
        content: `
          <p>Star varsity athletes—especially strikers on the football team or point guards on the basketball court—inevitably enjoy high visibility and a flock of campus admirers. Fellow students will follow them on social media, cheer their names in the stadium, and approach them at dining halls:</p>
          <ul>
            <li><strong>Quiet Confidence Beats Jealousy:</strong> An insecure partner who constantly monitors their partner’s social media comments looks small and suffocating. Stand tall in quiet confidence. They chose you to be their private sanctuary, away from the stadium noise.</li>
            <li><strong>Establish Mutual Respect Boundaries:</strong> While fan admiration is normal, your partner must establish firm boundaries with admirers. A mature athlete introduces you proudly to teammates and coaches and makes it abundantly clear that they are in a committed relationship.</li>
          </ul>
        `,
      },
      {
        id: 'becoming-their-safe-haven',
        heading: 'Being the Person They Can Be Real With When the Game Ends',
        content: `
          <p>Every athlete encounters tough moments: missing a penalty kick, suffering an ankle sprain, losing a critical semifinal match, or facing harsh criticism from demanding coaches. In those painful moments, they do not need another sports critic or coach—they need an unconditional partner.</p>
          <p>Remind them that their human worth, character, and intellect extend far beyond athletic statistics. Being the partner who loves them equally whether they hoist the gold trophy or suffer a heartbreaking defeat builds lifelong emotional devotion.</p>
        `,
      },
      {
        id: 'authentic-partnerships-on-the-college-date',
        heading: 'Discover Active, Inspiring Singles on The College Date',
        content: `
          <p>Whether you are an active varsity athlete, a fitness enthusiast, or simply someone who appreciates discipline and passion, university romance thrives when partners share mutual admiration.</p>
          <p>On <a href="/campus-dating">The College Date</a>, university students across Africa connect with verified peers who understand the demands of serious commitment, both in sports and in personal growth. Meet genuine campus singles ready to build inspiring relationships today.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'How do I support my partner after they lose a major championship game?',
        answer: 'Give them a warm hug, provide a good meal, and let them decompress in quiet companionship. Do not offer unsolicited tactical sports analysis or say "It was just a game." Validate their disappointment: "I know how hard you trained for this, and I am proud of your effort no matter what."',
      },
      {
        question: 'What if my partner’s training schedule leaves very little time for dates?',
        answer: 'Integrate quality time into daily routines: have breakfast together after their morning workout, walk together between classes, or join them for casual recovery stretching in the gym. Quality presence trumps quantity of hours.',
      },
      {
        question: 'Do student athlete relationships typically survive past college graduation?',
        answer: 'Yes, especially when couples develop strong communication habits and adapt gracefully to life after varsity sports. The transition away from competitive sports can be emotionally challenging, making a supportive partner even more vital.',
      },
      {
        question: 'What are great gift ideas for a university athlete?',
        answer: 'High-quality insulated water bottles, massage roller guns, premium sports socks, compression gear, personalized gym bags, or a gift basket of their favorite energy snacks and electrolyte mixes.',
      },
    ],
    relatedGuides: [
      { label: 'Dating an Engineering Student', href: '/dating-an-engineering-student-in-university' },
      { label: 'How to Date During University Exams', href: '/how-to-date-during-university-exams' },
      { label: 'Student Gift Ideas on a Budget', href: '/student-gift-ideas-on-a-budget' },
      { label: 'How to Balance Dating and Studies', href: '/how-to-balance-dating-and-studies-in-university' },
    ],
  },
  {
    slug: 'dating-a-creative-arts-student-in-university',
    file: 'public/dating-a-creative-arts-student-in-university.html',
    lang: 'en',
    title: 'Dating a Creative Arts Student in University - Studio Guide',
    description: 'Guide to dating a creative arts or theatre student in university. Tips on handling late-night rehearsals, studio deadlines, emotional depth, and art showcases.',
    kicker: 'Faculty Dynamics & Creative Romance',
    h1: 'Dating a Creative Arts Student in University - Studio Guide',
    lede: 'Dating a theatre arts, fine arts, music, film, or design student in university? From midnight stage rehearsals and frantic studio art exhibitions to deep emotional vulnerability and intense creative flow, here is your complete guide to loving a campus artist.',
    date: '2026-09-24',
    ctaHeading: 'Connect with Creative Campus Minds',
    ctaText: 'The College Date helps university students meet verified peers across all creative, scientific, and humanities faculties. Find someone who appreciates your unique expressive spirit.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-creative-arts-ecosystem',
        heading: 'The Creative Arts Ecosystem: Rehearsals, Studios & Passion',
        content: `
          <p>Creative arts, theatre arts, music, visual arts, and mass communication students experience higher education through a deeply expressive, visceral lens. Whether based at the creative arts faculties of UNILAG, Kenyatta University, KNUST, Makerere’s Margaret Trowell School of Industrial and Fine Arts, or UCT’s Michaelis School of Fine Art, campus artists live in an unconventional, intense rhythm.</p>
          <p>Unlike standard lecture disciplines assessed strictly by multiple-choice tests, a creative arts student's academic survival depends on original creation: stage acting performances, painting collections, short film productions, or musical recitals. Because their academic work is an extension of their personal soul and emotional vulnerability, dating a creative student is an intensely rewarding, deeply colorful experience that requires empathy and open-mindedness.</p>
        `,
      },
      {
        id: 'late-night-rehearsals-and-creative-flow',
        heading: 'Surviving Midnight Rehearsals, Studio Deadlines & Creative Flow',
        content: `
          <p>Partners dating a creative arts student quickly discover that traditional 9-to-5 schedules simply do not exist in the creative faculties:</p>
          <ul>
            <li><strong>The "Night Owl" Studio Sprints:</strong> Inspiration often strikes at 11:00 PM. Visual artists, sculptors, and digital animators will lock themselves in departmental studios until dawn, covered in charcoal, paint, or clay dust, racing to finish pieces before annual faculty exhibitions.</li>
            <li><strong>Exhausting Technical Rehearsals:</strong> During theatre and musical production weeks, cast and crew endure 8-hour technical rehearsals, adjusting lighting cues, memorizing dialogue, and drilling dance choreography. Demanding long telephone chats during production week will only cause unnecessary friction.</li>
            <li><strong>Deep Emotional Vulnerability:</strong> Creative students are trained to access and express raw human emotion—joy, grief, heartbreak, and fury—for their artistic work. This makes them remarkably empathetic and emotionally intuitive partners, but it also means they experience emotional highs and lows with greater intensity.</li>
          </ul>
        `,
      },
      {
        id: 'creative-student-dating-matrix',
        heading: 'Loving a Campus Artist: Nurturing Habits vs. Straining Habits',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nurturing, Partner-Building Habits</th>
                  <th>Straining, Inspiration-Draining Habits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Attending their gallery openings, stage plays, film screenings, and recitals.</td>
                  <td>Treating their artistic passion as an impractical, trivial campus hobby.</td>
                </tr>
                <tr>
                  <td>Giving them space to immerse themselves in creative flow states without guilt.</td>
                  <td>Interrupting their deep artistic concentration for trivial entertainment.</td>
                </tr>
                <tr>
                  <td>Offering sincere, thoughtful reactions to their art, music, or acting.</td>
                  <td>Mocking their vulnerability or dismissing experimental art as weird.</td>
                </tr>
                <tr>
                  <td>Being a calm, stabilizing anchor when creative self-doubt and imposter syndrome strike.</td>
                  <td>Criticizing their career prospects or comparing them to corporate business majors.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'handling-stage-romances-and-screen-kisses',
        heading: 'Handling On-Stage Romances, Screen Kisses & Art Models',
        content: `
          <p>One unique hurdle when dating an actor, dancer, or visual artist is witnessing them perform romantic or physically intimate scenes with coursemates on stage or in student films, or drawing live figure models in art studio sessions:</p>
          <ul>
            <li><strong>Separate Performance from Personal Reality:</strong> Acting is a technical discipline. When your partner hugs, kisses, or gazes into a co-actor’s eyes on stage under hot theatre spotlights while following a script and director’s cues, it is a professional job, not romantic attraction.</li>
            <li><strong>Mature Communication:</strong> If a specific stage role or creative project brings up natural feelings of jealousy, talk about it openly and playfully before opening night. An emotionally mature creative partner will reassure you with warmth and affection.</li>
          </ul>
        `,
      },
      {
        id: 'dates-that-inspire-creative-minds',
        heading: 'Designing Dates That Inspire Creative Minds',
        content: `
          <p>Artists thrive on sensory richness and fresh aesthetic experiences. Instead of standard fast-food cafeteria outings, plan dates that feed their creative soul:</p>
          <ul>
            <li><strong>Local Cultural Centers & Art Galleries:</strong> Visit off-campus artisan markets, indigenous heritage centers, or independent photography galleries.</li>
            <li><strong>Outdoor Acoustic Music & Poetry Evenings:</strong> Bring a blanket to an evening open-mic session or acoustic campus concert.</li>
            <li><strong>Collaborative DIY Painting Sessions:</strong> Buy two cheap mini-canvases, acrylic paints, and brushes, sit on a campus lawn, and paint portraits of each other. The laughter and keepsake souvenirs will be unforgettable.</li>
          </ul>
        `,
      },
      {
        id: 'authentic-expression-on-the-college-date',
        heading: 'Discover Expressive, Passionate Singles on The College Date',
        content: `
          <p>Every relationship becomes richer when partners appreciate each other’s unique talents and worldview. Dating someone who sees the world in vivid color and emotional depth brings magic to your university years.</p>
          <p>On <a href="/student-dating">The College Date</a>, university students across Africa discover verified peers who celebrate authentic expression, creative ambition, and meaningful emotional connection. Find someone who appreciates your unique story today.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'What should I do if my partner experiences intense imposter syndrome or creative block?',
        answer: 'Listen patiently without immediately jumping to logical fixes. Remind them of past pieces or performances they created that touched people. A warm cup of tea, a walk outdoors, and steady emotional reassurance help break creative paralysis faster than pressure.',
      },
      {
        question: 'Is it normal for a theatre arts student to spend all weekend in rehearsals?',
        answer: 'Yes, absolutely. In the 2 to 3 weeks before major departmental production examinations or university theatre festivals, rehearsals frequently run from morning until late at night. Plan simple ways to support them, like dropping off bottled water or packing a meal.',
      },
      {
        question: 'What if I am a science major and know nothing about visual art or music?',
        answer: 'You do not need an art history degree to be an amazing partner! In fact, artists often love dating STEM or business students because it provides a grounded, refreshing break from intense creative faculty drama. Just be curious and ask them what inspired their work.',
      },
      {
        question: 'What are creative gift ideas for an arts student?',
        answer: 'High-grade sketchbooks, quality artist pigment sets, leather notebook covers, tickets to an indie film screening, a curated vinyl record or Spotify playlist, or a portfolio transport case.',
      },
    ],
    relatedGuides: [
      { label: 'Dating a Law Student', href: '/dating-a-law-student-in-university' },
      { label: 'Campus Date Ideas for Students', href: '/campus-date-ideas-students' },
      { label: 'Student Gift Ideas on a Budget', href: '/student-gift-ideas-on-a-budget' },
      { label: 'How to Keep Your Relationship Private', href: '/how-to-keep-your-relationship-private-on-campus' },
    ],
  },
  {
    slug: 'dating-apps-for-students-malawi',
    file: 'public/dating-apps-for-students-malawi.html',
    lang: 'en',
    title: 'Dating Apps for Students in Malawi - University Social Guide',
    description: 'Best dating apps for students in Malawi. How university students at UNIMA, Mzuzu, and LUANAR connect safely, meet campus singles, and discover student romance.',
    kicker: 'Regional Student Guides & Malawi Campuses',
    h1: 'Dating Apps for Students in Malawi - University Social Guide',
    lede: 'Looking for the best dating apps for university students in Malawi? From the historic halls of UNIMA in Zomba and Mzuzu University to LUANAR, MUST, and Catholic University of Malawi, here is how Malawian students are discovering meaningful romance, campus peers, and safe dating.',
    date: '2026-09-24',
    ctaHeading: 'Join Malawi’s Dedicated Student Dating App',
    ctaText: 'The College Date helps Malawian university students meet verified peers safely across all tertiary campuses with photo integrity and zero mobile data bloat.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-malawi-student-dating-landscape',
        heading: 'The Malawi Campus Dating Landscape: Zomba, Blantyre & Lilongwe',
        content: `
          <p>Higher education in Malawi is home to dynamic, tight-knit, and ambitious student communities. Across institutions like the University of Malawi (UNIMA) in Zomba, Mzuzu University (MZUNI) in the northern region, Lilongwe University of Agriculture and Natural Resources (LUANAR), Malawi University of Science and Technology (MUST) in Thyolo, and the Catholic University of Malawi (CUNIMA), campus life is rich with culture, intellectual ambition, and social connection.</p>
          <p>Historically, Malawian students met romantic partners primarily through student Christian organizations (like SCOM), departmental associations, inter-hall sports tournaments, and student union social bashes. However, as 4G mobile smartphone penetration expands rapidly across Airtel Malawi and TNM networks, tertiary students are increasingly seeking modern, secure digital avenues to meet verified peers beyond their immediate lecture halls and hostel corridors.</p>
        `,
      },
      {
        id: 'why-generic-dating-apps-fail-malawian-students',
        heading: 'Why Generic Global Dating Apps Struggle in Malawi',
        content: `
          <p>While mainstream international dating platforms exist, tertiary students in Malawi face unique obstacles when trying to use them for meaningful connection:</p>
          <ul>
            <li><strong>High Mobile Data Costs:</strong> Mobile internet tariffs in Malawi remain a significant budgeting consideration for undergraduates. Heavy, video-bloated dating apps consume scarce megabytes within minutes, making continuous usage financially unsustainable for students on tight monthly allowances.</li>
            <li><strong>Severe Infiltration of Fake Accounts & Scams:</strong> Unverified global platforms suffer from catfish accounts, commercial solicitations, and deceptive profiles that compromise student safety and emotional well-being.</li>
            <li><strong>Lack of Campus Filtering:</strong> Global apps pair students with non-academic individuals across wide geographic radiuses who do not share the university lifestyle, exam schedules, or intellectual goals of student life.</li>
          </ul>
        `,
      },
      {
        id: 'malawi-student-dating-app-comparison',
        heading: 'Dating Platform Comparison for Tertiary Students in Malawi',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Platform Feature</th>
                  <th>The College Date</th>
                  <th>Generic International Dating Apps</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Campus & Faculty Community Focus</td>
                  <td>Strictly tailored for university and tertiary students.</td>
                  <td>Generic public audience across all demographics.</td>
                </tr>
                <tr>
                  <td>Bandwidth & Data Optimization</td>
                  <td>Optimized for low-data mobile performance and fast CDN loading.</td>
                  <td>Heavy video backgrounds and high mobile data consumption.</td>
                </tr>
                <tr>
                  <td>Safety & Anti-Catfish Verification</td>
                  <td>Vision AI photo checks and NDPA-compliant safety protocols.</td>
                  <td>Minimal or optional profile picture validation.</td>
                </tr>
                <tr>
                  <td>Payment & Virtual Economy Access</td>
                  <td>Designed with local African payment options and mobile accessibility.</td>
                  <td>Rigid US dollar subscriptions requiring international credit cards.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'malawi-campus-dating-safety-protocols',
        heading: 'Essential Dating Safety Rules for Students in Malawi',
        content: `
          <p>Whether meeting someone from UNIMA’s Chirunga campus, MZUNI, or LUANAR’s Bunda campus, protecting your physical and emotional safety is paramount:</p>
          <ul>
            <li><strong>Always Meet in Public Campus Spots First:</strong> Arrange first dates in lively public areas—such as campus dining halls, university library quads, student union cafes, or recognized shopping centers in Zomba, Blantyre, or Lilongwe.</li>
            <li><strong>Inform a Trusted Roommate or Friend:</strong> Never go on a first date without telling your hostel roommate where you are going, who you are meeting, and what time you expect to return. Share live location coordinates via WhatsApp when meeting off-campus.</li>
            <li><strong>Maintain Financial Independence:</strong> Always carry your own mobile money (Airtel Money or TNM Mpamba) or cash to cover your own drinks, transport, or unexpected taxi fares. Never rely on a stranger for your return transit.</li>
          </ul>
        `,
      },
      {
        id: 'campus-date-ideas-in-malawi',
        heading: 'Affordable, Romantic Campus Date Ideas Across Malawi',
        content: `
          <p>Dating in Malawi does not require lavish spending. Some of the most memorable student dates celebrate the country’s stunning natural beauty and local culture:</p>
          <ul>
            <li><strong>Zomba Plateau Scenic Walks (UNIMA):</strong> Students in Zomba can enjoy a scenic afternoon hike or picnic near the botanical gardens or lower plateau trails with breathtaking vistas.</li>
            <li><strong>Lake Malawi Weekend Day Trips:</strong> For students near Mangochi or Salima campuses, a sunny afternoon by the freshwater beaches of Lake Malawi offers incredible romance on a student budget.</li>
            <li><strong>Street Snack & Chambo Food Dates:</strong> Savoring fresh grilled maize, roasted bananas, or lake chambo at popular student food spots creates relaxed, unpretentious chemistry.</li>
          </ul>
        `,
      },
      {
        id: 'joining-the-college-date-in-malawi',
        heading: 'Start Your Campus Romance Journey on The College Date',
        content: `
          <p>The College Date is proud to welcome students across the Warm Heart of Africa. Connect with verified students from UNIMA, MZUNI, LUANAR, MUST, CUNIMA, and colleges nationwide.</p>
          <p>Create your free profile on <a href="/signup">The College Date</a> today. Discover ambitious peers, build lasting friendships, and experience modern campus dating built with safety, respect, and student realities at its core.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is The College Date accessible for students across all universities in Malawi?',
        answer: 'Yes! Students from UNIMA, Mzuzu University, LUANAR, MUST, Catholic University, and all accredited tertiary institutions across Malawi can register, verify their campus credentials, and discover verified peers.',
      },
      {
        question: 'Does The College Date work smoothly on Airtel Malawi and TNM mobile data?',
        answer: 'Yes. The application and website are engineered with ultra-lightweight client bundles and optimized mobile CDNs, ensuring rapid loading and minimal data consumption even on standard mobile internet connections.',
      },
      {
        question: 'Can I keep my profile private from people outside my university in Malawi?',
        answer: 'Yes! The College Date provides dedicated campus filters and privacy controls, allowing you to discover peers within your institution, faculty, or across nearby university campuses.',
      },
      {
        question: 'How do I protect myself from romance scams when dating online in Malawi?',
        answer: 'Never send money, airtime vouchers, or transport advances to someone you have not met in person. Use verified student platforms, verify profiles through video calls before meeting, and always meet for the first time in populated public places.',
      },
    ],
    relatedGuides: [
      { label: 'Dating Apps for Students in Zambia', href: '/dating-apps-for-students-zambia' },
      { label: 'Dating Apps for Students in Tanzania', href: '/dating-apps-for-students-tanzania' },
      { label: 'Dating Apps for Students in Zimbabwe', href: '/dating-apps-for-students-zimbabwe' },
      { label: 'Student Dating Apps in Africa', href: '/student-dating-apps-africa' },
    ],
  },
];

export function generateWave8Batch3() {
  for (const page of wave8Batch3Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`✓ Rendered Wave 8 Batch 3: ${page.file}`);
  }
}
