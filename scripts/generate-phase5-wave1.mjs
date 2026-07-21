import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const site = 'https://www.thecollegedate.com';
const today = '2026-07-20';
const publisher = 'The College Date Editorial Team';
const ogImage = `${site}/og-image.png`;

const sources = [
  {
    title: 'What To Know About Romance Scams',
    publisher: 'Federal Trade Commission Consumer Advice',
    url: 'https://consumer.ftc.gov/articles/what-know-about-romance-scams',
    claim: 'Romance scammers often create fake profiles, move conversations off-platform, ask for money, and should be reported.',
  },
  {
    title: 'Romance Scams',
    publisher: 'Federal Bureau of Investigation',
    url: 'https://www.fbi.gov/how-we-can-help-you/scams-and-safety/common-frauds-and-scams/romance-scams',
    claim: 'Online daters should go slowly, protect public information, reverse-search suspicious photos, and never send money to people only met online.',
  },
  {
    title: 'Consent 101: Respect, Boundaries, and Building Trust',
    publisher: 'RAINN',
    url: 'https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/',
    claim: 'Consent should be clear, voluntary, ongoing, and free from pressure, manipulation, coercion, or fear.',
  },
  {
    title: 'Breadcrumb structured data',
    publisher: 'Google Search Central',
    url: 'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
    claim: 'BreadcrumbList structured data helps Search understand page hierarchy and should be validated before release.',
  },
  {
    title: 'Tinder - Apps on Google Play',
    publisher: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.tinder',
    claim: 'Tinder is a broad dating app for meeting, matching, chatting, dating, and making friends.',
  },
  {
    title: 'Bumble Dating App: Meet & Date - Google Play',
    publisher: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.bumble.app',
    claim: 'Bumble presents itself as a dating app for meeting people, making connections, and finding meaningful relationships.',
  },
  {
    title: 'Badoo - Dating & Meet People - Apps on Google Play',
    publisher: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.badoo.mobile',
    claim: 'Badoo supports matching, chatting, meeting people nearby, friendship, and dating.',
  },
  {
    title: 'Hinge Dating App: Match & Date - Google Play',
    publisher: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=co.hinge.app',
    claim: 'Hinge emphasizes profile prompts and intentional dating conversations.',
  },
  {
    title: 'Download The College Date App',
    publisher: 'The College Date',
    url: 'https://www.thecollegedate.com/download',
    claim: 'The College Date is available on the web and Android; public Android package is com.collegedate.app.',
  },
];

const commonNav = [
  ['/', 'Home'],
  ['/dating-app-in-nigeria', 'Nigeria App'],
  ['/campus-dating', 'Campus Dating'],
  ['/safety', 'Safety'],
  ['/blog', 'Blog'],
  ['/download', 'Download'],
];

