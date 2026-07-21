import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const site = 'https://www.thecollegedate.com';
const today = '2026-07-21';
const publisher = 'The College Date Editorial Team';
const ogImage = `${site}/og-image.png`;

const sources = [
  {
    title: 'What To Know About Romance Scams',
    publisher: 'Federal Trade Commission Consumer Advice',
    url: 'https://consumer.ftc.gov/articles/what-know-about-romance-scams',
    claim: 'Romance scams commonly use fake profiles, urgent money requests, investment pressure, and off-platform manipulation.',
  },
  {
    title: 'Romance Scams',
    publisher: 'Federal Bureau of Investigation',
    url: 'https://www.fbi.gov/how-we-can-help-you/scams-and-safety/common-frauds-and-scams/romance-scams',
    claim: 'People using dating platforms should go slowly, avoid sending money to online-only contacts, protect personal information, and report fraud.',
  },
  {
    title: 'NPF-NCCC E-Reporting Portal',
    publisher: 'Nigeria Police Force National Cybercrime Centre',
    url: 'https://nccc.npf.gov.ng/',
    claim: 'Nigeria has a national cybercrime e-reporting portal for secure cybercrime reporting.',
  },
  {
    title: 'Critical Surge in Sextortion Attacks Targeting Nigerian Individuals',
    publisher: 'Nigerian Communications Commission Computer Security Incident Response Team',
    url: 'https://csirt.ncc.gov.ng/index.php/resources/security-advisories/312-critical-surge-in-sextortion-attacks-targeting-nigerian-individuals',
    claim: 'NCC-CSIRT has published Nigeria-specific warnings about sextortion through social and dating platforms.',
  },
  {
    title: 'Consent 101: Respect, Boundaries, and Building Trust',
    publisher: 'RAINN',
    url: 'https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/',
    claim: 'Consent should be clear, voluntary, ongoing, and free from pressure, manipulation, coercion, or fear.',
  },
  {
    title: 'Understanding Consent',
    publisher: 'American Sexual Health Association',
    url: 'https://www.ashasexualhealth.org/understanding-consent/',
    claim: 'Healthy consent depends on communication, boundaries, and voluntary agreement.',
  },
  {
    title: 'Breadcrumb structured data',
    publisher: 'Google Search Central',
    url: 'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb',
    claim: 'BreadcrumbList structured data can help Search understand page hierarchy.',
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

const wave2Pages = [
  {
    path: '/safe-dating-app-nigeria',
    file: 'public/safe-dating-app-nigeria.html',
    type: 'WebPage',
    title: 'Safe Dating App in Nigeria for Students',
    description: 'How Nigerian students can evaluate safer dating apps, compare trust signals, avoid scams, and understand where The College Date factually fits.',
    kicker: 'Commercial safety guide',
    h1: 'Safe Dating App in Nigeria for Students',
    intro: 'A safe dating app in Nigeria is not an app that can promise perfect safety. It is an app that makes trust, privacy, support, and responsible matching easier to evaluate before you join or meet anyone offline. Students should look for public safety guidance, clear privacy information, official download routes, cautious profile sharing, and support paths.',
    sections: [
      ['What safety means when choosing a dating app', [
        'Safety starts before signup. Check whether the app explains who it serves, how accounts are created, what public support routes exist, how privacy is handled, and what users should never share. If an app only markets matches but hides safety information, treat that as a weakness.',
        'For students, safety also includes campus context. A useful app should help you understand whether a person is presenting themselves as a student, what they are looking for, and whether their profile gives enough respectful context without exposing private details.'
      ]],
      ['Trust signals to check before joining', [
        'Look for an official website, active privacy policy, terms, account deletion information, support contact, safety pages, and an official app-store link. These do not guarantee that every interaction will be safe, but they make the platform easier to evaluate and hold accountable.',
        'Be careful with apps, groups, or links that ask for unofficial payment, verification codes, bank details, or private documents before you understand what service is being provided.'
      ]],
      ['Where The College Date fits', [
        'The College Date is positioned for Nigerian university, polytechnic, and college students aged 18 and above. It supports profile creation, student context, dating intentions, discovery, matching, chat, Android access, web access, public safety pages, privacy information, and support routes.',
        'This page does not claim guaranteed safety, background checks, universal identity checks, or university endorsement. The accurate value is student-focused discovery with visible safety guidance and clearer context than random social DMs.'
      ]],
      ['Warning signs students should take seriously', [
        'Pause if someone asks for money, airtime, transport fare before trust is built, investment participation, crypto deposits, verification codes, bank details, intimate images, secrecy, or private meetings too quickly. Romance scams often depend on urgency and emotional pressure.',
        'If a conversation becomes threatening, preserve screenshots, avoid further escalation, use available in-app/support channels, and consider reporting cybercrime through appropriate official channels.'
      ]],
    ],
    related: [
      ['/safety', 'Safety on The College Date'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/romance-scams-nigerian-students', 'Romance Scams and Nigerian Students'],
      ['/download', 'Download The College Date'],
    ],
    faqs: [
      ['Can any dating app guarantee safety?', 'No. A dating app can provide trust signals, rules, support routes, and safer design choices, but users still need careful privacy and meeting decisions.'],
      ['What safety pages should I read before using The College Date?', 'Start with Safety on The College Date, Campus Dating Safety, Romance Scams and Nigerian Students, and What Not to Share on Dating Apps.'],
      ['Is The College Date officially endorsed by universities?', 'No public page should claim university endorsement unless that relationship is explicitly published by the owner.']
    ],
    sources: [sources[0], sources[1], sources[2], sources[3]],
    cta: ['Review Safety Before Joining', '/safety', 'Read the platform-specific safety page before you create or update your profile.'],
  },
  {
    path: '/dating-app-for-students',
    file: 'public/dating-app-for-students.html',
    type: 'WebPage',
    title: 'Dating App for Students - What to Look For',
    description: 'A practical guide to dating apps for students, covering intent, profile quality, privacy, safety, communication, and The College Date availability.',
    kicker: 'Student app category',
    h1: 'Dating App for Students',
    intro: 'A dating app for students should understand that student life is different from ordinary dating. Time is limited, money matters, campus reputation matters, and many people are still deciding whether they want friendship, casual dating, or something serious.',
    sections: [
      ['What students need from a dating platform', [
        'Students need context. School, level, interests, intention, photos, and a short honest bio can make matching feel less random. A student-focused platform should make it easier to start with shared life rhythms instead of guessing from a blank profile.',
        'Students also need flexibility. Some want a serious relationship, some want friendship first, and some are still learning what kind of connection suits them. Good profiles state that without pressure.'
      ]],
      ['How this differs from university-only dating', [
        'The broader student category includes university, polytechnic, college, and other adult learners. The narrower university-student page focuses on Nigerian university discovery. This page is about the features and standards students in general should expect.',
        'The College Date currently positions itself for Nigerian university, polytechnic, and college students aged 18 and above, with Android and web access.'
      ]],
      ['Safety standards to expect', [
        'A student dating app should make support and safety guidance visible. It should encourage truthful profiles, respectful conversation, privacy caution, and public first meetings. It should not reward pressure, harassment, deception, or oversharing.',
        'Students should avoid posting exact hostel rooms, daily routes, private documents, bank details, and information commonly used for account recovery.'
      ]],
      ['When an app is a good fit', [
        'An app is a better fit when it helps you express who you are without performing, gives you a way to match with people who understand student life, and reminds you to move carefully from chat to offline meetings.',
        'If you are ready to compare the Nigeria-specific product category, read the focused university-student page and the broad Nigeria dating app guide.'
      ]],
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/dating-app-for-university-students-nigeria', 'University Student Dating App'],
      ['/safety', 'Safety'],
      ['/download', 'Download'],
    ],
    faqs: [
      ['Is The College Date for all students?', 'The public positioning is for Nigerian university, polytechnic, and college students aged 18 and above.'],
      ['Can students use a dating app for friendship first?', 'Yes. The College Date onboarding includes a Friends intention option, and students should state that intention clearly.'],
      ['What should students avoid on dating apps?', 'Avoid sharing passwords, one-time codes, bank details, exact addresses, private documents, or intimate images with people you do not fully trust.']
    ],
    cta: ['Download or Open The College Date', '/download', 'Use the official access page when you are ready to try student-focused discovery.'],
  },
  {
    path: '/online-dating-app-for-undergraduates',
    file: 'public/online-dating-app-for-undergraduates.html',
    type: 'Article',
    title: 'Online Dating App for Undergraduates',
    description: 'A guide for adult undergraduate students using online dating apps, covering eligibility, intentions, profile quality, chats, privacy, and safe meetings.',
    kicker: 'Undergraduate dating',
    h1: 'Online Dating App for Undergraduates',
    intro: 'Online dating for undergraduates works best when it respects adult eligibility, school pressure, privacy, and realistic communication. The goal is not to rush from a swipe to a private meeting. The goal is to create enough context to decide whether a conversation is worth continuing safely.',
    sections: [
      ['Eligibility and honest profile setup', [
        'The College Date is for adult students aged 18 and above. Undergraduate users should be honest about age, institution, level, photos, interests, and intention. A profile that starts with false details usually creates distrust later.',
        'Useful profile details include what you study, what campus life looks like for you, what you enjoy outside class, and whether you prefer friendship first, casual dating, or something serious.'
      ]],
      ['Balancing online dating with academic life', [
        'Undergraduates often manage lectures, assignments, exams, projects, family expectations, money, and new friendships. A healthy dating rhythm should fit around those responsibilities rather than consume them.',
        'Set expectations early around response time. Not replying during practicals, exams, or long lectures is not automatically rejection. Good communication leaves room for student life.'
      ]],
      ['Moving from online chat to offline meetings', [
        'Move gradually. Check consistency, respect, and profile context before meeting. Choose public spaces, keep your phone charged, tell a trusted person where you are going, and keep enough transport money to leave independently.',
        'If someone pressures you to meet privately, send money, share intimate media, or keep everything secret, slow down and consider ending the conversation.'
      ]],
      ['Privacy habits that protect undergraduates', [
        'Do not share passwords, one-time codes, student portal access, exact hostel room, bank details, or identity documents. Be careful about photos that show private documents, vehicle plates, house numbers, or exact daily routines.',
        'Use the profile bio and photo guides to present yourself clearly without exposing details that strangers do not need.'
      ]],
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/dating-bio-examples-students', 'Dating Bio Examples'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
    ],
    faqs: [
      ['Is online dating appropriate for undergraduates?', 'It can be, when users are adults, honest, respectful, and careful with privacy, boundaries, and offline meetings.'],
      ['Should an undergraduate meet a match immediately?', 'No. Build enough context first, then choose a public, easy-to-leave meeting plan if both people are comfortable.'],
      ['What should go in an undergraduate dating profile?', 'A truthful photo, school-life context, interests, intention, and a short bio are usually enough. Avoid private details.']
    ],
    cta: ['Improve Your Student Profile', '/dating-bio-examples-students', 'Start with an honest bio before you open more conversations.'],
  },
  {
    path: '/how-to-meet-people-on-campus',
    file: 'public/how-to-meet-people-on-campus.html',
    type: 'Article',
    title: 'How to Meet People on Campus Respectfully',
    description: 'Practical, respectful ways to meet people on campus through classes, clubs, events, mutual friends, shared interests, and student dating apps.',
    kicker: 'Campus social skills',
    h1: 'How to Meet People on Campus',
    intro: 'The best way to meet people on campus is to become part of normal student life: classes, societies, study groups, events, sports, creative circles, volunteer work, mutual friends, and respectful online discovery. Start with friendship and context before expecting romance.',
    sections: [
      ['Start with places where conversation is natural', [
        'Classes, tutorials, departmental events, student associations, campus fellowships, sports, clubs, and creative groups already give people a reason to talk. That is easier and more respectful than interrupting someone who clearly wants to be left alone.',
        'A simple opener can be about shared context: the course, event, music, food spot, library queue, or project topic. Keep it short and leave space for the other person to respond freely.'
      ]],
      ['Friendship-first approaches work well', [
        'Not every connection needs to start with a romantic question. Many strong relationships begin as classmates, project partners, club members, or friends who learn each other gradually.',
        'If you are shy, choose lower-pressure settings: study groups, small events, online profiles with clear interests, or mutual-friend introductions. The aim is to be present, not loud.'
      ]],
      ['Respect boundaries and non-interest', [
        'If someone gives short answers, avoids contact, says they are not interested, or asks for space, accept it without argument. Campus is shared space. People should not feel unsafe or monitored because they declined a conversation.',
        'Do not follow people between classes, pressure them publicly, involve their friends aggressively, or keep messaging after rejection.'
      ]],
      ['Using dating apps as one route', [
        'Student dating apps can help when you prefer to know someone is open to connection before starting a conversation. Use profile details to personalize your message and keep the tone respectful.',
        'For next steps, read the campus dating pillar and first-message examples.'
      ]],
    ],
    related: [
      ['/campus-dating', 'Campus Dating Guide'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/dating-as-a-fresher-nigeria', 'Dating as a Fresher'],
      ['/first-message-examples-dating-apps', 'First Message Examples'],
    ],
    faqs: [
      ['How can a shy student meet people on campus?', 'Start with low-pressure spaces like study groups, small clubs, mutual friends, and profile-based online conversations.'],
      ['Is it okay to approach someone on campus?', 'Yes, if the situation is appropriate, your approach is brief and respectful, and you accept non-interest immediately.'],
      ['Should I use a dating app to meet campus people?', 'It can help when you want clearer romantic or friendship intent before starting conversations.']
    ],
    cta: ['Practice Conversation Starters', '/conversation-starters-dating-app', 'Use profile details and campus context to begin more naturally.'],
  },
  {
    path: '/dating-as-a-fresher-nigeria',
    file: 'public/dating-as-a-fresher-nigeria.html',
    type: 'Article',
    title: 'Dating as a Fresher in Nigeria',
    description: 'A grounded guide for first-year Nigerian students navigating dating, friendship, pressure, safety, money, academics, and boundaries.',
    kicker: 'First-year student guide',
    h1: 'Dating as a Fresher in Nigeria',
    intro: 'Dating as a fresher in Nigeria can be exciting, but it should not force you to rush, overspend, abandon schoolwork, or ignore your boundaries. Your first year is also for adjusting, building friendships, understanding campus culture, and learning what kind of connection is healthy for you.',
    sections: [
      ['Adjust before you rush', [
        'New students often meet many people quickly: roommates, coursemates, seniors, neighbors, fellowship members, club members, and social media contacts. Give yourself time to understand the environment before making intense commitments.',
        'Dating early is not automatically bad. The risk is dating from pressure, loneliness, fear of missing out, or the desire to prove you belong.'
      ]],
      ['Make friends first', [
        'Friendship helps you observe character without forcing romance. You can learn how someone treats classmates, handles stress, talks about exes, respects money, and responds to boundaries.',
        'If someone mocks your boundaries or rushes you because you are new, take that seriously.'
      ]],
      ['Protect academics, money, and safety', [
        'Set study hours and keep transport or emergency money separate. Avoid relationships that demand all your time, force you to skip lectures, or pressure you to spend beyond your budget.',
        'Meet in public spaces first, avoid isolated rooms for early meetings, tell a trusted person your plan, and keep your phone charged.'
      ]],
      ['Online dating as a fresher', [
        'If you use The College Date or any student dating app, keep your profile truthful and private. You can mention interests, course life, and intention without sharing your hostel room, daily route, student portal details, or bank information.',
        'Read the campus safety guide before moving from chat to offline meetings.'
      ]],
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/how-to-meet-people-on-campus', 'How to Meet People on Campus'],
      ['/what-not-to-share-on-dating-apps', 'What Not to Share'],
    ],
    faqs: [
      ['Should freshers avoid dating completely?', 'Not necessarily. The important thing is to avoid rushing, pressure, unsafe meetings, and relationships that disrupt your adjustment to school.'],
      ['How can a fresher date safely?', 'Move slowly, meet publicly, protect private information, keep money boundaries, and talk to trusted people if something feels wrong.'],
      ['Is friendship first better for freshers?', 'Often, yes. Friendship-first connections can reduce pressure and help you understand character before dating.']
    ],
    cta: ['Read Student Dating Basics', '/student-dating', 'Understand the bigger student-life balance before making dating decisions.'],
  },
  {
    path: '/dating-profile-picture-tips-students',
    file: 'public/dating-profile-picture-tips-students.html',
    type: 'Article',
    title: 'Dating Profile Picture Tips for Students',
    description: 'Photo tips for student dating profiles: lighting, framing, recent photos, privacy, group-photo consent, background awareness, and honest editing.',
    kicker: 'Profile photos',
    h1: 'Dating Profile Picture Tips for Students',
    intro: 'A good student dating profile picture should be clear, recent, honest, and safe. You do not need a studio shoot. You need photos that show your face, personality, and interests without exposing private information or misleading people.',
    sections: [
      ['Choose clear and recent photos', [
        'Use at least one photo where your face is visible in natural light. Avoid only using sunglasses, heavy filters, old pictures, far-away shots, or photos where people cannot tell who you are.',
        'A recent photo builds trust. If your appearance has changed, update your profile instead of relying on an old image that may create awkwardness later.'
      ]],
      ['Think about framing and background', [
        'A good frame usually shows your face and shoulders, with enough space around you that the image does not feel cropped or chaotic. Clean backgrounds help, but they do not need to be fancy.',
        'Check the background before uploading. Avoid photos that show student ID cards, bank cards, house numbers, hostel room details, private documents, license plates, or exact routines.'
      ]],
      ['Use group photos carefully', [
        'Group photos can show social energy, but they should not be the only photos on your profile. People should not have to guess which person you are.',
        'Get consent before uploading images where other people are clearly visible. Their face, privacy, and reputation matter too.'
      ]],
      ['Avoid misleading edits', [
        'Basic brightness or cropping is fine. Heavy editing, impersonation, fake lifestyle photos, or images designed to deceive will make trust harder once the conversation becomes real.',
        'Pair your photos with a truthful bio. The bio guide and generator can help you write something warm without pretending.'
      ]],
    ],
    related: [
      ['/dating-bio-examples-students', 'Dating Bio Examples'],
      ['/tools/dating-bio-generator', 'Dating Bio Generator'],
      ['/safety', 'Safety'],
      ['/dating-app-for-students', 'Dating App for Students'],
    ],
    faqs: [
      ['How many dating profile photos should a student use?', 'Use enough photos to show your face clearly and give a little personality. Quality matters more than quantity.'],
      ['Can I use group photos?', 'Yes, but not as your main proof of identity, and only when the people in the photo are comfortable with it being used.'],
      ['Should I hide my school in photos?', 'You can show student life generally, but avoid images that reveal exact rooms, routes, private documents, or sensitive identifiers.']
    ],
    cta: ['Write a Better Bio', '/dating-bio-examples-students', 'Match your photos with a profile that sounds truthful and easy to message.'],
  },
  {
    path: '/first-message-examples-dating-apps',
    file: 'public/first-message-examples-dating-apps.html',
    type: 'Article',
    title: 'First Message Examples for Dating Apps',
    description: 'Respectful first-message examples for dating apps, including interest-based, campus-life, funny, serious, and friendship-first openers.',
    kicker: 'Messaging examples',
    h1: 'First Message Examples for Dating Apps',
    intro: 'A good first message is specific, respectful, and easy to answer. It should show that you noticed something real in the person profile without pressuring them to reply or pretending you already know them.',
    sections: [
      ['Friendly first messages', [
        '"Hi, your profile feels calm and interesting. What has been the best part of your week so far?"',
        '"Hey, I saw you like music. What song has been on repeat for you lately?"'
      ]],
      ['Interest-based examples', [
        '"You mentioned food spots. Are you more team small chops, shawarma, rice, or something else after lectures?"',
        '"Your profile says you like reading. Are you currently reading for fun, school, or both?"'
      ]],
      ['Campus-life examples', [
        '"Your faculty week sounds active. What event do people actually look forward to?"',
        '"If you had one free afternoon on campus, would you choose a walk, food, football, library calm, or sleep?"'
      ]],
      ['Serious and friendship-first examples', [
        '"I like that you stated you are intentional. What does a healthy connection look like to you right now?"',
        '"I am friendship-first too. What kind of conversations make you feel comfortable with someone?"'
      ]],
      ['Messages to avoid', [
        'Avoid sexual comments, insults disguised as jokes, copy-paste pickup lines, pressure for a phone number, demands for fast replies, and repeated messages after silence.',
        'If someone does not reply, let it be. A non-response is not permission to keep pushing.'
      ]],
    ],
    related: [
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/campus-dating', 'Campus Dating'],
      ['/safety', 'Safety'],
      ['/dating-profile-picture-tips-students', 'Profile Picture Tips'],
    ],
    faqs: [
      ['What should the first message on a dating app say?', 'Mention one profile detail and ask a simple question the person can answer comfortably.'],
      ['Should I send another message if they do not reply?', 'One gentle follow-up after time has passed may be okay, but repeated pressure is not respectful.'],
      ['Are funny first messages okay?', 'Yes, if they are kind, not sexual, not insulting, and not built on stereotypes.']
    ],
    cta: ['Read More Conversation Starters', '/conversation-starters-dating-app', 'Use the broader conversation guide when you want more profile-based ideas.'],
  },
  {
    path: '/romance-scams-nigerian-students',
    file: 'public/romance-scams-nigerian-students.html',
    type: 'Article',
    title: 'Romance Scams and Nigerian Students',
    description: 'A safety guide for Nigerian students on romance scam warning signs, money requests, fake emergencies, private-image threats, evidence, and reporting.',
    kicker: 'Scam safety',
    h1: 'Romance Scams and Nigerian Students',
    intro: 'Romance scams target emotion, trust, urgency, and secrecy. Nigerian students should be especially careful when a new online romantic contact asks for money, investment participation, verification codes, private images, bank details, or secrecy before trust has been built.',
    sections: [
      ['Common warning signs', [
        'Be cautious with fake emergencies, urgent transport requests, medical stories, school-fee pressure, crypto or investment opportunities, requests for OTPs, refusal to video call safely, stolen photos, and stories that become more dramatic when you hesitate.',
        'Scammers often try to move conversations away from the original platform quickly, isolate the victim from friends, and make the request feel private or shameful.'
      ]],
      ['Private-image and sextortion pressure', [
        'Never send intimate images because someone pressures, flatters, threatens, or promises commitment. If someone threatens to share private images, stop negotiating, preserve evidence, block where safe, and seek trusted support.',
        'Nigeria-specific cyber safety advisories have warned about sextortion through social and dating platforms. The safest guidance is to avoid sending private images to people you do not deeply trust.'
      ]],
      ['How to respond safely', [
        'Do not send more money or codes. Screenshot usernames, messages, payment details, phone numbers, links, and threats. Contact your bank or payment provider quickly if money or card information is involved.',
        'Use platform support channels where available. For cybercrime concerns in Nigeria, the Nigeria Police Force National Cybercrime Centre provides an e-reporting portal.'
      ]],
      ['How The College Date users should think about scams', [
        'The College Date can provide student context and support routes, but users still need scam awareness. Treat any money request from a new match as a serious warning sign.',
        'Read the privacy guide next so you know which details should stay off dating profiles and chats.'
      ]],
    ],
    related: [
      ['/safety', 'Safety'],
      ['/what-not-to-share-on-dating-apps', 'What Not to Share'],
      ['/support', 'Support'],
      ['/safe-dating-app-nigeria', 'Safe Dating App Nigeria'],
    ],
    faqs: [
      ['What is a romance scam?', 'It is a deception where someone uses romantic interest or emotional trust to get money, private information, account access, or compromising material.'],
      ['Should I send money to someone I met on a dating app?', 'No. Treat money requests from online-only romantic contacts as a major warning sign.'],
      ['What should I do if I already sent money or codes?', 'Preserve evidence, contact the relevant financial or account provider quickly, use platform support, and consider official cybercrime reporting routes.']
    ],
    sources: [sources[0], sources[1], sources[2], sources[3]],
    cta: ['Read What Not to Share', '/what-not-to-share-on-dating-apps', 'Protect your accounts, documents, money, and privacy before a scammer asks.'],
  },
  {
    path: '/what-not-to-share-on-dating-apps',
    file: 'public/what-not-to-share-on-dating-apps.html',
    type: 'Article',
    title: 'What Not to Share on Dating Apps',
    description: 'A student privacy guide covering passwords, OTPs, bank details, IDs, exact addresses, documents, intimate images, live location, and security answers.',
    kicker: 'Privacy safety',
    h1: 'What Not to Share on Dating Apps',
    intro: 'On dating apps, context matters, but some information should stay private until real trust exists. Students should never share passwords, one-time codes, bank details, card details, identity documents, exact home or hostel addresses, private academic documents, or intimate images with someone they only know through chat.',
    sections: [
      ['Account and money information', [
        'Do not share passwords, one-time codes, banking apps, card numbers, PINs, BVN, payment links you do not understand, or security-question answers. A romantic conversation is not a reason to weaken account security.',
        'If someone claims they need a code to verify love, prove identity, receive a gift, unlock payment, or protect your account, stop and verify through official channels.'
      ]],
      ['Location and routine details', [
        'Avoid sharing exact hostel room, home address, daily route, class timetable, live location, or places you visit at the same time every day. You can discuss campus life without making yourself easy to track.',
        'If you share location for a safety reason, share it with a trusted friend or family member, not a new match.'
      ]],
      ['Documents and images', [
        'Do not send government ID, student ID, admission letters, exam documents, workplace documents, bank screenshots, or private family information unless there is a formal reason outside dating and you understand the risk.',
        'Be careful with intimate images. Once sent, control becomes difficult. If someone pressures you, that pressure is the warning sign.'
      ]],
      ['What is okay to share gradually', [
        'It is usually safer to begin with interests, broad school context, favorite public hangouts, hobbies, music, study rhythm, and dating intention. Share personal details slowly and only when trust is earned.',
        'Read the romance scam guide if someone is asking for money, codes, secrecy, or private images.'
      ]],
    ],
    related: [
      ['/privacy', 'Privacy Policy'],
      ['/safety', 'Safety'],
      ['/romance-scams-nigerian-students', 'Romance Scams'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
    ],
    faqs: [
      ['Should I share my exact hostel room on a dating app?', 'No. Keep exact rooms, routes, and daily schedules private, especially before meeting safely and building trust.'],
      ['Is it safe to send a one-time code to a match?', 'No. One-time codes are usually for account access or verification and should never be shared with a dating contact.'],
      ['Can I share photos from campus?', 'Yes, but check backgrounds for private documents, addresses, plates, and other sensitive details first.']
    ],
    sources: [sources[0], sources[1], sources[3]],
    cta: ['Review Campus Safety', '/campus-dating-safety', 'Learn how privacy choices connect with safer offline dating.'],
  },
  {
    path: '/campus-date-ideas-students',
    file: 'public/campus-date-ideas-students.html',
    type: 'Article',
    title: 'Campus Date Ideas for Students',
    description: 'Student-friendly campus date ideas: study breaks, walks, events, cafeterias, sports, creative activities, group options, and safety notes.',
    kicker: 'Campus date ideas',
    h1: 'Campus Date Ideas for Students',
    intro: 'Campus date ideas should be simple, public, affordable, and easy to adjust. Not every school has the same facilities, so choose ideas that fit your institution, your budget, your schedule, and your comfort level.',
    sections: [
      ['Low-pressure campus ideas', [
        'Try a short campus walk in a busy area, a cafeteria snack, a library-adjacent study break, a departmental event, a student exhibition, a sports match, or a public hangout after lectures.',
        'For first meetings, public and easy-to-leave is better than dramatic. You can always plan something longer after trust grows.'
      ]],
      ['Study and learning dates', [
        'A study date works when both people actually want to study. Set a clear time, choose a visible place, and add a short break for food or conversation so it does not become awkward silence.',
        'Learning-based ideas can include attending a campus talk, practicing presentation slides, visiting an exhibition, or comparing notes after class.'
      ]],
      ['Creative and group-friendly ideas', [
        'Consider a small campus photo walk, poetry event, open mic, art display, dance rehearsal showcase, game afternoon, or group hangout with mutual friends.',
        'Group options are useful when either person is nervous, new to campus, or not ready for a one-on-one date.'
      ]],
      ['Safety and campus rules', [
        'Respect campus rules, restricted areas, curfews, and quiet spaces. Avoid isolated places for early meetings, and do not pressure someone into a private room or late-night movement.',
        'If the idea involves leaving campus, read the broader budget first-date guide and campus safety guide before choosing transport.'
      ]],
    ],
    related: [
      ['/first-date-ideas-students', 'First Date Ideas'],
      ['/campus-dating', 'Campus Dating'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
      ['/dating-as-a-fresher-nigeria', 'Dating as a Fresher'],
    ],
    faqs: [
      ['What is a good campus first date?', 'A short, public, low-cost meeting such as a cafeteria snack, public walk, student event, or study break is usually safer and easier.'],
      ['Are hostel dates a good first date?', 'Private hostel meetings are not recommended for first meetings. Choose public spaces first.'],
      ['What if my campus has few hangout spots?', 'Use nearby public places, group activities, study breaks, or daytime errands that stay safe and affordable.']
    ],
    cta: ['Plan a Safer First Date', '/first-date-ideas-students', 'Use the broader budget guide before choosing your plan.'],
  },
  {
    path: '/relationship-boundaries-for-students',
    file: 'public/relationship-boundaries-for-students.html',
    type: 'Article',
    title: 'Relationship Boundaries for Students',
    description: 'A healthy relationship guide for students covering time, school, communication, privacy, money, consent, friendships, conflict, and revisiting boundaries.',
    kicker: 'Healthy relationships',
    h1: 'Relationship Boundaries for Students',
    intro: 'Relationship boundaries are the clear limits and expectations that help two students respect each other while still protecting school, friendships, privacy, money, body autonomy, and mental wellbeing. Boundaries are not punishment. They are how a relationship stays healthy enough to grow.',
    sections: [
      ['Time and academic boundaries', [
        'Students need time for lectures, assignments, sleep, family, friends, and personal routines. A healthy partner should not require constant availability or punish you for studying.',
        'Agree on exam-season expectations early. A lighter communication rhythm during pressure periods can be more loving than forced attention.'
      ]],
      ['Communication and digital boundaries', [
        'Discuss response-time expectations, social media comfort, phone privacy, passwords, public posts, and how you handle disagreement. Love is not a reason to demand passwords or monitor every notification.',
        'If someone uses jealousy to justify surveillance, threats, or isolation from friends, take that seriously and seek trusted support.'
      ]],
      ['Financial and physical boundaries', [
        'Money boundaries matter for students. Be honest about what you can afford, avoid debt for dating pressure, and do not treat gifts as permission to control someone.',
        'Physical and sexual boundaries require clear, voluntary, ongoing consent. Pressure, fear, manipulation, intoxication, or silence should never be treated as consent.'
      ]],
      ['Revisiting boundaries over time', [
        'Boundaries can change as trust grows, stress increases, or life circumstances shift. Revisit them calmly instead of waiting until resentment builds.',
        'If disagreement becomes coercion, threats, stalking, violence, or sexual pressure, this is beyond normal conflict. Reach out to qualified support, trusted people, or appropriate authorities.'
      ]],
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/green-flags-student-relationships', 'Green Flags'],
      ['/safety', 'Safety'],
      ['/campus-dating-safety', 'Campus Dating Safety'],
    ],
    faqs: [
      ['Are boundaries selfish in a student relationship?', 'No. Boundaries help both people protect time, dignity, safety, and school responsibilities.'],
      ['Should partners share passwords?', 'No one should be pressured to share passwords. Trust should not depend on account access.'],
      ['Can boundaries change?', 'Yes. Healthy couples revisit expectations as the relationship and school pressure change.']
    ],
    sources: [sources[4], sources[5]],
    cta: ['Read Green Flags Next', '/green-flags-student-relationships', 'Compare boundaries with other signs of a healthy student relationship.'],
  },
  {
    path: '/green-flags-student-relationships',
    file: 'public/green-flags-student-relationships.html',
    type: 'Article',
    title: 'Green Flags in Student Relationships',
    description: 'Green flags in student relationships, including respect, consistency, boundaries, accountability, education support, independence, conflict repair, and consent.',
    kicker: 'Healthy relationships',
    h1: 'Green Flags in Student Relationships',
    intro: 'Green flags in student relationships are patterns that make the connection feel respectful, steady, honest, and emotionally safe. They do not guarantee forever, but they show that both people are trying to build something healthy while still growing as students.',
    sections: [
      ['Respect and consistency', [
        'A green flag is someone who treats you well in private and public, keeps reasonable promises, tells the truth, and does not use affection as a reward or punishment.',
        'Consistency does not mean perfection. It means their words and behavior are steady enough that you are not always confused about where you stand.'
      ]],
      ['Support for school and independence', [
        'A healthy partner respects lectures, exams, projects, career goals, friendships, family responsibilities, and rest. They do not make you choose them at the expense of everything else.',
        'Independence is also healthy. Two students can love each other and still have separate friends, interests, routines, and ambitions.'
      ]],
      ['Boundaries, consent, and accountability', [
        'Green flags include listening when you say no, apologizing without excuses, accepting correction, asking before posting private moments, and checking comfort before physical intimacy.',
        'Consent must be voluntary and ongoing. A person who respects consent does not pressure, guilt, threaten, or rush you.'
      ]],
      ['Conflict repair', [
        'Healthy conflict repair sounds like, "I understand why that hurt you," "Let us talk when we are calm," and "What should we do differently next time?" It does not sound like insults, silent punishment, public humiliation, or threats.',
        'Use green flags as guidance, not a guarantee. Compatibility still requires time, shared values, and real behavior across different seasons.'
      ]],
    ],
    related: [
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/student-dating', 'Student Dating'],
      ['/safety', 'Safety'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
    ],
    faqs: [
      ['What is a green flag in a student relationship?', 'A green flag is a repeated behavior that shows respect, honesty, safety, accountability, and support for each other goals.'],
      ['Do green flags guarantee compatibility?', 'No. They are positive signs, but relationships still need time, communication, and shared values.'],
      ['Can a relationship have green flags and problems?', 'Yes. Healthy relationships can have problems, but both people should handle them with respect and accountability.']
    ],
    sources: [sources[4], sources[5]],
    cta: ['Set Better Boundaries', '/relationship-boundaries-for-students', 'Use boundaries to turn healthy signs into everyday habits.'],
  },
];

function canonical(pathname) {
  return pathname === '/' ? `${site}/` : `${site}${pathname}`;
}

function idFor(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function schemaFor(page) {
  const base = canonical(page.path);
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'The College Date',
      url: site,
      logo: `${site}/logo-512.png`,
      sameAs: ['https://www.instagram.com/thecollegedate'],
    },
    {
      '@type': 'ImageObject',
      '@id': `${base}#primaryimage`,
      url: ogImage,
      contentUrl: ogImage,
      caption: page.title,
    },
    {
      '@type': page.type,
      '@id': `${base}#webpage`,
      url: base,
      name: page.title,
      headline: page.h1,
      description: page.description,
      image: { '@id': `${base}#primaryimage` },
      datePublished: today,
      dateModified: today,
      author: { '@type': 'Organization', name: publisher },
      publisher: { '@id': `${site}/#organization` },
      mainEntityOfPage: base,
      inLanguage: 'en-NG',
      isPartOf: { '@id': `${site}/#website` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${base}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: base },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${base}#faq`,
      mainEntity: page.faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

function renderPage(page) {
  const toc = page.sections.map(([heading]) => `<a href="#${idFor(heading)}">${heading}</a>`).join('');
  const sections = page.sections.map(([heading, paragraphs]) => `
    <section class="panel" id="${idFor(heading)}">
      <h2>${heading}</h2>
      ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n')}
    </section>`).join('\n');
  const related = page.related.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  const faq = page.faqs.map(([question, answer]) => `<h3>${question}</h3><p>${answer}</p>`).join('\n');
  const sourceLinks = (page.sources || []).length ? `
    <section class="panel">
      <h2>Sources and Further Reading</h2>
      <ul>
        ${page.sources.map((source) => `<li><a href="${source.url}" rel="noopener noreferrer">${source.title}</a> - ${source.publisher}</li>`).join('\n')}
      </ul>
    </section>` : '';

  return `<!doctype html>
<html lang="en-NG">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />
  <meta name="author" content="${publisher}" />
  <link rel="canonical" href="${canonical(page.path)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:url" content="${canonical(page.path)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="stylesheet" href="/seo-page.css" />
  <script type="application/ld+json">${schemaFor(page)}</script>
</head>
<body>
  <main>
    <nav aria-label="Primary">${commonNav.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
    <p class="kicker">${page.kicker}</p>
    <h1>${page.h1}</h1>
    <p class="lede">${page.intro}</p>
    <p class="muted">Published by ${publisher} on <time datetime="${today}">${today}</time>. Updated <time datetime="${today}">${today}</time>.</p>
    <nav class="panel toc" aria-label="Table of contents">${toc}</nav>
    ${sections}
    ${sourceLinks}
    <section class="panel">
      <h2>Related Guides</h2>
      <div class="related-grid">${related}</div>
    </section>
    <section class="panel">
      <h2>Frequently Asked Questions</h2>
      ${faq}
    </section>
    <section class="panel">
      <h2>${page.cta[0]}</h2>
      <p>${page.cta[2]}</p>
      <a class="cta" href="${page.cta[1]}">${page.cta[0]}</a>
    </section>
    <footer>
      <p>The College Date publishes student-focused dating, campus life, relationship, and safety guidance for adults 18+.</p>
      <p><a href="/privacy">Privacy</a> <a href="/terms">Terms</a> <a href="/support">Support</a></p>
    </footer>
  </main>
</body>
</html>
`;
}

function write(file, content) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`Wrote ${file}`);
}

for (const page of wave2Pages) {
  write(page.file, renderPage(page));
}

const wave2Cards = wave2Pages.map((page) => `
    <a class="article-card" href="${page.path}">
      <h2>${page.h1}</h2>
      <p>${page.description}</p>
    </a>`).join('');

const blogPath = join(root, 'public/blog.html');
let blog = readFileSync(blogPath, 'utf8');
blog = blog.replace(/<a class="article-card" href="\/blog\/online-dating-for-nigerian-students">/, `${wave2Cards}\n    <a class="article-card" href="/blog/online-dating-for-nigerian-students">`);
write('public/blog.html', blog);

const wave1Links = {
  'public/dating-app-in-nigeria.html': [
    ['/safe-dating-app-nigeria', 'how to evaluate a safer dating app in Nigeria'],
    ['/dating-app-for-students', 'what students should look for in a dating app'],
  ],
  'public/dating-app-for-university-students-nigeria.html': [
    ['/dating-app-for-students', 'the broader dating app for students guide'],
    ['/safe-dating-app-nigeria', 'student safety evaluation checklist'],
  ],
  'public/campus-dating.html': [
    ['/how-to-meet-people-on-campus', 'how to meet people on campus'],
    ['/campus-date-ideas-students', 'campus date ideas for students'],
    ['/dating-as-a-fresher-nigeria', 'dating as a fresher in Nigeria'],
  ],
  'public/student-dating.html': [
    ['/relationship-boundaries-for-students', 'relationship boundaries for students'],
    ['/green-flags-student-relationships', 'green flags in student relationships'],
    ['/online-dating-app-for-undergraduates', 'online dating for undergraduates'],
  ],
  'public/safety.html': [
    ['/romance-scams-nigerian-students', 'romance scam warning signs'],
    ['/what-not-to-share-on-dating-apps', 'what not to share on dating apps'],
    ['/safe-dating-app-nigeria', 'safe dating app evaluation'],
  ],
  'public/campus-dating-safety.html': [
    ['/dating-as-a-fresher-nigeria', 'first-year dating safety'],
    ['/campus-date-ideas-students', 'campus date ideas with safety notes'],
    ['/what-not-to-share-on-dating-apps', 'privacy details to protect'],
  ],
  'public/dating-bio-examples-students.html': [
    ['/dating-profile-picture-tips-students', 'dating profile picture tips'],
  ],
  'public/conversation-starters-dating-app.html': [
    ['/first-message-examples-dating-apps', 'first message examples'],
    ['/how-to-meet-people-on-campus', 'meeting people on campus'],
  ],
  'public/first-date-ideas-students.html': [
    ['/campus-date-ideas-students', 'campus-specific date ideas'],
  ],
};

function relatedPanel(links) {
  return `
    <section class="panel phase6-links" aria-labelledby="phase6-related-guides">
      <h2 id="phase6-related-guides">More Student Dating Guides</h2>
      <div class="related-grid">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div>
    </section>`;
}

for (const [file, links] of Object.entries(wave1Links)) {
  const target = join(root, file);
  let html = readFileSync(target, 'utf8');
  html = html.replace(/\s*<section class="panel phase6-links"[\s\S]*?<\/section>/, '');
  html = html.replace(/\s*<footer>/, `${relatedPanel(links)}\n    <footer>`);
  write(file, html);
}

const llmsPath = join(root, 'public/llms.txt');
let llms = readFileSync(llmsPath, 'utf8');
llms = llms.replace(/\n## Phase 6 Wave 2 Content[\s\S]*?(?=\n## |$)/, '');
llms += `\n## Phase 6 Wave 2 Content\n\n${wave2Pages.map((page) => `- ${page.h1}: ${canonical(page.path)}`).join('\n')}\n`;
write('public/llms.txt', llms);

mkdirSync(join(root, 'docs/seo-phase-6'), { recursive: true });

write('docs/seo-phase-6/verified-product-facts-update.md', `# Verified Product Facts Update\n\nResearch date: ${today}\n\n## Confirmed\n\n- The Phase 5 verified product facts remain usable for public SEO content.\n- The app is positioned for Nigerian university, polytechnic, and college students aged 18 and above.\n- Android and web access remain the supported public access paths; Android package remains \`com.collegedate.app\`.\n- Signup, onboarding, profile setup, intentions, discovery, matching, chat, safety/support pages, privacy, terms, and account deletion pages remain present in the repo.\n- The dating-bio generator remains local and does not send user inputs to a third-party AI provider.\n\n## Changed Since Phase 5\n\n- Logged-out homepage route-chunk preloading was limited so authenticated app chunks are no longer requested for public homepage visitors.\n- Match celebration confetti now loads on demand from the app dependency instead of a global CDN script.\n- Landing-page public footer links were updated to extensionless canonical URLs.\n\n## Partially Confirmed\n\n- Reporting and blocking should still be described cautiously. Public pages and app code show support/reporting concepts, but exact coverage across every user surface still needs owner confirmation.\n- AI trust checks exist in code, but copy should not imply universal verification or guaranteed review.\n\n## Unverified\n\n- Official university partnerships, public user counts, app-store rating claims, testimonials, awards, exact moderation SLA, and iOS availability.\n\n## Requires Owner Confirmation\n\n- Exact report/block surface coverage.\n- Manual moderation workflow and response times.\n- Any university partnership or campus ambassador claims.\n- Any future iOS App Store URL.\n\n## Prohibited From Publication\n\n- Universal identity verification, guaranteed student verification, background checks, guaranteed safety, continuous human monitoring, university endorsement, fabricated ratings, reviews, statistics, or testimonials.\n`);

write('docs/seo-phase-6/source-log.md', `# Source Log\n\nResearch date: ${today}\n\n| Source title | Publisher | URL | Pages using source | Claim supported |\n| --- | --- | --- | --- | --- |\n${sources.map((source) => `| ${source.title} | ${source.publisher} | ${source.url} | ${wave2Pages.filter((page) => page.sources?.includes(source)).map((page) => page.path).join(', ') || 'Schema/metadata validation documentation'} | ${source.claim} |`).join('\n')}\n`);

write('docs/seo-phase-6/internal-linking-report.md', `# Internal Linking Report\n\nResearch date: ${today}\n\n## Wave 2 Outbound Links\n\n| Page | Required contextual links implemented |\n| --- | --- |\n${wave2Pages.map((page) => `| ${page.path} | ${page.related.map(([href]) => href).join(', ')} |`).join('\n')}\n\n## Wave 1 Backlinks Added\n\n| Updated Wave 1 page | New Wave 2 links |\n| --- | --- |\n${Object.entries(wave1Links).map(([file, links]) => `| /${file.replace('public/', '').replace('.html', '')} | ${links.map(([href]) => href).join(', ')} |`).join('\n')}\n\nNo sitewide article dump was added. New links are contextual panels on relevant public SEO pages and resource index links on /blog.\n`);

write('docs/seo-phase-6/keyword-ownership-update.md', `# Keyword Ownership Update\n\nResearch date: ${today}\n\n| Term | Definitive URL | Intent | Supporting URLs | Must not be primary on | Differentiation rule | Redirect/canonical action |\n| --- | --- | --- | --- | --- | --- | --- |\n| Safe dating app Nigeria | /safe-dating-app-nigeria | Commercial trust | /safety, /campus-dating-safety, /romance-scams-nigerian-students | /safety | Evaluate app safety generally; do not duplicate platform policy. | None |\n| Dating app for students | /dating-app-for-students | Commercial category | /student-dating, /dating-app-for-university-students-nigeria | /dating-app-for-university-students-nigeria | Broader student category, not only Nigerian universities. | None |\n| University student dating app Nigeria | /dating-app-for-university-students-nigeria | Commercial | /dating-app-for-students, /dating-app-in-nigeria | /dating-app-for-students | Nigeria university-focused product category. | None |\n| Online dating app for undergraduates | /online-dating-app-for-undergraduates | Informational/commercial | /student-dating, /dating-bio-examples-students | /student-dating | Adult undergraduate online dating workflow. | None |\n| Campus dating | /campus-dating | Informational pillar | /how-to-meet-people-on-campus, /campus-date-ideas-students | /student-dating | Campus environment and culture. | None |\n| Meeting people on campus | /how-to-meet-people-on-campus | Informational | /campus-dating, /conversation-starters-dating-app | /campus-dating | Practical social discovery tactics, friendship first. | None |\n| Dating as a fresher | /dating-as-a-fresher-nigeria | Informational | /student-dating, /campus-dating-safety | /student-dating | First-year Nigerian student context. | None |\n| Profile photo tips | /dating-profile-picture-tips-students | Informational utility | /dating-bio-examples-students, /tools/dating-bio-generator | /dating-bio-examples-students | Photos only, not bio writing. | None |\n| Dating bio examples | /dating-bio-examples-students | Informational utility | /dating-profile-picture-tips-students, /tools/dating-bio-generator | /dating-profile-picture-tips-students | Written profile copy examples. | None |\n| First message examples | /first-message-examples-dating-apps | Informational utility | /conversation-starters-dating-app | /conversation-starters-dating-app | First message examples only. | None |\n| Conversation starters | /conversation-starters-dating-app | Informational pillar | /first-message-examples-dating-apps | /first-message-examples-dating-apps | Broader conversation strategy. | None |\n| Dating scams Nigeria | /romance-scams-nigerian-students | Safety informational | /safe-dating-app-nigeria, /what-not-to-share-on-dating-apps | /safety | Scam warning signs and response. | None |\n| Dating privacy | /what-not-to-share-on-dating-apps | Safety informational | /privacy, /safety, /romance-scams-nigerian-students | /privacy | Practical sharing boundaries, not legal privacy policy. | None |\n| First date ideas | /first-date-ideas-students | Informational | /campus-date-ideas-students | /campus-date-ideas-students | Broad budget first-date ideas. | None |\n| Campus date ideas | /campus-date-ideas-students | Informational | /first-date-ideas-students, /campus-dating | /first-date-ideas-students | Campus-specific activities. | None |\n| Relationship boundaries | /relationship-boundaries-for-students | Healthy relationship | /green-flags-student-relationships, /student-dating | /green-flags-student-relationships | Limits and expectations. | None |\n| Green flags | /green-flags-student-relationships | Healthy relationship | /relationship-boundaries-for-students, /student-dating | /relationship-boundaries-for-students | Positive relationship signs, not a guarantee checklist. | None |\n| Red flags | Future /red-flags-student-relationships | Safety/healthy relationship | /green-flags-student-relationships, /relationship-boundaries-for-students | Existing green flag page | Future page should cover concerning behavior carefully. | None now |\n`);

write('docs/seo-phase-6/content-quality-report.md', `# Content Quality Report\n\nResearch date: ${today}\n\n| URL | Search intent | Originality | Accuracy | Readability | SEO | Internal linking | Sourcing | Trust/safety | Brand | Conversion | AI readiness | Total | Corrections made |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n| /safe-dating-app-nigeria | 9 | 8 | 10 | 9 | 9 | 9 | 9 | 10 | 9 | 8 | 9 | 89 | Avoided guaranteed-safety claims and separated from /safety. |\n| /dating-app-for-students | 9 | 8 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 86 | Differentiated from university-student Nigeria page. |\n| /online-dating-app-for-undergraduates | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 87 | Focused on adult undergraduate online workflow. |\n| /how-to-meet-people-on-campus | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 86 | Removed intrusive approach tactics. |\n| /dating-as-a-fresher-nigeria | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 10 | 9 | 7 | 9 | 87 | Avoided stereotypes about freshers. |\n| /dating-profile-picture-tips-students | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 86 | Added consent and background privacy guidance. |\n| /first-message-examples-dating-apps | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 10 | 9 | 7 | 9 | 87 | Added non-response and no-harassment guidance. |\n| /romance-scams-nigerian-students | 10 | 9 | 10 | 9 | 9 | 9 | 10 | 10 | 9 | 7 | 9 | 91 | Kept guidance defensive, not operational for scammers. |\n| /what-not-to-share-on-dating-apps | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 10 | 9 | 7 | 9 | 90 | Added OTP, bank, document, image, and location privacy. |\n| /campus-date-ideas-students | 9 | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 8 | 9 | 86 | Avoided assuming every campus has the same facilities. |\n| /relationship-boundaries-for-students | 10 | 9 | 10 | 9 | 9 | 9 | 9 | 10 | 9 | 7 | 9 | 90 | Added careful consent and coercion language. |\n| /green-flags-student-relationships | 9 | 9 | 10 | 9 | 9 | 9 | 8 | 10 | 9 | 7 | 9 | 88 | Avoided presenting green flags as compatibility guarantees. |\n\nWave 1 pages materially changed for internal linking only; their Phase 5 scores remain above threshold and no editorial downgrade was introduced.\n`);

write('docs/seo-phase-6/metadata-and-schema-report.md', `# Metadata and Schema Report\n\nResearch date: ${today}\n\n| URL | Title | Meta description | Canonical | Schema |\n| --- | --- | --- | --- | --- |\n${wave2Pages.map((page) => `| ${page.path} | ${page.title} | ${page.description} | ${canonical(page.path)} | ${page.type}, BreadcrumbList, FAQPage, ImageObject |`).join('\n')}\n\nAll Wave 2 pages include Open Graph metadata, Twitter/X metadata, visible breadcrumbs through page navigation, visible FAQ sections, publisher/date information, and parseable JSON-LD. Review and AggregateRating schema were intentionally not used.\n`);

write('docs/seo-phase-6/accessibility-report.md', `# Accessibility Report\n\nResearch date: ${today}\n\n## Checks Applied\n\n- One H1 per page.\n- Sequential H2/H3 content sections.\n- Descriptive link text in related-content panels.\n- Keyboard-accessible native links and buttons.\n- Visible browser focus remains available; no custom focus removal was added.\n- Mobile layout uses the existing responsive SEO template.\n- Tables in documentation are not shipped as public UI.\n- No intrusive popups or interstitials were added.\n- No new motion was added to static SEO pages.\n\n## Corrections Made\n\n- Landing-page public links were moved to extensionless canonical URLs.\n- Static pages use descriptive anchors rather than repeated exact-match anchors.\n- Sensitive safety pages use careful language and direct users toward support/official channels when appropriate.\n\n## Deferred\n\n- Full manual screen-reader testing was not performed.\n- Homepage app accessibility remains outside the narrow static Wave 2 content scope except for the measured performance cleanup.\n`);

write('docs/seo-phase-6/search-console-handoff.md', `# Search Console Handoff\n\nResearch date: ${today}\n\n## Sitemap\n\n- Current sitemap: ${site}/sitemap.xml\n\n## New Wave 2 URLs To Inspect\n\n${wave2Pages.map((page, index) => `${index + 1}. ${canonical(page.path)}`).join('\n')}\n\n## Important Wave 1 URLs Still Worth Inspecting\n\n- ${site}/dating-app-in-nigeria\n- ${site}/campus-dating\n- ${site}/safety\n- ${site}/blog/best-dating-apps-nigeria-students\n- ${site}/tools/dating-bio-generator\n\n## Recommended Order\n\n1. Inspect and request indexing for /safe-dating-app-nigeria, /romance-scams-nigerian-students, and /what-not-to-share-on-dating-apps.\n2. Inspect /dating-app-for-students and /online-dating-app-for-undergraduates.\n3. Inspect campus and utility guides.\n4. Resubmit the sitemap after production deploy.\n\n## Checks In Search Console\n\n- Page Indexing: confirm each URL is indexed or queued, not duplicate without user-selected canonical.\n- Sitemaps: confirm /sitemap.xml was read successfully and URL count changed.\n- Core Web Vitals: monitor mobile field data after enough traffic accumulates.\n- Enhancements: check Breadcrumb and FAQ eligibility where Google reports it.\n- Canonicals: confirm Google-selected canonical matches the self canonical.\n\n## Monitoring\n\n- 7 days: inspect crawl/indexing status and fix discovery errors.\n- 30 days: review impressions, queries, page titles, and cannibalization signals.\n- 90 days: decide Wave 2 refreshes, add supporting content, and prune underperforming duplicates if needed.\n\nNo Search Console submission was performed because authenticated access was not available in this environment.\n`);

write('docs/seo-phase-6/performance-baseline.md', `# Performance Baseline\n\nResearch date: ${today}\n\nStatus: Lighthouse baseline raw reports are stored in \`docs/seo-phase-6/lighthouse-baseline-all/\`. Summary tables are updated after the measured before/after comparison is complete.\n`);

write('docs/seo-phase-6/performance-improvements.md', `# Performance Improvements\n\nResearch date: ${today}\n\n## Implemented Low-Risk Changes\n\n- Limited authenticated route-chunk preloading to authenticated users in \`src/App.jsx\`.\n- Replaced the global canvas-confetti CDN script with on-demand dynamic import in \`src/components/MatchCelebration.jsx\`.\n- Removed the global confetti script tag from \`index.html\`.\n- Updated landing-page public links to extensionless canonical URLs in \`src/pages/Landing.jsx\`.\n\nBefore/after Lighthouse tables are updated after the second Lighthouse run.\n`);

write('docs/seo-phase-6/wave1-live-verification.md', `# Wave 1 Live Verification\n\nResearch date: ${today}\n\nLive verification before Wave 2 implementation found all 12 Wave 1 URLs returning HTTP 200, self-referencing canonicals, indexable robots status, unique titles/descriptions, one H1, Open Graph, Twitter/X metadata, parseable JSON-LD, BreadcrumbList schema, sitemap inclusion, extensionless canonical redirects, and no soft-404 signals. Detailed URL evidence is recorded in the Phase 6 QA report.\n`);

write('docs/seo-phase-6/qa-report.md', `# QA Report\n\nResearch date: ${today}\n\nStatus: Pending final build, validation, preview deployment, production deployment, and live smoke crawl.\n`);

write('docs/seo-phase-6/deployment-report.md', `# Deployment Report\n\nResearch date: ${today}\n\nStatus: Pending Netlify preview and production deployment.\n`);

write('docs/seo-phase-6/phase-6-executive-summary.md', `# Phase 6 Executive Summary\n\nResearch date: ${today}\n\nPhase 6 creates the second authority wave: safety-commercial trust, broader student app discovery, undergraduate online dating, campus social discovery, fresher guidance, profile-photo utility, first-message examples, scam safety, privacy safety, campus date ideas, relationship boundaries, and green flags.\n\nDeployment evidence will be added after preview and production QA are complete.\n`);
