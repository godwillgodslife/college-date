import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const outDir = join(process.cwd(), 'docs', 'seo-phase-4');
mkdirSync(outDir, { recursive: true });

const researchDate = '2026-07-20';
const sourceSummary = [
  'Google Autocomplete via suggestqueries.google.com on 2026-07-20',
  'Live SERP sampling for Nigerian dating app, campus dating, student dating, and dating safety queries on 2026-07-20',
  'Competitor pattern review: Tinder, Bumble, Badoo, Nigeria-focused dating app listings, app ranking pages, and Nigerian lifestyle publishers',
  'Safety source pattern review: FTC, FBI, RAINN, eSafety Commissioner, university safety resources',
  'Google Search Console data was not available in this environment, so demand is directional rather than exact monthly volume',
];

const demandScores = { 'Very High': 10, High: 8, Medium: 6, Low: 3, Emerging: 4, Seasonal: 5 };
const difficultyOpportunity = { Low: 9, Medium: 6, High: 3 };
const existingUrls = new Map([
  ['/about', 'Existing page refresh'],
  ['/best-dating-site-for-students-nigeria', 'Existing page expansion'],
  ['/blog', 'Existing page expansion'],
  ['/blog/best-dating-apps-nigeria-students', 'Existing page expansion'],
  ['/blog/how-to-date-safely-on-campus-nigeria', 'Existing page refresh'],
  ['/blog/online-dating-for-nigerian-students', 'Existing page expansion'],
  ['/campus-dating-app-lagos', 'Existing page expansion'],
  ['/campus-dating-safety', 'Existing page expansion'],
  ['/campus-dating', 'Existing page expansion'],
  ['/child-safety-standards', 'Existing page refresh'],
  ['/college-dating-app', 'Existing page expansion'],
  ['/dating-app-for-students', 'Existing page expansion'],
  ['/dating-app-for-university-students-nigeria', 'Existing page expansion'],
  ['/dating-app-in-nigeria', 'Existing page expansion'],
  ['/download', 'Existing page refresh'],
  ['/faq', 'Existing page refresh'],
  ['/nigeria-dating-app', 'Existing page expansion'],
  ['/online-dating-app-for-undergraduates', 'Existing page expansion'],
  ['/safe-dating-app-nigeria', 'Existing page expansion'],
  ['/safety', 'Existing page expansion'],
  ['/serious-relationship-app-nigeria-students', 'Existing page expansion'],
  ['/student-dating', 'Existing page expansion'],
  ['/university-dating-nigeria', 'Existing page expansion'],
  ['/what-is-the-college-date', 'Existing page refresh'],
]);

