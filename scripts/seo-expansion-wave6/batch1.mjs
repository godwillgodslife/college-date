import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave6Batch1Pages = [
  {
    slug: 'dating-an-engineering-student-in-university',
    file: 'public/dating-an-engineering-student-in-university.html',
    lang: 'en',
    title: 'Dating an Engineering Student in University - Campus Guide',
    description: 'How to date an engineering student in university. Tips on surviving CAD studio deadlines, coding marathons, introverted communication, and project defense.',
    kicker: 'Faculty Dynamics & Academic Realities',
    h1: 'Dating an Engineering Student in University - Campus Guide',
    lede: 'In a relationship with someone in engineering, computer science, or architecture? Here is your complete guide to dating a future engineer—surviving 72-hour CAD deadlines, coding marathons, introverted texting, and final-year project defense weeks.',
    date: '2026-09-20',
    ctaHeading: 'Connect with Ambitious Campus Peers',
    ctaText: 'The College Date helps students meet verified peers across all faculties. Discover partners who understand your academic dedication and career drive.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-engineering-faculty-reality',
        heading: 'The Engineering Reality: Labs, Calculations & Screen Time',
        content: `
          <p>Engineering, software engineering, and architecture students navigate some of the most grueling academic schedules in tertiary education. From the engineering faculties of University of Lagos (Unilag), Kwame Nkrumah University of Science and Technology (KNUST), Jomo Kenyatta University of Agriculture and Technology (JKUAT), Federal University of Technology Akure (FUTA), to the University of Cape Town (UCT) and Wits, engineering students endure relentless workloads.</p>
          <p>Between 8 AM mechanical workshops, thermodynamics problem sets, electrical circuit simulations, computer lab coding sprints, and studio design submissions, engineering students spend hours deeply immersed in logic and problem-solving. Understanding this intense cognitive demand is the key to building a joyful, resilient relationship without taking their focus or exhaustion personally.</p>
        `,
      },
      {
        id: 'the-communication-style-of-engineers',
        heading: 'Cracking the Code: The Literal & Logical Communication Style',
        content: `
          <p>Engineering education trains students to be highly analytical, direct, and focused on practical problem-solving. This mindset often shapes how they communicate in relationships:</p>
          <ul>
            <li><strong>Literal Interpretation Over Subtle Hints:</strong> If you say: <em>"I'm fine,"</em> an engineering partner will almost always take that statement literally and assume everything is fine. Passive-aggressive hints, silent treatments, or testing games confuse them. Direct, clear communication (<em>"I'm feeling a bit lonely today; can we grab dinner tonight?"</em>) yields immediate, loving responses.</li>
            <li><strong>Fixers, Not Just Listeners:</strong> When you vent about a stressful day or hostel roommate disagreement, their first instinct is to propose a 5-step optimization plan. If you just want emotional empathy, tell them upfront: <em>"I don't need a solution right now; I just need a warm hug and someone to listen."</em></li>
            <li><strong>The "Deep Work" Tunnel Vision:</strong> When debugging a line of code or calculating beam deflections in CAD, interruption breaks hours of mental concentration. A delayed WhatsApp reply does not mean they stopped caring; it means their brain is locked in deep focus.</li>
          </ul>
        `,
      },
      {
        id: 'engineering-dating-survival-matrix',
        heading: 'Survival Rules: How to Build Balance with an Engineer',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Helpful Partner Habits</th>
                  <th>Relationship-Straining Habits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Respecting their intensive lab, design studio, or workshop hours.</td>
                  <td>Guilt-tripping them for missing non-essential campus parties during lab weeks.</td>
                </tr>
                <tr>
                  <td>Planning relaxing, low-pressure dates that allow them to unplug from screens.</td>
                  <td>Demanding constant rapid-fire texting during afternoon practical classes.</td>
                </tr>
                <tr>
                  <td>Taking interest in their creations: visiting their design expo or robot showcase.</td>
                  <td>Dismissing their technical passions as boring or incomprehensible nerd talk.</td>
                </tr>
                <tr>
                  <td>Maintaining your own independent campus social life, hobbies, and goals.</td>
                  <td>Making them the sole source of your entertainment when they have deadlines.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'surviving-project-defense-and-studio-deadlines',
        heading: 'Surviving Final-Year Project Defense and Studio Sprints',
        content: `
          <p>The final-year project defense (often termed "Cap-stone" or "Project Defense") and architecture studio crits are peak pressure periods. Students often spend 48 consecutive hours in labs building hardware prototypes or rendering 3D blueprints:</p>
          <ol>
            <li><strong>Deliver Practical Comfort:</strong> Bring hot coffee, fresh energy snacks, or a warm meal to their lab or workshop table. An unexpected snack delivery during an all-night CAD session is the ultimate language of love.</li>
            <li><strong>The "Zero Drama" Truce:</strong> Agree that major relationship milestones, sensitive negotiations, or long-term existential talks are paused until after their project defense marks are submitted.</li>
            <li><strong>Celebrate Their Engineering Milestones:</strong> Attend their final project exhibition, cheer during their prototype demonstration, and take proud photos of their completed machine or software app.</li>
          </ol>
        `,
      },
      {
        id: 'helping-an-introverted-engineer-unwind',
        heading: 'Helping an Introverted Engineer Unplug and Decompress',
        content: `
          <p>Because technical fields attract many introverted students who spend 10+ hours a day in front of glowing monitors, traditional high-energy dates can feel overwhelming:</p>
          <ul>
            <li><strong>Embrace Quiet Parallel Play:</strong> Sit together in a comfortable room or shaded campus lawn where they work on their circuit simulation and you read your literature novel or listen to music. Being in each other's calm presence without constant talking is profoundly restorative.</li>
            <li><strong>Get Outside into Nature:</strong> A gentle walk through campus botanical gardens, sports fields, or an off-campus nature reserve helps rest their strained eyes and resets their nervous system.</li>
            <li><strong>Cook Comfort Meals Together:</strong> Cooking dinner together in a quiet hostel kitchenette or off-campus apartment offers an enjoyable, hands-on activity that completely distracts from academic algorithms.</li>
          </ul>
        `,
      },
      {
        id: 'great-date-ideas-for-engineering-couples',
        heading: '5 High-Connection Date Ideas for Engineering Couples',
        content: `
          <p>Keep your romantic bond fresh without disrupting intensive laboratory schedules:</p>
          <ol>
            <li><strong>The Post-Lab Smoothie Decompression:</strong> Meet at a campus fruit bar or juice stand for 20 minutes right after their long Thursday workshop before evening revision.</li>
            <li><strong>Museum or Science Exhibition Visit:</strong> Explore a local science centre, technology museum, or architecture landmark where their passion for how things work can shine.</li>
            <li><strong>Gaming or Board Game Night:</strong> Spend an evening playing cooperative board games, strategy puzzles, or casual video games that engage their strategic mind in a fun, relaxed setting.</li>
            <li><strong>Campus Stargazing or Night Walk:</strong> Take a quiet walk across the campus athletic field late at night after the library closes, talking about life beyond university.</li>
            <li><strong>Sunday Morning Brunch Unplugged:</strong> Have a 45-minute brunch at a campus eatery with a strict "phones and laptops face-down" rule to reconnect deeply before the new week begins.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Why do engineering students take so long to text back?',
        answer: 'Engineering students frequently spend hours in noisy physical laboratories, workshops, or locked in deep computer programming concentration where taking out a phone breaks complex mental workflows. Once free, they will gladly reply.',
      },
      {
        question: 'How do I support an engineering student who is failing a tough course?',
        answer: 'Listen with empathy without lecturing. Difficult weed-out courses (like Engineering Mathematics, Fluid Mechanics, or Thermodynamics) are notorious for high failure rates. Remind them that one bad test does not define their intellect, and support their revision schedule.',
      },
      {
        question: 'Can an arts or humanities student date an engineering student successfully?',
        answer: 'Absolutely! Many of the happiest campus couples bridge different faculties. Humanities students bring emotional depth, cultural perspectives, and creative warmth, while engineers provide grounded logic, dependability, and structured support.',
      },
      {
        question: 'How does The College Date help students find compatible partners across faculties?',
        answer: 'The College Date displays faculty background, study levels, and personal passions upfront. You can easily discover peers from engineering, arts, science, or business who appreciate your lifestyle and schedule.',
      },
    ],
    relatedGuides: [
      { label: 'How to Balance Dating and Studies in University', href: '/how-to-balance-dating-and-studies-in-university' },
      { label: 'How to Date During University Exams', href: '/how-to-date-during-university-exams' },
      { label: 'Dating as an Introvert in University', href: '/dating-as-an-introvert-in-university' },
      { label: 'Healthy Relationships for University Students', href: '/healthy-relationship-university-students' },
    ],
  },
  {
    slug: 'how-to-date-as-a-working-student',
    file: 'public/how-to-date-as-a-working-student.html',
    lang: 'en',
    title: 'How to Date as a Working Student - Side Hustles & Balance',
    description: 'Practical guide to dating as a working student. How to balance full-time university coursework, freelance side hustles, romantic dates, and prevent burnout.',
    kicker: 'Student Hustle & Relationship Balance',
    h1: 'How to Date as a Working Student - Side Hustles & Balance',
    lede: 'Juggling full-time university lectures, late-night freelance clients, a campus side hustle, and a romantic relationship? Here is how to date successfully as a working student without burning out, tanking your GPA, or neglecting your partner.',
    date: '2026-09-20',
    ctaHeading: 'Meet Driven, Understanding Peers',
    ctaText: 'Connect with campus peers who value hard work, entrepreneurial ambition, and authentic relationships. Join The College Date free today.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-rise-of-the-working-undergraduate',
        heading: 'The Modern Reality: The Hustling Undergraduate',
        content: `
          <p>Across African universities, the concept of the "full-time student with endless free time" is becoming obsolete. From Lagos, Nairobi, and Accra to Johannesburg and Kampala, millions of undergraduates are working students: freelancing as software developers, graphic designers, and social media managers; running campus baking, catering, or thrift fashion brands; working part-time retail shifts; or tutoring junior students.</p>
          <p>Working students bear immense responsibilities: covering tuition fees, supporting family at home, paying private off-campus accommodation rent, and building career portfolios before graduation. However, adding romantic dating into a packed calendar of 8 AM lectures and client deliverables can feel like an impossible juggling act.</p>
        `,
      },
      {
        id: 'the-time-scarcity-dilemma',
        heading: 'Managing Severe Time Scarcity: The 168-Hour Audit',
        content: `
          <p>Every student has exactly 168 hours in a week. When 40 hours go to lectures and revision, 25 hours to your side hustle, and 50 hours to sleep, you have limited discretionary hours left. Use them with high intention:</p>
          <ul>
            <li><strong>Schedule Dates Like Executive Appointments:</strong> Spontaneous "hangouts" often collapse when unexpected client revisions arrive. Protect romantic time by putting a 90-minute Friday dinner date or Sunday brunch directly on your calendar like a mandatory client deadline.</li>
            <li><strong>Practice True Disconnection During Dates:</strong> When you are with your partner for that scheduled hour, close your client Slack channels, mute business WhatsApp notifications, and put your phone in your pocket. One hour of focused presence feels far more loving than three hours of distracted laptop typing.</li>
            <li><strong>Embrace "Co-Working" Dates:</strong> If you both have work to do, meet at a quiet campus cafe or off-campus workspace. Work silently on your separate laptops for 90 minutes, then celebrate by sharing a meal or walking across campus together.</li>
          </ul>
        `,
      },
      {
        id: 'navigating-financial-disparities',
        heading: 'Navigating Income Gaps: Earning Student vs. Allowance Student',
        content: `
          <p>Working students often earn independent income, which can create subtle relationship friction if their partner relies strictly on a modest parental allowance:</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Healthy Financial Dynamic</th>
                  <th>Unhealthy Financial Resentment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Treating your partner generously within reason without expecting subservience.</td>
                  <td>Using your earning power to control date choices or demand relationship leverage.</td>
                </tr>
                <tr>
                  <td>Choosing date spots that fit your partner's comfort zone so they don't feel awkward.</td>
                  <td>Insisting on expensive venues that make an allowance-dependent partner feel insecure.</td>
                </tr>
                <tr>
                  <td>Recognizing non-monetary contributions: emotional care, study help, cooking meals.</td>
                  <td>Viewing the relationship purely through financial transactions and keeping score.</td>
                </tr>
                <tr>
                  <td>Respecting your partner's academic discipline even if their studies don't generate cash yet.</td>
                  <td>Looking down on a partner because they haven't started an entrepreneurial side hustle.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'preventing-chronic-burnout-and-exhaustion',
        heading: 'Preventing the Triple Burnout: Work, School & Romance',
        content: `
          <p>Trying to be a straight-A student, a six-figure freelancer, and the world's most attentive romantic partner will quickly lead to physical and mental collapse:</p>
          <ol>
            <li><strong>Learn to Say "No" to Low-Yield Commitments:</strong> Drop low-paying, high-stress freelance clients who demand endless revisions. Your mental health and relationship quality are worth more than micro-income.</li>
            <li><strong>Communicate Your Energy Limits Honestly:</strong> If you worked a 14-hour shift between classes and client deliverables, say kindly: <em>"I'm so exhausted tonight that I won't be good company. Can we cuddle and watch a movie quietly, or meet for breakfast tomorrow instead?"</em></li>
            <li><strong>Let Your Partner Be Your Peace, Not Another Job:</strong> A healthy relationship should be a sanctuary where you can take off your "hustler" armor and rest, not an exhausting performance where you have to prove yourself constantly.</li>
          </ol>
        `,
      },
      {
        id: 'choosing-a-supportive-partner',
        heading: 'Green Flags: How to Know Your Partner Truly Supports Your Hustle',
        content: `
          <p>As an ambitious, working student, you cannot afford a partner who drains your energy. Look for these essential green flags:</p>
          <ul>
            <li><strong>They Respect Your Work Deadlines:</strong> When you say you have an urgent client deliverable or inventory drop to prepare, they encourage you rather than throwing tantrums or accusing you of neglect.</li>
            <li><strong>They Celebrate Your Wins:</strong> When you land a major client, make a record sale, or pass an exam, they are genuinely thrilled for your success, free from petty jealousy.</li>
            <li><strong>They Provide Practical Support:</strong> They help you proofread a pitch deck, test your new app, help package customer orders during campus rush hour, or bring you a cold drink while you work.</li>
          </ul>
        `,
      },
      {
        id: 'low-stress-date-ideas-for-busy-students',
        heading: '5 Time-Smart Date Ideas for Working Student Couples',
        content: `
          <p>Maximize intimacy when time is precious with these efficient, deeply rewarding date ideas:</p>
          <ol>
            <li><strong>The Campus Coffee & Goal-Setting Hour:</strong> Spend 45 minutes on Monday morning reviewing your weekly schedules together over coffee so you know when to support each other.</li>
            <li><strong>The Late-Night Dinner Decompression:</strong> Meet at a 24-hour campus diner or cook a 20-minute meal together after your freelance client work is finished for the night.</li>
            <li><strong>The Co-Working Library Session:</strong> Reserve a study room with power outlets where you code, write, or design alongside your partner for two focused hours.</li>
            <li><strong>The 30-Minute Sunset Quad Walk:</strong> Leave laptops in your rooms and take an evening stroll around campus to breathe fresh air and hold hands before night revision.</li>
            <li><strong>Weekend Morning Rest Date:</strong> Dedicate Saturday morning entirely to sleeping in, sharing breakfast, and talking without alarm clocks or emails.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'How do I tell my partner I am too busy with work without hurting their feelings?',
        answer: 'Use affirming, forward-looking language: "I really want to give you my full attention, but I have a major client deadline tonight. Can we plan an uninterrupted dinner date on Saturday once this project is delivered?"',
      },
      {
        question: 'Should I lend money to my boyfriend or girlfriend from my side hustle earnings?',
        answer: 'Exercise extreme caution. Lending money in student relationships often creates awkward power imbalances and resentment. If you choose to help, only give an amount you are comfortable treating as a gift with zero expectation of repayment.',
      },
      {
        question: 'What if my partner complains that my hustle takes up too much time?',
        answer: 'Have a calm conversation about your long-term goals. Explain that your side business is necessary for your education and future, but also evaluate whether you can optimize your schedule to protect quality time together.',
      },
      {
        question: 'How does The College Date cater to ambitious, busy university students?',
        answer: 'The College Date features asynchronous messaging and audio voice notes that allow busy students to stay warmly connected between lectures and work shifts without interrupting their daily hustle.',
      },
    ],
    relatedGuides: [
      { label: 'How to Balance Dating and Studies in University', href: '/how-to-balance-dating-and-studies-in-university' },
      { label: 'How to Date on a Student Budget', href: '/how-to-date-on-a-student-budget' },
      { label: 'Splitting the Bill on Campus Dates', href: '/splitting-the-bill-on-campus-dates' },
      { label: 'Healthy Relationships for University Students', href: '/healthy-relationship-university-students' },
    ],
  },
];

export function generateWave6Batch1() {
  console.log('Generating Wave 6 Batch 1 SEO Pages (Engineering & Working Students)...');
  for (const page of wave6Batch1Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`✓ Generated ${page.file} (${page.slug})`);
  }
}
