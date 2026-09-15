import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderSeoPage } from './template.mjs';

const root = process.cwd();

export const batch2Pages = [
  {
    slug: 'dating-apps-for-students-ghana',
    file: 'public/dating-apps-for-students-ghana.html',
    lang: 'en-GH',
    title: 'Dating Apps for Students in Ghana - University Dating Guide',
    description: 'Explore dating apps for students in Ghana. Practical guidance for campus dating at Legon, KNUST, UCC, safety advice, profile tips, and student social discovery.',
    kicker: 'Ghanaian Campus Dating',
    h1: 'Dating Apps for Students in Ghana',
    lede: 'Dating as a tertiary student in Ghana—whether at the University of Ghana (Legon), KNUST in Kumasi, UCC in Cape Coast, UPSA, or Ashesi—blends rich campus traditions with modern social exploration. Discover how dedicated student dating platforms create safer, more authentic connections across Ghanaian universities.',
    date: '2026-09-15',
    ctaHeading: 'Connect with Students Across Ghana',
    ctaText: 'Join The College Date to discover classmates, campus crushes, and genuine student friends across Ghanaian universities.',
    ctaHref: '/signup',
    ctaButtonText: 'Join The College Date Free',
    sections: [
      {
        id: 'the-social-fabric-ghana-campuses',
        heading: 'The Social Fabric of Ghanaian Campuses',
        content: `
          <p>Higher education in Ghana is renowned for its rich campus culture. From the historic halls and diaspora hostels (Pentagon, Bani, Evandy) at the University of Ghana (Legon) in Accra, to the sprawling tech and engineering community around Ayeduase and Brunei at KNUST in Kumasi, the coastal ambiance of UCC in Cape Coast, and private institutions like Ashesi, students create vibrant social ecosystems.</p>
          <p>Student life in Ghana involves balancing demanding lecture timetables and continuous assessments with hall weeks, campus fellowships, and social gatherings. When students look for romance or new friendships, they need platforms that respect the campus environment, understand student budgets, and connect them with peers who share their daily academic rhythm.</p>
        `,
      },
      {
        id: 'why-mainstream-apps-disappoint',
        heading: 'Why Mainstream Dating Apps Disappoint Ghanaian Students',
        content: `
          <p>Many students who try open, generic dating applications in Ghana run into predictable issues:</p>
          <ul>
            <li><strong>Mismatched Intentions & Financial Expectations:</strong> Generic apps in Accra and Kumasi are populated by working adults, tourists, and expatriates, leading to mismatched lifestyle expectations and conversations centered around material dates rather than student bonding.</li>
            <li><strong>Fake Accounts and Commercial Spammers:</strong> Open-door registration invites accounts with fake photos, promotional spam, and financial solicitations.</li>
            <li><strong>Zero Campus Relevance:</strong> On global platforms, you cannot filter by your university, faculty, or level of study, making it impossible to discover peers within your student community.</li>
          </ul>
          <p>The College Date addresses these friction points by building a dedicated student platform where young adults connect as peers.</p>
        `,
      },
      {
        id: 'the-college-date-ghana-features',
        heading: 'How The College Date Solves Campus Discovery in Ghana',
        content: `
          <p>The College Date is designed around the authentic student experience:</p>
          <ul>
            <li><strong>Vision AI Profile Photo Screening:</strong> Every uploaded profile photo is screened to confirm an authentic single human portrait, preventing cartoon characters, stock photos, and bot accounts.</li>
            <li><strong>University & Campus Affiliation:</strong> Students select their university during setup, allowing you to discover peers at Legon, KNUST, UCC, UPSA, GIMPA, and others.</li>
            <li><strong>Transparent Dating Intentions:</strong> State clearly whether you want a serious relationship, casual dates, or simply want to use the "Find Friends" feature to expand your study and social circle.</li>
            <li><strong>Campus Confessions & Anonymous Ask:</strong> Post anonymous confessions to your campus feed or share your unique <code>/ask/:username</code> link to WhatsApp Status to receive candid questions from friends without forced app downloads.</li>
            <li><strong>Data-Efficient Mobile Experience:</strong> Optimized for smooth performance on Android and mobile web, saving mobile data during daily campus use.</li>
          </ul>
        `,
      },
      {
        id: 'campus-dating-safety-ghana',
        heading: 'Safety and Etiquette for Campus Dating in Ghana',
        content: `
          <p>Staying safe while dating online in Ghana is straightforward when you stick to core precautions:</p>
          <ol>
            <li><strong>Meet in Well-Frequented Public Venues:</strong> For a first meetup, choose bustling daytime campus spots—such as the Balme Library gardens or Central Cafeteria at Legon, the Commercial Area at KNUST, or a reputable campus cafe. Avoid private off-campus hostel rooms for an initial date.</li>
            <li><strong>Tell a Trusted Roommate or Friend:</strong> Before heading out, let your hostel roommate know where you are going, who you are meeting, and when you plan to return.</li>
            <li><strong>Maintain Transport Independence:</strong> Ensure you have your own transport planned, whether by campus shuttle, walking, or using trusted ride-hailing apps like Bolt, Uber, or Yango.</li>
            <li><strong>Never Send Money or Airtime:</strong> Do not send Mobile Money (MoMo) transfers or airtime to online matches. Genuine students will never demand financial assistance before meeting.</li>
          </ol>
        `,
      },
      {
        id: 'affordable-student-dates-ghana',
        heading: 'Budget-Friendly Campus Date Ideas in Ghana',
        content: `
          <p>Great first dates don't require expensive outings. Memorable, budget-conscious ideas include:</p>
          <ul>
            <li><strong>Campus Smoothie or Sobolo Hangout:</strong> Grab fresh juices or smoothies at the campus student centre and enjoy a relaxed conversation between afternoon lectures.</li>
            <li><strong>Campus Walk & Chat:</strong> Stroll through the scenic avenues of Legon's botanical spaces or KNUST's shaded green lawns during the cool late afternoon.</li>
            <li><strong>Shared Study Session:</strong> Meet at the library or departmental study pavilion to review quiz questions together before heading to the night market for local snacks.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'Which Ghanaian universities can use The College Date?',
        answer: 'Students from all accredited universities and tertiary institutions in Ghana—including UG Legon, KNUST, UCC, UPSA, Ashesi, and others—can register and connect.',
      },
      {
        question: 'Is The College Date free to join in Ghana?',
        answer: 'Yes. Profile creation, campus discovery, mutual swiping, anonymous confessions, and match messaging are completely free for students aged 18 and older.',
      },
      {
        question: 'Can I use the app just to make friends on my campus?',
        answer: 'Yes. The app provides a dedicated "Find Friends" intention, allowing students to match for study groups, campus companionship, and social events without romantic expectations.',
      },
      {
        question: 'How do I report fake or abusive profiles?',
        answer: 'You can report any suspicious or disrespectful account directly through the in-app report modal. Our moderation team reviews reports promptly to protect our campus community.',
      },
    ],
    relatedGuides: [
      { label: 'Student Dating Apps in Africa', href: '/student-dating-apps-africa' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
      { label: 'Dating a Coursemate in University', href: '/dating-a-coursemate-in-university' },
      { label: 'How to Talk to Your Campus Crush', href: '/how-to-talk-to-your-campus-crush' },
    ],
  },
  {
    slug: 'how-to-talk-to-your-campus-crush',
    file: 'public/how-to-talk-to-your-campus-crush.html',
    lang: 'en',
    title: 'How to Talk to Your Campus Crush - In Person & Online Guide',
    description: 'Learn how to talk to your campus crush without awkwardness. Natural opening lines, reading body language, texting tips, and overcoming approach anxiety at uni.',
    kicker: 'Campus Romance & Flirting',
    h1: 'How to Talk to Your Campus Crush',
    lede: 'Seeing someone catch your eye in the lecture theatre, campus library, or cafeteria is exhilarating—and terrifying. Here is a practical, psychology-backed guide to starting natural conversations with your campus crush without feeling awkward, desperate, or pushy.',
    date: '2026-09-15',
    ctaHeading: 'Take the First Step on Campus',
    ctaText: 'Create your profile on The College Date to discover if your campus crush has already liked you, or send a secret anonymous compliment.',
    ctaHref: '/signup',
    ctaButtonText: 'Create Your Free Profile',
    sections: [
      {
        id: 'demystifying-approach-anxiety',
        heading: 'Demystifying Approach Anxiety: Reframing the Moment',
        content: `
          <p>Almost every student experiences a racing heart when thinking about approaching someone they find attractive. In university, approach anxiety is heightened because of proximity: you worry that if things go awkwardly, you might run into them again next week in the same lecture hall or hostel corridor.</p>
          <p>The solution is to lower the stakes completely. Stop treating the first interaction as a high-stakes confession of romantic intent. Reframe your goal: you are not trying to make them fall in love with you in 60 seconds; you are simply checking if they are friendly and easy to talk to. A conversation is just an exploration.</p>
        `,
      },
      {
        id: 'lecture-and-library-openers',
        heading: 'Natural Openers for Lectures and the Campus Library',
        content: `
          <p><strong>In Lecture Theatres:</strong> Situational observations are always superior to canned pickup lines. Sit near them and ask something natural before class starts:</p>
          <ul>
            <li><em>"Hey, did you happen to catch what the lecturer said about the submission deadline?"</em></li>
            <li><em>"Are you ready for this test? I spent the whole night going over chapter four and my brain is completely fried."</em></li>
            <li><em>"Is anyone sitting in this chair, or can I steal it?"</em> Followed with: <em>"By the way, I'm [Your Name]. What's your major?"</em></li>
          </ul>
          <p><strong>In the Library:</strong> Respect the quiet environment. Keep interactions low-volume, brief, and considerate:</p>
          <ul>
            <li><em>"Excuse me, do you have a phone charger / adapter I could borrow for 20 minutes while studying here?"</em></li>
            <li><em>"Hey, do you know if these desk outlets actually work? Mine seems dead."</em></li>
            <li>When leaving: <em>"Thanks again for the charger! Hope the study grind goes well today."</em> This leaves an open door for future greetings.</li>
          </ul>
        `,
      },
      {
        id: 'cafeteria-and-campus-event-openers',
        heading: 'Cafeterias, Campus Events, and Residence Hangouts',
        content: `
          <p>In social spaces like campus dining halls, sports fields, or student society events, energy is higher and spontaneous chats are welcomed:</p>
          <ul>
            <li><strong>In Cafeteria Queues:</strong> <em>"Have you tried the jollof / pasta today? Is it actually good or should I go for the pastries?"</em> Shared humor about campus food is universal.</li>
            <li><strong>At Student Events & Sports:</strong> <em>"Are you supporting our faculty team or just here for the atmosphere?"</em></li>
            <li><strong>In Residence Lounges:</strong> <em>"Hey, what movie / game is this? Mind if I sit here for a bit?"</em></li>
          </ul>
        `,
      },
      {
        id: 'reading-signals-green-vs-red-flags',
        heading: 'Reading the Signals: Green Flags vs Clear Disinterest',
        content: `
          <p>Pay close attention to how they respond. Mutual attraction is marked by reciprocity:</p>
          <ul>
            <li><strong>Green Flags (Interest & Warmth):</strong> They smile genuinely, turn their body toward you, make eye contact, ask you questions in return (<em>"What about you? What year are you in?"</em>), and laugh easily.</li>
            <li><strong>Yellow Flags (Neutral / Distracted):</strong> Polite one-word answers, checking their watch, or wearing headphones. If they seem busy, wrap up politely and step away.</li>
            <li><strong>Red Flags (Clear Disinterest):</strong> Looking past you, turning their back, giving cold clipped answers, or avoiding eye contact. If you sense this, say <em>"Have a great day!"</em> and move on smoothly. Respecting boundaries is non-negotiable.</li>
          </ul>
        `,
      },
      {
        id: 'digital-messaging-and-asking-out',
        heading: 'Digital Approaches & Transitioning to a Low-Pressure Date',
        content: `
          <p>If you connect on social media or match on The College Date, follow these messaging rules:</p>
          <ol>
            <li><strong>Reference Something Specific:</strong> Never send just <em>"Hey"</em> or a fire emoji. Mention something on their profile: their taste in music, their campus society, or a funny bio line.</li>
            <li><strong>Use Anonymous Ask for Playful Curiosity:</strong> If they have a <code>/ask</code> link on their story, send an encouraging compliment or cheeky question to test the waters.</li>
            <li><strong>The 20-Minute Coffee Rule:</strong> When asking them out, make it low-pressure, daytime, and short: <em>"I'm grabbing a coffee at the student centre between my 11 AM and 1 PM classes tomorrow—do you want to join me for 20 minutes?"</em> A short coffee date removes the intimidating expectations of an evening dinner.</li>
          </ol>
        `,
      },
    ],
    faqs: [
      {
        question: 'What should I do if my campus crush rejects me?',
        answer: 'Smile, say "No worries at all! Have a great week," and walk away with your head held high. Handling rejection gracefully earns respect and eliminates any awkwardness if you cross paths again.',
      },
      {
        question: 'Is it creepy to approach someone in the campus library?',
        answer: 'Not if you are polite, brief, and quiet. If they are wearing headphones or furiously typing with books piled high, leave them alone. If they are taking a break or looking around, a quick, polite question is completely fine.',
      },
      {
        question: 'How long should we text before asking for an in-person meetup?',
        answer: 'Aim for 2 to 4 days of consistent, engaging messaging. Dragging out texting for weeks builds false intimacy and causes the conversational spark to fade before you ever meet.',
      },
      {
        question: 'Can I find my campus crush on The College Date?',
        answer: 'Yes! You can explore profiles filtered by your campus and faculty. If you both like each other, you match mutually without any risk of one-sided embarrassment.',
      },
    ],
    relatedGuides: [
      { label: 'First Message Examples for Dating Apps', href: '/first-message-examples-dating-apps' },
      { label: 'Conversation Starters for Dating Apps', href: '/conversation-starters-dating-app' },
      { label: 'Student Dating Bio Generator', href: '/tools/dating-bio-generator' },
      { label: 'Anonymous Ask App for Students', href: '/anonymous-ask-app-for-students' },
    ],
  },
  {
    slug: 'dating-a-coursemate-in-university',
    file: 'public/dating-a-coursemate-in-university.html',
    lang: 'en',
    title: 'Dating a Coursemate in University - Pros, Cons & Unspoken Rules',
    description: 'Thinking of dating a coursemate? Discover the essential pros, cons, boundary rules, study balance, and how to handle group projects and potential breakups.',
    kicker: 'Academic & Social Balance',
    h1: 'Dating a Coursemate in University',
    lede: 'Sharing lectures, assignments, and exam stress can spark intense chemistry with a coursemate. But dating someone in your degree comes with unique complications. Here is everything you need to know to navigate coursemate relationships with maturity.',
    date: '2026-09-15',
    ctaHeading: 'Expand Your Campus Circle',
    ctaText: 'Looking to meet students outside your immediate lecture hall? Explore student profiles across faculties and colleges on The College Date.',
    ctaHref: '/signup',
    ctaButtonText: 'Explore Student Profiles',
    sections: [
      {
        id: 'the-allure-of-coursemate-dating',
        heading: 'The Allure of Coursemate Romance: Shared Reality',
        content: `
          <p>It is easy to see why so many university romances begin in the classroom. You see each other multiple days a week, share identical academic schedules, and endure the same difficult lecturers, grueling continuous assessments, and panic-inducing exam seasons.</p>
          <p>When you date a coursemate, you don't have to explain why you can't hang out on Thursday evening—they are studying for the same test. You understand each other's career ambitions, talk about the same industry topics, and have an instant circle of shared departmental friends. However, this intense closeness can quickly become a double-edged sword.</p>
        `,
      },
      {
        id: 'hidden-pitfalls-and-risks',
        heading: 'The Hidden Pitfalls: Academic Overlap, Competition, and Gossip',
        content: `
          <p>Before diving into a relationship with someone in your class, consider the potential challenges:</p>
          <ul>
            <li><strong>Loss of Independence and Social Suffocation:</strong> Spending 8:00 AM to 5:00 PM together in lectures, studying together in the library, and then spending evenings together can cause both of you to lose your individual identities.</li>
            <li><strong>Grade Competition and Academic Resentment:</strong> When test results are published, what happens if one person scores an 'A' while the other struggles with a 'D'? Jealousy and insecurity can silently corrode romance.</li>
            <li><strong>Departmental Gossip:</strong> Lecture halls are rumor mills. If you have an argument before class, your classmates will notice. If you break up, the entire department may take sides.</li>
            <li><strong>The Group Project Nightmare:</strong> Being assigned to the same semester project while dealing with relationship tension can jeopardize your grades and alienate other project members.</li>
          </ul>
        `,
      },
      {
        id: 'five-golden-rules',
        heading: 'The Five Golden Rules of Dating a Coursemate',
        content: `
          <p>If you decide to date someone in your degree, protect your relationship and your grades by establishing clear boundaries:</p>
          <ol>
            <li><strong>Keep Your Classroom Conduct Professional:</strong> Save intimate physical affection and relationship drama for private hours. Do not sit together in every single lecture if it distracts you from learning.</li>
            <li><strong>Maintain Independent Study Habits:</strong> Do not rely 100% on your partner for notes, revisions, or assignment preparation. Have your own study routine and your own academic accountability.</li>
            <li><strong>Do Not Exclude Other Coursemates:</strong> Don't form a two-person island. Continue to interact, sit with, and collaborate with other classmates to keep your broader professional network healthy.</li>
            <li><strong>Establish Independent Friendships:</strong> Make sure both of you have friends from other faculties, sports teams, or campus clubs who have nothing to do with your major.</li>
            <li><strong>Agree in Advance on Maturity:</strong> Have a frank, calm discussion early on: <em>"No matter what happens between us romantically, we both promise to keep things civil in class and never let our personal feelings impact group projects or academic progress."</em></li>
          </ol>
        `,
      },
      {
        id: 'navigating-breakups',
        heading: 'How to Handle a Breakup Without Derailing Your Degree',
        content: `
          <p>If the relationship ends, you cannot simply delete their number and never see them again—you still have to face them in Monday morning lectures for the next two or three years.</p>
          <p>To survive a coursemate breakup with dignity:</p>
          <ul>
            <li><strong>Change Your Seat, Not Your Routine:</strong> Sit on the opposite side of the lecture hall to give both of you emotional breathing room. Do not skip classes or sabotage your attendance.</li>
            <li><strong>Do Not Weaponize Shared Friends:</strong> Refrain from venting to mutual coursemates or forcing friends to choose between you. Keep personal details private.</li>
            <li><strong>Remain Polite and Cordial:</strong> If you must interact during a tutorial or laboratory practical, treat them with the same calm professionalism you would show any other classmate.</li>
          </ul>
        `,
      },
      {
        id: 'meeting-outside-your-faculty',
        heading: 'Why Meeting Outside Your Faculty is Often Healthier',
        content: `
          <p>Many experienced students find that dating someone from a completely different faculty—such as an engineering student dating a law or arts student—provides the perfect balance. You enjoy the freshness of learning about their different world, you have something new to talk about at the end of the day, and you never risk awkwardness in your own lecture hall.</p>
          <p>Platforms like The College Date make it effortless to discover students across every department, college, and campus in your university.</p>
        `,
      },
    ],
    faqs: [
      {
        question: 'Should we tell our coursemates that we are dating?',
        answer: 'You do not need to make an official announcement, but do not lie about it either. Be natural, discreet, and avoid bringing romantic disagreements or displays of affection into the classroom.',
      },
      {
        question: 'What if we get assigned to the same group project?',
        answer: 'Treat the assignment purely as professional colleagues. Focus on the project deliverables, split tasks fairly, communicate clearly in the group chat, and leave personal discussions outside project meetings.',
      },
      {
        question: 'How can I stop comparing my test grades to my partner?',
        answer: 'Remind yourself that you have different strengths, study styles, and academic backgrounds. Celebrate each other\'s successes and offer genuine help without turning exams into a competition.',
      },
      {
        question: 'Is it better to date someone in your faculty or outside your faculty?',
        answer: 'Dating outside your faculty often provides healthier boundaries and more privacy, while dating a coursemate offers convenience and shared understanding. Both can work with emotional maturity.',
      },
    ],
    relatedGuides: [
      { label: 'How to Make Friends in University', href: '/how-to-make-friends-in-university' },
      { label: 'How to Date Safely at University', href: '/how-to-date-safely-at-university' },
      { label: 'Relationship Boundaries for Students', href: '/relationship-boundaries-for-students' },
      { label: 'Healthy Relationships for Students', href: '/healthy-relationship-university-students' },
    ],
  },
  {
    slug: 'campus-confessions-guide',
    file: 'public/campus-confessions-guide.html',
    lang: 'en',
    title: 'Campus Confessions Guide - Culture, Ethics & Anonymous Sharing',
    description: 'Explore campus confessions culture: why students share anonymous secrets, ethical boundaries, meme sharing, mental health impact, and how to participate safely.',
    kicker: 'Campus Culture & Community',
    h1: 'Campus Confessions Guide',
    lede: 'From humorous hostel mishaps to secret crushes, academic burnout, and relatable memes, campus confessions feeds have evolved into digital town squares for university students. Learn how confessions culture works, ethical boundaries to respect, and how to participate safely.',
    date: '2026-09-15',
    ctaHeading: 'Read and Share Campus Confessions',
    ctaText: 'Join The College Date to read real student confessions, react to campus memes, or share your own thoughts 100% anonymously.',
    ctaHref: '/signup',
    ctaButtonText: 'Join Campus Confessions',
    sections: [
      {
        id: 'evolution-of-confessions-culture',
        heading: 'The Evolution of Campus Confessions: The Student Digital Town Square',
        content: `
          <p>For over a decade, anonymous confession pages have been an iconic staple of university life. Beginning with grassroots Facebook pages in the early 2010s and shifting to Twitter handles and Telegram groups, campus confessions have always offered a raw, uncurated window into student sentiment.</p>
          <p>In modern student culture, confessions have moved inside purpose-built mobile and web platforms like The College Date. Instead of relying on rogue social media administrators who may leak identities or abandon feeds, integrated campus confession boards provide real-time community engagement, anonymous peer catharsis, and student-focused moderation.</p>
        `,
      },
      {
        id: 'why-students-love-confessions',
        heading: 'Why Students Love Confessions: Catharsis, Community, and Humor',
        content: `
          <p>Campus confessions thrive because they meet several fundamental student needs:</p>
          <ul>
            <li><strong>Relatable Academic Struggle:</strong> Reading that half of your faculty also failed the midterm or stayed up all night crying over a programming assignment relieves feelings of isolation and imposter syndrome.</li>
            <li><strong>Harmless Crush Shoutouts:</strong> Dropping a subtle hint about <em>"the guy in the grey hoodie on the 3rd floor library"</em> adds a spark of romance and mystery to mundane campus routines.</li>
            <li><strong>Hostel & Campus Life Comedy:</strong> Absurd stories about roommate cooking disasters, generator cuts during showers, or library seat reservations provide comic relief during intense exam periods.</li>
            <li><strong>Safe Emotional Venting:</strong> Many students use confessions to voice anxieties, family pressures, or loneliness that they feel uncomfortable sharing under their real names.</li>
          </ul>
        `,
      },
      {
        id: 'danger-zone-cyberbullying',
        heading: 'The Danger Zone: Cyberbullying, Doxing, and False Rumors',
        content: `
          <p>When anonymity is unmoderated, it can quickly turn toxic. The dark side of campus confessions includes targeted cyberbullying, doxing, and malicious character assassination:</p>
          <ul>
            <li><strong>Doxing & Naming Names:</strong> Posting someone's real name, phone number, social handle, or exact hostel room number without their consent is dangerous and can lead to real-world harassment.</li>
            <li><strong>Unsubstantiated Accusations:</strong> Using anonymous boards to spread unverified allegations or personal vendettas damages reputations and creates toxic campus hostility.</li>
            <li><strong>Body Shaming and Cruelty:</strong> Belittling classmates or posting unconsensual photos crosses the line from playful campus banter into active abuse.</li>
          </ul>
        `,
      },
      {
        id: 'the-ethical-confessions-code',
        heading: 'The Ethical Confessions Code: How to Post Responsibly',
        content: `
          <p>To keep campus confession feeds entertaining, supportive, and safe for everyone, follow these five essential rules:</p>
          <ol>
            <li><strong>Never Name Individuals Directly:</strong> Keep shoutouts general and positive. If your confession wouldn't feel kind if said to their face, don't post it.</li>
            <li><strong>Punch Up, Never Down:</strong> Tease general student struggles (exam schedules, cafeteria queues, rainy-day mud), but never target vulnerable individuals or marginalized groups.</li>
            <li><strong>Respect Personal Privacy:</strong> Never post screenshots of private chats, intimate photos, or private contact details.</li>
            <li><strong>Support Struggling Peers:</strong> When someone posts a confession expressing severe loneliness, mental health struggles, or grief, respond with encouraging, empathetic comments in the thread.</li>
            <li><strong>Report Harmful Content Immediately:</strong> If you see doxing, threats, or severe harassment, use the in-app report button to alert moderators instead of amplifying the post.</li>
          </ol>
        `,
      },
      {
        id: 'the-college-date-confessions-features',
        heading: 'How Confessions Work on The College Date',
        content: `
          <p>The College Date offers an advanced, student-first Confessions experience:</p>
          <ul>
            <li><strong>100% Anonymous Posting:</strong> Your account identity is completely detached from confession posts. Students can speak honestly without fearing reputational blowback.</li>
            <li><strong>Post Type Switcher:</strong> Choose between <em>"🎭 Secret / Meme (100% Anonymous)"</em> or <em>"👤 Campus Post (Public)"</em> depending on whether you want your profile attached or hidden.</li>
            <li><strong>Media Canvas Editor:</strong> Attach photos, memes, or screenshots and use our built-in cropping tool (1:1 square, 4:5 portrait, 16:9 landscape) with text captions.</li>
            <li><strong>Emoji Reactions & Threaded Comments:</strong> React with fire, laugh, heart, or shock emojis, and join threaded discussions inside the pinned comments drawer.</li>
            <li><strong>Built-in Safety Filters:</strong> Automated screening catches offensive slurs and harassment before posts go live, ensuring a fun and healthy campus space.</li>
          </ul>
        `,
      },
    ],
    faqs: [
      {
        question: 'Are my confessions on The College Date truly anonymous?',
        answer: 'Yes. When you select the Secret / Meme post type, your confession is published without any link to your profile or identity.',
      },
      {
        question: 'Can I add images or memes to my confessions?',
        answer: 'Yes. You can upload images, format them using our built-in multi-aspect ratio canvas editor, and post them anonymously alongside your text.',
      },
      {
        question: 'What happens if someone posts something abusive or bullying?',
        answer: 'Every confession post features a report button. Our moderation team reviews flagged content and removes posts that violate community guidelines.',
      },
      {
        question: 'Can other students comment on my confessions?',
        answer: 'Yes. Students can react with emojis and leave comments in the interactive comments drawer to offer advice, share laughter, or discuss the topic.',
      },
    ],
    relatedGuides: [
      { label: 'Anonymous Ask App for Students', href: '/anonymous-ask-app-for-students' },
      { label: 'How to Talk to Your Campus Crush', href: '/how-to-talk-to-your-campus-crush' },
      { label: 'Campus Dating Safety', href: '/safety' },
      { label: 'Student Blog and Advice', href: '/blog' },
    ],
  },
];

export function generateBatch2() {
  console.log('Generating Batch 2 SEO Pages (4 pages)...');
  for (const page of batch2Pages) {
    const html = renderSeoPage(page);
    writeFileSync(join(root, page.file), html, 'utf8');
    console.log(`  ✓ Generated ${page.file}`);
  }
}

if (process.argv[1]?.endsWith('batch2.mjs')) {
  generateBatch2();
}