const clusterDefaults = {
  Commercial: {
    parent: 'Commercial and Product Discovery',
    pillar: '/dating-app-in-nigeria',
    links: ['/download', '/faq', '/safety', '/about'],
    type: 'Commercial landing page or comparison guide',
    persona: 'Someone new to online dating',
    funnel: 'Consideration',
    cta: 'Download The College Date',
    secondary: 'Read the FAQ',
    schema: 'WebPage, FAQPage, BreadcrumbList',
  },
  Campus: {
    parent: 'Campus and Student Dating',
    pillar: '/campus-dating',
    links: ['/student-dating', '/dating-app-for-university-students-nigeria', '/safety', '/download'],
    type: 'Student guide',
    persona: 'First-year undergraduate',
    funnel: 'Awareness',
    cta: 'Create a student profile',
    secondary: 'Read campus safety tips',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Safety: {
    parent: 'Online Dating Safety',
    pillar: '/safety',
    links: ['/safety', '/campus-dating-safety', '/privacy', '/support', '/child-safety-standards'],
    type: 'Safety resource',
    persona: 'Someone new to online dating',
    funnel: 'Retention or trust',
    cta: 'Read the safety guide',
    secondary: 'Contact support',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Profiles: {
    parent: 'Dating Profiles and Matching',
    pillar: '/dating-profile-guide-students',
    links: ['/dating-app-for-students', '/download', '/safety', '/faq'],
    type: 'How-to guide or tool landing page',
    persona: 'Shy student',
    funnel: 'Consideration',
    cta: 'Create your profile',
    secondary: 'Read profile safety tips',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Messaging: {
    parent: 'Conversations and Messaging',
    pillar: '/conversation-starters-dating-app',
    links: ['/dating-app-for-students', '/safety', '/download', '/relationship-advice-for-students'],
    type: 'How-to guide or tool landing page',
    persona: 'Shy student',
    funnel: 'Awareness',
    cta: 'Try The College Date',
    secondary: 'Read respectful messaging tips',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Dates: {
    parent: 'First Dates and Date Ideas',
    pillar: '/first-date-ideas-students',
    links: ['/safety', '/campus-dating', '/download', '/date-budget-calculator'],
    type: 'Guide or interactive tool landing page',
    persona: 'Someone looking for a serious relationship',
    funnel: 'Awareness',
    cta: 'Plan a safe first date',
    secondary: 'Download The College Date',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Relationships: {
    parent: 'Healthy Relationships',
    pillar: '/relationship-advice-for-students',
    links: ['/safety', '/student-dating', '/communication-in-relationships-students', '/download'],
    type: 'Relationship advice guide or quiz landing page',
    persona: 'Someone looking for a serious relationship',
    funnel: 'Awareness',
    cta: 'Explore student dating',
    secondary: 'Read safety guidance',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Breakups: {
    parent: 'Breakups, Rejection, and Emotional Wellbeing',
    pillar: '/breakup-advice-students',
    links: ['/relationship-advice-for-students', '/safety', '/support', '/student-dating'],
    type: 'Supportive advice guide',
    persona: 'Someone recovering from a breakup',
    funnel: 'Awareness',
    cta: 'Read related relationship guidance',
    secondary: 'Return when you feel ready',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
  Culture: {
    parent: 'Nigerian Dating Culture and Student Lifestyle',
    pillar: '/dating-culture-in-nigeria-students',
    links: ['/university-dating-nigeria', '/campus-dating', '/safety', '/download'],
    type: 'Culture or student lifestyle guide',
    persona: 'International student studying in Nigeria',
    funnel: 'Awareness',
    cta: 'Explore The College Date',
    secondary: 'Read campus safety tips',
    schema: 'Article, FAQPage, BreadcrumbList',
  },
};

const items = [
  // Commercial and Product Discovery - 15
  ['COM-001','Best Dating Apps in Nigeria for Students','Best Dating Apps in Nigeria for Students','/blog/best-dating-apps-nigeria-students','dating apps in Nigeria','dating app in Nigeria, Nigerian dating apps, best dating apps for students','Very High','High',10,10,8,6,'Commercial'],
  ['COM-002','Dating App for University Students in Nigeria','Dating App for University Students in Nigeria','/dating-app-for-university-students-nigeria','dating app for university students in Nigeria','student dating app Nigeria, university dating app, campus dating app Nigeria','High','Medium',10,10,9,7,'Commercial'],
  ['COM-003','Dating App in Nigeria for Campus Connections','Dating App in Nigeria for Campus Connections','/dating-app-in-nigeria','dating app in Nigeria','Nigeria dating app, dating app download Nigeria, campus connections','Very High','High',10,10,9,6,'Commercial'],
  ['COM-004','Dating App for Students','Dating App for Students','/dating-app-for-students','dating app for students','student dating app, college student dating app, uni dating app','High','High',9,10,8,6,'Commercial'],
  ['COM-005','College Dating App for Students','College Dating App for Students','/college-dating-app','college dating app','college dating site, campus dating app, dating app for college students','High','High',8,8,8,5,'Commercial'],
  ['COM-006','Nigeria Dating App for Students','Nigeria Dating App for Students','/nigeria-dating-app','Nigeria dating app for students','Nigerian dating app, student dating Nigeria, campus dating Nigeria','High','Medium',10,9,9,6,'Commercial'],
  ['COM-007','Best Dating Site for Students in Nigeria','Best Dating Site for Students in Nigeria','/best-dating-site-for-students-nigeria','best dating site for students in Nigeria','student dating site Nigeria, dating website for students, best dating app Nigeria','Medium','Medium',8,8,7,5,'Commercial'],
  ['COM-008','Safe Dating App in Nigeria for Students','Safe Dating App in Nigeria for Students','/safe-dating-app-nigeria','safe dating app Nigeria','safe dating app for students, online dating safety Nigeria, student dating safety','Medium','Medium',9,9,8,10,'Commercial'],
  ['COM-009','Serious Relationship App in Nigeria for Students','Serious Relationship App in Nigeria for Students','/serious-relationship-app-nigeria-students','serious relationship app Nigeria students','serious dating app Nigeria, relationship app for students, intentional dating','Medium','Medium',8,8,8,6,'Commercial'],
  ['COM-010','Online Dating App for Undergraduates','Online Dating App for Undergraduates','/online-dating-app-for-undergraduates','online dating app for undergraduates','undergraduate dating app, dating app for college students, student online dating','Medium','Medium',8,8,8,6,'Commercial'],
  ['COM-011','Polytechnic Dating App in Nigeria','Polytechnic Dating App in Nigeria','/polytechnic-dating-app-nigeria','polytechnic dating app Nigeria','dating app for polytechnic students, student dating app Nigeria, campus dating','Low','Low',8,8,7,5,'Commercial'],
  ['COM-012','Free Dating Apps in Nigeria for Students: What to Know','Free Dating Apps in Nigeria for Students: What to Know','/free-dating-apps-in-nigeria-for-students','free dating apps in Nigeria for students','dating apps in Nigeria without payment, free dating app Nigeria, student dating app free','High','High',8,7,7,7,'Commercial'],
  ['COM-013','Download The College Date App','Download The College Date App','/download','The College Date app download','College Date app download, CD app download, dating app for Nigerian students Android','Medium','Low',10,8,10,5,'Commercial'],
  ['COM-014','Dating Apps in Nigeria Without Payment: Student Guide','Dating Apps in Nigeria Without Payment: A Student Guide','/dating-apps-in-nigeria-without-payment-students','dating apps in Nigeria without payment','free dating apps Nigeria, dating app in Nigeria for free, dating app costs','High','High',7,7,6,7,'Commercial'],
  ['COM-015','Student Dating Platforms in Nigeria Compared','Student Dating Platforms in Nigeria Compared','/student-dating-platforms-nigeria','student dating platforms Nigeria','dating app comparison Nigeria, campus dating app comparison, student dating sites','Medium','Medium',8,8,8,6,'Commercial'],

  // Campus and Student Dating - 15
  ['CAMP-001','Campus Dating App for Student Connections','Campus Dating App for Student Connections','/campus-dating','campus dating app','campus dating, dating on campus, student connections','Medium','Medium',10,10,9,6,'Campus'],
  ['CAMP-002','Student Dating App for University Communities','Student Dating App for University Communities','/student-dating','student dating app','student dating, university dating app, college dating app','High','High',9,10,9,6,'Campus'],
  ['CAMP-003','University Dating in Nigeria','University Dating in Nigeria','/university-dating-nigeria','university dating Nigeria','dating in Nigerian universities, campus relationships, student dating Nigeria','Medium','Medium',8,10,7,6,'Campus'],
  ['CAMP-004','Dating as a Fresher: A Nigerian Student Guide','Dating as a Fresher: A Nigerian Student Guide','/dating-as-a-fresher','dating as a fresher','fresher dating advice, first year dating, campus dating tips','Emerging','Low',7,8,6,7,'Campus'],
  ['CAMP-005','How to Meet People on Campus Without Pressure','How to Meet People on Campus Without Pressure','/how-to-meet-people-on-campus','how to meet people on campus','make friends on campus, meet students, campus social life','Medium','Medium',7,9,6,5,'Campus'],
  ['CAMP-006','Campus Crush Advice for Students','Campus Crush Advice for Students','/campus-crush-advice','campus crush advice','campus crush meaning, how to talk to your crush, student crush','Medium','Medium',7,8,6,5,'Campus'],
  ['CAMP-007','Dating During Exams: How to Keep Balance','Dating During Exams: How to Keep Balance','/dating-during-exams','dating during exams','dating during exam season, does dating affect studies, relationship and exams','Medium','Low',6,8,4,5,'Campus'],
  ['CAMP-008','Balancing School and Relationships','Balancing School and Relationships','/balancing-school-and-relationships','balancing school and relationships','relationship and studies, student relationship balance, dating in school','Medium','Medium',6,9,5,5,'Campus'],
  ['CAMP-009','Hostel Dating Boundaries for Students','Hostel Dating Boundaries for Students','/hostel-dating-boundaries','hostel dating boundaries','hostel dating, student privacy, campus boundaries','Low','Low',6,8,4,8,'Campus'],
  ['CAMP-010','Off-Campus Dating Safety for Students','Off-Campus Dating Safety for Students','/off-campus-dating-safety-students','off-campus dating safety','student dating safety, first meeting safety, campus dating safety','Medium','Low',7,8,5,10,'Campus'],
  ['CAMP-011','Dating in Final Year: Time, Pressure, and Intentions','Dating in Final Year: Time, Pressure, and Intentions','/dating-in-final-year','dating in final year','final year relationship, dating while graduating, serious student dating','Low','Low',6,7,5,5,'Campus'],
  ['CAMP-012','Postgraduate Student Dating Guide','Postgraduate Student Dating Guide','/postgraduate-student-dating','postgraduate student dating','grad student dating app, dating as a postgraduate, mature student dating','Medium','Medium',6,7,5,5,'Campus'],
  ['CAMP-013','Dating Guide for Shy Students','Dating Guide for Shy Students','/shy-student-dating-guide','dating guide for shy students','shy dating advice, introvert dating students, how to start dating','Medium','Medium',7,8,7,5,'Campus'],
  ['CAMP-014','Friendship Before Dating: A Student Guide','Friendship Before Dating: A Student Guide','/friendship-before-dating-students','friendship before dating','friends before dating, student friendships, low pressure dating','Medium','Medium',6,8,6,5,'Campus'],
  ['CAMP-015','Student Dating Etiquette on Campus','Student Dating Etiquette on Campus','/student-dating-etiquette','student dating etiquette','dating etiquette, campus dating rules, respectful dating students','Medium','Medium',7,9,6,8,'Campus'],

  // Safety - 12
  ['SAF-001','Safety on The College Date','Safety on The College Date','/safety','The College Date safety','dating app safety, student dating safety, reporting dating app','Medium','Low',10,10,7,10,'Safety'],
  ['SAF-002','Campus Dating Safety','Campus Dating Safety','/campus-dating-safety','campus dating safety','dating safely on campus, student dating safety, first date safety','Medium','Low',8,10,6,10,'Safety'],
  ['SAF-003','How to Date Safely on Campus in Nigeria','How to Date Safely on Campus in Nigeria','/blog/how-to-date-safely-on-campus-nigeria','how to date safely on campus Nigeria','campus dating safety Nigeria, student safety dating apps, safe first meeting','Medium','Low',8,10,6,10,'Safety'],
  ['SAF-004','Romance Scams in Nigeria: Student Safety Guide','Romance Scams in Nigeria: Student Safety Guide','/romance-scams-nigeria-students','romance scams Nigeria','Nigerian romance scams, online dating scams, dating app scam signs','High','High',8,10,5,10,'Safety'],
  ['SAF-005','Online Dating Red Flags for Students','Online Dating Red Flags for Students','/online-dating-red-flags-students','online dating red flags','dating red flags texting, online relationship red flags, student dating red flags','High','High',8,10,6,10,'Safety'],
  ['SAF-006','How to Spot Fake Dating Profiles','How to Spot Fake Dating Profiles','/fake-dating-profiles','fake dating profiles','fake dating profile pictures, fake dating profile checker, catfish dating profile','High','High',7,9,5,10,'Safety'],
  ['SAF-007','Dating App Privacy Tips for Students','Dating App Privacy Tips for Students','/dating-app-privacy-students','dating app privacy','dating app privacy concerns, dating app security, student privacy online','Medium','Medium',7,9,5,10,'Safety'],
  ['SAF-008','First Meeting Safety After Matching Online','First Meeting Safety After Matching Online','/first-meeting-safety-dating-app','first meeting safety dating app','online date safety, meet in public, dating app first date safety','Medium','Medium',8,9,5,10,'Safety'],
  ['SAF-009','Consent in Student Relationships','Consent in Student Relationships','/consent-in-student-relationships','consent in relationships','dating consent, student relationship boundaries, respectful dating','Medium','Medium',7,10,3,10,'Safety'],
  ['SAF-010','Digital Harassment in Dating: What Students Should Know','Digital Harassment in Dating: What Students Should Know','/digital-harassment-dating','digital harassment dating','digital dating abuse, online dating harassment, dating app harassment','Medium','Medium',7,9,3,10,'Safety'],
  ['SAF-011','What Not to Share on Dating Apps','What Not to Share on Dating Apps','/what-not-to-share-on-dating-apps','what not to share on dating apps','dating app privacy, personal information dating apps, online dating safety tips','Medium','Medium',7,9,5,10,'Safety'],
  ['SAF-012','How to Report Suspicious Behaviour on Dating Apps','How to Report Suspicious Behaviour on Dating Apps','/how-to-report-suspicious-behaviour-dating-app','report suspicious behaviour dating app','block and report dating app, dating app safety report, suspicious profile','Low','Low',7,8,4,10,'Safety'],

  // Profiles - 10
  ['PRO-001','Dating Bio Examples for Students','Dating Bio Examples for Students','/dating-bio-examples-students','dating bio examples students','dating profile bio examples, student dating bio, bio examples for dating apps','High','Medium',9,10,9,5,'Profiles'],
  ['PRO-002','Dating Bio Generator for Students','Dating Bio Generator for Students','/dating-bio-generator','dating bio generator','dating profile bio generator, dating prompt generator, bio ideas dating app','High','Medium',10,10,10,4,'Profiles'],
  ['PRO-003','Dating Profile Picture Tips for Students','Dating Profile Picture Tips for Students','/dating-profile-picture-tips-students','dating profile picture tips','dating profile pictures, profile photo examples, dating photos students','High','Medium',8,9,8,7,'Profiles'],
  ['PRO-004','Profile Photo Checklist for Dating Apps','Profile Photo Checklist for Dating Apps','/profile-photo-checklist','profile photo checklist dating app','dating profile photo checklist, best dating profile pictures, profile photo tips','Medium','Low',8,9,8,7,'Profiles'],
  ['PRO-005','Dating Profile Mistakes Students Should Avoid','Dating Profile Mistakes Students Should Avoid','/dating-profile-mistakes-students','dating profile mistakes','dating profile mistakes students, bad dating profile examples, profile tips','Medium','Medium',8,9,8,5,'Profiles'],
  ['PRO-006','How to Get More Matches on Dating Apps','How to Get More Matches on Dating Apps','/how-to-get-more-matches-dating-app','how to get more matches dating app','get more matches on dating apps, dating profile tips, better matches','High','High',8,9,9,5,'Profiles'],
  ['PRO-007','Dating Profile Prompts for Students','Dating Profile Prompts for Students','/dating-profile-prompts-students','dating profile prompts','dating prompt answers, dating profile questions, profile prompt examples','High','Medium',8,9,8,4,'Profiles'],
  ['PRO-008','How to State Your Intentions on a Dating Profile','How to State Your Intentions on a Dating Profile','/how-to-state-intentions-dating-profile','state intentions dating profile','serious relationship profile, dating profile intentions, honest dating profile','Medium','Medium',8,8,8,6,'Profiles'],
  ['PRO-009','Verified Dating Profiles: What Students Should Know','Verified Dating Profiles: What Students Should Know','/verified-dating-profiles-students','verified dating profile','verified dating apps, profile verification, safe dating profiles','Medium','Medium',8,8,7,9,'Profiles'],
  ['PRO-010','Dating Profile Examples for Shy Students','Dating Profile Examples for Shy Students','/profile-examples-for-shy-students','dating profile examples shy students','introvert dating profile, shy dating bio, student profile examples','Medium','Medium',8,8,8,5,'Profiles'],

  // Conversations - 12
  ['MSG-001','Conversation Starter Generator for Dating Apps','Conversation Starter Generator for Dating Apps','/conversation-starters-dating-app','conversation starters dating app','first message dating app, good conversation starters, flirty conversation starters','High','Medium',10,10,10,4,'Messaging'],
  ['MSG-002','First Message Examples for Dating Apps','First Message Examples for Dating Apps','/first-message-examples-dating-app','first message examples dating app','dating app opener examples, first text after matching, opening messages','High','Medium',9,9,9,4,'Messaging'],
  ['MSG-003','How to Text a Match Without Being Awkward','How to Text a Match Without Being Awkward','/how-to-text-a-match','how to text a match','how to text a girl you matched with, text after matching, dating app texting','High','High',8,9,8,5,'Messaging'],
  ['MSG-004','How to Keep a Conversation Going on a Dating App','How to Keep a Conversation Going on a Dating App','/how-to-keep-a-conversation-going','how to keep a conversation going','keep chat interesting, dating app conversation tips, questions to ask','High','Medium',8,9,8,4,'Messaging'],
  ['MSG-005','How to Fix a Dry Conversation on a Dating App','How to Fix a Dry Conversation on a Dating App','/dry-conversation-dating-app','dry conversation dating app','dry texter dating, boring conversation dating, revive a conversation','Medium','Medium',7,8,7,4,'Messaging'],
  ['MSG-006','When to Ask Someone Out After Matching','When to Ask Someone Out After Matching','/when-to-ask-someone-out-dating-app','when to ask someone out dating app','ask match on a date, when to ask someone out, first date timing','High','Medium',8,8,8,6,'Messaging'],
  ['MSG-007','Respectful Flirting Tips for Students','Respectful Flirting Tips for Students','/respectful-flirting-students','respectful flirting','flirting tips students, how to flirt respectfully, dating boundaries','Medium','Medium',7,9,6,9,'Messaging'],
  ['MSG-008','Talking Stage Meaning for Students','Talking Stage Meaning for Students','/talking-stage-meaning-students','talking stage meaning','talking stage, talking stage vs situationship, talking stage guide','High','Medium',8,8,6,5,'Messaging'],
  ['MSG-009','Talking Stage Questions to Ask','Talking Stage Questions to Ask','/talking-stage-questions','talking stage questions','questions to ask in talking stage, talking stage conversations, get to know you questions','High','Medium',8,8,7,4,'Messaging'],
  ['MSG-010','Ghosting Meaning in Dating','Ghosting Meaning in Dating','/ghosting-meaning-dating','ghosting meaning dating','what is ghosting in dating, ghosting dating term, why people ghost','High','Medium',7,8,4,6,'Messaging'],
  ['MSG-011','How to Reply After Being Left on Read','How to Reply After Being Left on Read','/how-to-reply-after-being-left-on-read','left on read reply','what to say after left on read, dating text reply, ghosted or busy','Medium','Medium',6,7,5,5,'Messaging'],
  ['MSG-012','Conversation Boundaries on Dating Apps','Conversation Boundaries on Dating Apps','/conversation-boundaries-dating-app','conversation boundaries dating app','dating app boundaries, respectful texting, online dating consent','Medium','Low',7,8,5,9,'Messaging'],

  // First Dates - 10
  ['DATE-001','First Date Ideas for Students','First Date Ideas for Students','/first-date-ideas-students','first date ideas students','first date ideas college students, good first date ideas, date ideas students','High','Medium',9,10,8,7,'Dates'],
  ['DATE-002','Campus Date Ideas for Students','Campus Date Ideas for Students','/campus-date-ideas','campus date ideas','date ideas on campus, student date ideas, campus dating','Medium','Low',8,9,7,6,'Dates'],
  ['DATE-003','Cheap Date Ideas for Students','Cheap Date Ideas for Students','/cheap-date-ideas-students','cheap date ideas students','cheap date ideas college students, date ideas on a budget, student budget dates','High','Medium',8,9,7,5,'Dates'],
  ['DATE-004','Campus Date Budget Calculator','Campus Date Budget Calculator','/date-budget-calculator','date budget calculator','date cost calculator, student date budget, cheap date planner','Medium','Low',9,9,9,4,'Dates'],
  ['DATE-005','First Date Planner for Students','First Date Planner for Students','/first-date-planner','first date planner','date planner, first date ideas, safe first date plan','Medium','Low',9,9,9,7,'Dates'],
  ['DATE-006','First Date Questions for Students','First Date Questions for Students','/first-date-questions-students','first date questions','first date questions to ask, questions for first date, student first date','Very High','High',8,9,7,5,'Dates'],
  ['DATE-007','What to Wear on a First Date as a Student','What to Wear on a First Date as a Student','/what-to-wear-on-a-first-date-students','what to wear on first date','first date outfit students, what to wear on a date, casual date outfit','Very High','High',7,7,6,3,'Dates'],
  ['DATE-008','Where to Go on a Date in Lagos as a Student','Where to Go on a Date in Lagos as a Student','/where-to-go-on-a-date-in-lagos-students','where to go on a date in Lagos','Lagos date ideas, student date ideas Lagos, affordable dates Lagos','High','Medium',8,8,7,6,'Dates'],
  ['DATE-009','Rainy-Day Date Ideas for Students','Rainy-Day Date Ideas for Students','/rainy-day-date-ideas-students','rainy day date ideas students','indoor date ideas, rainy day dates, student date ideas','Medium','Medium',6,7,5,4,'Dates'],
  ['DATE-010','After the First Date: What Should Students Do Next?','After the First Date: What Should Students Do Next?','/after-first-date-what-next','after first date what next','what to text after first date, second date advice, first date follow up','High','Medium',7,8,6,5,'Dates'],

  // Healthy Relationships - 12
  ['REL-001','Relationship Advice for Students','Relationship Advice for Students','/relationship-advice-for-students','relationship advice for students','relationship advice college students, dating advice for college students, student relationships','High','Medium',8,10,6,7,'Relationships'],
  ['REL-002','Green Flags in a Relationship for Students','Green Flags in a Relationship for Students','/green-flags-in-a-relationship-students','green flags in a relationship','green flags relationship examples, healthy relationship signs, student relationships','High','High',7,9,5,7,'Relationships'],
  ['REL-003','Green Flag Checklist for Healthy Relationships','Green Flag Checklist for Healthy Relationships','/green-flag-checklist','green flag checklist','healthy relationship checklist, green flags list, relationship checklist','Medium','Medium',8,9,6,7,'Relationships'],
  ['REL-004','Relationship Boundaries for Students','Relationship Boundaries for Students','/relationship-boundaries-students','relationship boundaries','relationship boundaries examples, dating boundaries, student relationship boundaries','Very High','High',8,10,5,9,'Relationships'],
  ['REL-005','Communication in Relationships for Students','Communication in Relationships for Students','/communication-in-relationships-students','communication in relationships','relationship communication, student relationship advice, how to communicate','High','High',7,9,5,6,'Relationships'],
  ['REL-006','Trust in Student Relationships','Trust in Student Relationships','/trust-in-student-relationships','trust in relationships','building trust, student relationships, healthy relationship trust','Medium','Medium',7,8,5,6,'Relationships'],
  ['REL-007','Jealousy in Student Relationships','Jealousy in Student Relationships','/jealousy-in-student-relationships','jealousy in relationship','relationship jealousy, jealousy examples, healthy jealousy','High','High',6,8,4,7,'Relationships'],
  ['REL-008','Conflict Resolution for Student Relationships','Conflict Resolution for Student Relationships','/conflict-resolution-relationships-students','conflict resolution relationships','relationship conflict, argument in relationship, communication conflict','Medium','Medium',6,8,4,6,'Relationships'],
  ['REL-009','Emotional Maturity in Relationships','Emotional Maturity in Relationships','/emotional-maturity-in-relationships','emotional maturity in relationships','mature relationship signs, emotional intelligence dating, student relationships','Medium','Medium',6,8,4,6,'Relationships'],
  ['REL-010','Long-Distance Relationships in University','Long-Distance Relationships in University','/long-distance-relationship-university','long distance relationship university','long distance relationship during university, LDR students, university relationship','Medium','Medium',6,8,4,5,'Relationships'],
  ['REL-011','Love Languages for Students','Love Languages for Students','/love-languages-for-students','love languages for students','love language quiz, love languages relationship, student couples','High','High',6,7,5,4,'Relationships'],
  ['REL-012','Compatibility Quiz for Students','Compatibility Quiz for Students','/compatibility-quiz-students','compatibility quiz students','relationship compatibility quiz, student relationship quiz, dating compatibility','High','Medium',8,8,8,4,'Relationships'],

  // Breakups - 7
  ['BRK-001','Breakup Advice for Students','Breakup Advice for Students','/breakup-advice-students','breakup advice students','breakup advice, student breakup, how to handle breakup in school','Medium','Medium',5,8,2,7,'Breakups'],
  ['BRK-002','How to Handle Rejection in Dating','How to Handle Rejection in Dating','/how-to-handle-rejection-dating','how to handle rejection dating','handle rejection gracefully, rejection in love, dating rejection','High','High',5,8,2,6,'Breakups'],
  ['BRK-003','How to Move On From a Breakup as a Student','How to Move On From a Breakup as a Student','/how-to-move-on-from-breakup-students','how to move on from a breakup','move on from breakup, breakup recovery, student heartbreak','Very High','High',5,8,2,7,'Breakups'],
  ['BRK-004','Seeing Your Ex on Campus','Seeing Your Ex on Campus','/seeing-your-ex-on-campus','seeing your ex on campus','ex on campus, how to act around your ex, student breakup','Low','Low',4,7,1,6,'Breakups'],
  ['BRK-005','How to Know When You Are Ready to Date Again','How to Know When You Are Ready to Date Again','/how-to-know-when-to-date-again','when to date again after breakup','ready to date again, dating after breakup, emotional readiness','Medium','Medium',5,7,3,6,'Breakups'],
  ['BRK-006','Coping With Ghosting','Coping With Ghosting','/coping-with-ghosting','coping with ghosting','how to deal with ghosting, ghosted after talking, dating ghosting','Medium','Medium',5,7,2,6,'Breakups'],
  ['BRK-007','How to End a Relationship Respectfully','How to End a Relationship Respectfully','/how-to-end-a-relationship-respectfully','how to end a relationship respectfully','break up respectfully, end relationship kindly, student breakup advice','Medium','Medium',5,8,2,7,'Breakups'],

  // Culture and Lifestyle - 7
  ['CUL-001','Dating Culture in Nigeria for Students','Dating Culture in Nigeria for Students','/dating-culture-in-nigeria-students','dating culture in Nigeria','dating in Nigerian culture, Nigerian student dating, university dating culture','High','Medium',7,10,5,6,'Culture'],
  ['CUL-002','Campus Relationship Expectations in Nigerian Universities','Campus Relationship Expectations in Nigerian Universities','/campus-relationship-expectations-nigeria','university dating culture Nigeria','dating in Nigerian universities, campus relationship expectations, student relationships Nigeria','Medium','Medium',7,10,5,6,'Culture'],
  ['CUL-003','Social Media and Relationships for Students','Social Media and Relationships for Students','/social-media-and-relationships-students','social media and relationships','social media relationship problems, student relationships, online boundaries','High','High',6,8,3,7,'Culture'],
  ['CUL-004','Valentine Ideas for Students in Nigeria','Valentine Ideas for Students in Nigeria','/valentine-ideas-students-nigeria','Valentine ideas students Nigeria','Valentine ideas for students, cheap Valentine ideas, student date ideas','Seasonal','Medium',7,7,6,5,'Culture'],
  ['CUL-005','Student Budget Dating in Nigeria','Student Budget Dating in Nigeria','/student-budget-dating-nigeria','student budget dating','dating on a student budget, affordable dating Nigeria, cheap student dates','Emerging','Low',7,8,6,5,'Culture'],
  ['CUL-006','Dating Expectations Among Nigerian Students','Dating Expectations Among Nigerian Students','/dating-expectations-nigerian-students','dating expectations Nigerian students','relationship expectations, Nigerian student dating culture, serious dating','Medium','Medium',6,8,4,6,'Culture'],
  ['CUL-007','Resumption Week Dating and Social Life','Resumption Week Dating and Social Life','/resumption-week-dating-students','resumption week dating','freshers week dating, campus resumption, student social life','Seasonal','Low',6,7,5,5,'Culture'],
];

function intentFor(cluster, title) {
  if (cluster === 'Commercial') return title.includes('Download') ? 'Transactional' : 'Commercial';
  if (title.includes('Generator') || title.includes('Calculator') || title.includes('Quiz') || title.includes('Checklist') || title.includes('Planner')) return 'Mixed';
  return 'Informational';
}

function wordCountFor(cluster, title) {
  if (title.includes('Generator') || title.includes('Calculator') || title.includes('Quiz') || title.includes('Checklist') || title.includes('Planner')) return '600-1,000 words plus interactive tool';
  if (cluster === 'Commercial') return '1,200-2,000 words';
  if (cluster === 'Safety') return '1,000-1,800 words';
  return '900-1,500 words';
}

function h2Outline(cluster, title, keyword) {
  const base = [
    `What ${keyword} means for students`,
    'Why it matters on Nigerian campuses',
    'Practical steps and examples',
    'Mistakes to avoid',
    'Safety and privacy notes',
    'How The College Date fits naturally',
    'FAQs',
  ];
  if (cluster === 'Commercial') return ['Short answer: who this page is for','What students should look for','Comparison criteria','Safety and trust checks','Where The College Date fits','Download and next steps','FAQs'];
  if (cluster === 'Safety') return ['Short safety answer','Common risks to understand','Warning signs','What students should do','When to block, report, or seek help','Useful official resources','FAQs'];
  if (title.includes('Generator') || title.includes('Calculator') || title.includes('Quiz') || title.includes('Checklist') || title.includes('Planner')) return ['What this tool does','Who should use it','How to use it','Privacy and safety notes','Recommended next steps','Related guides','FAQs'];
  return base;
}

function questions(title, keyword) {
  return [
    `What is ${keyword}?`,
    `How should students approach ${keyword}?`,
    `What should Nigerian students know before acting on this advice?`,
    `How can The College Date help with this safely?`,
  ];
}

function intro(title, keyword, cluster) {
  if (cluster === 'Safety') return `${title} should give students a clear, calm way to understand risk, protect their privacy, and know when to block, report, or ask for help.`;
  if (cluster === 'Commercial') return `${title} should help Nigerian students compare options without hype and understand when a campus-focused app like The College Date is the right fit.`;
  if (title.includes('Generator') || title.includes('Calculator') || title.includes('Quiz') || title.includes('Checklist') || title.includes('Planner')) return `${title} should explain the tool quickly, show who it helps, and guide students toward a useful result before any product CTA.`;
  return `${title} should answer the student’s main question first, then give practical Nigerian campus examples and safety-conscious next steps.`;
}

function score(item) {
  const [, , , , , , demand, difficulty, business, topical, conversion, safety] = item;
  const ranking = difficultyOpportunity[difficulty];
  const demandScore = demandScores[demand];
  const seasonality = demand === 'Seasonal' ? 10 : demand === 'Emerging' ? 7 : 5;
  const siteAdvantage = existingUrls.has(item[3]) ? 10 : 6;
  return Math.round(
    demandScore * 2 +
    ranking * 1.5 +
    business * 2 +
    topical * 1.5 +
    conversion +
    safety +
    seasonality * 0.5 +
    siteAdvantage * 0.5
  );
}

const briefs = items.map((raw, index) => {
  const [id, workingTitle, h1, slug, primaryKeyword, secondaryKeywords, demand, difficulty, businessValue, topicalAuthorityValue, conversionPotential, safetyTrustImportance, cluster] = raw;
  const defaults = clusterDefaults[cluster];
  const status = existingUrls.get(slug) || 'New page';
  const schema = workingTitle.includes('Generator') || workingTitle.includes('Calculator') || workingTitle.includes('Quiz') ? 'SoftwareApplication, WebPage, FAQPage, BreadcrumbList' : defaults.schema;
  const parentPillar = defaults.pillar;
  return {
    brief_id: id,
    priority_rank: index + 1,
    working_title: workingTitle,
    recommended_h1: h1,
    target_url_slug: slug,
    content_status: status,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondaryKeywords,
    relevant_question_queries: questions(workingTitle, primaryKeyword),
    search_intent: intentFor(cluster, workingTitle),
    funnel_stage: defaults.funnel,
    estimated_demand: demand,
    estimated_ranking_difficulty: difficulty,
    business_value_score: businessValue,
    topical_authority_value: topicalAuthorityValue,
    conversion_potential: conversionPotential,
    safety_or_trust_importance: safetyTrustImportance,
    overall_priority_score: score(raw),
    target_audience_persona: defaults.persona,
    parent_topic_cluster: defaults.parent,
    recommended_content_type: defaults.type,
    recommended_word_count_range: wordCountFor(cluster, workingTitle),
    searchers_main_question: `What should I know about ${primaryKeyword} as a student?`,
    recommended_answer_first_introduction: intro(workingTitle, primaryKeyword, cluster),
    proposed_h2_h3_outline: h2Outline(cluster, workingTitle, primaryKeyword),
    originality_requirement: 'Include student-specific scenarios, Nigerian campus context where relevant, and practical examples that are not copied from generic dating advice pages.',
    nigerian_or_student_specific_examples_to_include: 'Use examples from lectures, hostels, faculty events, resumption periods, Lagos hangouts, student budgets, campus transport, group chats, and Android-first mobile usage where natural.',
    required_factual_claims_to_verify: cluster === 'Commercial'
      ? 'Verify The College Date app availability, Android package com.collegedate.app, official Google Play URL, and avoid unsupported ranking or user-count claims.'
      : cluster === 'Safety'
        ? 'Verify safety claims against official or reputable sources; do not give legal, medical, or mental-health advice beyond general guidance.'
        : 'Verify any factual claims about The College Date, Nigerian locations, school terms, app features, and public safety guidance.',
    recommended_authoritative_source_types: cluster === 'Safety'
      ? 'Official safety agencies, consumer protection bodies, reputable NGOs, university safety offices, platform policy pages.'
      : 'Official app pages, Google Play listing, university resources, reputable Nigerian media, expert-reviewed relationship or safety resources.',
    existing_internal_pages_to_link_to: defaults.links,
    future_supporting_pages_that_should_link_to_it: [],
    required_link_to_parent_pillar: parentPillar,
    safety_page_linking_requirement: cluster === 'Safety' ? 'Mandatory: link to /safety, /support, and /privacy where relevant.' : 'Link to /safety when the page discusses meeting, privacy, scams, boundaries, consent, or messaging risk.',
    primary_cta: defaults.cta,
    secondary_cta: defaults.secondary,
    recommended_cta_placement: 'One contextual CTA after the first useful section and one gentle final CTA. Avoid interrupting safety or wellbeing advice.',
    featured_image_concept: `${workingTitle} visual with Nigerian student/campus context, app-neutral composition, and no fake testimonial elements.`,
    suggested_image_alt_text: `${workingTitle} guide for Nigerian students`,
    recommended_schema: schema,
    suggested_faq_questions: questions(workingTitle, primaryKeyword).slice(0, 3),
    featured_snippet_or_ai_answer_opportunity: 'Add a 40-60 word answer box near the top, followed by a concise checklist or table that can be cited by AI search systems.',
    suggested_author_or_expert_reviewer_type: cluster === 'Safety' ? 'Editorial author plus safety or student wellbeing reviewer' : 'Editorial author with Nigerian student lifestyle familiarity',
    freshness_or_update_schedule: demand === 'Seasonal' ? 'Review annually before the relevant season.' : cluster === 'Commercial' ? 'Review quarterly for app/store/competitor changes.' : 'Review every 6-12 months, sooner if user safety or product facts change.',
    cannibalization_risks: status.startsWith('Existing') ? 'Refresh the existing URL; do not create a duplicate page for this intent.' : `Differentiate from ${parentPillar} by keeping this page focused on ${primaryKeyword}.`,
    notes_for_writer: 'Follow the Editorial Handbook: educate first, avoid stereotypes, avoid fake claims, use calm student-focused language, and make the content useful without search traffic.',
    notes_for_developer_or_publisher: 'Add canonical self-reference, BreadcrumbList, appropriate Article/FAQ/tool schema, internal related-links block, optimized image metadata, and sitemap inclusion only when published.',
  };
});

// Populate supporting-page backlinks after all slugs exist.
for (const brief of briefs) {
  const sameCluster = briefs
    .filter((item) => item.parent_topic_cluster === brief.parent_topic_cluster && item.brief_id !== brief.brief_id)
    .slice(0, 5)
    .map((item) => item.target_url_slug);
  brief.future_supporting_pages_that_should_link_to_it = sameCluster;
}

function walkHtml(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, files);
    else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('google')) files.push(full);
  }
  return files;
}

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function get(html, regex) {
  return (html.match(regex) || [])[1]?.replace(/\s+/g, ' ').trim() || '';
}

const inventoryRows = walkHtml(join(process.cwd(), 'public')).sort().map((file) => {
  const html = readFileSync(file, 'utf8');
  const rel = relative(join(process.cwd(), 'public'), file).replace(/\\/g, '/');
  const url = `/${rel.replace(/\.html$/, '')}`;
  const words = strip(html).split(/\s+/).filter(Boolean).length;
  const title = get(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = get(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const matchingBrief = briefs.find((brief) => brief.target_url_slug === url);
  const action = url === '/404'
    ? 'Leave unchanged'
    : matchingBrief
      ? matchingBrief.content_status.includes('refresh') ? 'Refresh' : 'Expand'
      : words < 250 ? 'Retain but consider future expansion' : 'Retain';
  return {
    existing_url: url,
    current_page_title: title,
    primary_topic: h1 || title,
    likely_target_keyword: matchingBrief?.primary_keyword || title.replace(/ - The College Date$/i, ''),
    content_type: url.startsWith('/blog/') ? 'Blog article' : url === '/404' ? 'Utility page' : 'Static SEO page',
    parent_cluster: matchingBrief?.parent_topic_cluster || inferCluster(url),
    approximate_content_depth: words < 250 ? `Thin (${words} words)` : words < 600 ? `Moderate (${words} words)` : `Substantial (${words} words)`,
    recommendation: action,
    cannibalization_note: matchingBrief ? 'Brief targets this existing URL; do not create a duplicate.' : 'No direct backlog duplicate identified.',
  };
});

function inferCluster(url) {
  if (url.includes('safety')) return 'Online Dating Safety';
  if (url.includes('dating-app') || url.includes('download') || url.includes('college-date')) return 'Commercial and Product Discovery';
  if (url.includes('campus') || url.includes('student') || url.includes('university')) return 'Campus and Student Dating';
  if (url.includes('privacy') || url.includes('terms') || url.includes('support') || url.includes('about') || url.includes('press') || url.includes('faq')) return 'Trust and Brand';
  return 'General';
}

const csvFields = Object.keys(briefs[0]);
function csvValue(value) {
  const normalized = Array.isArray(value) ? value.join(' | ') : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}
const csv = [csvFields.join(','), ...briefs.map((brief) => csvFields.map((field) => csvValue(brief[field])).join(','))].join('\n');

function table(rows, cols) {
  return [
    `| ${cols.join(' | ')} |`,
    `| ${cols.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${cols.map((col) => String(row[col] ?? '').replace(/\|/g, '/')).join(' | ')} |`),
  ].join('\n');
}

const inventoryMd = `# Existing Content Inventory\n\nResearch date: ${researchDate}\n\n${table(inventoryRows, ['existing_url','current_page_title','primary_topic','likely_target_keyword','content_type','parent_cluster','approximate_content_depth','recommendation','cannibalization_note'])}\n`;

const briefMd = `# The College Date - 100 SEO Content Briefs\n\nResearch date: ${researchDate}\n\nDemand labels are directional estimates because no authenticated keyword-volume tool or Search Console export was available.\n\n${briefs.map((b) => `## ${b.brief_id}: ${b.working_title}\n\n- Recommended H1: ${b.recommended_h1}\n- Target URL slug: ${b.target_url_slug}\n- Content status: ${b.content_status}\n- Primary keyword: ${b.primary_keyword}\n- Secondary keywords: ${b.secondary_keywords}\n- Relevant question queries: ${b.relevant_question_queries.join(' | ')}\n- Search intent: ${b.search_intent}\n- Funnel stage: ${b.funnel_stage}\n- Estimated demand: ${b.estimated_demand}\n- Estimated ranking difficulty: ${b.estimated_ranking_difficulty}\n- Business value score: ${b.business_value_score}/10\n- Topical authority value: ${b.topical_authority_value}/10\n- Conversion potential: ${b.conversion_potential}/10\n- Safety or trust importance: ${b.safety_or_trust_importance}/10\n- Overall priority score: ${b.overall_priority_score}/100\n- Target audience persona: ${b.target_audience_persona}\n- Parent topic cluster: ${b.parent_topic_cluster}\n- Recommended content type: ${b.recommended_content_type}\n- Recommended word-count range: ${b.recommended_word_count_range}\n- Searcher's main question: ${b.searchers_main_question}\n- Recommended answer-first introduction: ${b.recommended_answer_first_introduction}\n- Proposed H2/H3 outline: ${b.proposed_h2_h3_outline.join(' | ')}\n- Originality requirement: ${b.originality_requirement}\n- Nigerian/student examples to include: ${b.nigerian_or_student_specific_examples_to_include}\n- Required factual claims to verify: ${b.required_factual_claims_to_verify}\n- Recommended authoritative source types: ${b.recommended_authoritative_source_types}\n- Existing internal pages to link to: ${b.existing_internal_pages_to_link_to.join(' | ')}\n- Future supporting pages that should link to it: ${b.future_supporting_pages_that_should_link_to_it.join(' | ')}\n- Required link to parent pillar: ${b.required_link_to_parent_pillar}\n- Safety-page linking requirement: ${b.safety_page_linking_requirement}\n- Primary CTA: ${b.primary_cta}\n- Secondary CTA: ${b.secondary_cta}\n- Recommended CTA placement: ${b.recommended_cta_placement}\n- Featured image concept: ${b.featured_image_concept}\n- Suggested image alt text: ${b.suggested_image_alt_text}\n- Recommended schema: ${b.recommended_schema}\n- Suggested FAQ questions: ${b.suggested_faq_questions.join(' | ')}\n- Featured-snippet or AI-answer opportunity: ${b.featured_snippet_or_ai_answer_opportunity}\n- Suggested author/reviewer type: ${b.suggested_author_or_expert_reviewer_type}\n- Freshness/update schedule: ${b.freshness_or_update_schedule}\n- Cannibalization risks: ${b.cannibalization_risks}\n- Notes for writer: ${b.notes_for_writer}\n- Notes for developer/publisher: ${b.notes_for_developer_or_publisher}\n`).join('\n')}\n`;

const waves = [
  { name: 'Wave 1 - Foundation', range: [0, 12], why: 'Establishes or expands core pillars and safety/trust resources before narrower long-tail pages depend on them.' },
  { name: 'Wave 2 - High-Intent Quick Wins', range: [12, 30], why: 'Targets commercial and student-intent long tails that can convert and reinforce the core pillars.' },
  { name: 'Wave 3 - Topical Depth', range: [30, 60], why: 'Builds the internal-link network around safety, profiles, messaging, and student dating subtopics.' },
  { name: 'Wave 4 - Engagement and Tool Support', range: [60, 80], why: 'Prepares article support for generators, checklists, quizzes, and calculators that can attract links and repeat use.' },
  { name: 'Wave 5 - Culture, Seasonal, and Expansion', range: [80, 100], why: 'Rounds out Nigerian culture, lifestyle, seasonal, and emotional wellbeing coverage after the core authority base exists.' },
];

const wavesMd = `# Publishing Waves\n\n${waves.map((wave) => {
  const waveBriefs = briefs.slice(...wave.range);
  return `## ${wave.name}\n\nWhy this wave: ${wave.why}\n\nPillar pages that should exist first: ${[...new Set(waveBriefs.map((b) => b.required_link_to_parent_pillar))].join(', ')}\n\nRequired internal-link dependencies: link every page to its parent pillar, relevant safety/trust page, and at least two same-cluster pages.\n\nRecommended publishing sequence:\n${waveBriefs.map((b, i) => `${i + 1}. ${b.brief_id} - ${b.target_url_slug} (${b.content_status})`).join('\n')}\n\nExpected strategic outcome: ${wave.name.includes('Foundation') ? 'Core site authority and trust foundations improve.' : wave.name.includes('Quick') ? 'More commercially useful long-tail pages become indexable.' : wave.name.includes('Depth') ? 'Clusters gain enough support to avoid thin topical coverage.' : wave.name.includes('Tool') ? 'Interactive tool pages receive context and internal links.' : 'Seasonal and culture content expands reach without diluting the core.'}\n`;
}).join('\n')}\n`;

const clusters = [...new Set(briefs.map((b) => b.parent_topic_cluster))];
const topicalMapMd = `# Topical Map\n\n${clusters.map((cluster) => {
  const clusterBriefs = briefs.filter((b) => b.parent_topic_cluster === cluster);
  const pillar = [...new Set(clusterBriefs.map((b) => b.required_link_to_parent_pillar))][0];
  return `## ${cluster}\n\nPillar: ${pillar}\n\n- Pillar/expansion briefs: ${clusterBriefs.filter((b) => b.content_status.startsWith('Existing')).map((b) => `${b.brief_id} ${b.target_url_slug}`).join('; ') || 'None'}\n- New supporting articles/tools: ${clusterBriefs.filter((b) => b.content_status === 'New page').map((b) => `${b.brief_id} ${b.target_url_slug}`).join('; ')}\n- Conversion connection: ${clusterBriefs[0].primary_cta}; link to /download when product intent is present.\n- Safety/trust connection: ${clusterBriefs[0].safety_page_linking_requirement}\n`;
}).join('\n')}\n`;

const internalLinkingMd = `# Internal Linking Map\n\nGlobal rules:\n\n- Every brief links to its parent pillar.\n- Every brief links to two to five same-cluster pages.\n- Every safety-sensitive page links to /safety and usually /support or /privacy.\n- Every commercial page links to /download and /faq.\n- Every tool page links back to the explanatory guide that helps the user understand the result.\n- No page should publish without at least four relevant internal links unless it is a short utility/trust page.\n\n${briefs.map((b) => `## ${b.brief_id} ${b.target_url_slug}\n\n- Parent pillar: ${b.required_link_to_parent_pillar}\n- Existing links out: ${b.existing_internal_pages_to_link_to.join(', ')}\n- Future backlinks: ${b.future_supporting_pages_that_should_link_to_it.join(', ')}\n- CTA target: ${b.primary_cta}\n`).join('\n')}\n`;

