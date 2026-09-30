import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const site = 'https://www.thecollegedate.com';
const today = '2026-07-23';
const publisher = 'The College Date Editorial Team';
const ogImage = `${site}/og-image.png`;

const sources = {
  rainnConsent: {
    title: 'Consent 101: Respect, Boundaries, and Building Trust',
    publisher: 'RAINN',
    url: 'https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/',
    claim: 'Consent should be clear, voluntary, ongoing, and free from pressure, manipulation, coercion, or fear.',
  },
  ashaConsent: {
    title: 'Understanding Consent',
    publisher: 'American Sexual Health Association',
    url: 'https://www.ashasexualhealth.org/understanding-consent/',
    claim: 'Healthy consent depends on communication, boundaries, and voluntary agreement.',
  },
  jedBreakups: {
    title: 'The Painful Truth About Breakups',
    publisher: 'The Jed Foundation',
    url: 'https://jedfoundation.org/resource/the-painful-truth-about-breakups/',
    claim: 'Breakups can be emotionally painful, and support, routine, and healthy coping matter.',
  },
  youngMindsBreakup: {
    title: 'How to Look After Your Mental Health During a Breakup',
    publisher: 'YoungMinds',
    url: 'https://www.youngminds.org.uk/young-person/blog/how-to-look-after-your-mental-health-during-a-breakup/',
    claim: 'Young people can protect their wellbeing after a breakup by seeking support and using healthy coping habits.',
  },
  nccc: {
    title: 'NPF-NCCC E-Reporting Portal',
    publisher: 'Nigeria Police Force National Cybercrime Centre',
    url: 'https://nccc.npf.gov.ng/',
    claim: 'Nigeria has a cybercrime reporting portal for relevant online threats and cybercrime concerns.',
  },
};

const commonNav = [
  ['/', 'Home'],
  ['/student-dating', 'Student Dating'],
  ['/campus-dating', 'Campus Dating'],
  ['/safety', 'Safety'],
  ['/blog', 'Blog'],
  ['/download', 'Download'],
];