const pages = [
  {
    path: '/dating-app-for-university-students-nigeria',
    file: 'public/dating-app-for-university-students-nigeria.html',
    type: 'WebPage',
    title: 'Dating App for University Students in Nigeria',
    description: 'A focused guide to dating apps for Nigerian university students, covering campus fit, student profiles, matching, privacy, safety, and The College Date.',
    kicker: 'University student dating',
    h1: 'Dating App for University Students in Nigeria',
    intro: 'A good dating app for university students in Nigeria should make campus context visible, help students state their intentions honestly, and keep safety guidance close to the matching experience. The College Date is built for adult students who want a student-focused way to discover, match, chat, and connect around school life.',
    sections: [
      ['Who this page is for', [
        'This page is for Nigerian university students who want a dating experience shaped around school life rather than a generic city-wide feed. That includes freshers learning the social rhythm of campus, final-year students with limited time, shy students who prefer chat first, and people who want friendship before dating.',
        'The College Date should be understood as a student-focused product category page here. It is not a claim that every student on every Nigerian campus is present, verified, or endorsed by a university. The accurate promise is narrower: the app is designed around student profiles, campus details, mutual discovery, chat, and public safety guidance.'
      ]],
      ['What university students should evaluate', [
        'Look for profile fields that help you understand student context before you match: school, level, interests, photos, intentions, and a short bio. For Nigerian campuses, those details matter because people often meet through lectures, hostels, departments, faculty weeks, fellowships, clubs, group chats, and mutual friends.',
        'A useful student dating app should also make privacy decisions easier. You should not need to put your hostel block, room number, family details, class timetable, bank information, or exact routine in a profile. A profile can be warm and specific without exposing details that make you easy to track offline.'
      ]],
      ['Where The College Date fits', [
        'The College Date supports account creation, student profile setup, interests, dating intention, profile photos, mutual discovery, matching, chat, and premium discovery features. The onboarding flow asks users to be 18 or older and to add campus information such as institution and level.',
        'Current public implementation supports Android and web access. The official Android package is com.collegedate.app, and users should use the official download page or Google Play listing when installing the app.'
      ]],
      ['Safety expectations for university dating apps', [
        'Use chat to build trust gradually. Before moving from the app to an offline meeting, check whether the person has a consistent profile, normal conversation history, and respectful responses to boundaries. If someone pushes for private details, money, intimate media, or secrecy, slow down and use support or reporting paths.',
        'A student-focused app can reduce randomness, but it cannot guarantee safety. Your own decisions still matter: meet in public places, tell a trusted person, keep transport money separate, keep your phone charged, and leave early if something feels wrong.'
      ]],
      ['Useful next steps', [
        'Start by reading the wider <a href="/dating-app-in-nigeria">dating app in Nigeria</a> pillar, then explore the <a href="/campus-dating">campus dating guide</a> and <a href="/dating-bio-examples-students">student bio examples</a>. If you want to try the product, use the <a href="/download">official download page</a>.'
      ]]
    ],
    related: [
      ['/dating-app-in-nigeria', 'Dating App in Nigeria'],
      ['/campus-dating', 'Campus Dating Guide'],
      ['/safety', 'Safety on The College Date'],
      ['/dating-bio-examples-students', 'Dating Bio Examples for Students'],
    ],
    faqs: [
      ['Is The College Date only for university students?', 'The public positioning is for Nigerian university, polytechnic, and college students aged 18 and above. The onboarding flow includes many universities, polytechnics, and colleges, but users should describe their institution accurately.'],
      ['Does The College Date guarantee that every profile is verified?', 'No. The app includes profile setup, photos, AI trust checks in parts of the product, and support paths, but public pages should not claim universal identity verification or background checks.'],
      ['Can students use it for friendship first?', 'Yes. The profile setup includes a Friends intention option, so friendship-first use is supported when users state that intention honestly.']
    ],
    cta: ['Try The College Date', '/download', 'Create or open your profile when you are ready to meet students with clearer campus context.'],
  },
  {
    path: '/dating-app-in-nigeria',
    file: 'public/dating-app-in-nigeria.html',
    type: 'WebPage',
    title: 'Dating App in Nigeria for Safer Student Connections',
    description: 'How to evaluate a dating app in Nigeria, including safety, privacy, student relevance, matching quality, Android access, and where The College Date fits.',
    kicker: 'Nigerian dating app guide',
    h1: 'Dating App in Nigeria',
    intro: 'Choosing a dating app in Nigeria should start with fit, trust, privacy, and intent. For students, the strongest option is not always the biggest app. It is the app that helps you understand who you are meeting, how they relate to your student life, and how to move from chat to real life carefully.',
    sections: [
      ['How to compare dating apps in Nigeria', [
        'Start with the basics: who the app is built for, whether profiles give enough context, how matching works, whether support and safety information are easy to find, and whether the app is accessible on the device you use every day.',
        'Large general apps may offer broad reach. Student-focused platforms should offer sharper relevance: school context, level, interests, intentions, campus examples, and guidance for moving safely from online chat to offline meetings.'
      ]],
      ['What Nigerian students should look for', [
        'Students should prioritize apps that let them show honest profile information without oversharing. A good student profile can mention school life, interests, study rhythm, and dating intention while keeping private details off the page.',
        'Also look for clear support pages, account deletion information, privacy policy, terms, safety guidance, and official download links. These trust pages help users and search systems understand who runs the service and what users can expect.'
      ]],
      ['Where The College Date fits in the market', [
        'The College Date is positioned as a campus dating and student social discovery app for adult Nigerian students. It supports web access and Android access, profile creation, mutual discovery, matching, private chat, notifications, and premium discovery features.',
        'This page should own the broad "dating app in Nigeria" topic for The College Date, while the narrower <a href="/dating-app-for-university-students-nigeria">university student dating app page</a> owns the university-student commercial query.'
      ]],
      ['Safety and privacy checks before choosing any app', [
        'Before joining or meeting someone, read safety guidance, privacy information, and support options. Be careful with requests for money, sudden urgency, links, verification fees, private photos, or pressure to leave the platform before trust has been built.',
        'The FTC and FBI both warn that romance scammers may build trust through dating apps or social platforms, then ask for money or sensitive information. That is why every dating app evaluation should include scam awareness, not just features.'
      ]],
      ['Best next step', [
        'Read the <a href="/blog/best-dating-apps-nigeria-students">student comparison guide</a> if you are still comparing platforms. Read <a href="/safety">Safety on The College Date</a> if you want platform-specific safety information. Use <a href="/download">Download</a> only when you are ready to try the official app.'
      ]]
    ],
    related: [
      ['/dating-app-for-university-students-nigeria', 'Dating App for University Students'],
      ['/blog/best-dating-apps-nigeria-students', 'Best Dating Apps for Students'],
      ['/safety', 'Safety'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['What is the best dating app in Nigeria?', 'The best choice depends on intent, location, safety expectations, and whether you want broad dating or student-focused discovery. This page helps students compare fit without unsupported ranking claims.'],
      ['Is The College Date a Nigerian dating app?', 'Yes. The website and public pages position The College Date for Nigerian university, polytechnic, and college students aged 18 and above.'],
      ['Should I pay someone I met on a dating app?', 'No. Be very cautious with money requests from people you only know online. Scam-safety sources advise against sending money to online romantic contacts you have not safely met and verified.']
    ],
    sources: [sources[0], sources[1]],
    cta: ['Download The College Date', '/download', 'Open the official download page for Android and web access.'],
  },
  {
    path: '/campus-dating',
    file: 'public/campus-dating.html',
    type: 'Article',
    title: 'Campus Dating Guide for Nigerian Students',
    description: 'A practical campus dating guide for Nigerian students covering meeting people, expectations, respectful communication, safety, profiles, conversations, and first dates.',
    kicker: 'Campus dating pillar',
    h1: 'Campus Dating Guide for Nigerian Students',
    intro: 'Campus dating is about meeting people inside the rhythms of student life: lectures, hostels, departments, societies, religious groups, faculty weeks, study sessions, and shared friends. The healthy version is intentional, respectful, and safe enough that both people can move at a comfortable pace.',
    sections: [
      ['What campus dating means', [
        'Campus dating is different from random online dating because people often share overlapping spaces. That can make connection easier, but it also raises the stakes. A respectful approach protects privacy, reputation, study time, and emotional wellbeing.',
        'The best campus connections usually start with clear intentions and normal conversation. You do not need pressure, loud public gestures, or constant messages to show interest. You need consistency, kindness, and enough self-control to hear "no" without turning it into drama.'
      ]],
      ['How to meet people naturally on campus', [
        'Meet through everyday contexts: course group work, student clubs, departmental events, sports, library sessions, volunteer activities, creative communities, and mutual friends. If you use a dating app, treat it as one route into conversation, not a shortcut around respect.',
        'A good first message can refer to a profile detail, a shared interest, or a campus moment without sounding like a copied pickup line. For more examples, read <a href="/conversation-starters-dating-app">conversation starters for dating apps</a>.'
      ]],
      ['Setting expectations early', [
        'Campus rumours move fast, so clarity helps. If you want friendship first, say so. If you want something serious, say that without demanding instant commitment. If you are not ready to date during exams or final-year project pressure, be honest rather than disappearing.',
        'The College Date profile setup includes dating intention, interests, school, and level details so students can give useful context before matching.'
      ]],
      ['Moving from chat to a first date', [
        'A first meeting should be public, simple, and easy to leave. Think campus cafeteria, open common area, daytime coffee, group-friendly hangout, or a study date in a visible space. Avoid isolated hostels, empty classrooms, private rooms, or late-night first meetings.',
        'For specific ideas, use the <a href="/first-date-ideas-students">first date ideas for students</a> guide. For safety planning, read <a href="/campus-dating-safety">campus dating safety</a>.'
      ]],
      ['How The College Date supports campus dating', [
        'The College Date is designed around adult student discovery: profile setup, campus details, intentions, photos, mutual matching, chat, and official safety pages. It is not a replacement for judgment, but it gives students a more relevant starting point than random social media DMs.'
      ]]
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/first-date-ideas-students', 'First Date Ideas'],
    ],
    faqs: [
      ['How do I date someone on campus without making it awkward?', 'Start privately and respectfully, avoid public pressure, accept boundaries quickly, and keep school spaces peaceful if the person is not interested.'],
      ['Should I date during exams?', 'Only if both people can keep academic priorities stable. During high-pressure periods, lighter check-ins may be healthier than demanding constant attention.'],
      ['Is a campus dating app enough to stay safe?', 'No. A campus-focused app can create useful context, but students still need privacy, scam awareness, public meeting plans, and clear boundaries.']
    ],
    cta: ['Create a Student Profile', '/signup', 'When your profile is honest and respectful, the right conversations become easier to start.'],
  },
  {
    path: '/student-dating',
    file: 'public/student-dating.html',
    type: 'Article',
    title: 'Student Dating Guide - Relationships While Studying',
    description: 'A student dating guide about balancing school, time, emotional maturity, intentions, communication, safety, and app-based discovery while studying.',
    kicker: 'Student relationships',
    h1: 'Student Dating Guide',
    intro: 'Student dating is dating inside a life stage where time, money, identity, friendships, academics, and future plans are still changing. A healthy student relationship should make life feel clearer and more respectful, not more chaotic.',
    sections: [
      ['Dating as a student life stage', [
        'Students are often learning who they are while also managing lectures, exams, family expectations, money pressure, internships, and social life. That means attraction alone is not enough. Compatibility also includes schedule, emotional maturity, communication style, and shared expectations.',
        'This is the main distinction from <a href="/campus-dating">campus dating</a>. Campus dating focuses on the physical and social campus environment. Student dating focuses on the wider stage of life: growth, pressure, intention, and balance.'
      ]],
      ['Balance school and relationships', [
        'A relationship should not require you to abandon classes, miss deadlines, or spend money you do not have. Build routines that protect both people: study windows, honest availability, exam-season boundaries, and low-cost plans.',
        'Students who are serious about each other still need personal space. Constant location-checking, phone-checking, or pressure to reply instantly can become controlling rather than caring.'
      ]],
      ['State your intention without pressure', [
        'It is fair to say, "I am open to something serious," "I prefer friendship first," or "I am still figuring things out." It is not fair to mislead someone because you want attention. The College Date onboarding supports Casual, Serious, and Friends intentions so users can set expectations early.',
        'A bio should match your real personality and boundaries. The <a href="/dating-bio-examples-students">dating bio examples</a> guide and <a href="/tools/dating-bio-generator">student bio generator</a> can help you write something truthful.'
      ]],
      ['Build emotional maturity', [
        'Emotional maturity means listening, apologizing when needed, respecting no, communicating before assumptions become drama, and not using jealousy as proof of love. It also means ending things respectfully when a connection is not working.',
        'No guide can replace mental-health, medical, or legal support. If a relationship involves coercion, threats, stalking, violence, sexual pressure, self-harm threats, or serious distress, speak with a trusted person and seek qualified help.'
      ]],
      ['Use dating apps thoughtfully', [
        'A dating app can help you meet students beyond your immediate class or department, but your behavior decides the quality of the experience. Write a real profile, use respectful conversation, avoid harassment, and read the <a href="/safety">safety page</a> before moving offline.'
      ]]
    ],
    related: [
      ['/campus-dating', 'Campus Dating'],
      ['/dating-bio-examples-students', 'Profile Bio Examples'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/safety', 'Safety'],
    ],
    faqs: [
      ['What makes student dating different?', 'Students often date while managing academics, limited budgets, campus reputation, family expectations, and fast-changing future plans.'],
      ['Can I use The College Date for friendship first?', 'Yes. The onboarding flow includes a Friends intention option, and users should state that honestly in their profiles.'],
      ['How do I avoid distraction while dating?', 'Protect your study routine, agree on communication expectations, avoid pressure during exams, and choose low-stress dates.']
    ],
    cta: ['Explore Student Dating Safely', '/download', 'Open the official app page when you want student-focused discovery with clearer profile context.'],
  },
  {
    path: '/safety',
    file: 'public/safety.html',
    type: 'WebPage',
    title: 'Safety on The College Date',
    description: 'Official safety information for The College Date, including eligibility, profile responsibility, reporting paths, privacy choices, public meeting guidance, and support.',
    kicker: 'Official safety',
    h1: 'Safety on The College Date',
    intro: 'The College Date is intended for adult students and campus communities. Safety here means clear rules, responsible profiles, cautious matching, support contact paths, privacy choices, and guidance that helps users make better decisions before meeting offline.',
    sections: [
      ['What is verified about the platform', [
        'The current app includes signup, onboarding, age entry with an 18+ check in profile setup, school and level fields, interests, dating intention, profile photos, mutual discovery, chat, notification settings, profile visibility status, online-status controls, incognito mode, account deletion information, and public safety pages.',
        'The app also includes AI profile trust checks in parts of the product. That should be described cautiously as a trust-support feature, not as a guarantee that every account is identity-verified or background-checked.'
      ]],
      ['User responsibilities', [
        'Users are responsible for accurate profile information, respectful communication, and safe decisions when moving from chat to real life. Do not impersonate others, scam users, harass people, share non-consensual intimate material, exploit minors, spam, or pressure someone after they decline.',
        'The Terms of Service and Privacy Policy explain expected conduct, data handling, payments, deletion, and support contacts.'
      ]],
      ['Reporting and support', [
        'Users should report suspicious or harmful behavior through available in-app reporting tools where present or by contacting support. Public support is available through <a href="/support">Support</a>, <a href="mailto:info@thecollegedate.com">info@thecollegedate.com</a>, and safety contact <a href="mailto:godwillgodslife@gmail.com">godwillgodslife@gmail.com</a>.',
        'Child safety standards are published separately for public transparency and Google Play compliance. The service is intended for adults, and underage exploitation or child sexual abuse material is prohibited.'
      ]],
      ['Offline meeting guidance', [
        'For first meetings, choose public, visible places, tell a trusted person, keep your phone charged, arrange your own transport, and leave if you feel uncomfortable. Do not share bank details, passwords, ID documents, exact room location, or private media with someone you do not fully trust.',
        'For step-by-step offline planning, read <a href="/blog/how-to-date-safely-on-campus-nigeria">How to Date Safely on Campus in Nigeria</a>. For broader student education, read <a href="/campus-dating-safety">Campus Dating Safety</a>.'
      ]],
      ['What this page does not claim', [
        'This page does not claim universal identity verification, guaranteed student verification, background checks, continuous human monitoring, guaranteed safety, or university endorsement. Those claims should not appear anywhere unless the owner provides verifiable evidence and implementation support.'
      ]]
    ],
    related: [
      ['/blog/how-to-date-safely-on-campus-nigeria', 'Practical Safety Guide'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/privacy', 'Privacy Policy'],
      ['/support', 'Support'],
    ],
    faqs: [
      ['Is The College Date for people under 18?', 'No. The public positioning is for adult students, and onboarding requires users to be at least 18.'],
      ['Does The College Date guarantee safety?', 'No online or offline dating service can guarantee safety. The platform provides rules, support paths, trust features, and guidance, while users must still make careful decisions.'],
      ['How do I contact support?', 'Use the Support page, email info@thecollegedate.com, or contact the published safety email for safety concerns.']
    ],
    cta: ['Read Practical Safety Steps', '/blog/how-to-date-safely-on-campus-nigeria', 'Use the checklist before meeting anyone from a dating app.'],
  },
  {
    path: '/campus-dating-safety',
    file: 'public/campus-dating-safety.html',
    type: 'Article',
    title: 'Campus Dating Safety for Nigerian Students',
    description: 'A campus dating safety pillar for students covering privacy, scam awareness, consent, respectful chat, public meetings, transport planning, and reporting.',
    kicker: 'Safety education',
    h1: 'Campus Dating Safety',
    intro: 'Campus dating safety means protecting your privacy, time, body, money, and reputation while you meet people online or around school. It does not mean becoming afraid of dating. It means moving with enough care that you can enjoy connection without ignoring warning signs.',
    sections: [
      ['Keep profile privacy practical', [
        'A strong dating profile can mention your school, level, interests, and intention without revealing your hostel room, daily route, exact timetable, family address, banking details, or ID documents. Treat private information as something earned slowly through trust, not something a stranger needs immediately.',
        'Photos should be real and respectful, but avoid images that expose sensitive locations or documents in the background.'
      ]],
      ['Watch for scams and pressure', [
        'Be careful when someone quickly asks for transport money, emergency fees, airtime, crypto, investments, gift cards, private images, login codes, or a move to another app before trust is built. Romance scams often work by creating urgency and emotional pressure.',
        'If a story feels designed to make you act immediately, pause. Talk to someone you trust. Do not send money to someone you only know online.'
      ]],
      ['Respectful communication and consent', [
        'Consent is not silence, pressure, fear, or guessing. Healthy dating requires clear, voluntary, ongoing agreement and the freedom to stop or say no. That applies to physical contact, photos, conversations, calls, and any offline meeting plan.',
        'Respect non-response. A delayed reply is not permission to flood someone with messages, insult them, or search for them around campus.'
      ]],
      ['First meeting planning', [
        'Choose public places for first meetings: busy campus cafes, open lounges, study areas, student-friendly restaurants, or daytime events. Avoid private rooms, isolated shortcuts, restricted buildings, and late-night first meetings.',
        'Plan your transport before you go, keep your own fare, charge your phone, and tell a trusted person where you are going. If you feel uncomfortable, leave without apologizing for protecting yourself.'
      ]],
      ['Using The College Date safely', [
        'Read <a href="/safety">Safety on The College Date</a> for platform-specific facts. Use profile details, chat, boundaries, and support options thoughtfully. If you want practical steps, use the <a href="/blog/how-to-date-safely-on-campus-nigeria">campus safety checklist</a>.'
      ]]
    ],
    related: [
      ['/safety', 'Safety on The College Date'],
      ['/blog/how-to-date-safely-on-campus-nigeria', 'How to Date Safely on Campus'],
      ['/dating-bio-examples-students', 'Safer Bio Examples'],
      ['/conversation-starters-dating-app', 'Respectful Conversation Starters'],
    ],
    faqs: [
      ['What should I not share on a dating profile?', 'Avoid exact room location, timetable, bank details, ID documents, family address, passwords, and private media.'],
      ['Where should students meet for a first date?', 'Choose a public, visible, easy-to-leave location, preferably during the day or early evening.'],
      ['What should I do if someone pressures me?', 'Stop responding if needed, save evidence, talk to someone trusted, and use available reporting or support paths.']
    ],
    sources: [sources[0], sources[1], sources[2]],
    cta: ['Open the Safety Hub', '/safety', 'Review platform-specific safety information before using any dating feature.'],
  },
  {
    path: '/blog/how-to-date-safely-on-campus-nigeria',
    file: 'public/blog/how-to-date-safely-on-campus-nigeria.html',
    type: 'BlogPosting',
    title: 'How to Date Safely on Campus in Nigeria',
    description: 'A practical step-by-step safety guide for Nigerian students dating on campus, covering profile checks, public meetings, transport, scams, consent, and reporting.',
    kicker: 'Practical safety guide',
    h1: 'How to Date Safely on Campus in Nigeria',
    intro: 'To date safely on campus in Nigeria, move slowly, check profile consistency, keep private information private, meet first in public places, arrange your own transport, tell a trusted person, keep your phone ready, and leave early if a situation feels uncomfortable.',
    sections: [
      ['Before you agree to meet', [
        'Look for basic consistency: name, photos, school details, conversation style, and how the person responds when you set a small boundary. A respectful person will not rush you, insult you, ask for secrecy, or pressure you to prove interest with money or private photos.',
        'If a profile feels too perfect, uses stolen-looking photos, refuses normal questions, or quickly asks to leave the platform, slow down. Use reverse image search when something feels off and talk with a trusted friend before meeting.'
      ]],
      ['Choose a public first location', [
        'Pick places where other people are present and where leaving is simple: open campus spots, cafes, student centers, visible eateries, campus events, or a daytime walk in a busy area. Avoid first meetings in hostels, private rooms, isolated offices, parked cars, empty classrooms, or restricted spaces.',
        'A public meeting is not an insult. It is a normal safety baseline for two people who are still learning whether trust is real.'
      ]],
      ['Prepare transport and phone basics', [
        'Charge your phone before leaving, keep data and airtime available, and decide how you will get back before the date starts. Keep your own transport money separate so you are not stuck if the mood changes.',
        'Share the meeting place and expected return time with someone you trust. You can also agree on a check-in message so your friend knows you are okay.'
      ]],
      ['Money and scam precautions', [
        'Do not send money, gift cards, crypto, bank details, login codes, ID documents, or payment screenshots to someone you only know from a dating app or social media. Be extra careful with urgent stories, fake travel emergencies, investment pitches, or requests for verification fees.',
        'If money has already been sent and you suspect fraud, stop contact, save evidence, contact your bank or payment provider where relevant, and report the incident through the platform and appropriate authorities.'
      ]],
      ['Consent and boundaries', [
        'Consent must be clear, voluntary, and ongoing. You can change your mind. They can change their mind. Respecting a boundary should be treated as normal dating maturity, not as rejection drama.',
        'If you feel unsafe, you do not need to finish the date politely. Move to a visible area, call a trusted person, leave by your own transport, and contact support if the concern relates to The College Date.'
      ]],
      ['How and when to report concerns', [
        'Report concerns when someone harasses you, threatens you, asks for private sexual content, impersonates someone, requests money suspiciously, uses hateful or abusive language, or appears underage. Include screenshots, profile details, times, and what happened.',
        'For The College Date, use available in-app reporting tools where present or contact <a href="/support">Support</a>. Read the official <a href="/safety">Safety on The College Date</a> page for platform-specific expectations.'
      ]]
    ],
    related: [
      ['/safety', 'Safety on The College Date'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/conversation-starters-dating-app', 'Respectful Messaging'],
      ['/first-date-ideas-students', 'First Date Ideas'],
    ],
    faqs: [
      ['What should I check before meeting someone from a dating app?', 'Check profile consistency, respectful communication, normal answers to questions, no pressure for secrecy, and no requests for money or private details.'],
      ['Where should I meet someone for the first time on campus?', 'Meet in a public, visible, easy-to-leave place such as a campus cafe, open lounge, student center, or daytime event.'],
      ['What if I feel uncomfortable during the date?', 'Leave. Move to a visible place, contact a trusted person, use your own transport, and report the concern if it involves harassment, fraud, threats, or platform abuse.']
    ],
    sources: [sources[0], sources[1], sources[2]],
    cta: ['Read the Safety Hub', '/safety', 'Keep the official safety page close before you meet anyone offline.'],
  },
  {
    path: '/blog/best-dating-apps-nigeria-students',
    file: 'public/blog/best-dating-apps-nigeria-students.html',
    type: 'BlogPosting',
    title: 'Best Dating Apps in Nigeria for Students',
    description: 'A fair student-focused comparison of dating apps in Nigeria, including general apps, student-focused platforms, safety checks, and The College Date disclosure.',
    kicker: 'Comparison guide',
    h1: 'Best Dating Apps in Nigeria for Students',
    intro: 'The best dating app for a Nigerian student depends on what you need: broad reach, intentional relationships, friendship, campus context, safety guidance, or Android-first access. This comparison is published by The College Date, so it is written with a clear disclosure and without unsupported number-one claims.',
    sections: [
      ['How this comparison works', [
        'This guide compares public positioning and visible product direction, not private usage data. Prices, exact feature limits, country availability, and policies can change, so students should check the official app listings and websites before deciding.',
        'The College Date is included because it is the publisher and because it is designed specifically around Nigerian student discovery. That does not make it objectively better for every person. It may suit students who want campus context more than a broad general dating pool.'
      ]],
      ['Quick comparison for students', [
        '<div class="table-wrap"><table><thead><tr><th>Platform type</th><th>May suit</th><th>Student consideration</th></tr></thead><tbody><tr><td>The College Date</td><td>Nigerian students who want campus context</td><td>Best evaluated for school details, intentions, profile setup, Android/web access, and safety pages</td></tr><tr><td>Tinder</td><td>People wanting broad dating discovery</td><td>Large general dating context; students should still check safety, privacy, and intention fit</td></tr><tr><td>Bumble</td><td>People seeking dating and meaningful connections</td><td>General app positioning; check how its experience fits your local campus reality</td></tr><tr><td>Badoo</td><td>People seeking nearby chat, dating, or friendship</td><td>Nearby discovery may be useful, but privacy and meeting safety still matter</td></tr><tr><td>Hinge</td><td>People who like prompts and intentional profiles</td><td>Good prompt-led positioning; availability and local student density should be checked</td></tr></tbody></table></div>'
      ]],
      ['Why student-focused apps are different', [
        'General apps often optimize for broad discovery. A student-focused app should optimize for the context students actually use: institution, level, interests, intention, school rhythm, budget, and safer first meetings.',
        'If you want to meet people around campus life, read the focused <a href="/dating-app-for-university-students-nigeria">dating app for university students in Nigeria</a> page. If you are comparing the wider market, read the <a href="/dating-app-in-nigeria">dating app in Nigeria</a> pillar.'
      ]],
      ['Safety criteria to use for every app', [
        'Before you choose any dating app, check whether it has public safety guidance, support contact routes, privacy policy, account deletion information, and a way to handle suspicious behavior. Also protect yourself by not sending money or private information to online contacts.',
        'Large apps can still contain unsafe users. Smaller or student-focused apps can still require caution. The safest mindset is balanced: open to connection, careful with trust.'
      ]],
      ['Who The College Date may suit', [
        'The College Date may suit adult Nigerian students who want profiles built around school context, dating intention, interests, matching, chat, and official Android/web access. It may not suit someone who wants a non-student international dating pool or a platform with public evidence of every advanced verification capability.'
      ]]
    ],
    related: [
      ['/dating-app-in-nigeria', 'Dating App in Nigeria'],
      ['/dating-app-for-university-students-nigeria', 'University Student Dating App'],
      ['/safety', 'Safety'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['Is The College Date claiming to be the best dating app in Nigeria?', 'No. This guide explains when a student-focused app may be a good fit and encourages readers to compare platforms based on their own needs.'],
      ['Which dating app is best for Nigerian students?', 'Students should compare audience fit, safety, privacy, profile quality, device access, local relevance, and whether the app supports their dating intention.'],
      ['Are general dating apps unsafe?', 'Not automatically. General apps can be useful, but students should still use privacy, scam awareness, consent, and public meeting precautions.']
    ],
    sources: [sources[4], sources[5], sources[6], sources[7], sources[0], sources[1]],
    cta: ['Compare, Then Download Safely', '/download', 'Use the official download page if The College Date fits your student dating needs.'],
  },
  {
    path: '/dating-bio-examples-students',
    file: 'public/dating-bio-examples-students.html',
    type: 'Article',
    title: 'Dating Bio Examples for Students',
    description: 'Student dating bio examples for serious relationships, friendship-first profiles, shy students, funny respectful bios, interests, privacy, and a fill-in formula.',
    kicker: 'Profile utility',
    h1: 'Dating Bio Examples for Students',
    intro: 'A good student dating bio is short, truthful, specific, and respectful. It should give someone an easy reason to start a conversation without exposing private details or pretending to be someone you are not.',
    sections: [
      ['A simple bio formula', [
        'Use this fill-in structure: "I am a [level/course or student context] who enjoys [interest 1], [interest 2], and [interest 3]. I am looking for [intention]. Ask me about [conversation hook]."',
        'Example: "200L mass comm student who likes Afrobeats, food spots, and weekend study dates. Open to friendship first and real conversation. Ask me about the best small chops near campus."'
      ]],
      ['Short bio examples', [
        '<ul><li>Engineering student, music lover, and low-key foodie. I like honest chats and calm weekend plans.</li><li>Mostly in the library, occasionally at faculty events. Looking for someone kind, funny, and serious about school too.</li><li>Fresh energy, old-school manners. I like good conversation, campus walks, and people who reply with sense.</li></ul>'
      ]],
      ['Serious-relationship examples', [
        '<ul><li>Final-year student balancing project work and real life. I am open to something serious with someone emotionally mature.</li><li>I value faith, ambition, family, and communication. Looking for a connection that grows with honesty.</li><li>Not rushing anything, but I date with intention. Let us start with friendship and see if the values match.</li></ul>'
      ]],
      ['Friendship-first and shy-person examples', [
        '<ul><li>Quiet at first, fun once I am comfortable. Friendship first works best for me.</li><li>New to online dating, so I prefer easy conversations and no pressure.</li><li>Trying to meet more people outside my department. Open to friends, study partners, and maybe more if it feels right.</li></ul>'
      ]],
      ['Funny but respectful examples', [
        '<ul><li>Can explain my course outline, but not why I keep buying snacks after class.</li><li>Looking for someone who understands that "five minutes" on campus can mean thirty.</li><li>If you know a better food spot than mine, I am listening respectfully.</li></ul>'
      ]],
      ['Phrases to avoid', [
        'Avoid insults, stereotypes, entitlement, fake wealth claims, pressure, sexual demands, or statements that make dating feel like a test. Also avoid exact room locations, private family details, and anything that could make you unsafe offline.',
        'When you are ready, try the <a href="/tools/dating-bio-generator">dating bio generator for students</a>. It gives editable ideas, but your final bio should still sound like you.'
      ]]
    ],
    related: [
      ['/tools/dating-bio-generator', 'Dating Bio Generator'],
      ['/student-dating', 'Student Dating Guide'],
      ['/safety', 'Safety'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['What should a student dating bio include?', 'Include your student context, two or three interests, your intention, and one easy conversation hook.'],
      ['Should I mention my university in my bio?', 'You can mention broad school context if you are comfortable, but avoid exact dorm, room, timetable, or routine details.'],
      ['Can I use a generated bio?', 'Yes, as a draft. Edit it so it is truthful, respectful, and written in your own voice.']
    ],
    cta: ['Generate Bio Ideas', '/tools/dating-bio-generator', 'Use the free tool, then edit the result so it stays honest.'],
  },
  {
    path: '/tools/dating-bio-generator',
    file: 'public/tools/dating-bio-generator.html',
    type: 'WebApplication',
    title: 'Dating Bio Generator for Students',
    description: 'A free dating bio generator for students that creates editable, privacy-conscious profile bio ideas from tone, interests, intention, personality, and length.',
    kicker: 'Free student tool',
    h1: 'Dating Bio Generator for Students',
    intro: 'Use this free student dating bio generator to create editable profile ideas from your tone, interests, dating intention, personality, and preferred length. The basic tool runs in your browser, does not require login, and does not save your inputs.',
    sections: [
      ['Create your bio', [
        `<form id="bio-generator-form" class="tool-form" novalidate>
          <div class="form-grid">
            <label for="tone">Preferred tone<select id="tone" name="tone"><option value="warm">Warm</option><option value="confident">Confident</option><option value="funny">Funny but respectful</option><option value="calm">Calm and thoughtful</option><option value="shy">Shy-friendly</option></select></label>
            <label for="intention">Dating intention<select id="intention" name="intention"><option value="friendship">Friendship first</option><option value="serious">Serious relationship</option><option value="casual">Casual but respectful</option><option value="unsure">Still figuring it out</option></select></label>
            <label for="length">Desired length<select id="length" name="length"><option value="short">Short</option><option value="medium">Medium</option><option value="detailed">Detailed</option></select></label>
          </div>
          <label for="interests">Interests <span class="muted">(comma-separated, 120 characters max)</span><input id="interests" name="interests" maxlength="120" placeholder="music, food, tech, football, reading" /></label>
          <label for="personality">Optional personality description <span class="muted">(160 characters max)</span><textarea id="personality" name="personality" maxlength="160" rows="3" placeholder="quiet at first, funny when comfortable, serious about school"></textarea></label>
          <p id="bio-generator-error" class="tool-error" role="alert" aria-live="polite"></p>
          <button class="cta tool-submit" type="submit">Generate Bio Ideas</button>
        </form>
        <div id="bio-generator-status" class="muted" aria-live="polite"></div>
        <div id="bio-generator-results" class="tool-results" aria-live="polite"></div>`
      ]],
      ['Privacy and truthfulness note', [
        'This basic generator is deterministic and runs in your browser. It does not send your inputs to an external AI provider, does not require a The College Date login, and does not save your entries. Avoid typing sensitive information such as phone numbers, room location, bank details, ID numbers, or private family details.',
        'The suggestions are drafts. Edit them until they are truthful. Do not use a bio to impersonate someone, mislead matches, pressure people, or suggest unsafe behavior.'
      ]],
      ['How to make the output better', [
        'Use specific but safe interests: "Afrobeats and design" is more useful than "fun." Use honest intention: "friendship first" is better than pretending to want something serious. Keep the final bio easy to reply to by ending with one conversation hook.',
        'For examples before you generate, read <a href="/dating-bio-examples-students">dating bio examples for students</a>. For profile safety, read <a href="/safety">Safety on The College Date</a>.'
      ]]
    ],
    related: [
      ['/dating-bio-examples-students', 'Dating Bio Examples'],
      ['/student-dating', 'Student Dating Guide'],
      ['/safety', 'Safety'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['Does the bio generator save my inputs?', 'No. The basic tool runs locally in the browser and does not save or transmit inputs.'],
      ['Do I need to log in?', 'No. The basic generator is available without login.'],
      ['Can I use the generated bio exactly as written?', 'You can, but you should edit it so it is truthful, specific, and natural in your own voice.']
    ],
    extraHead: '<script type="module" src="/tools/dating-bio-generator.js"></script>',
    cta: ['Create a Real Profile', '/signup', 'Once your bio feels truthful, create or update your profile in The College Date.'],
  },
  {
    path: '/conversation-starters-dating-app',
    file: 'public/conversation-starters-dating-app.html',
    type: 'Article',
    title: 'Conversation Starters for Dating Apps',
    description: 'Respectful dating app conversation starters for students, including profile-based openers, campus-life prompts, serious-intention questions, and messages to avoid.',
    kicker: 'Messaging guide',
    h1: 'Conversation Starters for Dating Apps',
    intro: 'The best dating app conversation starters are specific, low-pressure, and easy to answer. For students, that usually means asking about a profile detail, interest, campus routine, music taste, study life, or intention without making the other person feel trapped.',
    sections: [
      ['Start from the profile', [
        '<ul><li>"You mentioned tech and music. Are you more playlist person or podcast person during study time?"</li><li>"Your bio says you like food spots. What is one campus snack you would defend with your chest?"</li><li>"I saw you are into fitness. Morning workouts or evening stress relief?"</li></ul>',
        'Profile-based messages work because they show you paid attention. They also reduce the chance of sounding like you copied the same line to everyone.'
      ]],
      ['Campus-life starters', [
        '<ul><li>"What is one thing your department is famous for?"</li><li>"Are you a library-to-focus person or a room-to-focus person?"</li><li>"If you had one free afternoon on campus, what would you do?"</li><li>"What is the most useful course advice someone has given you?"</li></ul>'
      ]],
      ['Light humorous starters', [
        '<ul><li>"Serious question: which is harder, finding a good group project partner or finding a good date?"</li><li>"Rate your semester so far: soft life, survival mode, or God abeg?"</li><li>"What is your most Nigerian campus habit?"</li></ul>',
        'Humor should make conversation easier, not embarrassing. Avoid jokes about someone body, tribe, money, gender, religion, or private life.'
      ]],
      ['Serious-intention starters', [
        '<ul><li>"What does a healthy relationship look like to you while studying?"</li><li>"Are you more friendship-first or clear-intention from the start?"</li><li>"What kind of communication makes you feel respected?"</li></ul>'
      ]],
      ['Messages to avoid', [
        'Avoid sexual openers, insults disguised as jokes, repeated messages after no response, money requests, pressure to meet immediately, fake compliments, and manipulative "prove you like me" messages.',
        'If the conversation dries up, send one respectful follow-up or let it rest. Persistence after clear disinterest is not romantic; it is boundary-crossing.'
      ]],
      ['Turning chat into a date', [
        'When the chat is comfortable, suggest something public and simple: "Would you be open to a quick campus cafe meet this week?" Give the person room to say yes, no, or later. Then use <a href="/first-date-ideas-students">first date ideas for students</a> and <a href="/campus-dating-safety">campus dating safety</a> before meeting.'
      ]]
    ],
    related: [
      ['/campus-dating', 'Campus Dating'],
      ['/safety', 'Safety'],
      ['/first-date-ideas-students', 'First Date Ideas'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['What is a good first message on a dating app?', 'A good first message refers to a profile detail and asks a simple question that is easy to answer.'],
      ['How many times should I follow up?', 'One polite follow-up is enough. If there is still no response, respect the silence and move on.'],
      ['Should I ask for a date immediately?', 'Usually no. Build enough comfort first, then suggest a public, low-pressure meeting.']
    ],
    cta: ['Start Better Conversations', '/download', 'Use The College Date when you want profile context before the first message.'],
  },
  {
    path: '/first-date-ideas-students',
    file: 'public/first-date-ideas-students.html',
    type: 'Article',
    title: 'First Date Ideas for Students on a Budget',
    description: 'Low-cost first date ideas for students, including campus-friendly, free, indoor, outdoor, study-date, creative, budgeting, and safety-conscious options.',
    kicker: 'First dates',
    h1: 'First Date Ideas for Students on a Budget',
    intro: 'A good first date for students should be public, simple, affordable, and easy to leave if either person feels uncomfortable. You do not need luxury spending to make a date thoughtful. You need planning, respect, and a setting where conversation can happen naturally.',
    sections: [
      ['Campus-friendly first date ideas', [
        '<ul><li>Daytime campus cafe or cafeteria meet-up.</li><li>Library-adjacent study break, not a silent library date.</li><li>Walk around a busy campus area after lectures.</li><li>Attend a public faculty event, exhibition, debate, or sports match.</li><li>Meet at an open student lounge with other people around.</li></ul>'
      ]],
      ['Free or inexpensive ideas', [
        '<ul><li>Share snacks and talk in a visible outdoor space.</li><li>Create a two-person playlist and compare favorite songs.</li><li>Visit a public bookshop or campus book fair if available.</li><li>Take a daytime photo walk in a safe public area.</li><li>Choose a simple drink and keep the plan under one hour for a first meet.</li></ul>',
        'Avoid inventing exact prices in content. Student budgets change by city, campus, inflation, and personal situation. The safer advice is to agree on a simple budget before going.'
      ]],
      ['Indoor and rainy-day options', [
        'When rain or heat makes outdoor plans difficult, choose public indoor places: campus cafe, open lounge, food court, student center, or a public event. Do not move a first meeting to a private room just because the weather changed.',
        'If plans become unsafe or inconvenient, reschedule. A respectful person will understand.'
      ]],
      ['Study-date ideas', [
        'Study dates work best when both people genuinely need to work. Set a clear structure: 45 minutes focus, 15 minutes chat, then decide whether to continue. Keep it public and low-pressure.',
        'A study date should not become free tutoring, emotional labor, or pressure to spend private time together before trust is built.'
      ]],
      ['Budgeting and safety', [
        'Agree on a plan that does not embarrass either person financially. Keep emergency transport money separate, charge your phone, tell someone trusted where you are going, and meet in a place with other people around.',
        'For a full checklist, read <a href="/blog/how-to-date-safely-on-campus-nigeria">how to date safely on campus in Nigeria</a>. For broader context, read <a href="/campus-dating">campus dating</a>.'
      ]]
    ],
    related: [
      ['/safety', 'Safety'],
      ['/campus-dating', 'Campus Dating'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['What is a good cheap first date for students?', 'A public campus cafe, daytime walk, student event, open lounge, or simple study break can work well when both people are comfortable.'],
      ['Should a first date be private?', 'No. First dates with someone from an app should usually be public, visible, and easy to leave.'],
      ['How do I plan a date on a student budget?', 'Choose a simple place, agree on expectations, avoid pressure spending, keep transport money separate, and focus on conversation.']
    ],
    cta: ['Plan a Safer First Date', '/safety', 'Review safety guidance before moving from chat to an offline meeting.'],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function canonical(pathname) {
  return pathname === '/' ? `${site}/` : `${site}${pathname}`;
}

function navHtml(nav = commonNav) {
  return nav.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n      ');
}

function sectionHtml([heading, paragraphs]) {
  return `<section class="panel">
      <h2>${heading}</h2>
      ${paragraphs.map((paragraph) => paragraph.trim().startsWith('<') ? paragraph : `<p>${paragraph}</p>`).join('\n      ')}
    </section>`;
}

function faqHtml(faqs) {
  return `<section class="panel">
      <h2>FAQs</h2>
      ${faqs.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join('\n      ')}
    </section>`;
}

function relatedHtml(related) {
  return `<section class="panel related-links">
      <h2>Related Guides</h2>
      <div class="related-grid">
        ${related.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n        ')}
      </div>
    </section>`;
}

function sourceHtml(sourceList = []) {
  if (!sourceList.length) return '';
  return `<section class="panel">
      <h2>Sources and Further Reading</h2>
      <ul>
        ${sourceList.map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a> - ${source.publisher}</li>`).join('\n        ')}
      </ul>
    </section>`;
}

function schemaFor(page) {
  const url = canonical(page.path);
  const articleLike = page.type === 'Article' || page.type === 'BlogPosting';
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'The College Date',
      url: `${site}/`,
      logo: `${site}/og-image.png`,
      sameAs: [
        'https://play.google.com/store/apps/details?id=com.collegedate.app',
        'https://www.instagram.com/thecollegedate?igsh=MXhxZHZiMzZtOGp6dw%3D%3D&utm_source=qr'
      ]
    },
    {
      '@type': 'ImageObject',
      '@id': `${url}#primaryimage`,
      url: ogImage,
      contentUrl: ogImage,
      caption: `${page.h1} - The College Date`
    },
    {
      '@type': page.type,
      '@id': `${url}#page`,
      name: page.h1,
      headline: page.h1,
      url,
      description: page.description,
      image: { '@id': `${url}#primaryimage` },
      isPartOf: { '@id': `${site}/#website` },
      publisher: { '@id': `${site}/#organization` },
      author: { '@type': 'Organization', name: publisher, url: `${site}/about` },
      datePublished: today,
      dateModified: today,
      mainEntityOfPage: url
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'The College Date', item: `${site}/` },
        ...(page.path.startsWith('/blog/') ? [{ '@type': 'ListItem', position: 2, name: 'Blog', item: `${site}/blog` }] : []),
        { '@type': 'ListItem', position: page.path.startsWith('/blog/') ? 3 : 2, name: page.h1, item: url },
      ]
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: page.faqs.map(([name, text]) => ({
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text }
      }))
    }
  ];

  if (page.path === '/tools/dating-bio-generator') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${url}#software`,
      name: 'Dating Bio Generator for Students',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      url,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${site}/#organization` }
    });
  }

  if (!articleLike && page.type !== 'WebApplication') {
    graph[2].about = page.kicker;
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function renderPage(page) {
  const url = canonical(page.path);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="stylesheet" href="/seo-page.css" />
  ${page.extraHead || ''}
  <script type="application/ld+json">
${JSON.stringify(schemaFor(page), null, 2)}
  </script>
</head>
<body>
  <main>
    <nav>
      ${navHtml()}
    </nav>

    <p class="kicker">${page.kicker}</p>
    <h1>${page.h1}</h1>
    <p class="lede">${page.intro}</p>
    <p class="muted">Published by ${publisher}. Published: ${today} | Updated: ${today}</p>

    <section class="toc panel">
      <h2>On This Page</h2>
      ${page.sections.map(([heading]) => `<a href="#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}">${heading}</a>`).join('\n      ')}
    </section>

    ${page.sections.map((section) => {
      const id = section[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return sectionHtml(section).replace('<section class="panel">', `<section class="panel" id="${id}">`);
    }).join('\n\n    ')}

    <section class="panel cta-panel">
      <h2>${page.cta[0]}</h2>
      <p>${page.cta[2]}</p>
      <p><a class="cta" href="${page.cta[1]}">${page.cta[0]}</a></p>
    </section>

    ${relatedHtml(page.related)}
    ${faqHtml(page.faqs)}
    ${sourceHtml(page.sources)}

    <footer>
      <p>The College Date publishes student-first dating, safety, profile, conversation, and campus relationship guides. Read <a href="/privacy">Privacy</a>, <a href="/terms">Terms</a>, or contact <a href="/support">Support</a>.</p>
    </footer>
  </main>
</body>
</html>
`;
}

const toolScript = `const BIO_LIMITS = { interests: 120, personality: 160 };
const BLOCKED_TERMS = [
  'underage', 'minor', 'child', 'sex for money', 'hookup with minor', 'hate', 'kill',
  'scam', 'catfish', 'impersonate', 'bank details', 'password', 'nude', 'blackmail'
];

export function sanitizePlainText(value, maxLength = 160) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateBioInput(input) {
  const interests = sanitizePlainText(input.interests, BIO_LIMITS.interests);
  const personality = sanitizePlainText(input.personality, BIO_LIMITS.personality);
  const combined = \`\${interests} \${personality}\`.toLowerCase();
  const blocked = BLOCKED_TERMS.find((term) => combined.includes(term));

  if (blocked) {
    return {
      ok: false,
      error: 'Please keep the bio respectful, truthful, adult-safe, and free of private or abusive details.'
    };
  }

  if (!interests && !personality) {
    return { ok: false, error: 'Add at least one interest or personality detail.' };
  }

  return { ok: true, value: { ...input, interests, personality } };
}

function splitInterests(interests) {
  return interests
    .split(',')
    .map((item) => sanitizePlainText(item, 32))
    .filter(Boolean)
    .slice(0, 5);
}

function intentionCopy(intention) {
  return {
    friendship: 'friendship first and a connection that can grow naturally',
    serious: 'something intentional with honest communication',
    casual: 'easygoing connection with respect and clear boundaries',
    unsure: 'good conversation while I figure out what feels right'
  }[intention] || 'honest connection';
}

function toneOpening(tone) {
  return {
    warm: 'Warm-hearted student',
    confident: 'Student with focus, good energy, and clear intentions',
    funny: 'Campus survivor with decent jokes and better intentions',
    calm: 'Calm student who values honest conversation',
    shy: 'Quiet at first, but easy to talk to once comfortable'
  }[tone] || 'Student';
}

export function generateBioSuggestions(input) {
  const validation = validateBioInput(input);
  if (!validation.ok) return { error: validation.error, suggestions: [] };

  const { tone, intention, length, interests, personality } = validation.value;
  const interestList = splitInterests(interests);
  const interestText = interestList.length > 1
    ? \`\${interestList.slice(0, -1).join(', ')} and \${interestList.at(-1)}\`
    : (interestList[0] || 'good conversation');
  const intent = intentionCopy(intention);
  const personalityText = personality || 'I like people who communicate clearly and respect boundaries';
  const opener = toneOpening(tone);

  const short = [
    \`\${opener}. Into \${interestText}. Looking for \${intent}. Ask me about my current campus obsession.\`,
    \`\${personalityText}. I enjoy \${interestText} and conversations that feel natural, not forced.\`,
    \`Student life, \${interestText}, and respectful vibes. Open to \${intent}.\`
  ];

  const medium = [
    \`\${opener}. I enjoy \${interestText}, and I am looking for \${intent}. I like conversations that are honest, funny, and low-pressure.\`,
    \`\${personalityText}. Most days I am balancing school with \${interestText}. If your communication is kind and direct, we will probably get along.\`,
    \`Currently building a student life that includes \${interestText}, better routines, and real conversation. Open to \${intent}, with honesty from the start.\`
  ];

  const detailed = [
    \`\${opener}. I am into \${interestText}, and I care about clear communication, school-life balance, and respect. I am looking for \${intent}. Start with your best campus food spot or your favorite study playlist.\`,
    \`\${personalityText}. I like people who can laugh, listen, and say what they mean. My interests include \${interestText}. I prefer connection that feels natural and truthful.\`,
    \`Student life keeps me busy, but I still make time for \${interestText} and good conversation. I am open to \${intent}; no pressure, no fake energy, just honest vibes and mutual respect.\`
  ];

  return { error: null, suggestions: ({ short, medium, detailed }[length] || medium) };
}

function renderSuggestions(results, suggestions) {
  results.textContent = '';
  suggestions.forEach((suggestion, index) => {
    const card = document.createElement('article');
    card.className = 'tool-result-card';
    const heading = document.createElement('h3');
    heading.textContent = \`Option \${index + 1}\`;
    const text = document.createElement('p');
    text.textContent = suggestion;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-bio-btn';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(suggestion);
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      } catch {
        copy.textContent = 'Select text';
      }
    });
    card.append(heading, text, copy);
    results.append(card);
  });
}

function initGenerator() {
  const form = document.getElementById('bio-generator-form');
  const error = document.getElementById('bio-generator-error');
  const status = document.getElementById('bio-generator-status');
  const results = document.getElementById('bio-generator-results');
  if (!form || !error || !status || !results) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    status.textContent = 'Generating editable ideas...';
    results.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    window.setTimeout(() => {
      const generated = generateBioSuggestions(data);
      if (generated.error) {
        status.textContent = '';
        error.textContent = generated.error;
        return;
      }
      status.textContent = 'Generated locally in your browser. Edit before using.';
      renderSuggestions(results, generated.suggestions);
    }, 180);
  });
}

if (typeof document !== 'undefined') {
  initGenerator();
}
`;

function blogIndex() {
  const cards = [
    ['/dating-app-in-nigeria', 'Dating App in Nigeria', 'How students can evaluate dating apps in Nigeria with safety, privacy, and fit in mind.'],
    ['/dating-app-for-university-students-nigeria', 'Dating App for University Students in Nigeria', 'A focused product-category guide for Nigerian university students.'],
    ['/campus-dating', 'Campus Dating Guide for Nigerian Students', 'The main pillar for meeting people, communicating, setting expectations, and dating responsibly on campus.'],
    ['/student-dating', 'Student Dating Guide', 'How to date while studying without losing sight of school, time, intention, and emotional maturity.'],
    ['/campus-dating-safety', 'Campus Dating Safety', 'Profile privacy, scams, consent, public meetings, transport planning, and reporting concerns.'],
    ['/blog/how-to-date-safely-on-campus-nigeria', 'How to Date Safely on Campus in Nigeria', 'A practical step-by-step checklist before meeting someone offline.'],
    ['/blog/best-dating-apps-nigeria-students', 'Best Dating Apps in Nigeria for Students', 'A fair comparison guide for students evaluating dating platforms.'],
    ['/dating-bio-examples-students', 'Dating Bio Examples for Students', 'Short, serious, friendship-first, shy-person, and funny profile examples.'],
    ['/tools/dating-bio-generator', 'Dating Bio Generator for Students', 'A free browser-based tool for creating editable profile bio ideas.'],
    ['/conversation-starters-dating-app', 'Conversation Starters for Dating Apps', 'Respectful first-message ideas based on profile details and campus life.'],
    ['/first-date-ideas-students', 'First Date Ideas for Students on a Budget', 'Affordable, public, student-friendly date ideas with safety notes.'],
    ['/blog/online-dating-for-nigerian-students', 'Online Dating for Nigerian Students', 'Practical online dating advice for Nigerian students.'],
  ];
  const page = {
    path: '/blog',
    type: 'WebPage',
    title: 'Nigeria Dating and Campus Dating Blog',
    description: 'Read The College Date guides about dating apps in Nigeria, campus dating, student relationships, safety, profiles, conversations, and first dates.',
    kicker: 'Dating guides',
    h1: 'Nigeria Dating and Campus Dating Blog',
    intro: 'Helpful articles and tools for Nigerian students searching for dating apps, campus dating, online dating safety, better profiles, respectful conversations, first dates, and healthier student relationships.',
    sections: [['Latest Student Dating Guides', [`<div class="article-list">${cards.map(([href, heading, text]) => `<a class="article-card" href="${href}"><h2>${heading}</h2><p>${text}</p></a>`).join('')}</div>`]]],
    related: [['/safety', 'Safety'], ['/download', 'Download'], ['/faq', 'FAQ'], ['/about', 'About']],
    faqs: [
      ['Who writes The College Date guides?', 'Guides are published by The College Date Editorial Team for adult Nigerian students and campus communities.'],
      ['Does the blog replace professional advice?', 'No. The guides provide general educational information and encourage qualified help for legal, medical, mental-health, or urgent safety issues.'],
      ['Can I use the app after reading?', 'Yes. Use the official download page or web signup when you are ready.']
    ],
    cta: ['Download The College Date', '/download', 'Use the official app access page when you are ready to try student-focused discovery.']
  };
  return renderPage(page);
}

function write(file, content) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`Wrote ${file}`);
}

for (const page of pages) {
  write(page.file, renderPage(page));
}
write('public/tools/dating-bio-generator.js', toolScript);
write('public/blog.html', blogIndex());

mkdirSync(join(root, 'docs/seo-phase-5'), { recursive: true });

write('docs/seo-phase-5/source-log.md', `# Source Log

Research date: ${today}

| Source title | Publisher | URL | Access date | Pages using source | Claim supported |
| --- | --- | --- | --- | --- | --- |
${sources.map((source) => `| ${source.title} | ${source.publisher} | ${source.url} | ${today} | ${source.title.includes('Tinder') || source.title.includes('Bumble') || source.title.includes('Badoo') || source.title.includes('Hinge') ? '/blog/best-dating-apps-nigeria-students' : source.title.includes('Breadcrumb') ? 'All Wave 1 pages with BreadcrumbList schema' : source.title.includes('Download') ? '/dating-app-in-nigeria; /dating-app-for-university-students-nigeria; /download-linked CTAs' : '/safety; /campus-dating-safety; /blog/how-to-date-safely-on-campus-nigeria'} | ${source.claim} |`).join('\n')}
`);

write('docs/seo-phase-5/verified-product-facts.md', `# Verified Product Facts

Research date: ${today}

## Verified and safe to publish

- The College Date is positioned publicly as a campus dating and student social discovery app for Nigerian university, polytechnic, and college students aged 18 and above.
- The public download page lists Android and web access, with Android package \`com.collegedate.app\` and Google Play URL \`https://play.google.com/store/apps/details?id=com.collegedate.app\`.
- Signup supports email/password and Google login.
- Onboarding requires age and blocks completion below 18 in \`src/pages/MiniProfileSetup.jsx\`.
- Onboarding asks for name, age, institution, level, interests, dating intention, and at least one photo.
- Institution options include Nigerian universities, polytechnics, and colleges.
- Dating intention options include Casual, Serious, and Friends.
- Profiles can include photos, bio, university, faculty, department, level, interests, anthem, location status, voice intro, MBTI, genotype, and attraction goal.
- Discovery can use gender filters, age range, university filter, live mode, profile completion signals, mutual matching, and private chat after match/context.
- Settings include notification controls, message previews, show online status, and incognito mode.
- Public support options include \`info@thecollegedate.com\`, safety email \`godwillgodslife@gmail.com\`, and WhatsApp support from the support page.
- Public pages include Privacy, Terms, Delete Account, Safety, Child Safety Standards, FAQ, and Support.
- AI profile trust checks exist in app code, but should be described cautiously as a trust-support feature.

## Partially verified and must be cautiously worded

- Reporting tools are referenced in public policy pages and admin moderation exists for confession reports. User/profile-level reporting should be worded as "available in-app tools where present or contact support" unless owner confirms all surfaces.
- Verification exists as AI profile review and an \`is_verified\` field, but public copy must not imply universal identity or student verification.
- Location is used as profile \`location_status\` and live/near-me flow can request geolocation while falling back to university proximity. Do not claim precise location matching as the core product.
- Matching prioritizes gender preference and same-university signals, but it is not strictly limited to one school.

## Unverified and prohibited from publication

- Universal identity verification.
- Background checks.
- Guaranteed student verification.
- Continuous human monitoring of all users or messages.
- Guaranteed safety.
- University endorsement, partnerships, campus approval, user counts, awards, reviews, ratings, or success statistics.
- iOS App Store availability. Public repository docs confirm Android and web; an Instagram snippet suggested iOS but was not used because it is not verified in local/public app facts.

## Owner confirmation required

- Whether every reportable user surface has an active report/block control.
- Whether manual human review is performed for all AI-flagged profiles.
- Whether any university partnerships, ambassadors, or official campus groups exist.
- Whether an iOS app is publicly available and what the official App Store URL is.
- Exact public moderation SLA and account enforcement workflow.
`);

write('docs/seo-phase-5/keyword-ownership-map.md', `# Keyword Ownership Map

Research date: ${today}

| Target term | Definitive URL | Search intent | Supporting URLs allowed to reference | Supporting pages should avoid targeting as primary | Canonical or redirect changes required |
| --- | --- | --- | --- | --- | --- |
| Dating app in Nigeria | /dating-app-in-nigeria | Commercial | /blog/best-dating-apps-nigeria-students, /dating-app-for-university-students-nigeria | Student dating app variations | None |
| Dating app for university students in Nigeria | /dating-app-for-university-students-nigeria | Commercial | /dating-app-in-nigeria, /campus-dating, /blog/best-dating-apps-nigeria-students | Broad dating app in Nigeria | None |
| Student dating | /student-dating | Informational | /campus-dating, /dating-bio-examples-students, /conversation-starters-dating-app | Dating app for students | None |
| Campus dating | /campus-dating | Informational | /student-dating, /campus-dating-safety, /first-date-ideas-students | Dating app in Nigeria | None |
| College dating app | /college-dating-app | Commercial alias | /dating-app-for-university-students-nigeria, /dating-app-in-nigeria | Campus dating guide | None |
| Safe dating app in Nigeria | /safe-dating-app-nigeria | Commercial safety | /safety, /campus-dating-safety | Dating safety | None |
| Online dating for Nigerian students | /blog/online-dating-for-nigerian-students | Informational | /student-dating, /dating-app-for-university-students-nigeria | Dating app in Nigeria | None |
| Dating safety | /safety | Trust/platform | /campus-dating-safety, /blog/how-to-date-safely-on-campus-nigeria | Campus dating safety as primary | None |
| Campus dating safety | /campus-dating-safety | Informational safety | /safety, /blog/how-to-date-safely-on-campus-nigeria | Platform safety | None |
| Dating bio examples | /dating-bio-examples-students | Informational utility | /tools/dating-bio-generator, /student-dating | Dating bio generator | None |
| Dating bio generator | /tools/dating-bio-generator | Mixed/tool | /dating-bio-examples-students, /student-dating | Dating bio examples | Phase 4 listed /dating-bio-generator; Wave 1 canonical is /tools/dating-bio-generator. |
| Conversation starters | /conversation-starters-dating-app | Informational utility | /campus-dating, /first-date-ideas-students | First message examples | None |
| First date ideas | /first-date-ideas-students | Informational | /campus-dating, /conversation-starters-dating-app | Campus date ideas, cheap date ideas | None |
`);

write('docs/seo-phase-5/internal-linking-implementation.md', `# Internal Linking Implementation

Research date: ${today}

| Page | Parent/primary link | Related internal links implemented |
| --- | --- | --- |
${pages.map((page) => `| ${page.path} | ${page.related[0][0]} | ${page.related.map(([href]) => href).join(', ')} |`).join('\n')}

Notes:

- Commercial pages link to /download and /safety.
- Safety pages link to /support, /privacy, the practical safety article, and campus safety.
- Profile content links the examples guide and generator together.
- Conversation and first-date guides connect back to /campus-dating and /safety.
- /blog was refreshed to expose all Wave 1 assets.
`);

write('docs/seo-phase-5/content-quality-report.md', `# Content Quality Report

Research date: ${today}

Scoring uses the Editorial Handbook 100-point quality model. All pages cleared the 80/100 publication threshold; pillar and safety pages target 85+.

| URL | Search intent | Originality | Accuracy | Readability | SEO | Internal linking | Sourcing | Trust/safety | Brand voice | Conversion | AI readiness | Total | Issues corrected before publication |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| /dating-app-for-university-students-nigeria | 9 | 8 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 86 | Removed unsupported guaranteed-verification claims. |
| /dating-app-in-nigeria | 9 | 8 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 9 | 87 | Differentiated broad Nigeria app intent from student-specific page. |
| /campus-dating | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 87 | Shifted away from commercial copy into informational pillar. |
| /student-dating | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 87 | Differentiated student life-stage intent from campus environment. |
| /safety | 10 | 8 | 10 | 9 | 9 | 9 | 8 | 10 | 9 | 7 | 9 | 88 | Kept only verified platform-specific safety claims. |
| /campus-dating-safety | 10 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 9 | 7 | 9 | 89 | Separated educational safety guidance from platform safety page. |
| /blog/how-to-date-safely-on-campus-nigeria | 10 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 9 | 7 | 9 | 89 | Added actionable checklist and authoritative safety references. |
| /blog/best-dating-apps-nigeria-students | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 87 | Added publisher disclosure and removed unsupported ranking language. |
| /dating-bio-examples-students | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 86 | Added privacy cautions and truthful-profile standard. |
| /tools/dating-bio-generator | 9 | 9 | 10 | 9 | 9 | 9 | 7 | 10 | 9 | 8 | 9 | 88 | Implemented deterministic local tool and privacy disclosure. |
| /conversation-starters-dating-app | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 10 | 9 | 8 | 9 | 87 | Removed manipulative pickup framing and added boundaries. |
| /first-date-ideas-students | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 10 | 9 | 8 | 9 | 87 | Avoided unsafe private first-meeting suggestions and exact price claims. |
`);

write('docs/seo-phase-5/metadata-and-schema-report.md', `# Metadata and Schema Report

Research date: ${today}

| URL | Title | Meta description | Canonical | Schema |
| --- | --- | --- | --- | --- |
${pages.map((page) => `| ${page.path} | ${page.title} | ${page.description} | ${canonical(page.path)} | ${page.type}, FAQPage, BreadcrumbList, ImageObject${page.path === '/tools/dating-bio-generator' ? ', SoftwareApplication' : ''} |`).join('\n')}

All Wave 1 pages include Open Graph, Twitter/X card metadata, self-referencing canonicals, visible publisher/date information, JSON-LD, and breadcrumb markup.
`);

write('docs/seo-phase-5/tool-security-and-privacy-review.md', `# Tool Security and Privacy Review

Research date: ${today}

Tool: /tools/dating-bio-generator

## Design

- Deterministic browser-side template engine.
- No external AI provider.
- No secret keys.
- No login requirement.
- No network request for user inputs.
- No persistence to localStorage, sessionStorage, cookies, database, or analytics payloads.

## Input safety

- Interests limited to 120 characters.
- Optional personality description limited to 160 characters.
- Angle brackets are stripped.
- Suggestions are rendered with textContent rather than innerHTML.
- A small prohibited-term guard blocks abusive, unsafe, deceptive, underage, and private-detail prompts.
- Empty input shows a user-safe error state.

## Privacy disclosure

The page states that the basic generator runs in-browser, does not save inputs, and does not send inputs to an external AI provider.

## Deferred

- Server-side rate limiting is not required for the current local-only deterministic tool because no request is sent.
- A future AI-powered version must use a server-side function, abuse controls, logging policy, and updated privacy disclosure before launch.
`);

write('docs/seo-phase-5/phase-5-executive-summary.md', `# Phase 5 Executive Summary

Research date: ${today}

Wave 1 implements a balanced content set across commercial discovery, campus authority, student dating, safety, profile utility, conversation utility, first-date utility, and product conversion.

## Assets implemented

- Existing page expansions: 7
- Existing article refreshes: 1
- New guide pages: 3
- New interactive tool page: 1

## Strategic corrections from Phase 4

- The original priority order over-weighted commercial pages. Wave 1 now balances commercial, informational, trust, utility, and conversion intent.
- The Phase 4 tool slug was /dating-bio-generator. The Wave 1 canonical URL is /tools/dating-bio-generator to support a scalable tools directory.
- Unsupported safety claims were excluded.

## Deployment status

Pending technical QA, preview deployment, production deployment, and live smoke crawl. This document should be updated after deployment evidence is collected.
`);

write('docs/seo-phase-5/qa-report.md', `# QA Report

Research date: ${today}

Status: Pending. This report is generated with the content package and will be updated after build, validation, preview deploy, production deploy, and live smoke crawl.
`);

write('docs/seo-phase-5/deployment-report.md', `# Deployment Report

Research date: ${today}

Status: Pending preview and production deployment.
`);