const cannibalRows = [
  ['dating app in Nigeria','/dating-app-in-nigeria','/nigeria-dating-app; /blog/best-dating-apps-nigeria-students','Keep /dating-app-in-nigeria as primary commercial page; use /nigeria-dating-app for student positioning and blog page for comparisons.'],
  ['dating app for students','/dating-app-for-students','/student-dating; /college-dating-app','Differentiate /dating-app-for-students as broad commercial page, /student-dating as pillar, /college-dating-app as alias/US wording.'],
  ['campus dating safety','/campus-dating-safety','/safety; /blog/how-to-date-safely-on-campus-nigeria','/safety is global trust hub; /campus-dating-safety is cluster page; blog post is practical Nigeria guide.'],
  ['best dating apps in Nigeria for students','/blog/best-dating-apps-nigeria-students','/best-dating-site-for-students-nigeria; /student-dating-platforms-nigeria','Comparison blog handles apps; site page handles dating website language; platforms page compares student platform types.'],
  ['online dating for Nigerian students','/blog/online-dating-for-nigerian-students','/online-dating-app-for-undergraduates','Blog is broad advice; undergraduate page is commercial/product-discovery.'],
  ['university dating Nigeria','/university-dating-nigeria','/dating-culture-in-nigeria-students','Existing page should cover university dating broadly; culture page should cover norms/expectations, not app discovery.'],
  ['first date ideas students','/first-date-ideas-students','/campus-date-ideas; /cheap-date-ideas-students','Make /first-date-ideas-students the pillar; campus and cheap pages are sub-intents.'],
  ['green flags in a relationship','/green-flags-in-a-relationship-students','/green-flag-checklist','Guide explains concept; checklist is interactive/actionable.'],
  ['conversation starters dating app','/conversation-starters-dating-app','/first-message-examples-dating-app; /talking-stage-questions','Generator/tool page owns broad keyword; examples and talking-stage pages support narrower intents.'],
];
const cannibalMd = `# Keyword Cannibalization Report\n\n${table(cannibalRows.map((r) => ({ keyword:r[0], definitive_url:r[1], overlapping_pages:r[2], recommendation:r[3] })), ['keyword','definitive_url','overlapping_pages','recommendation'])}\n\nMerge recommendations:\n\n- Do not create a second page for /safe-dating-app-nigeria; expand the existing URL.\n- Do not create another “dating app for university students in Nigeria” page; expand the existing URL.\n- Keep brand aliases /the-college-date, /college-date, /cd-app, and /what-is-the-college-date as navigational/entity pages, not broader dating advice pages.\n- If future Search Console shows weak performance for very similar commercial pages, consolidate into the strongest intent page and 301 weaker duplicates.\n`;