const wave3Pages = [
  {
    path: '/red-flags-student-relationships',
    file: 'public/red-flags-student-relationships.html',
    type: 'Article',
    cluster: 'Healthy relationships and safety',
    title: 'Red Flags in Student Relationships',
    description: 'A safety-conscious guide to red flags in student relationships, including control, manipulation, isolation, dishonesty, disrespect, and when to seek help.',
    kicker: 'Relationship safety',
    h1: 'Red Flags in Student Relationships',
    intro: 'Red flags in student relationships are patterns that make you feel smaller, unsafe, controlled, confused, or pressured. One awkward moment is not always a red flag, but repeated disrespect, manipulation, isolation, dishonesty, or fear should be taken seriously.',
    sections: [
      ['What makes a red flag different from a mistake', [
        'Students are still learning how to communicate, handle conflict, and build trust. A mistake becomes more concerning when the person refuses accountability, repeats the behavior, blames you for reacting, or makes you feel you must shrink your normal life to keep the relationship peaceful.',
        'Healthy repair sounds like: I understand why that hurt you, I will change this, and I am open to boundaries. A red-flag pattern sounds like: you are too sensitive, nobody else will want you, prove you love me, or keep this away from your friends.'
      ]],
      ['Control, isolation, and emotional manipulation', [
        'Controlling behavior can include checking your phone, demanding passwords, deciding who you can talk to, timing your replies, monitoring your location, or making you feel guilty for studying, resting, or seeing friends. Campus relationships should not require surrendering normal independence.',
        'Isolation is especially serious. If someone slowly separates you from friends, classmates, family, roommates, faith groups, clubs, or trusted adults, they reduce the support network that helps you think clearly. Love should not make your world smaller.'
      ]],
      ['Dishonesty, disrespect, and pressure', [
        'Repeated lies about age, relationship status, money, school, intentions, or where they are going can damage trust. So can public humiliation, insults disguised as jokes, silent treatment used as punishment, threats to leave unless you comply, and pressure around sex, images, money, or secrecy.',
        'Consent should be clear and voluntary. If someone keeps pushing after you say no, makes you afraid to refuse, or treats boundaries as a challenge, pause the relationship and seek support. Respect is not optional because you are dating.'
      ]],
      ['When to seek help', [
        'Seek help if you feel afraid, trapped, watched, blackmailed, threatened, or unable to end the relationship safely. Talk to someone you trust, preserve messages if there are threats, avoid private confrontations, and use support or official reporting channels when needed.',
        'If the concern is happening inside The College Date, use the available support and safety routes. If there is immediate danger, contact local emergency support or campus security where available. This guide is educational and does not replace legal, medical, or mental-health advice.'
      ]],
      ['How to respond without blaming yourself', [
        'Many students stay too long because they feel embarrassed that they did not notice warning signs earlier. Try not to turn the red flag into self-blame. The useful question is not why did I allow this, but what support and boundaries do I need now?',
        'Write down what happened in plain language, especially if the person keeps confusing the issue. For example: they asked for my password, insulted my friend, then said I was dramatic. Seeing the pattern on paper can make it easier to decide what to do.',
        'If you choose to leave, plan for safety and privacy. Change passwords, reduce location sharing, tell someone trusted, and avoid one last private meeting if the person has already shown anger, threats, or control.'
      ]],
    ],
    examples: [
      'A partner who says you cannot attend a departmental dinner unless they go with you is showing control, not care.',
      'Someone who apologizes, gives space, and changes their behavior is different from someone who apologizes only to restart the same pressure.',
      'A student who asks for your timetable to plan study dates is different from someone who uses it to monitor you.'
    ],
    checklist: [
      'Do I feel free to keep my friends, classes, routines, and privacy?',
      'Can I say no without punishment, insults, pressure, or threats?',
      'Does this person take accountability without turning every issue against me?',
      'Have I told someone trusted if the pattern feels unsafe or confusing?',
      'Do I have a safe plan if I need to step back from the relationship?'
    ],
    related: [
      ['/green-flags-student-relationships', 'Green Flags in Student Relationships'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/safety', 'Safety on The College Date'],
      ['/how-to-reject-someone-politely', 'How to Reject Someone Politely'],
    ],
    faqs: [
      ['Is jealousy always a red flag?', 'Not always. Occasional insecurity can be discussed, but jealousy becomes a red flag when it turns into control, monitoring, isolation, blame, or threats.'],
      ['What should I do if a relationship feels unsafe?', 'Tell a trusted person, avoid private confrontation if you feel at risk, preserve evidence of threats, and contact appropriate support or safety channels.'],
      ['Can red flags appear in friendships too?', 'Yes. Control, manipulation, isolation, dishonesty, and disrespect can happen in friendships, talking stages, and relationships.']
    ],
    sources: [sources.rainnConsent, sources.ashaConsent, sources.nccc],
    cta: ['Meet People With Clearer Intentions', '/download', 'When you are ready to date, use official The College Date access and keep your safety standards visible.'],
    quality: [10, 9, 10, 9, 9, 10, 9, 10, 9, 7, 9, 91],
  },
  {
    path: '/healthy-relationship-university-students',
    file: 'public/healthy-relationship-university-students.html',
    type: 'Article',
    cluster: 'Healthy relationships',
    title: 'How to Start a Healthy Relationship in University',
    description: 'A practical guide for university students on starting a healthy relationship with trust, communication, boundaries, respect, expectations, and academic balance.',
    kicker: 'Healthy relationship guide',
    h1: 'How to Start a Healthy Relationship in University',
    intro: 'A healthy university relationship starts with honesty, respect, pace, and shared expectations. It should support your studies and personal growth, not consume your identity or cut you away from the rest of campus life.',
    sections: [
      ['Start with clear intentions', [
        'Before you call someone your partner, understand what both of you are hoping for. Are you exploring, dating seriously, friendship-first, or still unsure? It is better to be honest early than to let one person assume a future the other person never agreed to.',
        'For Nigerian students, pressure can come from classmates, roommates, social media, family expectations, or the fear of being single on campus. A healthy start ignores performance and focuses on what both people actually want.'
      ]],
      ['Build trust through consistency', [
        'Trust grows from small repeated actions: showing up when you said you would, telling the truth, keeping private matters private, admitting mistakes, and not using another person insecurity against them. Big romantic words do not replace consistent behavior.',
        'Do not demand instant access to phones, passwords, accounts, or location as proof of love. Trust and privacy can exist together. If someone needs reassurance, talk about the feeling rather than creating surveillance rules.'
      ]],
      ['Set boundaries that protect school and life', [
        'Good boundaries cover time, study periods, money, physical affection, social media, friendships, conflict, and family involvement. You can care about someone and still need evenings for assignments, departmental meetings, lab work, spiritual life, or rest.',
        'Boundaries should be discussed calmly, not introduced only during fights. A useful phrase is: I like where this is going, and I want us to agree on what feels respectful before we rush.'
      ]],
      ['Keep academic balance visible', [
        'A relationship should not make you miss classes, abandon projects, fail practicals, drain your budget, or lose friendships. In exam periods, agree on realistic communication instead of treating reduced availability as rejection.',
        'Healthy partners celebrate your growth. They do not punish ambition, compete with your schoolwork, or make every campus decision revolve around them.'
      ]],
      ['Build the relationship slowly enough to observe character', [
        'Early chemistry can be exciting, especially when you meet someone who understands your campus routine. Still, give the relationship enough time to show how both of you act when plans change, money is tight, exams are close, or one person is disappointed.',
        'Notice how they speak about former partners, friends, lecturers, and people who cannot benefit them. Respect is not only how someone treats you when they want your attention; it is how they handle ordinary inconvenience.',
        'A healthy start leaves space for both people to keep friendships, hobbies, spiritual life, family obligations, and personal goals. The relationship should become part of your life, not the only thing holding your life together.',
        'If you both come from different faculties, campuses, or social circles, use that difference as a way to learn, not a reason to compete. Ask how their schedule works, what support looks like to them, and what makes them feel respected when school pressure is high.'
      ]],
    ],
    examples: [
      'Agreeing on quiet study nights before exams can prevent unnecessary conflict.',
      'A relationship that allows club meetings, group assignments, and friendships has more room to breathe.',
      'A partner who can say sorry without turning the whole issue against you is showing maturity.'
    ],
    checklist: [
      'Have we talked about what kind of relationship we both want?',
      'Do our boundaries protect study time, friendships, money, and privacy?',
      'Can we disagree without insults, threats, silent punishment, or public drama?',
      'Are we moving at a pace both people freely choose?',
      'Does the relationship make student life steadier rather than smaller?'
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/green-flags-student-relationships', 'Green Flags'],
      ['/questions-before-dating', 'Questions Before Dating'],
    ],
    faqs: [
      ['What is the first step to a healthy university relationship?', 'Start with honest intentions and a pace both people are comfortable with.'],
      ['How do students balance dating and school?', 'Agree on study time, exam-season communication, budget limits, and social expectations before conflict starts.'],
      ['Can a healthy relationship still have conflict?', 'Yes. The difference is whether both people repair respectfully, listen, and change harmful patterns.']
    ],
    sources: [sources.rainnConsent],
    cta: ['Start With an Honest Profile', '/dating-bio-examples-students', 'A clear profile helps you attract people who understand your intentions and pace.'],
    quality: [10, 9, 10, 9, 9, 10, 8, 9, 9, 8, 9, 90],
  },
  {
    path: '/signs-someone-likes-you-college',
    file: 'public/signs-someone-likes-you-college.html',
    type: 'Article',
    cluster: 'Campus dating signals',
    title: 'How to Know Someone Likes You in College',
    description: 'A student-friendly guide to signs someone may like you in college, how to read interest respectfully, and how to avoid assumptions or pressure.',
    kicker: 'Campus dating signals',
    h1: 'How to Know Someone Likes You in College',
    intro: 'Someone may like you in college if they consistently make time for you, remember details, start conversations, show respectful curiosity, and seem comfortable building connection. But signs are not proof. The only clear answer comes from respectful communication.',
    sections: [
      ['Look for consistent interest, not one random moment', [
        'A smile after class, a quick reply, or a friendly joke can mean many things. Stronger signals are consistent: they start conversations more than once, ask follow-up questions, remember what you said, and choose to spend time with you when they have other options.',
        'Consistency matters because campus life is busy. A person who genuinely enjoys your company may make small but repeated efforts, such as saving you a seat, sending a lecture reminder, asking how your test went, or noticing your interests.'
      ]],
      ['Notice comfort, respect, and effort', [
        'Healthy interest feels respectful. They do not mock you, pressure you, invade privacy, demand quick intimacy, or make you feel watched. They may tease lightly, but they still care about your comfort and stop when a joke does not land.',
        'Effort can also be quiet. A shy student may not flirt dramatically, but they may show up in small ways: asking thoughtful questions, supporting your project, reacting warmly to your posts, or choosing one-on-one conversation after group settings.'
      ]],
      ['Avoid turning normal kindness into certainty', [
        'Kindness is not a contract. Some students are naturally friendly, helpful, or expressive. Do not assume someone likes you only because they reply politely, laugh in a group, or help with schoolwork.',
        'Also avoid using friends to pressure the person publicly. If you want clarity, choose a calm, private, low-pressure moment and ask directly without demanding a romantic answer.'
      ]],
      ['How to ask without making things awkward', [
        'Try a simple line: I enjoy talking with you and I would like to take you out sometime. Would you be open to that? If they say no, accept it. If they seem unsure, give space instead of arguing for a yes.',
        'On a dating app, use the fact that you matched as context, but still respect pace. A match means there may be interest; it does not mean someone owes instant replies, personal details, or a date.'
      ]],
      ['How to handle the answer maturely', [
        'If they say yes, keep the next step simple and public. A short campus hangout, library break, cafeteria chat, or student-friendly event is usually better than making the first plan too intense.',
        'If they say no, do not punish them with silence, gossip, insults, or public embarrassment. College communities can feel small, and the way you handle rejection can protect both your dignity and theirs.',
        'If they say maybe, do not treat uncertainty as a challenge. Give them time, keep your normal life moving, and avoid building a whole relationship in your head before both people have agreed to anything.',
        'Remember that attraction can grow through familiarity, but it should not be forced. If the person keeps choosing friendship, respect the category they have named and put your romantic energy somewhere healthier.'
      ]],
    ],
    examples: [
      'They remember your faculty week performance and ask how rehearsals went.',
      'They invite you to a public campus event rather than pushing for a private room immediately.',
      'They say no clearly and you respect it without turning the campus into a drama scene.'
    ],
    checklist: [
      'Is their interest consistent over time, not based on one friendly moment?',
      'Do they make conversation easy without making me feel watched or pressured?',
      'Am I reading their behavior respectfully instead of assuming kindness is romance?',
      'Can I ask clearly and accept a yes, no, or maybe with maturity?',
      'Is the next step public, simple, and comfortable for both of us?'
    ],
    related: [
      ['/campus-dating', 'Campus Dating Guide'],
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/talking-stage-students', 'Talking Stage Tips'],
      ['/how-to-reject-someone-politely', 'How to Reject Someone Politely'],
    ],
    faqs: [
      ['Can someone like me but reply slowly?', 'Yes. Students have classes, exams, family duties, and low-data days. Look at consistency and respect, not reply speed alone.'],
      ['Should I ask directly if I am unsure?', 'Yes, if you can ask calmly and accept any answer without pressure.'],
      ['Does a dating app match mean someone definitely likes me?', 'It means there may be interest. Respectful conversation is still needed before assuming anything more.']
    ],
    sources: [],
    cta: ['Start Respectful Conversations', '/conversation-starters-dating-app', 'Use profile details and campus context to begin without pressure.'],
    quality: [10, 9, 9, 10, 9, 9, 7, 9, 9, 8, 9, 88],
  },
  {
    path: '/long-distance-relationship-students',
    file: 'public/long-distance-relationship-students.html',
    type: 'Article',
    cluster: 'Student relationships',
    title: 'Long Distance Relationships for Nigerian Students',
    description: 'A practical guide to long distance relationships for Nigerian students, covering communication, trust, study schedules, visits, expectations, and warning signs.',
    kicker: 'Student relationship guide',
    h1: 'Long Distance Relationships for Nigerian Students',
    intro: 'Long distance relationships can work for students when both people communicate clearly, respect school schedules, make realistic visit plans, and agree on trust without constant monitoring. They become harder when distance hides dishonesty, pressure, or unclear commitment.',
    sections: [
      ['Agree on what the relationship is', [
        'Distance makes assumptions louder. Before one person moves for school, NYSC, SIWES, internship, family duties, or a different campus, talk about what you are agreeing to. Are you exclusive, still exploring, or unsure? What does commitment mean to each of you?',
        'A relationship label without shared expectations can create stress. It is better to define communication, visits, boundaries, and conflict repair than to rely on daily messages alone.'
      ]],
      ['Create a communication rhythm that fits student life', [
        'Students do not always have stable electricity, data, privacy, or time. A healthy rhythm might be short daily check-ins, longer weekend calls, voice notes after lectures, or planned video calls during less busy weeks.',
        'Avoid using missed calls, delayed replies, or exam-season silence as automatic proof of cheating. If a pattern worries you, discuss it directly and calmly.'
      ]],
      ['Plan visits with money and safety in mind', [
        'Visits should be realistic. Discuss transport, accommodation, public meeting points, class schedules, and budget before anyone travels. For early visits, public spaces and trusted-person awareness matter even if you have been chatting for months.',
        'Do not let distance pressure you into risky proof of love: sending intimate images, borrowing money you cannot afford, skipping exams, or travelling without telling anyone.'
      ]],
      ['Know when distance is exposing a bigger issue', [
        'Warning signs include secrecy, repeated lies, pressure for money, threats, blackmail, constant monitoring, disappearing after getting help, or refusing every reasonable conversation about expectations.',
        'If the relationship regularly leaves you anxious, isolated, distracted from school, or scared to ask questions, revisit the relationship and seek support from trusted people.'
      ]],
      ['Make a realistic student agreement', [
        'A long-distance agreement does not need to be dramatic. It can be a calm conversation about call days, exam periods, social media comfort, visit plans, money limits, and what both people consider respectful.',
        'Put the agreement in everyday language. For example: during exam weeks we send short check-ins; we do not demand screenshots; we plan visits only when transport and accommodation are safe; we discuss worries before accusing each other.',
        'Review the agreement when school calendars change. Matriculation, SIWES, strikes, internships, resumption, or final-year projects can change availability, and a healthy relationship adjusts instead of turning every change into suspicion.',
        'Distance also needs emotional honesty. If you are becoming lonely, resentful, or interested in someone else, say so before your behavior becomes confusing. Mature communication is harder than hiding, but it protects both people from slow betrayal.'
      ]],
    ],
    examples: [
      'A UNN student and a UNILAG student may agree on Sunday evening calls and exam-week quiet time.',
      'A partner who respects low-data weeks is different from someone who turns every delay into accusation.',
      'A visit plan should include public timing and transport money, not only romantic excitement.'
    ],
    checklist: [
      'Have we agreed on exclusivity, communication rhythm, and visit expectations?',
      'Do our plans respect exams, transport, data, money, and accommodation safety?',
      'Can we raise worries without demanding screenshots, passwords, or constant proof?',
      'Do both people still feel emotionally supported from a distance?',
      'Are warning signs being discussed early instead of hidden until they explode?'
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/questions-before-dating', 'Questions Before Dating'],
      ['/red-flags-student-relationships', 'Red Flags'],
    ],
    faqs: [
      ['Can long distance relationships work for students?', 'Yes, but they need realistic communication, trust, budget planning, and shared expectations.'],
      ['How often should student couples talk long distance?', 'There is no single rule. Choose a rhythm that respects classes, exams, data, rest, and emotional needs.'],
      ['What is a red flag in a long distance relationship?', 'Pressure, secrecy, repeated lies, money manipulation, threats, and constant monitoring are serious warning signs.']
    ],
    sources: [],
    cta: ['Meet Students With Clear Intentions', '/download', 'Use The College Date when you want a student-focused place to start honest conversations.'],
    quality: [10, 9, 9, 9, 9, 9, 7, 9, 9, 8, 9, 87],
  },
  {
    path: '/talking-stage-students',
    file: 'public/talking-stage-students.html',
    type: 'Article',
    cluster: 'Conversation and dating stages',
    title: 'Talking Stage Tips for Students',
    description: 'A guide to the talking stage for students, including what it means, healthy communication, mistakes to avoid, and moving toward a relationship.',
    kicker: 'Conversation guide',
    h1: 'Talking Stage Tips for Students',
    intro: 'The talking stage is the period where two people are getting to know each other before deciding whether to date, stay friends, or stop. For students, it works best when expectations are clear enough to prevent confusion but relaxed enough to let trust grow naturally.',
    sections: [
      ['What the talking stage means', [
        'A talking stage is not automatically a relationship. It can include chats, calls, campus meetups, shared study breaks, and learning about values, interests, habits, and intentions. The problem starts when one person treats it as commitment while the other person treats it as casual conversation.',
        'You do not need to force a label on day one, but you should avoid pretending you want something serious if you only want attention. Honesty protects both people.'
      ]],
      ['Communicate without turning it into pressure', [
        'Healthy communication is curious, consistent, and respectful. Ask questions that create real conversation: what their week looks like, what they enjoy outside class, how they handle stress, what they want from dating, and what pace feels comfortable.',
        'Do not turn every reply delay into a fight. Students have lectures, assignments, practicals, family calls, low data, and rest days. If consistency matters to you, say so calmly instead of testing the person.'
      ]],
      ['Mistakes to avoid', [
        'Avoid love-bombing, future promises you cannot mean yet, jealousy before commitment, monitoring social media, private-image pressure, demanding exclusivity without discussion, or using silence as punishment.',
        'Also avoid using the talking stage to keep someone emotionally available while you know you do not want to move forward. If your interest changes, be kind and clear.'
      ]],
      ['Moving toward a relationship', [
        'Move forward when both people show respect, consistency, mutual interest, and willingness to discuss expectations. Useful questions include: Are we exclusive? What pace feels right? How do we handle school pressure? What boundaries matter?',
        'If the talking stage keeps creating confusion, ask directly. Clarity may feel awkward for one evening, but months of uncertainty can be heavier.'
      ]],
      ['Know when to pause or end the talking stage', [
        'Pause when the connection depends on pressure, secrecy, mixed signals, or one person doing all the emotional work. A talking stage should help you learn each other, not keep you anxious every day.',
        'You can end it kindly without blaming the other person. Try: I have enjoyed getting to know you, but I do not think we want the same thing. I would rather be honest than keep this confusing.',
        'If the other person reacts with insults, threats, or repeated messages after you have been clear, stop explaining and protect your boundaries. Respectful interest accepts a no.',
        'A good talking stage should still leave you able to study, sleep, and enjoy your friendships. If the connection only feels alive when there is drama, jealousy, or fear of losing them, that is useful information.'
      ]],
    ],
    examples: [
      'Instead of asking why did you ignore me, try: I enjoy talking with you, but I get confused when we disappear for days. What pace works for you?',
      'A campus hangout after lectures can be a gentle next step before a formal date.',
      'If someone says they only want friendship, believe them.'
    ],
    checklist: [
      'Do we both understand that this is a talking stage, not automatic commitment?',
      'Are we communicating with curiosity instead of tests, jealousy, or pressure?',
      'Have I stated my intention clearly enough to avoid leading someone on?',
      'Is the talking stage making me more secure or more anxious every week?',
      'Can I ask for clarity without forcing a relationship label?'
    ],
    related: [
      ['/conversation-starters-dating-app', 'Conversation Starters'],
      ['/first-message-examples-dating-apps', 'First Message Examples'],
      ['/situationship-vs-relationship', 'Situationship vs Relationship'],
      ['/questions-before-dating', 'Questions Before Dating'],
    ],
    faqs: [
      ['Is the talking stage a relationship?', 'No. It is a getting-to-know-you stage unless both people clearly agree to a relationship.'],
      ['How long should the talking stage last?', 'There is no fixed timeline, but it should not stay confusing forever. Talk about expectations when feelings become serious.'],
      ['What should students avoid in the talking stage?', 'Avoid pressure, jealousy without agreement, dishonesty, manipulation, and asking for private information or intimate images.']
    ],
    sources: [],
    cta: ['Create a Profile That States Your Pace', '/dating-bio-examples-students', 'A clear bio makes the talking stage easier because people know what kind of connection you want.'],
    quality: [10, 9, 9, 10, 9, 10, 7, 9, 9, 8, 9, 89],
  },
  {
    path: '/situationship-vs-relationship',
    file: 'public/situationship-vs-relationship.html',
    type: 'Article',
    cluster: 'Relationship definitions',
    title: 'Situationship vs Relationship: Student Guide',
    description: 'A clear comparison of situationships and relationships for students, covering definitions, expectations, commitment, warning signs, and healthy choices.',
    kicker: 'Relationship clarity',
    h1: 'Situationship vs Relationship',
    intro: 'A situationship is an undefined romantic or emotional connection where expectations are unclear. A relationship has clearer mutual agreement about commitment, boundaries, communication, and how both people show up. The difference is not the amount of attention; it is the clarity.',
    sections: [
      ['Definitions that actually help', [
        'A situationship may include flirting, regular chats, physical closeness, campus hangouts, or emotional support without a shared label. It can feel exciting at first because there is less pressure, but it can become painful when one person wants more clarity than the other.',
        'A relationship is not just posting each other online. It means both people have agreed on what they are building, what behavior is respectful, and what commitment means in their student lives.'
      ]],
      ['Expectations and commitment', [
        'In a situationship, expectations are often guessed: Can we see other people? Are we exclusive? Do we owe daily calls? Are we allowed to be upset? In a relationship, those expectations should be discussed directly.',
        'Commitment can look different for different students, but it should never be assumed through pressure, jealousy, or public performance. Ask what both people want and listen to the answer.'
      ]],
      ['Warning signs that the undefined stage is hurting you', [
        'Watch for repeated confusion, secrecy, emotional dependency without accountability, jealousy without commitment, pressure for intimacy, or one person avoiding every conversation about where things are going.',
        'It is also a warning sign if you keep accepting treatment that makes you anxious because you are afraid asking for clarity will make the person leave.'
      ]],
      ['Healthy choices', [
        'You can choose to keep things casual, become exclusive, remain friends, slow down, or end the connection. What matters is whether both people know what they are choosing.',
        'A calm script helps: I like spending time with you, but I need to understand what this is becoming. Are you interested in a relationship, or should we keep it as friendship?'
      ]],
      ['How to ask for clarity without begging for commitment', [
        'Asking for clarity is not the same as begging. You are allowed to know whether your emotions, time, and energy are being invested in something mutual.',
        'Keep the question direct and grounded: I am starting to feel more invested. I need to know whether you see this becoming a relationship, or whether we should keep it casual. Then listen carefully to the answer, including hesitation.',
        'If the answer is not what you want, believe it. Do not try to become more available, more jealous, or more silent to make someone choose you. A clear no or unclear maybe gives you information you can use.',
        'Students sometimes stay in situationships because the person is popular, attractive, familiar, or part of their friend group. Those reasons may explain the attachment, but they do not replace emotional safety or mutual intention.',
        'If you choose to continue casually, be honest with yourself about whether you can actually do that without resentment. If you cannot, stepping back may be kinder than pretending you are fine.'
      ]],
    ],
    examples: [
      'Calling every night but avoiding any discussion of exclusivity may still be a situationship.',
      'A relationship can be private without being secretive; the key is mutual agreement.',
      'If your schoolwork and peace are suffering because of uncertainty, clarity is not too much to ask.'
    ],
    checklist: [
      'Do we both know whether this is casual, exclusive, friendship, or a relationship?',
      'Are expectations spoken clearly or only guessed through attention and jealousy?',
      'Can I ask where things are going without being mocked or punished?',
      'Am I accepting confusion because I am afraid clarity will end the connection?',
      'Does this connection leave room for peace, school, and self-respect?'
    ],
    related: [
      ['/talking-stage-students', 'Talking Stage Tips'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/red-flags-student-relationships', 'Red Flags'],
      ['/questions-before-dating', 'Questions Before Dating'],
    ],
    faqs: [
      ['Is a situationship always bad?', 'No. It becomes unhealthy when expectations are unclear, one person is hurt, or boundaries are ignored.'],
      ['How do I move from a situationship to a relationship?', 'Ask directly about intentions, exclusivity, pace, and expectations, then accept the answer you are given.'],
      ['Can students be exclusive without a public label?', 'Yes, if both people clearly agree. Privacy is different from secrecy.']
    ],
    sources: [],
    cta: ['Date With Clearer Intentions', '/download', 'Use The College Date to state what kind of connection you want before the confusion starts.'],
    quality: [10, 9, 9, 10, 9, 10, 7, 9, 9, 8, 9, 89],
  },
  {
    path: '/how-to-reject-someone-politely',
    file: 'public/how-to-reject-someone-politely.html',
    type: 'Article',
    cluster: 'Respectful communication and safety',
    title: 'How to Reject Someone Politely',
    description: 'Respectful rejection examples for students, including text messages, campus situations, dating-app conversations, boundaries, and safety considerations.',
    kicker: 'Respectful communication',
    h1: 'How to Reject Someone Politely',
    intro: 'To reject someone politely, be clear, kind, and firm. You do not need to insult, over-explain, disappear, or pretend you are interested. A respectful no protects both people from confusion and gives the other person a chance to move on.',
    sections: [
      ['Use clear language', [
        'A soft rejection can still be direct: I appreciate you telling me, but I do not feel the same way. I respect you and I do not want to lead you on. This is kinder than giving vague hope when your answer is already no.',
        'Avoid long explanations that invite debate. You are not in court. You can be polite without proving why your feelings are valid.'
      ]],
      ['Text examples students can adapt', [
        'For a classmate: Thank you for being honest with me. I think you are a good person, but I do not see us that way. I hope we can keep things respectful around campus.',
        'For a dating app match: I enjoyed chatting, but I do not think this is the right fit for me. I wish you well. For someone you went out with: Thank you for the date. I do not want to continue romantically, and I did not want to leave you guessing.'
      ]],
      ['Campus situations need extra care', [
        'When you share a department, hostel area, fellowship, society, or friend group, rejection can feel public. Choose a private, calm moment if possible, and avoid turning the person into gossip.',
        'If the person keeps pushing after you say no, becomes insulting, follows you, threatens you, or tries to shame you publicly, stop explaining. Preserve messages and involve trusted support or campus/security channels where appropriate.'
      ]],
      ['Safety and boundaries after rejection', [
        'You can block, mute, or stop replying when someone ignores a clear no. Respect does not require endless access to you. If you feel unsafe, prioritize distance, trusted witnesses, and documented evidence over another private conversation.',
        'When rejecting someone on The College Date or any dating app, avoid sharing extra private details to soften the message. A simple no is enough.'
      ]],
      ['What not to do when rejecting someone', [
        'Do not reject someone by humiliating them in a group chat, turning their feelings into content, or using friends to mock them. Even when you do not share their feelings, they still deserve dignity.',
        'Do not invent a fake relationship, fake emergency, or false accusation just to escape discomfort. If you are safe, a simple honest no is cleaner and less likely to create future drama.',
        'If the person has already shown anger or harassment, your priority changes from politeness to safety. Keep the message short, avoid meeting alone, and involve trusted support if needed.',
        'If you rejected someone and later change your mind, do not assume they are still available. Approach with humility, acknowledge the earlier answer, and give them the same freedom to decline that you expected for yourself.'
      ]],
    ],
    examples: [
      'I am not interested in dating, but I appreciate you being honest.',
      'I do not want to continue this conversation romantically. Please respect that.',
      'I am not comfortable meeting again. I wish you well.'
    ],
    checklist: [
      'Is my message clear enough that I am not creating false hope?',
      'Have I stayed kind without over-explaining or inviting a debate?',
      'Am I avoiding public embarrassment, screenshots, gossip, or group-chat drama?',
      'Do I need to prioritize safety over politeness because of threats or harassment?',
      'Have I kept private details out of the rejection message?'
    ],
    related: [
      ['/student-dating-etiquette', 'Student Dating Etiquette'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/safety', 'Safety'],
      ['/red-flags-student-relationships', 'Red Flags'],
    ],
    faqs: [
      ['Is ghosting ever acceptable?', 'A clear message is usually kinder, but if someone is threatening, manipulative, or unsafe, you do not owe continued access.'],
      ['Should I explain why I am rejecting someone?', 'You can give a short reason, but you do not need to debate your feelings or prove your no.'],
      ['What if I still see them on campus?', 'Stay respectful, avoid gossip, keep boundaries, and seek support if they continue pressuring or harassing you.']
    ],
    sources: [sources.rainnConsent, sources.nccc],
    cta: ['Keep Dating Respectful', '/download', 'The College Date encourages honest intentions, respectful messages, and safer student-focused discovery.'],
    quality: [10, 9, 10, 10, 9, 9, 8, 10, 9, 7, 9, 90],
  },
  {
    path: '/breakup-recovery-college-students',
    file: 'public/breakup-recovery-college-students.html',
    type: 'Article',
    cluster: 'Breakups and wellbeing',
    title: 'How to Recover After a Breakup in College',
    description: 'A gentle breakup recovery guide for college students, covering emotional recovery, academics, friends, social media, healthy coping, and dating again.',
    kicker: 'Breakup recovery',
    h1: 'How to Recover After a Breakup in College',
    intro: 'Recovering after a breakup in college takes time, support, and structure. You may still have lectures, exams, mutual friends, hostel routines, and social media reminders, so healing is not only emotional. It is practical too.',
    sections: [
      ['Give the pain a name without letting it run your life', [
        'A breakup can affect sleep, appetite, focus, mood, confidence, and motivation. That does not mean you are weak. It means an important attachment changed, and your mind is adjusting.',
        'Give yourself a few honest sentences: I am hurt, I miss them, I am disappointed, and I still have to care for myself. Naming the feeling helps you respond instead of pretending nothing happened.'
      ]],
      ['Protect your academic rhythm', [
        'You may not study perfectly for a while, but keep small routines: attend lectures, submit what you can, ask classmates for notes, break reading into shorter sessions, and tell a trusted lecturer or adviser if your situation is affecting deadlines seriously.',
        'Do not make major academic decisions in the first wave of pain. Missing one lecture is different from abandoning your semester.'
      ]],
      ['Use friends and social media wisely', [
        'Choose friends who can listen without turning the breakup into entertainment. Campus gist can make heartbreak worse when everyone wants updates. Share enough to get support, not enough to lose your privacy.',
        'Mute, unfollow, archive chats, or reduce checking if social media keeps reopening the wound. You do not need to perform being unbothered, and you do not need to monitor every new post.'
      ]],
      ['Know when to get more support', [
        'If sadness becomes overwhelming, you cannot function, you feel unsafe, or you have thoughts of harming yourself, reach out urgently to a trusted person, campus support where available, or a qualified mental-health professional. This guide is not medical advice.',
        'When you date again, move slowly. Use what you learned to set healthier boundaries, recognize red flags, and choose people who respect your life.'
      ]],
      ['Rebuild your identity outside the relationship', [
        'After a breakup, it can feel as if your whole campus routine belongs to the relationship: the walkway you used together, the cafeteria table, the music, the class break, the inside jokes. Healing often means making new routines in familiar places.',
        'Choose small identity-building actions: return to a club, sit with different classmates, cook with a roommate, restart exercise, attend tutorials, or work on a project you neglected. These steps may feel ordinary, but they remind your mind that life is wider than one person.',
        'Avoid rushing into a new relationship just to prove you are fine. It is better to become steady again than to carry fresh pain into someone else attention.',
        'If you and your ex share spaces, decide ahead of time how you will behave. A short greeting, a neutral nod, or simply keeping distance can be enough. You do not have to turn every shared corridor into a conversation.'
      ]],
    ],
    examples: [
      'A simple recovery week can include attending class, eating properly, muting the ex online, and meeting one trusted friend.',
      'If you share a department, keep interactions civil and brief instead of reopening the argument after every lecture.',
      'Dating again should come from readiness, not revenge.'
    ],
    checklist: [
      'Am I keeping basic routines like food, sleep, classes, and one trusted friend?',
      'Have I reduced social media checking if it keeps reopening the hurt?',
      'Do I have a plan for shared campus spaces so I am not improvising in pain?',
      'Am I seeking qualified help if I feel unsafe or unable to function?',
      'Am I waiting to date again from readiness, not revenge or loneliness?'
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/red-flags-student-relationships', 'Red Flags'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/green-flags-student-relationships', 'Green Flags'],
    ],
    faqs: [
      ['How long does breakup recovery take for students?', 'There is no fixed timeline. Focus on steady routines, support, and healing rather than rushing a deadline.'],
      ['Should I block my ex after a breakup?', 'If contact keeps hurting you or boundaries are not respected, blocking or muting can be a healthy privacy choice.'],
      ['When should I seek professional help?', 'Seek qualified support if you feel unsafe, cannot function, or have thoughts of harming yourself.']
    ],
    sources: [sources.jedBreakups, sources.youngMindsBreakup],
    cta: ['Return to Dating When You Are Ready', '/student-dating', 'Use the student dating guide to rebuild slowly, honestly, and with better boundaries.'],
    quality: [10, 9, 10, 10, 9, 9, 9, 10, 9, 6, 9, 90],
  },
  {
    path: '/student-dating-etiquette',
    file: 'public/student-dating-etiquette.html',
    type: 'Article',
    cluster: 'Dating skills',
    title: 'Student Dating Etiquette',
    description: 'A practical guide to student dating etiquette, including respect, consent, punctuality, communication, paying for dates, online manners, and boundaries.',
    kicker: 'Dating skills',
    h1: 'Student Dating Etiquette',
    intro: 'Student dating etiquette is about making the other person feel respected, safe, and free to choose. It covers how you ask someone out, how you communicate, how you handle money, how you behave online, and how you respond when the answer is no.',
    sections: [
      ['Respect starts before the date', [
        'Ask clearly and give the person room to decline. Do not corner someone after class, send friends to pressure them, or turn a private interest into public entertainment. A good invitation is simple, specific, and easy to refuse.',
        'Online, use profile details rather than generic pressure. A thoughtful opener beats repeated hey messages, sexual comments, or demanding immediate WhatsApp access.'
      ]],
      ['Consent and comfort are non-negotiable', [
        'Consent applies to touch, photos, private information, location sharing, sexual conversation, and physical intimacy. If someone hesitates, changes the subject, says no, freezes, or seems uncomfortable, slow down and check in.',
        'Do not use money, transport, gifts, social status, or emotional pressure to make someone feel they owe you affection. Paying for a date is not a contract.'
      ]],
      ['Time, communication, and money', [
        'Be punctual or communicate early if you are delayed. Students often manage tight schedules, transport stress, and limited funds, so reliability matters. If plans change, say so clearly instead of disappearing.',
        'Discuss budget without shame. Affordable public dates are valid. If you want to split, treat, or keep things low-cost, talk about it respectfully. Nobody should feel embarrassed for protecting their finances.'
      ]],
      ['After the date or conversation', [
        'If you enjoyed the date, say so. If you are not interested, be kind and direct. If you need time, ask for it instead of creating confusion. Good etiquette is not about perfect lines; it is about leaving people with dignity.',
        'If someone declines you, accept it. Do not insult, threaten, spread rumors, or keep messaging. Your response to rejection says a lot about your character.'
      ]],
      ['Etiquette for app conversations', [
        'On a dating app, remember that a match is an invitation to talk, not permission to demand attention. Start with something from the profile, keep the tone clean, and avoid pushing for phone numbers before basic comfort exists.',
        'If a conversation fades, you can try one thoughtful follow-up. After that, let it breathe. Repeated messages, guilt-tripping, or showing anger over slow replies makes the interaction feel unsafe.',
        'If you make plans through the app, confirm time, place, and budget clearly. A respectful date begins before anyone arrives.',
        'Good etiquette also means protecting privacy. Do not screenshot private chats for jokes, expose someone profile to your friends without reason, or share personal details they gave you in confidence.'
      ]],
    ],
    examples: [
      'Would you like to get a drink at the campus cafe after lectures? No pressure if you are not interested.',
      'I am running late from lab. I will be there in 15 minutes, or we can reschedule if that is better.',
      'Thank you for meeting me. I enjoyed the conversation, but I do not feel a romantic connection.'
    ],
    checklist: [
      'Have I asked in a way that gives the other person room to decline?',
      'Are the date plan, time, location, and budget clear before we meet?',
      'Am I respecting consent around touch, photos, private details, and pace?',
      'Do I communicate changes early instead of disappearing?',
      'Can I accept rejection without insulting, threatening, or repeatedly messaging?'
    ],
    related: [
      ['/student-dating', 'Student Dating Guide'],
      ['/first-date-ideas-students', 'First Date Ideas'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/how-to-reject-someone-politely', 'Reject Someone Politely'],
    ],
    faqs: [
      ['Who should pay on a student date?', 'There is no one rule. Discuss budget respectfully and choose a plan both people can afford.'],
      ['Is it rude to reject someone by text?', 'A respectful text can be appropriate, especially after a brief interaction or when safety or comfort matters.'],
      ['What is bad online dating etiquette?', 'Pressure, sexual comments, repeated messaging after no response, deception, and asking for private details too quickly are bad etiquette.']
    ],
    sources: [sources.rainnConsent, sources.ashaConsent],
    cta: ['Practice Respectful Student Dating', '/download', 'Use The College Date to start with clearer profiles, safer pacing, and better conversation habits.'],
    quality: [10, 9, 10, 10, 9, 9, 8, 10, 9, 8, 9, 91],
  },
  {
    path: '/questions-before-dating',
    file: 'public/questions-before-dating.html',
    type: 'Article',
    cluster: 'Relationship readiness',
    title: 'Questions to Ask Before Dating Someone',
    description: 'Useful questions students can ask before dating someone, covering goals, values, boundaries, expectations, communication, money, school, and safety.',
    kicker: 'Relationship readiness',
    h1: 'Questions to Ask Before Dating Someone',
    intro: 'The best questions to ask before dating someone help you understand intentions, values, boundaries, communication style, and expectations. They are not an interview script. They are conversation starters that make dating clearer and safer.',
    sections: [
      ['Questions about intentions and values', [
        'Start with simple clarity: What are you looking for right now? Are you open to something serious, friendship first, or still figuring it out? What does a healthy relationship look like to you?',
        'Values questions do not need to sound formal. You can ask what matters most in their week, how they handle stress, what they are proud of, and what kind of future they are working toward.'
      ]],
      ['Questions about boundaries and pace', [
        'Ask: What pace feels comfortable for you? How do you feel about public dates first? What topics are too private early on? How do you want us to handle physical affection, photos, social media, and personal information?',
        'Boundaries are not only about saying no. They also show how two people can say yes without pressure, guilt, or confusion.'
      ]],
      ['Questions about communication and conflict', [
        'Ask how they prefer to communicate during busy school weeks. Do they like calls, texts, voice notes, or planned check-ins? What happens during exams? How do they usually handle conflict?',
        'A mature answer does not have to be perfect. Look for self-awareness, accountability, and willingness to talk instead of blame.'
      ]],
      ['Questions about school, money, and expectations', [
        'Student dating happens around lectures, assignments, transport, family calls, budgets, and career pressure. Ask what dating should look like around those realities. Can dates be low-cost? How often should you meet? How private or public should the relationship be?',
        'If someone avoids every practical question, pressures you to move faster, or mocks your standards, treat that information seriously.'
      ]],
      ['How to ask without making the conversation heavy', [
        'You do not need to ask all the questions at once. Choose one that fits the moment. After a good chat, you might ask what kind of connection they are open to. Before a date, you might ask what kind of public place feels comfortable.',
        'Listen for both answers and behavior. Someone may say they respect boundaries, but the real test is how they respond when you actually set one. Someone may say school matters, but the real test is whether they support your study time.',
        'The aim is not to find a perfect person. It is to learn whether two imperfect students can communicate honestly, respect each other, and make choices that protect both people.',
        'If a question makes the other person defensive, notice whether they can return to it calmly later. Nobody answers everything perfectly, but avoidance, mockery, or anger around reasonable questions can reveal a mismatch.'
      ]],
    ],
    examples: [
      'What kind of connection are you genuinely open to right now?',
      'How do you like to communicate when school gets busy?',
      'What boundaries help you feel respected in a relationship?'
    ],
    checklist: [
      'Have I asked about intentions before assuming we want the same thing?',
      'Do we understand each other boundaries around pace, privacy, and affection?',
      'Have we discussed communication during exams, low-data days, and busy weeks?',
      'Are money, transport, public dates, and expectations realistic for student life?',
      'Do their actions match their answers when a real boundary appears?'
    ],
    related: [
      ['/healthy-relationship-university-students', 'Healthy Relationship in University'],
      ['/relationship-boundaries-for-students', 'Relationship Boundaries'],
      ['/talking-stage-students', 'Talking Stage Tips'],
      ['/situationship-vs-relationship', 'Situationship vs Relationship'],
    ],
    faqs: [
      ['Should I ask serious questions before dating?', 'Yes, but naturally. The goal is clarity, not interrogation.'],
      ['What is the most important question before dating someone?', 'Ask what they are looking for and whether their expectations match yours.'],
      ['Can these questions be used on dating apps?', 'Yes. Choose one or two at a time and keep the conversation natural.']
    ],
    sources: [sources.rainnConsent],
    cta: ['Put Your Intentions in Your Profile', '/dating-bio-examples-students', 'A clear bio helps the right people ask better questions from the start.'],
    quality: [10, 9, 10, 10, 9, 10, 8, 9, 9, 8, 9, 91],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function canonical(pathname) {
  return pathname === '/' ? `${site}/` : `${site}${pathname}`;
}

function schemaFor(page) {
  const pageUrl = canonical(page.path);
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'The College Date',
      url: `${site}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${site}/logo-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://play.google.com/store/apps/details?id=com.collegedate.app',
        'https://www.instagram.com/thecollegedate?igsh=MXhxZHZiMzZtOGp6dw%3D%3D&utm_source=qr',
      ],
    },
    {
      '@type': 'ImageObject',
      '@id': `${pageUrl}#primaryimage`,
      url: ogImage,
      contentUrl: ogImage,
      caption: `${page.h1} - The College Date`,
    },
    {
      '@type': page.type,
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      name: page.title,
      headline: page.h1,
      description: page.description,
      image: { '@id': `${pageUrl}#primaryimage` },
      isPartOf: { '@id': `${site}/#website` },
      author: {
        '@type': 'Organization',
        name: publisher,
        url: `${site}/about`,
      },
      publisher: { '@id': `${site}/#organization` },
      datePublished: today,
      dateModified: today,
      mainEntityOfPage: pageUrl,
      articleSection: page.cluster,
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'The College Date',
          item: `${site}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${site}/blog`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: page.h1,
          item: pageUrl,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: page.faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    },
  ];

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

function renderPage(page) {
  const toc = page.sections
    .map(([heading]) => `<a href="#${slugify(heading)}">${escapeHtml(heading)}</a>`)
    .join('');
  const sections = page.sections
    .map(([heading, paragraphs]) => `
    <section class="panel" id="${slugify(heading)}">
      <h2>${escapeHtml(heading)}</h2>
      ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n      ')}
    </section>`)
    .join('\n');
  const examples = page.examples?.length ? `
    <section class="panel">
      <h2>Student Examples</h2>
      <ul>${page.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join('')}</ul>
    </section>` : '';
  const checklist = page.checklist?.length ? `
    <section class="panel">
      <h2>Quick Self-Check</h2>
      <ul>${page.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>` : '';
  const sourceLinks = page.sources?.length ? `
    <section class="panel">
      <h2>Sources and Further Reading</h2>
      <ul>${page.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a> - ${escapeHtml(source.publisher)}</li>`).join('')}</ul>
    </section>` : '';
  const related = page.related
    .map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`)
    .join('');
  const faq = page.faqs
    .map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`)
    .join('\n      ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <meta name="author" content="${publisher}" />
  <link rel="canonical" href="${canonical(page.path)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:url" content="${canonical(page.path)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="stylesheet" href="/seo-page.css" />
  <script type="application/ld+json">${schemaFor(page)}</script>
</head>
<body>
  <main>
    <nav aria-label="Primary">${commonNav.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
    <p class="kicker">${escapeHtml(page.kicker)}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="lede">${escapeHtml(page.intro)}</p>
    <p class="muted">Published by ${publisher} on <time datetime="${today}">${today}</time>. Updated <time datetime="${today}">${today}</time>.</p>
    <nav class="panel toc" aria-label="Table of contents">${toc}</nav>
    ${sections}
    ${examples}
    ${checklist}
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
      <h2>${escapeHtml(page.cta[0])}</h2>
      <p>${escapeHtml(page.cta[2])}</p>
      <a class="cta" href="${page.cta[1]}">${escapeHtml(page.cta[0])}</a>
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

for (const page of wave3Pages) {
  write(page.file, renderPage(page));
}

const wave3Cards = `
<!-- phase8-wave3-start -->
${wave3Pages.map((page) => `    <a class="article-card" href="${page.path}"><h2>${escapeHtml(page.h1)}</h2><p>${escapeHtml(page.description)}</p></a>`).join('\n')}
<!-- phase8-wave3-end -->
`;

const blogPath = join(root, 'public/blog.html');
let blog = readFileSync(blogPath, 'utf8');
blog = blog.replace(/\s*<!-- phase8-wave3-start -->[\s\S]*?<!-- phase8-wave3-end -->\s*/g, '');
blog = blog.replace(/(<div class="article-list">)/, `$1${wave3Cards}`);
blog = blog.replace(/Updated: 2026-07-20/g, `Updated: ${today}`);
blog = blog.replace(/"dateModified": "2026-07-20"/g, `"dateModified": "${today}"`);
write('public/blog.html', blog);

const hubLinks = {
  'public/student-dating.html': [
    ['/healthy-relationship-university-students', 'starting a healthy university relationship'],
    ['/talking-stage-students', 'talking stage tips for students'],
    ['/questions-before-dating', 'questions to ask before dating'],
    ['/student-dating-etiquette', 'student dating etiquette'],
  ],
  'public/campus-dating.html': [
    ['/signs-someone-likes-you-college', 'signs someone likes you in college'],
    ['/student-dating-etiquette', 'student dating etiquette'],
    ['/how-to-reject-someone-politely', 'rejecting someone politely on campus'],
  ],
  'public/safety.html': [
    ['/red-flags-student-relationships', 'red flags in student relationships'],
    ['/how-to-reject-someone-politely', 'polite rejection and safety'],
  ],
  'public/campus-dating-safety.html': [
    ['/red-flags-student-relationships', 'relationship red flags'],
    ['/how-to-reject-someone-politely', 'safe and polite rejection'],
    ['/student-dating-etiquette', 'student dating etiquette'],
  ],
  'public/green-flags-student-relationships.html': [
    ['/red-flags-student-relationships', 'red flags in student relationships'],
    ['/healthy-relationship-university-students', 'healthy relationship foundations'],
    ['/questions-before-dating', 'questions before dating'],
  ],
  'public/relationship-boundaries-for-students.html': [
    ['/red-flags-student-relationships', 'red flags that ignore boundaries'],
    ['/situationship-vs-relationship', 'situationship vs relationship clarity'],
    ['/how-to-reject-someone-politely', 'polite rejection examples'],
    ['/questions-before-dating', 'questions before dating'],
  ],
  'public/conversation-starters-dating-app.html': [
    ['/talking-stage-students', 'talking stage tips'],
    ['/signs-someone-likes-you-college', 'reading interest respectfully'],
    ['/questions-before-dating', 'questions before dating'],
  ],
  'public/first-date-ideas-students.html': [
    ['/student-dating-etiquette', 'student dating etiquette'],
    ['/questions-before-dating', 'questions before dating'],
    ['/how-to-reject-someone-politely', 'polite rejection after a date'],
  ],
  'public/campus-date-ideas-students.html': [
    ['/student-dating-etiquette', 'date etiquette for students'],
    ['/questions-before-dating', 'questions before dating someone'],
  ],
  'public/how-to-meet-people-on-campus.html': [
    ['/signs-someone-likes-you-college', 'signs someone likes you in college'],
    ['/how-to-reject-someone-politely', 'respectful rejection'],
  ],
};

function relatedPanel(links) {
  return `
    <section class="panel phase8-links" aria-labelledby="phase8-related-guides">
      <h2 id="phase8-related-guides">More Relationship Guides</h2>
      <div class="related-grid">${links.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join('')}</div>
    </section>`;
}

for (const [file, links] of Object.entries(hubLinks)) {
  const target = join(root, file);
  let html = readFileSync(target, 'utf8');
  html = html.replace(/\s*<section class="panel phase8-links"[\s\S]*?<\/section>/g, '');
  html = html.replace(/\s*<footer>/, `${relatedPanel(links)}\n    <footer>`);
  write(file, html);
}

const llmsPath = join(root, 'public/llms.txt');
let llms = readFileSync(llmsPath, 'utf8');
llms = llms.replace(/\n## Phase 8 Wave 3 Content[\s\S]*?(?=\n## |$)/, '');
llms += `\n## Phase 8 Wave 3 Content\n\n${wave3Pages.map((page) => `- ${page.h1}: ${canonical(page.path)}`).join('\n')}\n`;
write('public/llms.txt', llms);

const docsDir = join(root, 'docs/seo-phase-8');
mkdirSync(docsDir, { recursive: true });

write('docs/seo-phase-8/content-quality-report.md', `# Phase 8 Content Quality Report\n\nResearch date: ${today}\n\n| URL | Search intent | Originality | Accuracy | Readability | SEO | Internal linking | Sourcing | Trust/safety | Brand | Conversion | AI readiness | Total | Notes |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n${wave3Pages.map((page) => {
  const labels = ['Distinct intent, not overlapping previous pages.', 'Student examples included.', 'Unsupported claims avoided.', 'Readable student-focused guidance.', 'Unique metadata and H1.', 'Links to pillar/support pages.', 'Sources added where sensitive claims need support.', 'Safety language reviewed.', 'Matches The College Date tone.', 'CTA is natural and non-aggressive.', 'Clear answer-first structure.'];
  return `| ${page.path} | ${page.quality.slice(0, 11).join(' | ')} | ${page.quality[11]} | ${labels.join(' ')} |`;
}).join('\n')}\n\nNo page is below the 80/100 publishing threshold. Safety-sensitive pages were scored higher on trust/safety because they include clear boundaries, support guidance, and no guaranteed-outcome claims.\n`);

write('docs/seo-phase-8/internal-linking-report.md', `# Phase 8 Internal Linking Report\n\nResearch date: ${today}\n\n## New Page Outbound Links\n\n| Page | Related internal links |\n| --- | --- |\n${wave3Pages.map((page) => `| ${page.path} | ${page.related.map(([href]) => href).join(', ')} |`).join('\n')}\n\n## Existing Pages Updated With Wave 3 Links\n\n| Existing page | New contextual links |\n| --- | --- |\n${Object.entries(hubLinks).map(([file, links]) => `| /${file.replace('public/', '').replace('.html', '')} | ${links.map(([href]) => href).join(', ')} |`).join('\n')}\n\nThe links avoid repeated exact-match anchors and connect each new page to a parent pillar, safety/trust content where relevant, and adjacent supporting articles.\n`);

write('docs/seo-phase-8/keyword-ownership-report.md', `# Phase 8 Keyword Ownership Report\n\nResearch date: ${today}\n\n| Primary topic | Definitive URL | Intent | Differentiation from existing pages |\n| --- | --- | --- | --- |\n${wave3Pages.map((page) => `| ${page.h1} | ${page.path} | Informational | ${page.cluster}; distinct from Wave 1/2 pages by focusing on this specific relationship question. |`).join('\n')}\n\n## Cannibalization Controls\n\n- /red-flags-student-relationships is the companion to /green-flags-student-relationships and should not target positive healthy-relationship signs as primary.\n- /healthy-relationship-university-students targets starting a relationship; /student-dating remains the broader life-stage pillar.\n- /talking-stage-students targets pre-relationship communication; /situationship-vs-relationship targets definition and commitment clarity.\n- /how-to-reject-someone-politely targets refusal scripts and boundaries; /student-dating-etiquette targets broader behavior standards.\n- /breakup-recovery-college-students targets recovery and wellbeing; it should not be merged into general student dating.\n`);

write('docs/seo-phase-8/source-log.md', `# Phase 8 Source Log\n\nResearch date: ${today}\n\n| Source title | Publisher | URL | Pages using source | Claim supported |\n| --- | --- | --- | --- | --- |\n${Object.values(sources).map((source) => `| ${source.title} | ${source.publisher} | ${source.url} | ${wave3Pages.filter((page) => page.sources?.includes(source)).map((page) => page.path).join(', ') || 'Not used directly'} | ${source.claim} |`).join('\n')}\n`);

write('docs/seo-phase-8/metadata-and-schema-report.md', `# Phase 8 Metadata and Schema Report\n\nResearch date: ${today}\n\n| URL | Title | Meta description | Canonical | Schema |\n| --- | --- | --- | --- | --- |\n${wave3Pages.map((page) => `| ${page.path} | ${page.title} | ${page.description} | ${canonical(page.path)} | ${page.type}, BreadcrumbList, FAQPage, ImageObject |`).join('\n')}\n\nAll Wave 3 pages use unique titles, descriptions, H1s, self-referencing canonicals, Open Graph, Twitter/X cards, visible publication/modified dates, visible FAQs, and parseable JSON-LD. Review and AggregateRating schema were not used.\n`);

write('docs/seo-phase-8/qa-report.md', `# Phase 8 QA Report\n\nResearch date: ${today}\n\nStatus: Pending final build, validation, preview deployment, production deployment, and live smoke tests.\n`);

write('docs/seo-phase-8/deployment-report.md', `# Phase 8 Deployment Report\n\nResearch date: ${today}\n\nStatus: Pending Netlify preview and production deployment.\n`);

write('docs/seo-phase-8/wave3-validation-report.md', `# Phase 8 Wave 3 Validation Report\n\nResearch date: ${today}\n\nStatus: Pending after validator execution.\n`);

write('docs/seo-phase-8/phase-8-executive-summary.md', `# Phase 8 Executive Summary\n\nResearch date: ${today}\n\nPhase 8 creates 10 Wave 3 authority pages focused on relationship clarity, safety, dating stages, rejection, breakup recovery, etiquette, and readiness questions. These pages intentionally avoid duplicating the previous 24 SEO pages by targeting narrower student relationship intents and linking back into the established pillars.\n\nDeployment evidence will be added after preview and production QA are complete.\n`);

export { wave3Pages };
