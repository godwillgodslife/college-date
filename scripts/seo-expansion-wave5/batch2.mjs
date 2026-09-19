import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave5Batch2Pages = [
  {
    slug: 'soft-launching-your-relationship-in-university',
    file: 'public/soft-launching-your-relationship-in-university.html',
    lang: 'en',
    title: 'Soft Launching Your Relationship in University - Campus Guide',
    description: 'How to soft-launch your university relationship on WhatsApp Status and Instagram. Avoid campus gossip while protecting your partner from feeling hidden.',
    kicker: 'Digital Campus Culture & Privacy',
    h1: 'Soft Launching Your Relationship in University - Campus Guide',
    lede: 'Wondering how to post your partner on WhatsApp Status, Instagram, or TikTok without inviting unwanted campus drama or making them feel hidden? Here is the complete guide to mastering the "soft launch" in university.',
    date: '2026-09-19',
    ctaHeading: 'Date Authentically on Campus',
    ctaText: 'Skip social media games and build real, intentional connections. Join The College Date to connect with verified campus peers who value genuine relationships.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'what-is-a-soft-launch',
        heading: 'What Is a Soft Launch? The Anatomy of Digital Subtlety',
        content: `
          <p>In modern digital campus culture, a "soft launch" is the deliberate practice of sharing hints of a romantic relationship on social media—such as WhatsApp Status, Instagram Stories, Snapchat, or TikTok—without tagging your partner or fully displaying their face. It might be two coffee cups on a cafe table, a casual shot of two hands holding books in the library, their shoulder in a sunset photo, or a snapshot of their shoes alongside yours.</p>
          <p>Unlike a "hard launch" (where you post a clear portrait photo, tag their handle, and declare your relationship status to hundreds of coursemates and faculty gossips), a soft launch communicates that you are happily off the market while maintaining a protective boundary around your private life.</p>
        `,
      },
      {
        id: 'why-students-soft-launch-on-campus',
        heading: 'Why University Students Choose the Soft Launch',
        content: `
          <p>Tertiary campuses are hyper-connected environments where gossip travels through departmental WhatsApp groups and hostel corridors in minutes. Students choose the soft launch for several smart, strategic reasons:</p>
          <ul>
            <li><strong>Protecting the Fragile Talking Stage:</strong> In the early months of dating, the relationship is still finding its footing. Hard launching too early places unnecessary social pressure and public scrutiny on a bond that is still taking root.</li>
            <li><strong>Deterring Unwanted Flirting Without Drama:</strong> A subtle photo showing you out on a date signals to mutual campus acquaintances and suitors that you are romantically occupied, reducing persistent DMs and awkward in-person advances.</li>
            <li><strong>Avoiding Ex-Partner and Gossip Interference:</strong> Full public reveals often trigger unsolicited comments from past exes, nosy hall neighbors, or speculative faculty rumors. A soft launch preserves peace.</li>
            <li><strong>Preventing Public Digital Scars:</strong> If the relationship does not work out after two months, you do not have to perform an awkward, public purge of photos from your feeds while fielding intrusive questions from coursemates.</li>
          </ul>
        `,
      },
      {
        id: 'soft-launch-vs-keeping-them-hidden',
        heading: 'Soft Launching vs. "Pocketing": How to Spot the Difference',
        content: `
          <p>There is a crucial emotional boundary between protecting privacy and "pocketing" (deliberately hiding your partner to appear single). Understand the difference:</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Healthy Soft Launch</th>
                  <th>Toxic Pocketing (Hiding Your Partner)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Your close hostel friends and core inner circle know your partner in real life.</td>
                  <td>You keep your partner completely secret from your real-life friends and coursemates.</td>
                </tr>
                <tr>
                  <td>Both partners mutually agree to keep online posting subtle and low-profile.</td>
                  <td>One partner begs to be posted while the other makes excuses to preserve an illusion of singlehood.</td>
                </tr>
                <tr>
                  <td>You proudly hold hands or sit together in public campus spaces.</td>
                  <td>You refuse to walk together on campus or act cold when other students walk past.</td>
                </tr>
                <tr>
                  <td>Hints and aesthetic date moments are shared openly on public status views.</td>
                  <td>You exclude your partner from WhatsApp Status or hide your status specifically from them.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'the-step-by-step-soft-launch-playbook',
        heading: 'The 4-Stage Campus Soft Launch Playbook',
        content: `
          <p>Follow this natural progression to navigate digital visibility gracefully as your relationship deepens:</p>
          <ol>
            <li><strong>Stage 1: The Environmental Clue (Month 1-2):</strong> Two plates of jollof rice or two cappuccino mugs at an off-campus cafe; two laptops open during a late-night study sprint; two shadows cast on the campus pathway. No faces, no hands.</li>
            <li><strong>Stage 2: The Physical Hint (Month 2-4):</strong> A watch or bracelet visible across the restaurant table; a photo taken from behind while walking toward the library; their hand holding the steering wheel or holding your backpack.</li>
            <li><strong>Stage 3: The Close Friends Reveal (Month 4-6):</strong> Sharing photos of the two of you laughing together exclusively to your curated Instagram "Close Friends" list or private WhatsApp custom privacy circle containing your trusted 15 friends.</li>
            <li><strong>Stage 4: The Milestone Hard Launch (Optional / Long-Term):</strong> A celebratory birthday portrait, anniversary post, or graduation picture where you openly celebrate your bond with full tags and warmth.</li>
          </ol>
        `,
      },
      {
        id: 'managing-campus-whatsapp-status-culture',
        heading: 'WhatsApp Status Culture: Respect, Re-posts & Boundaries',
        content: `
          <p>WhatsApp Status is the dominant social layer across African universities. Use it with maturity:</p>
          <ul>
            <li><strong>Never Post Passive-Aggressive Sub-Tweets:</strong> If you have an argument with your partner, never post cryptic heartbreak quotes, moody song lyrics, or bitter memes on WhatsApp Status. Campus peers will instantly notice, fueling rumors and eroding trust.</li>
            <li><strong>Discuss Re-Posting Etiquette:</strong> If your partner posts a cute photo of you, check with them before re-posting it to your own 500 WhatsApp contacts. Mutual comfort is the golden rule.</li>
            <li><strong>Avoid "Status Surveillance":</strong> Do not obsess over who viewed their status or demand explanations for every contact who leaves an emoji reply. Healthy digital trust is built on real-world integrity.</li>
          </ul>
        `,
      },
      {
        id: 'when-you-are-ready-to-hard-launch',
        heading: 'Signs You Are Ready for a Full Campus Hard Launch',
        content: `
          <p>Moving from a soft launch to an open, public campus launch is a milestone. You are ready when:</p>
          <ol>
            <li><strong>Exclusivity and Commitment Are Explicitly Agreed:</strong> You have had a clear, direct conversation confirming you are officially boyfriend and girlfriend, not lingering in a situationship.</li>
            <li><strong>You Have Weathered Your First Disagreement:</strong> You know how you resolve misunderstandings together and have built solid relational foundations.</li>
            <li><strong>You Both Genuinely Want to Share:</strong> Neither partner feels pressured by trends, peer competition, or the urge to prove something to campus onlookers.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it bad if my boyfriend or girlfriend doesn\'t post me on social media?',
        answer: 'Not necessarily. Many students are naturally private and prefer keeping their personal lives offline. What matters is how they treat you in person: do their friends know you, do they introduce you warmly on campus, and do they treat you with public respect?',
      },
      {
        question: 'What is the best aesthetic photo for a campus soft launch?',
        answer: 'Popular choices include two cups on a reading table, your hands holding snacks on a campus lawn, a silhouette photo during golden hour, or a candid picture showing their jacket or sneakers next to yours.',
      },
      {
        question: 'Should you delete soft-launch photos after a campus breakup?',
        answer: 'If you shared ephemeral stories (WhatsApp Status or Instagram Stories), they disappear automatically within 24 hours. If you posted highlights or grid photos, archive them calmly without staging public drama.',
      },
      {
        question: 'How does The College Date protect student privacy and dating intentions?',
        answer: 'The College Date gives students complete control over their profiles and dating badges, allowing you to connect with verified peers in a secure space without broadcasting your dating life to campus WhatsApp groups.',
      },
    ],
    relatedGuides: [
      { label: 'How to Keep Your Relationship Private on Campus', href: '/how-to-keep-your-relationship-private-on-campus' },
      { label: 'Situationship vs Relationship', href: '/situationship-vs-relationship' },
      { label: 'Talking Stage for Students', href: '/talking-stage-students' },
      { label: 'Healthy Relationships for University Students', href: '/healthy-relationship-university-students' },
    ],
  },
  {
    slug: 'how-to-text-your-campus-crush',
    file: 'public/how-to-text-your-campus-crush.html',
    lang: 'en',
    title: 'How to Text Your Campus Crush - WhatsApp & DM Etiquette',
    description: 'Master the art of texting your campus crush on WhatsApp and Instagram. Practical icebreakers, voice note timing, meme banter, and dry texting recovery.',
    kicker: 'Digital Messaging & Conversation Skills',
    h1: 'How to Text Your Campus Crush - WhatsApp & DM Etiquette',
    lede: 'Got your campus crush\'s WhatsApp number or Instagram handle and staring at a blank chat screen? Here is the socially calibrated playbook to texting your crush with warmth, humor, and effortless confidence.',
    date: '2026-09-19',
    ctaHeading: 'Start Natural Conversations on The College Date',
    ctaText: 'Skip cold texting anxiety. On The College Date, mutual matching means you already know the attraction is reciprocal. Start chatting with verified students today.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-first-text-anxiety',
        heading: 'Overcoming the First-Text Paralyzing Anxiety',
        content: `
          <p>You finally mustered the courage to ask for their WhatsApp handle after a tutorial class or campus fellowship meeting, and now your phone sits on your hostel desk like a ticking clock. What do you send? Will you seem too eager? What if they leave you on "read"?</p>
          <p>Texting anxiety on campus is universal. The secret to smooth, natural digital communication is simple: <strong>treat your text as a continuation of your real-world campus interaction</strong>, not an audition for their romantic approval. Low-pressure, contextual openers always outperform forced pick-up lines.</p>
        `,
      },
      {
        id: 'the-golden-rules-of-campus-texting',
        heading: 'The 5 Golden Rules of Campus WhatsApp & DM Etiquette',
        content: `
          <p>Keep these five rules at the forefront of every message you send:</p>
          <ol>
            <li><strong>Anchor to a Shared Campus Memory:</strong> The best first text references something specific you both experienced: <em>"Hey Sarah, it's David from ECO 201. Did you ever recover from that 2-hour microeconomics proof today?"</em></li>
            <li><strong>Banish the "Hey" and "Wyd":</strong> Single-word texts like <em>"Hey"</em>, <em>"Sup"</em>, or <em>"Wyd"</em> are conversational dead-ends. They shift 100% of the cognitive effort onto the other person to create an interesting dialogue.</li>
            <li><strong>Match Their Pacing and Energy:</strong> If they reply with two sentences, do not respond with a six-paragraph wall of text. If they reply once every two hours, do not fire back in 3 seconds every single time. Calibrate your rhythm.</li>
            <li><strong>Use Voice Notes Strategically:</strong> Once you have exchanged a few friendly texts, a warm, relaxed 20-second voice note brings your vocal tone, laughter, and personality to life. Voice notes build intimacy far faster than cold text characters.</li>
            <li><strong>The "Two-Text" Limit:</strong> If your crush has not replied to your last message, never double-text or send question marks (<em>"???"</em>). Let their silence be; they will reply when free, or their lack of engagement will give you clarity to move on gracefully.</li>
          </ol>
        `,
      },
      {
        id: 'tested-icebreakers-by-campus-scenario',
        heading: 'Tested Campus Text Openers for Different Scenarios',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Where You Met Them</th>
                  <th>High-Converting Text Opener</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Lecture Hall or Tutorial</strong></td>
                  <td><em>"Hey! Promise me you actually understood question 4 in today's assignment, because I am currently negotiating with my textbook for mercy."</em></td>
                </tr>
                <tr>
                  <td><strong>Campus Eatery or Cafe</strong></td>
                  <td><em>"Hey Maya! Still thinking about that meat pie debate at the cafeteria today. You were right—the buttery crust wins every time."</em></td>
                </tr>
                <tr>
                  <td><strong>Library Reading Hub</strong></td>
                  <td><em>"Hey Tolu! Just saw you battling that massive anatomy atlas in the reading room. Hope your brain survived the study sprint!"</em></td>
                </tr>
                <tr>
                  <td><strong>Student Union or Campus Event</strong></td>
                  <td><em>"Hey Chris! That debate showdown today was electric. You had the entire hall cheering during the rebuttal round!"</em></td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'how-to-revive-a-dry-conversation',
        heading: 'How to Rescue a Dry or Stalling Text Conversation',
        content: `
          <p>Even promising text threads can stall into one-word answers (<em>"Kk"</em>, <em>"Yeah"</em>, <em>"Cool"</em>). Here is how to resuscitate the chat or gracefully pivot:</p>
          <ul>
            <li><strong>Switch from Open-Ended to Playful Opinions:</strong> Instead of asking dry questions (<em>"How was your day?"</em>), ask playful binary questions: <em>"Important campus debate: Indomie with fried eggs or campus bakery jollof rice for late-night revision survival?"</em></li>
            <li><strong>Share a Relatable Campus Meme:</strong> Send a funny TikTok or Instagram reel about university exam struggles or campus hostel life that relates to an earlier joke you shared.</li>
            <li><strong>Step Away for 24 Hours:</strong> If a conversation feels heavy, don't force it. Let the chat breathe for a day. Often, a brief pause creates natural curiosity and gives them space to re-engage spontaneously.</li>
          </ul>
        `,
      },
      {
        id: 'timing-texts-around-campus-schedules',
        heading: 'Timing Your Texts: The Campus Daily Rhythm',
        content: `
          <p>Understanding undergraduate daily routines ensures your texts arrive when your crush is actually in a receptive headspace:</p>
          <ul>
            <li><strong>Morning (8 AM - 12 PM):</strong> Students are rushing between 8 AM lectures, finding seats, or taking notes. Keep texts minimal and functional.</li>
            <li><strong>Mid-Afternoon (1 PM - 4 PM):</strong> Lunch breaks and library breaks are great for quick, playful check-ins or sharing situational jokes.</li>
            <li><strong>Prime Evening Hours (7 PM - 10 PM):</strong> This is the golden window for conversational texting. Students are back in their hostels, done with lectures, eating dinner, and scrolling their phones in relaxed mood.</li>
            <li><strong>Late Night (Past 11 PM):</strong> Avoid sending intense, unprompted late-night texts in the first week of chatting. Keep boundaries respectful and polite.</li>
          </ul>
        `,
      },
      {
        id: 'transitioning-from-text-to-in-person-meetup',
        heading: 'How to Move from WhatsApp to an In-Person Campus Date',
        content: `
          <p>Texting is a bridge to meeting in person, not a permanent pen-pal arrangement. Transition smoothly with these three steps:</p>
          <ol>
            <li><strong>Identify Shared Enjoyment:</strong> When you both laugh over a shared topic (e.g., love for fresh fruit smoothies or campus coffee), capitalize immediately: <em>"We clearly have exceptional taste in smoothies."</em></li>
            <li><strong>Make a Low-Pressure Invitation:</strong> Suggest an effortless in-person meetup: <em>"I'm grabbing a smoothie by the student hub after my 2 PM class on Thursday—join me for 20 minutes if you're around campus."</em></li>
            <li><strong>Provide an Easy Out:</strong> A low-stakes date with a natural time limit (20-30 minutes between classes) allows both of you to test chemistry comfortably without awkward dinner pressure.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'How long should I wait before texting someone after getting their number?',
        answer: 'You do not need to follow outdated "3-day rules". Texting within a few hours or the same evening is ideal while the memory of your in-person conversation is fresh and warm.',
      },
      {
        question: 'What if my campus crush leaves my message on read?',
        answer: 'Give them the benefit of the doubt—they may have opened the text while walking into class or a practical lab. If they do not reply within 24 to 48 hours, accept the signal with grace and focus your energy on other connections.',
      },
      {
        question: 'Are voice notes better than text messages when getting to know someone?',
        answer: 'Yes! After exchanging a few basic texts, sending short, warm voice notes (under 30 seconds) conveys tone, charm, and laughter, helping you build real emotional familiarity much faster than plain text.',
      },
      {
        question: 'How does The College Date make starting conversations easier?',
        answer: 'The College Date features profile prompt highlights, faculty badges, and interest chips that give you instant conversation starters, eliminating awkward blank-screen texting anxiety completely.',
      },
    ],
    relatedGuides: [
      { label: 'How to Talk to Your Campus Crush', href: '/how-to-talk-to-your-campus-crush' },
      { label: 'Conversation Starters for Dating Apps', href: '/conversation-starters-dating-app' },
      { label: 'First Message Examples for Dating Apps', href: '/first-message-examples-dating-apps' },
      { label: 'How to Ask Someone Out in University', href: '/how-to-ask-someone-out-in-university' },
    ],
  },
  {
    slug: 'splitting-the-bill-on-campus-dates',
    file: 'public/splitting-the-bill-on-campus-dates.html',
    lang: 'en',
    title: 'Splitting the Bill on Campus Dates - Student Money Etiquette',
    description: 'Who pays on campus dates? Modern student guide to splitting the bill, 50/50 expectations, student allowances, and avoiding awkward cafe bill moments.',
    kicker: 'Campus Finances & Modern Dating Norms',
    h1: 'Splitting the Bill on Campus Dates - Student Money Etiquette',
    lede: 'Who pays when the waiter drops the check at the campus cafe or off-campus eatery? Here is the honest, modern guide to splitting bills, managing student allowances, navigating cultural expectations, and dating without financial stress.',
    date: '2026-09-19',
    ctaHeading: 'Date Without Financial Pretense',
    ctaText: 'Connect with campus peers who value genuine character and shared ambition. The College Date brings authenticity to student dating across Africa.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-campus-bill-dilemma',
        heading: 'The Underfunded Student Dilemma: Who Pays?',
        content: `
          <p>Navigating who pays on a first or second date is awkward in any phase of life, but during university years, the tension is magnified. Unlike working adults with full-time corporate salaries, university undergraduates are almost all managing finite, delicate budgets: parental allowances, student loans, modest campus side hustles, or strict pocket money allocations.</p>
          <p>Traditional cultural scripts across Africa often suggest that the man should pay for everything, while modern student realities mean young men frequently feel enormous financial pressure they cannot afford, and modern young women often prefer paying their share to maintain equality and independence. Understanding how to handle the bill gracefully prevents resentment and embarrassment.</p>
        `,
      },
      {
        id: 'the-inviter-pays-principle',
        heading: 'The "Whoever Initiates, Covers" Golden Rule',
        content: `
          <p>The most universally respected and socially elegant rule in modern campus dating is the <strong>Initiator Principle</strong>:</p>
          <ul>
            <li><strong>If You Chose the Venue, Be Prepared to Pay:</strong> If you invited your crush to a specific campus lounge, eatery, or ice cream parlor, you should naturally anticipate covering the bill. Never invite someone to an upscale venue and then spring a surprise 50/50 demand when the waiter arrives.</li>
            <li><strong>Always Come Prepared to Cover Yourself:</strong> Even if you were invited, always arrive with enough money on your mobile banking app or student debit card to cover your own meal and transport. The "wallet reach" gesture shows maturity, consideration, and self-respect.</li>
            <li><strong>The Gracious Offer to Split:</strong> When the bill arrives, offering: <em>"Can I contribute toward this, or shall we split it?"</em> signals financial awareness and appreciation for your date's effort.</li>
          </ul>
        `,
      },
      {
        id: 'navigating-50-50-vs-taking-turns',
        heading: 'Splitting 50/50 vs. Taking Turns: Which Works Best?',
        content: `
          <p>Student couples navigate financial sharing through different practical approaches. Choose the system that matches your comfort:</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>How It Works</th>
                  <th>Best For</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Taking Turns (Reciprocal)</strong></td>
                  <td>One partner covers coffee today; the other partner buys the cinema tickets or library snacks next weekend.</td>
                  <td>Long-term student couples who dislike tedious penny-pinching calculations.</td>
                </tr>
                <tr>
                  <td><strong>The Direct 50/50 Split</strong></td>
                  <td>Dividing the exact receipt total or sending bank transfers immediately at the table.</td>
                  <td>Casual early dates or study sessions where both parties want complete financial independence.</td>
                </tr>
                <tr>
                  <td><strong>The Split-by-Item Method</strong></td>
                  <td>Each person pays for their own meal, especially if one person ordered an expensive steak and the other had a side salad.</td>
                  <td>Group campus outings or dates with significant price discrepancies.</td>
                </tr>
                <tr>
                  <td><strong>The Experiential Contribution</strong></td>
                  <td>One person covers dinner; the other partner brings homemade snacks, drinks, or arranges the transport.</td>
                  <td>Couples balancing different pocket money backgrounds without awkwardness.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'red-flags-and-financial-entitlement',
        heading: 'Financial Entitlement vs. Generosity: Campus Red Flags',
        content: `
          <p>How someone handles money on campus dates reveals foundational aspects of their character:</p>
          <ul>
            <li><strong>Ordering Extravagantly on Another Student's Pocket:</strong> Ordering the most expensive platters, cocktails, and takeout packs when you know a fellow student is paying is bad manners and shows extreme lack of empathy.</li>
            <li><strong>Using Money as a Tool of Control:</strong> If someone insists on paying only to demand physical intimacy, emotional compliance, or immediate relationship status, recognize this toxic behavior immediately. A meal is never a contract for affection.</li>
            <li><strong>Shaming Someone for Their Budget:</strong> Shaming a student for choosing a budget-friendly cafeteria or splitting bills reflects superficiality. Genuine partners respect financial prudence.</li>
          </ul>
        `,
      },
      {
        id: 'talking-about-money-openly',
        heading: 'How to Talk About Money Early Without Embarrassment',
        content: `
          <p>Being honest about your student allowance builds profound mutual trust:</p>
          <ol>
            <li><strong>Normalize Low-Cost Activities:</strong> Suggest dates that cost almost nothing: <em>"I'm keeping my budget lean before exams—let's grab smoothies and sit on the campus lawn instead of going to a fancy lounge."</em></li>
            <li><strong>Appreciate Thoughtful Effort Over Cash:</strong> High-value partners value creativity, conversation, and shared laughter far more than expensive restaurant receipts.</li>
            <li><strong>Never Go into Debt for Campus Dates:</strong> Never borrow money from loan apps, roommates, or family to fund extravagant dates to impress someone. If someone only likes you when you overspend, they do not like you.</li>
          </ol>
        `,
      },
      {
        id: 'practical-low-cost-date-etiquette',
        heading: '5 Courteous Habits for Budget-Friendly Campus Dates',
        content: `
          <p>Keep dates respectful, affordable, and enjoyable with these five tips:</p>
          <ol>
            <li><strong>Check Prices in Advance:</strong> Before proposing a cafe, look at their menu online to ensure prices fit typical student allowances.</li>
            <li><strong>Offer to Cover the Tip or Drinks:</strong> If your date insists on paying for the main meal, offer to pay for the drinks, dessert, or bolt/uber ride home.</li>
            <li><strong>Send a Heartfelt Thank-You Text:</strong> If your date treated you, send a brief message: <em>"Thank you so much for lunch today—the food was amazing and I really loved our conversation!"</em></li>
            <li><strong>Reciprocate with Care:</strong> If they paid for a nice meal, surprise them on Monday with their favorite iced tea or study snack at the library.</li>
            <li><strong>Focus on Connection:</strong> The most memorable campus dates are about deep conversations and shared memories, not five-star bills.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Is it rude to ask to split the bill on a first date in university?',
        answer: 'Not at all. In a university context where everyone understands student financial realities, offering or agreeing to split the bill shows maturity, equality, and consideration.',
      },
      {
        question: 'What should a guy do if he wants to pay but his date insists on splitting?',
        answer: 'Politely say: "I really enjoyed spending time with you and I\'d love to treat you today. How about you grab the smoothies next time we hang out?" If she still insists on paying her half, respect her autonomy graciously.',
      },
      {
        question: 'How do you handle a date ordering way more food than you expected?',
        answer: 'If the bill arrives and there is a massive disparity, say politely: "Let\'s just pay for what each of us ordered today to keep things simple!" Most reasonable students will immediately agree.',
      },
      {
        question: 'How does The College Date encourage healthy dating on a student budget?',
        answer: 'The College Date is built by students for students, celebrating campus date ideas, creative study dates, and authentic connections that don\'t require luxury spending.',
      },
    ],
    relatedGuides: [
      { label: 'How to Date on a Student Budget', href: '/how-to-date-on-a-student-budget' },
      { label: 'Campus Date Ideas for Students', href: '/campus-date-ideas-students' },
      { label: 'First Date Ideas for Students', href: '/first-date-ideas-students' },
      { label: 'Student Dating Etiquette', href: '/student-dating-etiquette' },
    ],
  },
];

export function generateWave5Batch2() {
  console.log('Generating Wave 5 Batch 2 SEO Pages (Digital Romance & Norms)...');
  for (const page of wave5Batch2Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`✓ Generated ${page.file} (${page.slug})`);
  }
}