const tools = [
  ['Dating Bio Generator','/dating-bio-generator','dating bio generator',['/dating-bio-examples-students','/dating-profile-prompts-students','/dating-profile-mistakes-students'],['/dating-profile-picture-tips-students','/download'],'Generate bio -> review safety/profile tips -> create profile'],
  ['Conversation Starter Generator','/conversation-starters-dating-app','conversation starters dating app',['/first-message-examples-dating-app','/how-to-text-a-match','/talking-stage-questions'],['/how-to-keep-a-conversation-going','/download'],'Generate opener -> read respectful messaging -> join/match'],
  ['Red Flag Checklist','/online-dating-red-flags-students','online dating red flags',['/romance-scams-nigeria-students','/fake-dating-profiles','/what-not-to-share-on-dating-apps'],['/safety','/support'],'Checklist -> safety hub -> support/report if needed'],
  ['Date Budget Calculator','/date-budget-calculator','date budget calculator',['/cheap-date-ideas-students','/where-to-go-on-a-date-in-lagos-students','/campus-date-ideas'],['/first-date-planner','/download'],'Calculate budget -> plan safe date -> download app'],
  ['First Date Planner','/first-date-planner','first date planner',['/first-date-ideas-students','/first-date-questions-students','/first-meeting-safety-dating-app'],['/safety','/download'],'Plan date -> safety checklist -> app CTA'],
  ['Compatibility Quiz','/compatibility-quiz-students','compatibility quiz students',['/relationship-advice-for-students','/relationship-boundaries-students','/communication-in-relationships-students'],['/green-flags-in-a-relationship-students','/download'],'Quiz -> relationship guide -> create profile'],
  ['Green Flag Checklist','/green-flag-checklist','green flag checklist',['/green-flags-in-a-relationship-students','/trust-in-student-relationships','/emotional-maturity-in-relationships'],['/relationship-advice-for-students','/download'],'Checklist -> healthy relationship hub -> app CTA'],
  ['Profile Photo Checklist','/profile-photo-checklist','profile photo checklist dating app',['/dating-profile-picture-tips-students','/dating-profile-mistakes-students','/verified-dating-profiles-students'],['/dating-bio-generator','/download'],'Photo checklist -> bio generator -> create profile'],
];
const toolMd = `# Tool Content Dependencies\n\n${table(tools.map((t) => ({ tool:t[0], landing_page:t[1], main_keyword:t[2], supporting_articles:t[3].join('; '), tool_should_recommend:t[4].join('; '), conversion_path:t[5] })), ['tool','landing_page','main_keyword','supporting_articles','tool_should_recommend','conversion_path'])}\n\nDo not build tools until the supporting articles and safety review rules are ready.\n`;

