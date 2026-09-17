import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from '../seo-expansion/template.mjs';

const root = process.cwd();

export const wave3Batch1Pages = [
  {
    slug: 'best-dating-apps-for-students-uganda',
    file: 'public/best-dating-apps-for-students-uganda.html',
    lang: 'en-UG',
    title: 'Best Dating Apps for Students in Uganda (2026 Comparison)',
    description: 'Compare the best dating apps for students in Uganda. Reviewing Tinder, Bumble, Badoo, and The College Date for Makerere, Kyambogo, and UCU students.',
    kicker: 'Ugandan Student Dating Comparison',
    h1: 'Best Dating Apps for Students in Uganda (2026 Comparison)',
    lede: 'Looking for the best dating app for university students in Uganda? We compare Tinder, Bumble, Badoo, and The College Date across campus verification, mobile data economics, MTN/Airtel convenience, and safe student meetups in Kampala and Mukono.',
    date: '2026-09-17',
    ctaHeading: 'Connect with Ugandan University Students',
    ctaText: 'Join The College Date free to discover verified students from Makerere, Kyambogo, UCU, and MUBS for genuine campus dating and friendship.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'what-ugandan-students-need',
        heading: 'What Ugandan University Students Really Need in a Dating App',
        content: `
          <p>Navigating romance and social life across tertiary institutions in Uganda presents unique practical challenges. Undergraduates at <strong>Makerere University</strong> (Wandegeya, Kikoni, Kikoni hostels), <strong>Kyambogo University</strong> (Banda), <strong>Uganda Christian University (UCU Mukono)</strong>, and <strong>Makerere University Business School (MUBS Nakawa)</strong> operate within tight budgets, navigate intense semester workloads, and socialize in tightly woven campus ecosystems.</p>
          <p>When selecting a dating application in Uganda, students must evaluate platforms across four indispensable criteria:</p>
          <ul>
            <li><strong>Authentic Student Density:</strong> Does the platform allow you to discover peers studying in your faculty or surrounding halls, or is it overrun by non-students, corporate workers, and nightlife promoters?</li>
            <li><strong>Data & Connectivity Efficiency:</strong> Mobile data packages on MTN Uganda and Airtel Uganda represent a real cost. The app must load swiftly on 3G and 4G without consuming high megabytes on unnecessary video reels.</li>
            <li><strong>Safety & Scams Prevention:</strong> Protection against fake profiles, financial catfishing, and unsolicited commercial propositions is critical for peace of mind.</li>
            <li><strong>Student Culture Integration:</strong> Modern students want interactive campus social tools—such as anonymous questions, campus confessions, and low-pressure conversation starters.</li>
          </ul>
        `,
      },
      {
        id: 'detailed-app-reviews-uganda',
        heading: 'In-Depth Review: Top 4 Dating Apps for Ugandan Students',
        content: `
          <p><strong>1. The College Date (Best Overall for University Students):</strong> Built specifically for higher education across Africa. Every profile picture is screened by automated Vision AI to ensure authentic single human portraits—filtering out bots, anime avatars, and stock photography. Students select their specific university, faculty, and academic year, choose between dating or friendship ("Find Friends"), post anonymous campus confessions, and share personal <code>/ask/:username</code> links directly to WhatsApp Status. Core matching and direct messaging are completely free.</p>
          <p><strong>2. Tinder (Highest General Volume in Kampala):</strong> While Tinder has a large user base across Greater Kampala, Kololo, and Ntinda, it lacks campus filtering. University students frequently match with tourists, expatriates, or older professionals whose financial expectations and lifestyle do not match student reality. Features like seeing who liked you require costly credit card or dollar-denominated subscriptions.</p>
          <p><strong>3. Bumble (Best for Women-First Interactions):</strong> Bumble requires women to send the first message within 24 hours of matching, which drastically reduces unsolicited vulgarity. It enjoys popularity among students at private universities like UCU Mukono and Victoria University. However, user density drops sharply once you leave central Kampala, and premium upgrades are relatively expensive for an undergraduate allowance.</p>
          <p><strong>4. Badoo (Broad Reach, Mixed Verification):</strong> Badoo has high historical download numbers across Uganda, but is frequently plagued by inactive profiles, unverified accounts, and aggressive prompts to purchase coins or credits just to initiate conversation.</p>
        `,
      },
      {
        id: 'comparison-matrix-uganda',
        heading: 'Feature Comparison: Uganda Campus Dating Apps',
        content: `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Student Community</th>
                  <th>Photo Screening</th>
                  <th>Free Messaging</th>
                  <th>Campus Features</th>
                  <th>Student Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>The College Date</strong></td>
                  <td>100% University & Tertiary</td>
                  <td>Vision AI Portrait Check</td>
                  <td>Yes (Completely free)</td>
                  <td>Anonymous Confessions & /ask Link</td>
                  <td>High (Purpose-built)</td>
                </tr>
                <tr>
                  <td><strong>Tinder</strong></td>
                  <td>General Public (18–65+)</td>
                  <td>Basic Selfie Prompt</td>
                  <td>Yes (Mutual matches)</td>
                  <td>None (Basic swipe deck)</td>
                  <td>Low (Costly paywalls)</td>
                </tr>
                <tr>
                  <td><strong>Bumble</strong></td>
                  <td>General Public</td>
                  <td>Basic Selfie Check</td>
                  <td>Yes (Women message 1st)</td>
                  <td>Separate BFF Mode</td>
                  <td>Moderate</td>
                </tr>
                <tr>
                  <td><strong>Badoo</strong></td>
                  <td>General Public</td>
                  <td>Photo Match</td>
                  <td>Limited (Coin prompts)</td>
                  <td>Live streaming</td>
                  <td>Low (Aggressive credits)</td>
                </tr>
              </tbody>
            </table>
          </div>
        `,
      },
      {
        id: 'safety-and-campus-dating-uganda',
        heading: 'Safety Rules for Dating in Kampala & Mukono Universities',
        content: `
          <p>While dating apps make meeting people convenient, practicing proactive safety ensures your campus experience remains empowering and positive:</p>
          <ol>
            <li><strong>Meet in High-Traffic Daytime Spaces:</strong> For first dates, always select public campus locations—such as the Makerere University Guest House gardens, cafeteria hubs, a well-lit coffee cafe in Wandegeya, or a popular restaurant in Nakawa or Mukono town. Never agree to meet in an unfamiliar off-campus hostel room on the first date.</li>
            <li><strong>Keep Financial Boundaries Clear:</strong> Never send Mobile Money (MTN or Airtel) for "transport fare", data airtime, or emergency hospital bills before meeting someone in person. Catfish operators frequently target students with emotional fabrications.</li>
            <li><strong>Verify Before Meeting:</strong> Use The College Date's in-app audio notes or have a quick video check to ensure the person you are communicating with matches their profile photos.</li>
            <li><strong>Notify a Trusted Hostel Roommate:</strong> Before heading out on a date, inform your roommate or close friend of where you are going, who you are meeting, and when you plan to return to your hostel.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'Which dating app is best for Makerere University students?',
        answer: 'The College Date is the best dating app for Makerere students because it focuses specifically on university students, screens profiles with Vision AI, supports campus confessions, and allows you to find peers in Kikoni, Wandegeya, and surrounding student communities without paywalls.',
      },
      {
        question: 'Are dating apps in Uganda free to use for students?',
        answer: 'Most mainstream apps like Tinder allow free swiping and matching, but hide key features behind expensive subscriptions. The College Date provides free mutual matching, direct student messaging, voice notes, and campus confessions designed for student budgets.',
      },
      {
        question: 'How do I avoid fake profiles and catfishes on dating apps in Uganda?',
        answer: 'Always look for platforms that enforce automated portrait checks like The College Date. Avoid anyone who refuses a short voice note or video call, asks for MTN/Airtel mobile money before meeting, or claims to be an international student stuck in transit.',
      },
      {
        question: 'Can I use The College Date just to make friends on campus?',
        answer: 'Yes. The College Date offers a dedicated "Find Friends" mode allowing Ugandan students to expand their academic network, connect with coursemates, and build campus friendships alongside romantic discovery.',
      },
    ],
    relatedGuides: [
      { label: 'Dating Apps for Students in Uganda', href: '/dating-apps-for-students-uganda' },
      { label: 'Dating Apps for Students in Kenya', href: '/dating-apps-for-students-kenya' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
      { label: 'How to Spot a Catfish in University', href: '/how-to-spot-a-catfish-in-university' },
    ],
  },
  {
    slug: 'dating-apps-for-students-tanzania',
    file: 'public/dating-apps-for-students-tanzania.html',
    lang: 'en-TZ',
    title: 'Dating Apps for Students in Tanzania - Campus Social Guide',
    description: 'Discover dating apps for students in Tanzania. Safe campus dating guide for UDSM, Ardhi, UDOM, and MZUMBE students, M-Pesa tips, and profile advice.',
    kicker: 'Tanzanian Campus Social Guide',
    h1: 'Dating Apps for Students in Tanzania - Campus Social Guide',
    lede: 'Exploring dating apps as a university student in Tanzania? Here is the complete campus dating guide for students at UDSM, Ardhi, UDOM, and MZUMBE—covering digital privacy, cultural etiquette, safe meetup spots, and avoiding scams.',
    date: '2026-09-17',
    ctaHeading: 'Discover University Students in Tanzania',
    ctaText: 'Join The College Date free to meet verified Tanzanian university students for campus romance, study partners, and authentic campus connections.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'tanzania-campus-dating-landscape',
        heading: 'The Modern Campus Dating Scene in Tanzania',
        content: `
          <p>Higher education in Tanzania has expanded rapidly, with over 250,000 undergraduates studying across major academic hubs. From the expansive grounds of the <strong>University of Dar es Salaam (UDSM - Mlimani)</strong> and <strong>Ardhi University</strong> to <strong>University of Dodoma (UDOM)</strong>, <strong>Mzumbe University</strong> in Morogoro, and <strong>St. Augustine University of Tanzania (SAUT)</strong> in Mwanza, student life is energetic and social.</p>
          <p>However, traditional public dating apps often carry social friction in Tanzania:</p>
          <ul>
            <li><strong>Privacy & Discretion Concerns:</strong> Many students fear public judgment if family members, relatives, or lecturers spot their profiles on generic swipe platforms.</li>
            <li><strong>Non-Student Infiltration:</strong> Mainstream apps in Dar es Salaam and Dodoma are heavily crowded with non-student commercial profiles and older working professionals.</li>
            <li><strong>Mobile Money Fraud:</strong> Scammers frequently demand "nauli" (transport fare) or emergency mobile money via M-Pesa, Airtel Money, or Tigo Pesa before vanishing.</li>
            <li><strong>Need for Campus Community:</strong> Tanzanian students value community-centered interactions, academic banter, and peer validation over transactional adult hookups.</li>
          </ul>
        `,
      },
      {
        id: 'dating-apps-available-tanzania',
        heading: 'Comparing Student Dating Options in Tanzania',
        content: `
          <p>When looking to meet compatible peers across Tanzanian campuses, students generally consider three paths:</p>
          <p><strong>The College Date:</strong> Tailored specifically for higher education across Africa. It incorporates automated Vision AI image screening to verify authentic single human portraits, keeping out bots and stock imagery. Students specify their university and field of study, connect through genuine mutual matching, share anonymous campus confessions, and distribute personal <code>/ask/:username</code> links on WhatsApp Status and Instagram stories.</p>
          <p><strong>Mainstream Swipe Apps (Tinder & Badoo):</strong> Widely recognized in Dar es Salaam, particularly around Masaki, Oysterbay, and Mikocheni. However, their campus footprint is limited by lack of educational filters, high subscription costs, and an older general public demographic.</p>
          <p><strong>Campus WhatsApp Groups & Social Clubs:</strong> Many Tanzanian students rely on student union (DARUSO, etc.) committees, faculty groups, or religious fellowships. While organic, social circles can quickly become insular, and personal relationship drama spreads rapidly across campus.</p>
        `,
      },
      {
        id: 'safe-dating-rules-tanzania',
        heading: 'Safe Campus Dating Rules for Tanzanian Students',
        content: `
          <p>Practicing safety ensures your dating journey remains exciting, respectful, and protected:</p>
          <ol>
            <li><strong>Choose Public Daytime Meetups:</strong> For initial dates, pick well-populated campus spots such as Mlimani City Mall cafes, campus student canteens, university botanical spaces, or well-known restaurants in Mwenge or Sinza. Avoid secluded beaches or isolated off-campus lodges on the first meeting.</li>
            <li><strong>Never Send Nauli in Advance:</strong> Never transfer transport money via Vodacom M-Pesa, Tigo Pesa, or Airtel Money before meeting someone in person. Legitimate student matches will respect mutually convenient public meeting locations.</li>
            <li><strong>Voice Note First:</strong> Send a friendly voice note on The College Date to establish rapport and confirm the person's identity before scheduling an in-person meeting.</li>
            <li><strong>Set Clear Boundaries Early:</strong> Communicate what you are seeking—whether an intentional relationship, casual dating, or simply new campus friends—to avoid misunderstandings.</li>
          </ol>
        `,
      },
      {
        id: 'best-date-spots-dar-and-dodoma',
        heading: 'Top Low-Stress Campus Date Spots in Dar es Salaam & Dodoma',
        content: `
          <p>Choosing the right setting sets the foundation for a relaxed, low-pressure first meeting:</p>
          <ul>
            <li><strong>Mlimani City Mall (Dar es Salaam):</strong> Located directly adjacent to UDSM, offering bustling cafes, bookstores, and ice cream parlors where students can meet casually in broad daylight.</li>
            <li><strong>UDSM Botanical Garden & Campus Hill:</strong> Perfect for a calm afternoon stroll between lectures with panoramic views of Dar es Salaam.</li>
            <li><strong>UDOM Social Center & Student Hubs (Dodoma):</strong> Centrally located for students across the College of Humanities, Education, and Informatics to grab fresh fruit juices and discuss semester coursework.</li>
            <li><strong>Morogoro Town Cafes (Mzumbe University):</strong> Relaxed mountain-view cafes offering affordable snacks and quiet corners for genuine conversation.</li>
          </ul>
        `,
      },
      {
        id: 'balancing-gpa-and-dating-tanzania',
        heading: 'Balancing UE Exams, Coursework & Dating',
        content: `
          <p>University exams (University Examinations - UE) in Tanzania are notoriously demanding. Healthy campus relationships support your academic ambition rather than derail it:</p>
          <ul>
            <li><strong>Schedule Parallel Study Sessions:</strong> Meet at the UDSM University Library or faculty reading rooms for quiet revision followed by a relaxed evening walk.</li>
            <li><strong>Respect Academic Cycles:</strong> During test weeks and final examinations, establish a mutual pause on demanding social outings so both partners maintain high GPA standards.</li>
            <li><strong>Maintain Independent Social Lives:</strong> Continue spending time with your hostel roommates and faculty peers so your entire university identity is not tied to one relationship.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'What is the most popular dating app for UDSM students in Dar es Salaam?',
        answer: 'While Tinder has general awareness in Dar es Salaam, The College Date is designed specifically for university students, offering student-verified profiles, campus confessions, and free mutual matching without commercial noise.',
      },
      {
        question: 'How do I protect my privacy while using a dating app in Tanzania?',
        answer: 'Use a platform like The College Date that prioritizes student privacy, verifies genuine human portraits with Vision AI, and lets you connect discreetly without exposing your contact number or social accounts until you feel comfortable.',
      },
      {
        question: 'Can students in Dodoma, Morogoro, and Mwanza use The College Date?',
        answer: 'Yes. The College Date is accessible to students across all accredited universities and tertiary colleges in Tanzania, including UDOM Dodoma, Mzumbe Morogoro, and SAUT Mwanza.',
      },
      {
        question: 'Is The College Date free to join in Tanzania?',
        answer: 'Yes. Account creation, profile setup, student discovery, mutual matching, voice notes, and campus confessions are completely free for university students.',
      },
    ],
    relatedGuides: [
      { label: 'Dating Apps for Students in Kenya', href: '/dating-apps-for-students-kenya' },
      { label: 'Dating Apps for Students in Uganda', href: '/dating-apps-for-students-uganda' },
      { label: 'How to Make Friends in University', href: '/how-to-make-friends-in-university' },
      { label: 'How to Balance Dating and Studies in University', href: '/how-to-balance-dating-and-studies-in-university' },
    ],
  },
  {
    slug: 'dating-apps-for-students-zambia',
    file: 'public/dating-apps-for-students-zambia.html',
    lang: 'en-ZM',
    title: 'Dating Apps for Students in Zambia - Campus Dating Guide',
    description: 'Explore dating apps for university students in Zambia. Practical campus dating guide for UNZA, CBU, and Mulungushi students with verified profiles.',
    kicker: 'Zambian Student Dating Guide',
    h1: 'Dating Apps for Students in Zambia - Campus Dating Guide',
    lede: 'Looking for dating apps for university students in Zambia? Here is your complete campus guide for students at UNZA, Copperbelt University (CBU), and Mulungushi—covering verified student discovery, safety tips, and modern dating etiquette in Lusaka and Kitwe.',
    date: '2026-09-17',
    ctaHeading: 'Meet Zambian University Students',
    ctaText: 'Join The College Date free to connect with verified students across UNZA, CBU, and Zambian campuses for dating, campus friendships, and anonymous Q&A.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'zambia-student-dating-landscape',
        heading: 'The Campus Dating Scene in Zambia',
        content: `
          <p>University life in Zambia is vibrant, social, and academically rigorous. Thousands of undergraduates study at the <strong>University of Zambia (UNZA - Great East Road Campus and Ridgeway)</strong>, <strong>Copperbelt University (CBU)</strong> in Kitwe, <strong>Mulungushi University</strong> in Kabwe, and private institutions like Cavendish University and ZCAS University in Lusaka.</p>
          <p>Despite heavy smartphone adoption and digital connectivity, Zambian students face recurring challenges on mainstream dating platforms:</p>
          <ul>
            <li><strong>Lack of Campus Filtering:</strong> General dating apps lump undergraduates with working professionals across Lusaka, Ndola, and Livingstone, making it hard to find peers on your academic level.</li>
            <li><strong>Catfishing & Inactive Profiles:</strong> International platforms suffer from unmonitored fake profiles, outdated accounts, and commercial solicitation.</li>
            <li><strong>Subscription Hurdles:</strong> Pricing in US dollars or foreign currencies makes premium features inaccessible for students managing a standard meal and book allowance.</li>
            <li><strong>Desire for Campus Culture:</strong> Students want safe ways to connect around campus events, share anonymous secrets, and engage peers without awkward social exposure.</li>
          </ul>
        `,
      },
      {
        id: 'why-the-college-date-fits-zambia',
        heading: 'Why The College Date Fits Zambian University Life',
        content: `
          <p>The College Date was built to address the exact realities of tertiary education across Africa:</p>
          <ul>
            <li><strong>Automated Vision AI Verification:</strong> Every profile picture is analyzed by Vision AI to ensure it is a real, single human portrait. Accounts with stock images, celebrity avatars, or landscape photos are filtered out.</li>
            <li><strong>Campus & Faculty Discovery:</strong> Connect directly with students studying at UNZA, CBU, Mulungushi, and other institutions. You can filter by university and faculty to find someone who shares your timetable and interests.</li>
            <li><strong>Multi-Mode Socializing:</strong> Whether you are looking for serious dating, casual romance, or study buddies ("Find Friends"), clear intention tags eliminate guesswork.</li>
            <li><strong>Campus Confessions & Anonymous Ask:</strong> Students can post anonymous campus confessions and generate a personal <code>/ask/:username</code> link to receive candid questions from campus peers via WhatsApp Status.</li>
            <li><strong>Free Core Platform:</strong> Matching, swiping, messaging, and voice notes are free—no paywalls blocking basic student communication.</li>
          </ul>
        `,
      },
      {
        id: 'campus-dating-hotspots-zambia',
        heading: 'Popular Low-Cost Student Date Spots in Lusaka & Kitwe',
        content: `
          <p>Planning an enjoyable date on a student budget in Zambia is straightforward when you choose the right locations:</p>
          <ul>
            <li><strong>EastPark Mall Cafes (Near UNZA Lusaka):</strong> Just a short walk from UNZA Great East Road campus, offering vibrant outdoor seating, casual frozen yogurt shops, and quiet coffee cafes ideal for a relaxed 45-minute chat.</li>
            <li><strong>Arcades & Manda Hill (Lusaka):</strong> Classic student meeting points with affordable juice bars, bakeries, and fast casual eateries.</li>
            <li><strong>CBU Student Center & Riverside Spots (Kitwe):</strong> Ideal for Copperbelt University students looking to grab lunch or soft drinks between afternoon laboratory sessions.</li>
            <li><strong>Mulungushi Rock & Campus Lawns (Kabwe):</strong> Quiet, scenic campus locations for outdoor conversations away from busy residential halls.</li>
          </ul>
        `,
      },
      {
        id: 'safe-dating-practices-zambia',
        heading: 'Safe Dating Practices for Students in Lusaka & Kitwe',
        content: `
          <p>Staying safe while meeting people from dating apps requires simple, consistent habits:</p>
          <ol>
            <li><strong>Pick Public Campus Hotspots:</strong> For first dates, choose lively public locations—such as Manda Hill Mall, Arcades Shopping Mall, EastPark Mall cafes near UNZA, or student center eateries at CBU in Kitwe. Never meet in a secluded off-campus boarding house or private apartment on the first date.</li>
            <li><strong>Avoid Advance Money Transfers:</strong> Never send Airtel Money or MTN Mobile Money for transport or data to someone you have never met face-to-face. Genuine students will gladly meet on or near campus.</li>
            <li><strong>Test the Vibe with a Voice Note:</strong> Exchange quick voice notes inside The College Date chat to confirm the person sounds genuine and authentic before sharing your WhatsApp number.</li>
            <li><strong>Tell a Campus Roommate:</strong> Inform your hostel roommate or a trusted friend about your plans, who you are meeting, and what time you expect to be back.</li>
          </ol>
        `,
      },
      {
        id: 'conversation-starters-zambia',
        heading: 'Great Conversation Starters for Zambian Students',
        content: `
          <p>Breaking the ice does not require awkward pickup lines. Simple, relatable campus observations spark genuine conversations:</p>
          <ul>
            <li><em>"Are you based at Great East Road or Ridgeway? How is this semester treating your timetable?"</em></li>
            <li><em>"I saw you study Economics—how are you surviving that midterm everyone was complaining about?"</em></li>
            <li><em>"EastPark or Arcades for a quick study break coffee? What is your go-to spot?"</em></li>
            <li><em>"I liked your bio about music—who is on heavy rotation on your playlist during study sessions?"</em></li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'Which dating app is best for UNZA students in Lusaka?',
        answer: 'The College Date is the top recommendation for UNZA students because it provides verified student profiles, campus-specific discovery, anonymous confessions, and free messaging tailored to university life in Lusaka.',
      },
      {
        question: 'Can students at CBU in Kitwe use The College Date?',
        answer: 'Yes. The College Date is accessible to undergraduates and postgraduates across Copperbelt University (CBU) in Kitwe, as well as Mulungushi University in Kabwe.',
      },
      {
        question: 'How does The College Date verify student profiles in Zambia?',
        answer: 'The College Date uses automated Vision AI to confirm that profile photos are authentic single human portraits, keeping out bots, impersonators, and low-quality accounts.',
      },
      {
        question: 'Is The College Date free for university students in Zambia?',
        answer: 'Yes. Profile creation, swiping, mutual matching, direct messaging, voice notes, and campus confessions are completely free for all students.',
      },
    ],
    relatedGuides: [
      { label: 'Student Dating Apps Across Africa', href: '/student-dating-apps-africa' },
      { label: 'Dating Apps for Students in South Africa', href: '/dating-apps-for-students-south-africa' },
      { label: 'How to Ask Someone Out in University', href: '/how-to-ask-someone-out-in-university' },
      { label: 'How to Spot a Catfish in University', href: '/how-to-spot-a-catfish-in-university' },
    ],
  },
];

export function generateWave3Batch1() {
  console.log('Generating Wave 3 Batch 1 SEO Pages (Pan-African Expansion)...');
  for (const page of wave3Batch1Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`✓ Generated ${page.file} (${page.slug})`);
  }
}