const byCluster = Object.fromEntries(clusters.map((cluster) => [cluster, briefs.filter((b) => b.parent_topic_cluster === cluster).length]));
const byIntent = briefs.reduce((acc, b) => { acc[b.search_intent] = (acc[b.search_intent] || 0) + 1; return acc; }, {});
const statusCounts = briefs.reduce((acc, b) => { acc[b.content_status] = (acc[b.content_status] || 0) + 1; return acc; }, {});
const top20 = [...briefs].sort((a, b) => b.overall_priority_score - a.overall_priority_score).slice(0, 20);
const first12 = briefs.slice(0, 12);

const summaryMd = `# Phase 4 Executive Summary\n\nResearch date: ${researchDate}\n\n## Research Sources\n\n${sourceSummary.map((s) => `- ${s}`).join('\n')}\n\n## Existing Pages Inspected\n\n${inventoryRows.length} public HTML pages were inspected, including all sitemap SEO pages and the custom 404 page.\n\n## Brief Counts\n\n- Total briefs: ${briefs.length}\n- New-page briefs: ${briefs.filter((b) => b.content_status === 'New page').length}\n- Expansion briefs: ${briefs.filter((b) => b.content_status === 'Existing page expansion').length}\n- Refresh briefs: ${briefs.filter((b) => b.content_status === 'Existing page refresh').length}\n- Merge recommendations: 0 direct merge briefs; cannibalization controls recommend consolidation only if future Search Console data shows overlap.\n\n## Distribution by Topic Cluster\n\n${Object.entries(byCluster).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n## Distribution by Search Intent\n\n${Object.entries(byIntent).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n## Top 20 Highest-Priority Briefs\n\n${top20.map((b, i) => `${i + 1}. ${b.brief_id} - ${b.working_title} (${b.overall_priority_score}) -> ${b.target_url_slug}`).join('\n')}\n\n## First 12 Pages Recommended for Production\n\n${first12.map((b, i) => `${i + 1}. ${b.brief_id} - ${b.working_title} -> ${b.target_url_slug} [${b.content_status}]`).join('\n')}\n\n## Cannibalization Issues Discovered\n\n- Dating app in Nigeria cluster has overlapping pages; assign /dating-app-in-nigeria as the definitive commercial page.\n- Student dating, campus dating, and college dating app pages must have differentiated intent.\n- Safety pages should separate trust hub, campus safety cluster, and practical guide intent.\n- Tool pages must not duplicate their supporting articles; tools own interactive intent.\n\n## Business Facts Needed From Owner\n\n- Exact student verification workflow and what claims can be made publicly.\n- Current Google Play status, screenshots, and approved store assets.\n- Any official campus partnerships or ambassador programs, if they exist.\n- Support response process and reporting workflow details.\n- Any real founder/company registration details that should be public.\n\n## Briefs to Hold Until More Facts Are Available\n\n- Any university-specific landing page naming a school.\n- Any page claiming verified student status beyond what the app can prove.\n- Any testimonial, rating, user-count, or partnership page.\n- Any legal/medical/mental-health page requiring qualified expert review.\n\n## Recommended Next Phase\n\nPhase 5 should produce the first 12 foundation pages from the briefs, starting with expansion of existing pages before creating new pages. Build no interactive tools until their support articles and safety review patterns exist.\n`;

writeFileSync(join(outDir, 'existing-content-inventory.md'), inventoryMd);
writeFileSync(join(outDir, 'content-backlog-100.csv'), csv);
writeFileSync(join(outDir, 'content-backlog-100.json'), JSON.stringify({ research_date: researchDate, priority_model: 'Search demand 20%, ranking opportunity 15%, business relevance 20%, topical authority 15%, conversion 10%, safety/trust 10%, seasonality 5%, existing site advantage 5%', briefs }, null, 2));
writeFileSync(join(outDir, 'content-briefs-100.md'), briefMd);
writeFileSync(join(outDir, 'topical-map.md'), topicalMapMd);
writeFileSync(join(outDir, 'publishing-waves.md'), wavesMd);
writeFileSync(join(outDir, 'internal-linking-map.md'), internalLinkingMd);
writeFileSync(join(outDir, 'keyword-cannibalization-report.md'), cannibalMd);
writeFileSync(join(outDir, 'tool-content-dependencies.md'), toolMd);
writeFileSync(join(outDir, 'phase-4-executive-summary.md'), summaryMd);

console.log(JSON.stringify({
  output_directory: outDir,
  briefs: briefs.length,
  inventory_pages: inventoryRows.length,
  by_cluster: byCluster,
  by_intent: byIntent,
  status_counts: statusCounts,
}, null, 2));
