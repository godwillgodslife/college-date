import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWave1Page } from './cluster-builder-util.mjs';

const root = process.cwd();
const topics = JSON.parse(readFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'topics.json'), 'utf8'));

// Topic-specific definitions for Cluster 11 (101 to 120)
const c11Meta = [
  {
    num: 101,
    leadP: "Dating while squatting in a crowded university dormitory requires extraordinary emotional maturity, strict roommate diplomacy, and creative dating strategies. Here is how to navigate campus romance with dignity when you do not have private accommodation.",
    quickTake: "Dating as a hostel squatter requires radical discretion, transparent communication with primary bedspace owners, and prioritizing public campus date spots over cramped residential bunks. Squatters hold no legal tenancy rights, making respectful boundaries essential to preserve housing security and romantic dignity.",
    kicker: "Hostel Squatting Realities",
    tableHeading: "Comparative Analysis: Squatter Dating vs Registered Bedspace Resident Realities",
    colA: "Squatter Romantic Reality",
    colB: "Registered Resident Privileges",
    rows: [
      ["Tenancy Rights", "Zero official standing; reliant on roommate goodwill and covert presence.", "Registered resident with official bedspace allocation and hostel ID card."],
      ["Guest Hosting", "Zero moral right to host visitors without unanimous roommate permission.", "Authorized to receive daytime visitors within established hall visiting hours."],
      ["Private Sanctuary", "Completely communal; sleeping on floor foam mattresses or sharing bunks.", "Designated bedspace, personal storage locker, and dedicated study desk."],
      ["Venue Strategy", "Must prioritize public campus quads, botanical gardens, and student cafes.", "Can host quiet study sessions or brief afternoon tea visits in room."],
      ["Eviction Hazard", "High risk of immediate eviction and ID confiscation if reported to wardens.", "Protected by student tenancy regulations unless severe misconduct occurs."]
    ],
    detail1: "Hostel bedspace deficits across major institutions like UNILAG, UI, OAU, UNIBEN, and ABU force thousands of students into informal squatting. Coexisting with eight to twelve students in rooms designed for four creates acute emotional vulnerability when pursuing romance.",
    detail2: "Bringing dates into squatted spaces breeds friction with paying roommates. Practicing the Two-Hour Advance Notice protocol and strictly banning overnight sleepovers protects domestic goodwill.",
    detail3: "Shifting romantic dates to campus botanical gardens, sports complex bleachers, and faculty reading lounges provides scenic, zero-cost settings that relieve dormitory pressure.",
    detail4: "Honesty about your housing situation from the beginning weeds out superficial partners and demonstrates grounded, self-assured confidence.",
    rules: [
      "The Radical Transparency Rule: Own your living reality with confidence; mature partners respect resourcefulness.",
      "The Roommate Goodwill Compact: Keep the room immaculate and help with water fetching to preserve harmony.",
      "The Public-First Venue Policy: Make campus cafes, faculty courtyards, and botanical paths your primary date spots.",
      "The Balcony Telephone Rule: Never take intimate late-night phone calls from your bunk while roommates are resting.",
      "The Verified Connection Standard: Meet genuine, verified campus peers on The College Date who value character over pretense."
    ],
    faqs: [
      {
        question: "Should I feel embarrassed about telling my crush that I am squatting?",
        answer: "No, you should never feel ashamed of squatting in university. Bedspace shortages are an institutional reality affecting thousands of students across tertiary institutions. Mature partners understand that living arrangements do not define your character, intellect, or dating value. Being honest from the beginning demonstrates confidence and integrity."
      },
      {
        question: "Can my partner visit me in my squatted hostel room during the day?",
        answer: "Daytime visits for dropping off books or sharing lunch are acceptable only if your registered roommates give clear consent beforehand. Extended leisure hangouts or frequent visits erode roommate goodwill and should be avoided in favor of neutral campus spaces."
      },
      {
        question: "What should I do if my roommate complains about my date visiting?",
        answer: "Apologize sincerely and immediately without getting defensive. Acknowledge that the space belongs to the collective room occupants, and immediately move all future hangouts with your date to public campus quads, cafeterias, or the library to maintain domestic peace."
      },
      {
        question: "Where are the safest quiet spots on campus for private talks without a room?",
        answer: "Campus botanical gardens, faculty courtyards after 5:00 PM, sports complex bleachers during off-peak hours, and student union recreation parks offer safe, breezy, and pleasant environments for meaningful conversations without dorm intrusion."
      }
    ]
  },
  {
    num: 102,
    leadP: "Bringing romantic interests into a shared dormitory requires balancing personal freedom with communal respect. Here is the definitive unwritten roommate code for hosting dates without sparking hostel drama or damaging friendships.",
    quickTake: "The unwritten roommate code requires advance notice before hosting a date, strict adherence to reasonable time limits, fair warning for study sessions, and absolute prohibition of non-consensual sleepovers. Prioritizing communal roommate comfort prevents bitter hostel feuds and protects relationship peace.",
    kicker: "Communal Hostel Etiquette",
    tableHeading: "Comparative Analysis: Respectful Host Behavior vs Problematic Hostel Violations",
    colA: "Respectful Host Behavior",
    colB: "Hostel Code Violations",
    rows: [
      ["Advance Notice", "At least 2 hours advance message sent to the shared room group chat.", "Surprise walk-ins with a date while roommates are undressed or resting."],
      ["Visit Duration", "Visits capped at 1 to 2 hours for focused study or shared meals.", "Monopolizing the room for 6+ consecutive hours while roommates wait outside."],
      ["Physical Affection", "Modest, respectful interaction; intimate touch kept strictly private.", "Prolonged kissing, cuddling, or bed intimacy in communal view."],
      ["Noise Discipline", "Moderate speaking volume and headphones for shared media.", "Loud laughter, shouting, or blaring speakers during revision hours."],
      ["Overnight Stays", "Zero unapproved sleepovers; date departs before hall lockout siren.", "Tucking a date into a shared bunk overnight without unanimous consent."]
    ],
    detail1: "In shared student rooms across Nigerian universities, space is a shared asset. Thoughtless hosting habits—such as unannounced visits or occupying shared desks—quickly spark bitter roommate feuds.",
    detail2: "Adopting the Two-Hour Advance Notice rule gives roommates agency to dress appropriately, tidy personal items, or plan library study sessions without feeling blindsided.",
    detail3: "Communal dorm rooms are intellectual and resting sanctuaries, not private honeymoon suites. Keeping physical affection modest protects everyone from intense embarrassment.",
    detail4: "Offering a portion of snacks or food to roommates present during a date demonstrates warmth, disarms tension, and strengthens hall camaraderie.",
    rules: [
      "The Advance Warning Compact: Always notify room members before bringing any guest over.",
      "The Shared Food Protocol: Offer a courtesy portion of snacks or home-cooked meals to present roommates.",
      "The Two-Hour Cap: Keep dorm visits concise and transition to public campus parks for longer hangouts.",
      "The Post-Visit Cleanup: Wash all plates and wipe down shared study desks the instant your date departs.",
      "The Boundary Respect Rule: Use The College Date to meet emotionally mature students who value communal courtesy."
    ],
    faqs: [
      {
        question: "What should I do if my roommate brings their partner over too frequently?",
        answer: "Schedule a calm, private room meeting when the partner is absent. Use constructive 'I' statements, such as: 'I find it challenging to study and unwind when we have guests over every evening. Can we agree on designated visiting days or cap visits at two hours?' Establishing structured rules resolves tension amicably."
      },
      {
        question: "Is an overnight sleepover ever acceptable in a shared hostel room?",
        answer: "Only with explicit, unanimous prior consent from every single roommate. If even one occupant expresses discomfort, an overnight stay must not occur. Forcing an unapproved overnight guest breaches basic communal ethics."
      },
      {
        question: "Where can my date and I study together without disturbing my roommates?",
        answer: "Utilize departmental lecture halls after class hours, faculty study quads, or the main campus library. These venues are specifically designed for academic collaboration and eliminate the stress of crowded dorms."
      },
      {
        question: "How should I handle it if my roommate and my date do not get along?",
        answer: "Keep their interactions to an absolute minimum. Host all dates outside the room, and avoid venting to your roommate about relationship problems or complaining to your partner about roommate habits."
      }
    ]
  },
  {
    num: 103,
    leadP: "Hostel gate curfews are a strict reality in university living. Here is how to plan fulfilling evening dates, manage porter regulations, and avoid disciplinary gate lockouts.",
    quickTake: "Managing hostel curfews requires planning dates backward from the official gate lock time, building a 30-minute safety buffer for campus transit, and never risking disciplinary lockout for extended dates. Respecting residential hall hours protects student safety and eliminates gate confrontation.",
    kicker: "Campus Curfew Management",
    tableHeading: "Comparative Analysis: Proactive Curfew Planning vs Last-Minute Gate Panic",
    colA: "Proactive Evening Date Routine",
    colB: "Common Curfew Pitfalls",
    rows: [
      ["Date Scheduling", "Dates concluded 45 minutes prior to official hall gate lock.", "Leaving the date venue 10 minutes before curfew across a sprawling campus."],
      ["Transit Arrangement", "Campus shuttle or trusted bike hailed well in advance of peak rush.", "Scrambling for scarce transport at 9:55 PM alongside hundreds of students."],
      ["Porter Relationship", "Courteous greetings and polite communication with hall security staff.", "Aggressive arguments or attempting to scale perimeter fences after lock."],
      ["Contingency Plan", "Accredited off-campus friend identified in case of emergency delay.", "Panic-driven wandering around dark campus quads after gate closure."],
      ["Disciplinary Standing", "Clean administrative record with zero fines or warning letters.", "Names recorded in the hall disciplinary book, risking bedspace loss."]
    ],
    detail1: "Hostel curfews (typically 9:30 PM to 10:30 PM) exist across public and private tertiary campuses to enforce student safety and prevent unauthorized nighttime access.",
    detail2: "Dating couples frequently underestimate transit bottlenecks during peak evening hours when thousands leave libraries, fellowships, and cafeterias simultaneously.",
    detail3: "Confronting or insulting hall porters at locked gates escalates minor delays into serious disciplinary offenses that can lead to hostel eviction.",
    detail4: "Planning dates backward from gate closure guarantees relaxed farewells without frantic sprinting across unlit campus roads.",
    rules: [
      "The 45-Minute Buffer Rule: Conclude dates 45 minutes before the official hall gate lock time.",
      "The Early Transit Protocol: Hail campus shuttles before the post-library evening rush begins.",
      "The Courteous Porter Standard: Greet security staff respectfully to build long-term residential goodwill.",
      "The Safe Escort Rule: Walk your partner directly to the illuminated security perimeter of their hall.",
      "The Verified Network Advantage: Connect on The College Date with considerate peers who respect campus curfews."
    ],
    faqs: [
      {
        question: "What should I do if my partner and I arrive at the hostel after the gate is locked?",
        answer: "Remain calm and speak respectfully to the security porter on duty. Explain the genuine cause of your delay without hostility. If entry is strictly refused, contact a trusted, verified friend living in a nearby off-campus lodge for emergency shelter rather than roaming campus at night."
      },
      {
        question: "How can we enjoy evening dates if curfews are so early?",
        answer: "Shift the timing of your dates earlier. Meeting at 5:00 PM for an early dinner or campus coffee gives you four full hours of quality connection before the 9:00 PM return rush begins."
      },
      {
        question: "Can a male student walk a female student directly to her hostel door?",
        answer: "Most female halls restrict male visitors to external reception quads or outer security gates. Always respect the outer perimeter barrier and say your goodbyes in the illuminated reception area."
      },
      {
        question: "Do hall wardens record names of late students for disciplinary action?",
        answer: "Yes, most university halls maintain an official late register. Repeated infractions can result in formal warnings, fines, or forfeiture of hall accommodation for subsequent academic sessions."
      }
    ]
  },
  {
    num: 104,
    leadP: "When campus hall rivalries run deep, dating someone from across the residential divide tests your diplomacy and loyalties. Here is how to enjoy your relationship without getting dragged into hostel politics.",
    quickTake: "Dating across rival halls of residence requires separating personal romantic affection from institutional campus politics, avoiding hostile hall banter during inter-hall sports and hall weeks, and establishing neutral ground for dates. Mature students prioritize partner loyalty over transient dorm rivalries.",
    kicker: "Inter-Hall Social Dynamics",
    tableHeading: "Comparative Analysis: Mature Cross-Hall Romance vs Destructive Rivalry Traps",
    colA: "Mature Cross-Hall Relationship",
    colB: "Destructive Rivalry Mistakes",
    rows: [
      ["Hall Identity Balance", "Views hall affiliation as fun campus tradition without malice.", "Allows hostel tribalism to dictate personal respect for partner."],
      ["Sports Week Conduct", "Cheering respectfully for personal favorites without toxic insults.", "Joining aggressive mobs chanting derogatory slurs against partners hall."],
      ["Meeting Venue Choice", "Defaulting to neutral campus cafes, libraries, and parks.", "Forcing partner into hostile hall common rooms during heated debates."],
      ["Conflict Handling", "Refusing to let roommate hall gossip influence private intimacy.", "Sharing private relationship details with biased hostel cliques."],
      ["Loyalty Priority", "Firmly prioritizes partner safety and dignity above hostel pride.", "Sacrifices partner comfort to impress loud hall executive mobs."]
    ],
    detail1: "Heritage tertiary halls at institutions like UI, UNILAG, UNN, and OAU harbor intense historical rivalries, sports battles, and competing cultural identities.",
    detail2: "Dating someone from a rival hall often triggers mocking comments from roommates who treat cross-hall romance as an act of residential treason.",
    detail3: "During inter-hall football matches and hall weeks, tensions peak. Couples must agree in advance to avoid malicious gloating and sit together in neutral stands.",
    detail4: "Hosting your partner in neutral academic cafes and student union recreation gardens shields your romance from loud common-room politics.",
    rules: [
      "The Perspective Principle: Remember hall rivalries dissolve at convocation; authentic love lasts for life.",
      "The Anti-Mob Pact: Never participate in hostile chants or insults aimed at your partner's residence.",
      "The Neutral Ground Agreement: Choose neutral campus spaces for dates to avoid common-room drama.",
      "The Friendship Shield: Politely shut down disrespectful comments from roommates about your partner's hall.",
      "The Diverse Discovery Advantage: Find verified students across all halls and faculties on The College Date."
    ],
    faqs: [
      {
        question: "Is it dangerous to date someone from a rival hall on campus?",
        answer: "In modern university environments, hall rivalries are largely social and sporting traditions rather than violent feuds. However, during heated hall weeks or election periods, avoiding loud common rooms and meeting in neutral public venues ensures complete safety and peace."
      },
      {
        question: "How do I handle roommates making fun of my partners hall of residence?",
        answer: "Address the jokes calmly and with a smile. Say: 'I love the hall banter, but Sarah is my partner, so let us keep the jokes respectful.' Setting a firm, pleasant boundary usually stops peer mockery instantly."
      },
      {
        question: "What should we do when our respective halls play against each other in sports?",
        answer: "Embrace friendly, playful banter! Make a fun wager—such as the loser cooking dinner or buying suya at the campus gate. Focus on the shared excitement rather than fierce tribalism."
      },
      {
        question: "Can cross-hall relationships last after graduation?",
        answer: "Absolutely. Once students graduate and transition into national service or corporate employment, campus hall rivalries completely vanish, leaving behind the strong foundation of character and communication you built together."
      }
    ]
  },
  {
    num: 105,
    leadP: "Hostel balconies are the observation decks of campus social life. Here is how to navigate romantic affection, avoid intrusive hostel balcony surveillance, and protect your personal dignity.",
    quickTake: "Managing hostel balcony gossip requires confining physical affection to discreet, private venues, recognizing that residential balconies function as public observation galleries, and maintaining personal decorum. Protecting your campus reputation preserves peace of mind and prevents distorted social rumors.",
    kicker: "Campus Reputation Defense",
    tableHeading: "Comparative Analysis: Discreet Campus Affection vs Balcony Gossip Triggers",
    colA: "Discreet & Dignified Conduct",
    colB: "High-Risk Balcony Triggers",
    rows: [
      ["Farewell Location", "Brief, warm goodbyes at illuminated reception quads.", "Prolonged kissing and embracing directly beneath crowded hall balconies."],
      ["Physical Affection", "Polite hand-holding while walking along campus paths.", "Intimate physical contact on open hostel lawns during peak evening hours."],
      ["Reaction to Observers", "Ignoring hecklers with quiet composure and walking on.", "Shouting back at balcony spectators or escalating into public screaming."],
      ["Boundary Consensus", "Clear mutual agreement on public affection standards.", "Unspoken mismatch leading to awkward physical advances in public view."],
      ["Gossip Resilience", "Reputation anchored in academic excellence and high character.", "Emotional distress caused by viral hostel WhatsApp audio notes and rumors."]
    ],
    detail1: "Hostel balconies across high-density campus residences act as surveillance galleries where bored students gather to observe, critique, and gossip about passing couples.",
    detail2: "Prolonged physical intimacy beneath hall floodlights invites catcalls, loud whistling, and viral voice-note gossip that can damage student leadership ambitions.",
    detail3: "Graceful indifference is the best defense against balcony hecklers. Shouting back only feeds the crowd's appetite for public campus spectacle.",
    detail4: "Establishing mutual boundaries regarding public affection ensures both partners feel protected from unwarranted social scrutiny.",
    rules: [
      "The 10-Second Farewell Rule: Keep goodbyes at hostel gates warm, polite, and brief.",
      "The Private Greenery Rule: Reserve intimate emotional talks for serene campus gardens away from dorms.",
      "The Unreactive Stride: Ignore loud balcony whistles with quiet composure and never look up defensively.",
      "The Digital Privacy Shield: Keep relationship milestones off volatile hostel social media channels.",
      "The Discretion Advantage: Build genuine, private romantic connections on The College Date."
    ],
    faqs: [
      {
        question: "Why do students on hostel balconies heckle dating couples?",
        answer: "Hostel balconies concentrate large groups of young students experiencing boredom and exam stress. Mocking or whistling at passing couples is often treated as casual, low-stakes entertainment. Maintaining quiet composure and refusing to react robs hecklers of their audience."
      },
      {
        question: "Where is the best place to say goodbye to my partner without onlookers?",
        answer: "Depart at well-lit, public shuttle stops or central campus crossroads rather than lingering directly beneath crowded hostel railings. Brief, dignified goodbyes attract minimal attention."
      },
      {
        question: "Can hostel balcony gossip hurt my academic or leadership standing?",
        answer: "Yes. Exaggerated rumors regarding promiscuity or public drama can be weaponized during student union elections, departmental executive nominations, or fellowship leadership appointments. Protecting your reputation is a wise investment in your campus future."
      },
      {
        question: "What should I do if my partner insists on heavy PDA that makes me uncomfortable?",
        answer: "State your boundaries with clarity and warmth: 'I care about you deeply, but I feel uncomfortable with heavy physical affection in public view on campus. Let us keep our physical intimacy private.' A respectful partner will honor your comfort without resentment."
      }
    ]
  }
];

// Helper to auto-generate remaining topics (106 to 120) with deep, structured content
const c11Remainder = [
  {
    num: 106,
    slug: 'safe-late-night-walk-backs-to-female-hostels',
    title: 'How to Handle Late-Night Walk-Backs to Female Hostels Safely',
    kicker: 'Campus Night Safety',
    desc: 'Essential campus night safety guide for walking partners back to female hostels. Learn safe route selection, emergency protocols, and security patrol tips.',
    quickTake: 'Late-night walk-backs to female hostels require choosing well-lit primary campus boulevards, avoiding unlit shortcuts across faculty quads, and maintaining active phone situational awareness. Escorting partners safely honors care while protecting both individuals from security vulnerabilities.',
    colA: 'Safe Campus Escort Practices',
    colB: 'High-Risk Walking Habits',
    rows: [
      ['Route Selection', 'Sticking to illuminated main campus roads with active streetlights.', 'Taking dark shortcuts through unlit bush paths or unfinished buildings.'],
      ['Situational Awareness', 'Walking attentively without earphones; watching surroundings.', 'Looking down at smartphone screens with noise-canceling headphones.'],
      ['Timing Management', 'Departing study halls early to avoid late-night solitude.', 'Walking across deserted campus grounds past midnight alone.'],
      ['Return Transit Plan', 'Arranging verified bike escort or group return for the walker.', 'Walking back across dark campus alone after dropping off partner.'],
      ['Emergency Preparedness', 'Campus security emergency numbers saved on quick-dial.', 'No emergency contacts or panic awareness if confronted by strangers.']
    ],
    topicDilemma: 'late-night transit security across sprawling university campuses',
    ruleList: [
      'The Illuminated Route Rule: Always choose brightly lit primary avenues over dark shortcuts.',
      'The Earphone Blackout Rule: Keep earphones in pockets to maintain total auditory situational awareness.',
      'The Return Trip Plan: Ensure the escorting partner has a safe, verified transit method back to their lodge.',
      'The Quick-Dial Security Rule: Save university security control room numbers on immediate phone speed-dial.',
      'The Safe Discovery Standard: Connect on The College Date where verified student safety is the foundational priority.'
    ]
  },
  {
    num: 107,
    slug: 'surviving-hall-week-celebrations-in-a-relationship',
    title: 'Hall Week Celebrations: Surviving the Temptations and Drama',
    kicker: 'Campus Social Realities',
    desc: 'Survive campus hall week carnivals and parties while protecting your relationship. Discover loyalty strategies, alcohol moderation, and boundary management.',
    quickTake: 'Navigating Hall Week celebrations in a campus relationship demands establishing mutual social boundaries before parties begin, practicing intentional alcohol moderation, and refusing to let party euphoria undermine personal loyalty. Mutual trust and clear check-ins prevent post-carnival heartbreak.',
    colA: 'Loyal & Grounded Couple Conduct',
    colB: 'Common Hall Week Disasters',
    rows: [
      ['Boundary Agreement', 'Clear mutual agreement on party behavior, dancing, and curfews.', 'Unspoken assumptions leading to public jealousy and shouting matches.'],
      ['Alcohol & Substance Use', 'Strict moderation and drinking only personal, un-tampered drinks.', 'Heavy intoxication leading to compromised judgment and risky behavior.'],
      ['Social Inclusivity', 'Introducing partner warmly to hall friends and enjoying music together.', 'Abandoning partner in crowded party halls to flirt with strangers.'],
      ['Communication Rhythm', 'Quick, reassuring check-in texts if attending separate hall events.', 'Total radio silence fueling anxiety and suspicion throughout the night.'],
      ['Conflict De-escalation', 'Discussing discomfort quietly the morning after in private.', 'Creating dramatic public scenes in the middle of party dance floors.']
    ],
    topicDilemma: 'high-energy hall week carnivals, social temptations, and relationship security',
    ruleList: [
      'The Pre-Party Compact: Agree on party arrival and departure plans before stepping out.',
      'The Sobriety Anchor: Stay in control of your senses to protect your partner and personal safety.',
      'The Public Solidarity Rule: Make it evident to peers that you are happily committed and loyal.',
      'The Morning-After Review: Discuss any party awkwardness calmly over breakfast without anger.',
      'The High-Character Match: Find partners on The College Date who value emotional fidelity and maturity.'
    ]
  },
  {
    num: 108,
    slug: 'when-your-roommate-dislikes-your-campus-partner',
    title: 'Surviving a Messy Roommate Who Hates Your Campus Partner',
    kicker: 'Hostel Conflict Resolution',
    desc: 'How to handle roommates who dislike your campus partner. Learn diplomatic mediation tactics, boundary protection, and how to maintain domestic peace.',
    quickTake: 'When a roommate dislikes your campus partner, de-escalation requires keeping dating activities strictly outside the shared room, refusing to use roommates as emotional sounding boards, and validating their right to a peaceful living space. Separating romance from roommate dynamics prevents domestic warfare.',
    colA: 'Diplomatic Mediation Strategy',
    colB: 'Destructive Conflict Escalations',
    rows: [
      ['Date Location', 'Hosting all romantic dates in public campus cafes or off-campus venues.', 'Forcing partner into the dorm room despite obvious roommate hostility.'],
      ['Communication Style', 'Direct, calm conversation asking for specific, objective grievances.', 'Passive-aggressive door slamming, petty insults, and silent treatment.'],
      ['Information Flow', 'Keeping private relationship details strictly confidential from room.', 'Venting about partner to roommate, feeding fuel to their dislike.'],
      ['Loyalty Balance', 'Honoring roommate rights to shared space while defending partner.', 'Taking extreme sides that make everyday living impossible.'],
      ['Long-Term Solution', 'Planning independent accommodation for subsequent academic year.', 'Enduring chronic emotional toxicity that derails continuous assessment exams.']
    ],
    topicDilemma: 'roommate friction, personal animosity toward dating partners, and shared living stress',
    ruleList: [
      'The Room Neutrality Rule: Treat the dorm as a neutral sanctuary free from partner friction.',
      'The Objective Audit: Ask if roommate complaints stem from genuine guest misconduct or personal bias.',
      'The Zero-Venting Compact: Never complain about your partner to a roommate who already dislikes them.',
      'The Dignified Defense: Firmly insist on polite courtesy whenever your partner and roommate cross paths.',
      'The Verified Community: Connect on The College Date with considerate peers who respect domestic harmony.'
    ]
  },
  {
    num: 109,
    slug: 'private-off-campus-hostels-vs-school-halls-dating',
    title: 'Private Off-Campus Hostels vs School Halls: Dating Pros and Cons',
    kicker: 'Campus Accommodation Choices',
    desc: 'Compare private off-campus hostels and on-campus university halls for student dating. Discover privacy trade-offs, financial costs, and academic impacts.',
    quickTake: 'Private off-campus hostels offer superior privacy and autonomy for student couples but introduce higher financial costs, security risks, and domestic distractions. School halls restrict privacy through strict curfews but provide subsidized costs and built-in academic discipline.',
    colA: 'Private Off-Campus Hostels',
    colB: 'School Halls of Residence',
    rows: [
      ['Privacy & Autonomy', 'High privacy; self-contained rooms without porter surveillance.', 'Zero private space; shared bunks, communal bathrooms, and wardens.'],
      ['Financial Expense', 'Expensive rent, electricity tokens, water pumping, and security fees.', 'Subsidized, low-cost accommodation covered by standard semester fees.'],
      ['Curfew Regulations', 'Flexible gate hours or self-managed compound padlock keys.', 'Strict 10:00 PM gate lockouts with disciplinary registers for lateness.'],
      ['Academic Concentration', 'Higher risk of domestic lethargy and missed 8:00 AM lectures.', 'Walking distance to libraries, lecture theatres, and study groups.'],
      ['Parental Oversight', 'Lower direct scrutiny, but high anxiety during unannounced visits.', 'Clear institutional oversight offering reassurance to protective families.']
    ],
    topicDilemma: 'evaluating residential options and their profound impacts on student romantic dynamics',
    ruleList: [
      'The Financial Audit: Never choose expensive off-campus lodges purely for romantic privacy.',
      'The Commute Factor: Calculate daily shuttle expenses and transport reliability before signing leases.',
      'The Academic Checkpoint: Ensure off-campus autonomy does not degrade continuous assessment scores.',
      'The Security Assessment: Verify perimeter fences, night watchmen, and compound lighting.',
      'The Tailored Search: Use The College Date to filter student matches by accommodation type and faculty.'
    ]
  },
  {
    num: 110,
    slug: 'cooking-for-two-in-a-hostel-room-rules',
    title: 'How to Cook for Two in a Hostel Room Without Causing Conflict',
    kicker: 'Hostel Cooking Etiquette',
    desc: 'Master the art of cooking for two in crowded student dorms. Discover hotplate etiquette, grocery budget pooling, ventilation rules, and kitchen harmony.',
    quickTake: 'Cooking for two in a shared hostel room requires clearing hotplate usage with roommates, contributing generously to shared electricity tokens, ensuring proper room ventilation, and cleaning all utensils immediately. Courteous culinary habits prevent domestic disputes and foster roommate goodwill.',
    colA: 'Considerate Cooking Habits',
    colB: 'Hostel Kitchen Violations',
    rows: [
      ['Appliance Etiquette', 'Checking power capacity before using high-wattage electric hotplates.', 'Overloading sockets, blowing room fuses, and disrupting study lights.'],
      ['Ventilation Management', 'Opening all windows and doors when preparing aromatic spicy stews.', 'Filling closed dorm rooms with heavy smoke and strong cooking odors.'],
      ['Grocery Budgeting', 'Pooling funds transparently and storing foodstuff in labeled containers.', 'Using roommates cooking oil, seasonings, or provisions without asking.'],
      ['Sanitation Discipline', 'Washing all pots, plates, and spoons immediately after eating.', 'Leaving greasy pots soaking in shared sinks for days, attracting pests.'],
      ['Hospitality Courtesy', 'Offering a polite sample taste to roommates studying in the room.', 'Eating elaborate meals in front of hungry roommates without acknowledgment.']
    ],
    topicDilemma: 'communal kitchen diplomacy, electric appliance rules, and culinary intimacy in dorms',
    ruleList: [
      'The Power Balance Rule: Never use heavy electric cookers during low-voltage generator hours.',
      'The Immediate Clean Rule: Wash every pot and wipe the cooking station the moment dinner is served.',
      'The Ingredient Integrity Rule: Keep all couple provisions strictly separate from communal foodstuff.',
      'The Courtesy Taste Rule: Share a small portion of aromatic meals with roommates in the room.',
      'The Practical Match: Connect on The College Date with down-to-earth peers who appreciate authentic moments.'
    ]
  },
  {
    num: 111,
    slug: 'grooming-and-hygiene-for-dates-in-crowded-hostels',
    title: 'Managing Personal Hygiene and Grooming in Crowded Campus Hostels',
    kicker: 'Student Grooming Standards',
    desc: 'Look and smell your best on campus dates despite crowded hostel bathrooms and water shortages. Discover grooming hacks, scent longevity, and hygiene essentials.',
    quickTake: 'Managing grooming in crowded campus hostels requires preparing clothes and shower water hours in advance, mastering water-efficient personal hygiene, and selecting long-lasting, subtle fragrances that withstand tropical campus humidity. Impeccable hygiene communicates self-respect and confidence.',
    colA: 'Effective Hostel Grooming Routine',
    colB: 'Common Student Grooming Pitfalls',
    rows: [
      ['Water Planning', 'Storing clean bathing water early in the morning before tap rush.', 'Scrambling for muddy water 20 minutes before date time.'],
      ['Wardrobe Preparation', 'Ironing date outfits during stable power hours and hanging neatly.', 'Wearing rumpled, damp clothes retrieved from overcrowded laundry piles.'],
      ['Fragrance Selection', 'Applying subtle antiperspirant and long-lasting fresh cologne.', 'Masking unwashed sweat with excessive sprays of cheap body spray.'],
      ['Oral Care Discipline', 'Flossing, brushing thoroughly, and carrying discreet breath mints.', 'Neglecting oral hygiene after long cafeteria meals before close dates.'],
      ['Personal Confidence', 'Stepping out feeling refreshed, dignified, and comfortably poised.', 'Feeling self-conscious and insecure about body odor throughout the date.']
    ],
    topicDilemma: 'overcoming water scarcity, power cuts, and crowded facilities to look and feel your best',
    ruleList: [
      'The Advance Water Protocol: Secure bathing water hours before date time to avoid stressful queues.',
      'The Ironing Strategy: Press clothes whenever university power grid is active, not five minutes prior.',
      'The Subtlety Standard: Choose fresh citrus or woody scents that enhance rather than overpower.',
      'The Hygiene Priority: Never substitute deodorant sprays for thorough soap-and-water showers.',
      'The Authentic Impression: Put your best self forward on The College Date with genuine confidence.'
    ]
  },
  {
    num: 112,
    slug: 'unexpected-sleepovers-in-shared-hostel-rooms-etiquette',
    title: 'When Your Date Stays Over Without Prior Roommate Consent',
    kicker: 'Hostel Boundary Repair',
    desc: 'How to handle accidental or unplanned sleepovers in shared dorm rooms. Learn immediate damage control, roommate apologies, and preventative protocols.',
    quickTake: 'Unplanned date sleepovers in shared hostel rooms constitute severe boundary breaches. Immediate damage control requires departing at first light, issuing sincere in-person apologies to all roommates, and establishing ironclad preventative measures to ensure it never happens again.',
    colA: 'Responsible Remediation Actions',
    colB: 'Defensive Relationship Mistakes',
    rows: [
      ['Morning Departure', 'Guest departs discreetly at 6:00 AM before communal morning rush.', 'Looming around the shared room at 9:00 AM while roommates dress.'],
      ['Accountability', 'Host takes full responsibility and apologizes privately to roommates.', 'Blaming the partner or acting entitled to unilateral room privileges.'],
      ['Restitution', 'Performing extra chores or treating roommates to breakfast.', 'Becoming defensive and aggressive when roommates express discomfort.'],
      ['Policy Reset', 'Agreeing to a strict zero-unapproved-sleepovers rule going forward.', 'Repeating the offense the following weekend, escalating to hall wardens.'],
      ['Porter Escalation Risk', 'De-escalated internally through humility and roommate respect.', 'Roommates lodging formal complaints resulting in bedspace forfeiture.']
    ],
    topicDilemma: 'accidental curfew lockouts, unplanned overnight stays, and rebuilding roommate trust',
    ruleList: [
      'The Dawn Exit Rule: If stranded by emergency, ensure your guest leaves quietly before 6:30 AM.',
      'The Direct Apology: Own the mistake unconditionally without offering hollow excuses.',
      'The Restitution Gesture: Buy breakfast or handle room cleaning duties as a sincere goodwill offering.',
      'The Curfew Alarm System: Set irreversible phone alarms to prevent ever getting trapped again.',
      'The Mature Standard: Connect on The College Date with partners who respect residential boundaries.'
    ]
  },
  {
    num: 113,
    slug: 'turning-hostel-laundry-days-into-quality-dates',
    title: 'Laundry Day Dates: Turning Hostel Chores into Quality Time',
    kicker: 'Practical Campus Romance',
    desc: 'Turn tedious campus chores into memorable bonding moments. Discover laundry day date ideas, water-fetching teamwork, and grounded student intimacy.',
    quickTake: 'Laundry day dates transform mundane hostel chores into meaningful quality time, fostering vulnerability, teamwork, and authentic connection. Working side-by-side washing clothes and fetching water builds deeper companionship than expensive performative dinners.',
    colA: 'Productive Laundry Date Experience',
    colB: 'Ineffective Date Attempts',
    rows: [
      ['Collaborative Spirit', 'Washing and rinsing together while sharing music and life stories.', 'One partner doing heavy manual scrubbing while the other scrolls phone.'],
      ['Atmosphere Creation', 'Bringing portable Bluetooth speakers and cold drinks to wash area.', 'Treating chores as an annoying burden rather than shared quality time.'],
      ['Mutual Vulnerability', 'Seeing each other in simple casual wear without high-glam filters.', 'Demanding high-maintenance dressing for basic domestic errands.'],
      ['Efficiency & Pace', 'Dividing tasks logically—one washes, one wrings and hangs on lines.', 'Chaotic disorganization leaving clothes half-washed before sudden rain.'],
      ['Relational Depth', 'Developing deep appreciation for each others grit and work ethic.', 'Judging partner based on surface appearances and artificial flex.']
    ],
    topicDilemma: 'transforming domestic student necessities into authentic, grounded romantic connection',
    ruleList: [
      'The Fair Labor Compact: Always divide manual tasks evenly so nobody feels treated as domestic help.',
      'The Acoustic Vibe: Create a curated music playlist to turn laundry sessions into relaxing fun.',
      'The Weather Watch: Keep an eye on tropical campus rain clouds to protect freshly hung laundry.',
      'The Simple Refreshment: Celebrate chore completion with chilled zobo drinks or fruit smoothies.',
      'The Authentic Match: Find down-to-earth, genuine student partners on The College Date.'
    ]
  },
  {
    num: 114,
    slug: 'surviving-campus-blackouts-and-generator-hours-dating',
    title: 'Surviving Generator Cut-Off Hours and Darkness with Your Date',
    kicker: 'Campus Infrastructure Dating',
    desc: 'Romantic date ideas during campus power blackouts and generator curfew hours. Discover acoustic dates, stargazing, deep conversation prompts, and safety.',
    quickTake: 'Campus power blackouts and generator cut-offs provide unique opportunities for intimate, distraction-free connection. Shifting to outdoor starry quads, illuminated cafeteria patios, and battery-powered acoustic dates fosters profound emotional vulnerability without screens.',
    colA: 'Memorable Blackout Date Activities',
    colB: 'High-Risk Blackout Hazards',
    rows: [
      ['Venue Choice', 'Well-lit central cafeteria patios and populated campus quads.', 'Wandering into pitch-black secluded campus bushes or unlit faculties.'],
      ['Device Readiness', 'Fully charged power banks and low-brightness LED reading lights.', 'Phones completely drained, leaving couples stranded without communication.'],
      ['Conversational Depth', 'Engaging in deep prompt questions and sharing childhood stories.', 'Complaining bitterly about power grid failure the entire evening.'],
      ['Safety Awareness', 'Staying within sight of active campus security patrols and students.', 'Isolating in dark areas susceptible to phone snatchers and campus crime.'],
      ['Mood Cultivation', 'Treating darkness as a cozy, tranquil pause from academic noise.', 'Letting power cuts ruin enthusiasm and canceling quality connection.']
    ],
    topicDilemma: 'erratic electricity grids, generator shutdowns, and creative offline romance on campus',
    ruleList: [
      'The Safe Illumination Rule: Always stay near ambient campus lighting or security posts.',
      'The Charged Powerbank Habit: Keep portable battery backups ready for reliable communication.',
      'The Conversational Pivot: Use power outages to put phones away and talk about deep life goals.',
      'The Stargazing Alternative: Enjoy peaceful campus sports bleachers while the air is cool.',
      'The Resourceful Network: Meet adaptable, resilient student singles on The College Date.'
    ]
  },
  {
    num: 115,
    slug: 'dealing-with-nosy-hostel-wardens-and-inspectors',
    title: 'Dealing with Nosy Hostel Wardens and Security Spotlights',
    kicker: 'Hostel Administrative Safety',
    desc: 'How to handle strict hostel wardens and surprise room inspections. Learn residential rights, respectful communication, and how to avoid disciplinary citations.',
    quickTake: 'Handling hostel wardens and inspectors requires understanding official residential regulations, maintaining respectful communication during room checks, and ensuring room decorum aligns with campus policy. Composure and institutional compliance protect student standing.',
    colA: 'Polite Institutional Compliance',
    colB: 'High-Risk Warden Confrontations',
    rows: [
      ['Inspection Readiness', 'Room tidy, electrical hotplates stored, and zero contraband visible.', 'Frantic scrambling to hide unauthorized appliances during surprise knocks.'],
      ['Verbal Composure', 'Responding to questions with courteous, calm "Yes ma / Yes sir" poise.', 'Arguing defensively or accusing wardens of targeted harassment.'],
      ['Guest Policy Knowledge', 'Clear understanding of official visiting hours and sign-in sheets.', 'Ignorance of hall handbook rules leading to avoidable fines.'],
      ['ID Verification', 'Possessing valid student ID cards readily accessible at all times.', 'Inability to produce student credentials during evening spot-checks.'],
      ['Disciplinary Outcome', 'Clean record with wardens viewing you as a model resident student.', 'Formal appearance before the Hall Disciplinary Committee.' ]
    ],
    topicDilemma: 'navigating strict residential hall oversight, surprise checks, and administrative scrutiny',
    ruleList: [
      'The Handbook Familiarity Rule: Know your university hall regulations inside and out.',
      'The Respectful Demeanor: Never challenge security staff or wardens in hostile public arguments.',
      'The Clean Station Habit: Keep living quarters tidy and free from prohibited high-wattage items.',
      'The Immediate Compliance: Follow visitor departure directives promptly when wardens announce closing.',
      'The Verified Standing: Protect your collegiate reputation by dating verified students on The College Date.'
    ]
  },
  {
    num: 116,
    slug: 'discreet-dating-in-shared-student-lodges',
    title: 'The Art of Subtlety: Discreet Dating in Shared Campus Lodges',
    kicker: 'Lodge Privacy Protection',
    desc: 'Master the art of discreet romance in shared student lodges and compounds. Keep your relationship low-key, avoid compound gossip, and protect your peace.',
    quickTake: 'Discreet dating in shared student lodges requires keeping arrival and departures low-key, avoiding loud corridor displays, communicating through private digital channels, and establishing mutual privacy compacts. Discretion protects relationship peace from nosy lodge neighbors.',
    colA: 'Discreet & Protected Romance',
    colB: 'Noisy Compound Drama Triggers',
    rows: [
      ['Compound Movements', 'Entering and leaving quietly without lingering in shared corridors.', 'Loud conversations, laughing, and prolonged goodbyes at compound gates.'],
      ['Conflict Management', 'Resolving private disagreements behind closed doors in hushed tones.', 'Screaming arguments that echo through shared face-me-I-face-you halls.'],
      ['Neighbor Relations', 'Warm, polite, yet boundaried relationships with lodge neighbors.', 'Over-sharing relationship secrets with gossip-prone compound mates.'],
      ['Digital Footprint', 'Keeping relationship status low-key and off public lodge group chats.', 'Broadcasting dramatic status updates and sub-tweets that neighbors dissect.'],
      ['Emotional Sanctuary', 'Relationship remains a peaceful, private refuge from campus noise.', 'Private intimacy exposed to constant commentary from lodge busybodies.']
    ],
    topicDilemma: 'protecting romantic privacy in densely populated off-campus student compounds',
    ruleList: [
      'The Quiet Transit Rule: Keep footsteps and voices soft when passing neighbors rooms.',
      'The Private Resolution Rule: Never allow relationship debates to become compound entertainment.',
      'The Closed-Door Policy: Ensure lodge doors and curtains are drawn during private conversations.',
      'The Boundaried Politeness: Greet neighbors warmly without inviting them into your private affairs.',
      'The Secure Community: Connect with discrete, privacy-conscious students on The College Date.'
    ]
  },
  {
    num: 117,
    slug: 'dating-partner-living-in-remote-off-campus-village',
    title: 'When Your Partner Lives Far Away in a Remote Off-Campus Village',
    kicker: 'Campus Distance Realities',
    desc: 'How to manage dating when your partner lives in distant off-campus student settlements. Discover safe transit strategies, fare budgeting, and visit routines.',
    quickTake: 'Dating a partner residing in distant off-campus student villages requires coordinating travel around daylight hours, budgeting transport fares realistically, and prioritizing verified transportation options. Careful planning bridges geographical gaps without compromising safety.',
    colA: 'Safe Remote Lodge Travel Routine',
    colB: 'High-Risk Distance Mistakes',
    rows: [
      ['Travel Timing', 'Traveling during daylight hours and departing before sunset.', 'Hailing remote bikes along dark, deserted village roads after 9:00 PM.'],
      ['Transport Budget', 'Factoring weekly keke and bike fares into personal dating budgets.', 'Running out of cash in remote villages without transport back to school.'],
      ['Route Familiarity', 'Sticking to established, populated routes with active commercial traffic.', 'Following unknown dirt paths to save minor transport change.'],
      ['Communication Sync', 'Sharing live arrival updates and phone battery check-ins with friends.', 'Traveling without notifying roommates of your destination and return time.'],
      ['Visit Frequency', 'Consolidating visits to quality weekend afternoons to minimize transit.', 'Exhausting daily cross-town commutes that ruin lecture attendance.']
    ],
    topicDilemma: 'navigating long distances, bad roads, and security risks in peripheral campus villages',
    ruleList: [
      'The Daylight Transit Rule: Always complete remote village travel before darkness falls.',
      'The Fare Reserve Habit: Keep emergency cash tucked away specifically for return transport.',
      'The Friend Check-In Protocol: Let a trusted roommate know your destination and estimated return time.',
      'The Weekend Focus: Schedule longer quality weekend dates rather than exhausting weekday trips.',
      'The Localized Discovery: Use The College Date radius filters to discover peers in nearby neighborhoods.'
    ]
  },
  {
    num: 118,
    slug: 'bathroom-etiquette-and-morning-routines-lodge-dating',
    title: 'Bathroom Etiquette and Morning Realities in Campus Lodges',
    kicker: 'Lodge Hygiene Standards',
    desc: 'Master shared bathroom etiquette and morning routines when dating in student lodges. Learn water fetching courtesy, cleanliness rules, and morning diplomacy.',
    quickTake: 'Morning bathroom etiquette in student lodges demands respecting neighbors early morning toilet queues, leaving facilities spotless after use, and fetching your own water without depleting communal drums. Good domestic habits reflect personal maturity and respect.',
    colA: 'Courteous Morning Routine',
    colB: 'Lodge Bathroom Violations',
    rows: [
      ['Queue Management', 'Waiting patiently and taking swift, efficient showers during peak hours.', 'Monopolizing shared bathrooms for 45 minutes while neighbors rush for 8 AM classes.'],
      ['Water Replenishment', 'Fetching fresh water to refill communal drums after personal use.', 'Draining the last bucket of borehole water and leaving empty drums.'],
      ['Cleanliness Standard', 'Rinsing tiles, clearing hair from drains, and leaving spaces clean.', 'Leaving soapy scum, discarded toiletries, or dirty water on bathroom floors.'],
      ['Corridor Attire', 'Dressing in appropriate loungewear or bathrobes when exiting.', 'Walking through shared corridors in revealing or inappropriate towels.'],
      ['Neighbor Harmony', 'Maintaining high respect and peaceful relationships with lodge mates.', 'Igniting compound shouting matches over bathroom delays and mess.']
    ],
    topicDilemma: 'navigating shared water drums, early morning class rushes, and communal hygiene courtesy',
    ruleList: [
      'The Swift Shower Standard: Keep morning bathroom visits under 10 minutes during class rushes.',
      'The Clean Drain Rule: Ensure drains and surfaces are thoroughly rinsed before exiting.',
      'The Refill Responsibility: Always contribute physical labor to fetching borehole water.',
      'The Modest Attire Rule: Wear modest loungewear when moving between rooms and washrooms.',
      'The High-Standard Match: Find considerate, mature student singles on The College Date.'
    ]
  },
  {
    num: 119,
    slug: 'quiet-hours-and-noise-complaints-hosting-campus-dates',
    title: 'Navigating Quiet Hours and Noise Complaints When Hosting Dates',
    kicker: 'Hostel Acoustic Courtesy',
    desc: 'Avoid noise complaints and respect hostel quiet hours when hosting campus dates. Discover volume control, speaker etiquette, and neighbor consideration.',
    quickTake: 'Respecting quiet hours when hosting campus dates requires keeping speaker volumes low, speaking in moderate conversational tones, and respecting nighttime study windows. Acoustic consideration prevents bitter neighbor feuds and protects your residential standing.',
    colA: 'Acoustically Considerate Host',
    colB: 'Disruptive Noise Violations',
    rows: [
      ['Speaker Volume', 'Using headphones or keeping Bluetooth speakers on low ambient levels.', 'Blaring bass-heavy music through shared thin lodge walls at midnight.'],
      ['Voice Discipline', 'Speaking in calm, quiet conversational tones during evening hours.', 'Loud shouting, boisterous laughter, and animated yelling during quiet hours.'],
      ['Study Period Respect', 'Enforcing total silence in room during semester exam revision weeks.', 'Hosting distracting party-style hangouts while neighbors cram for exams.'],
      ['Reaction to Complaints', 'Apologizing instantly with grace and lowering volume immediately.', 'Reacting aggressively or mocking neighbors who knock asking for quiet.'],
      ['Compound Reputation', 'Viewed by lodge caretakers and peers as a mature, quiet neighbor.', 'Target of formal noise complaints and threats of non-renewal of lease.']
    ],
    topicDilemma: 'thin lodge walls, exam quiet hours, and managing acoustic courtesy with romantic guests',
    ruleList: [
      'The 10:00 PM Low-Decibel Rule: Lower all electronics and voices to hushed levels after 10:00 PM.',
      'The Earphone Protocol: Share earbuds when watching movies together on laptops late at night.',
      'The Exam Blackout: Suspend all entertainment hosting during departmental examination weeks.',
      'The Gracious Apology: If a neighbor knocks, turn down volume immediately without argument.',
      'The Considerate Match: Connect on The College Date with partners who respect academic boundaries.'
    ]
  },
  {
    num: 120,
    slug: 'how-to-coexist-in-the-same-hostel-after-a-breakup',
    title: 'How to Bow Out Gracefully When a Hostel Relationship Ends',
    kicker: 'Post-Breakup Hostel Coexistence',
    desc: 'How to peacefully coexist in the same hall or lodge after a campus breakup. Learn corridor etiquette, boundary maintenance, and emotional recovery strategies.',
    quickTake: 'Coexisting in the same hostel or lodge after a breakup demands maintaining cool, polite corridor greetings, avoiding mutual friend smear campaigns, and establishing firm personal boundaries. Composure and emotional discipline allow healing without residential disruption.',
    colA: 'Dignified Post-Breakup Conduct',
    colB: 'Destructive Hostel Breakup Chaos',
    rows: [
      ['Corridor Encounters', 'Polite, brief nod of acknowledgment before walking calmly on.', 'Glaring, aggressive sneering, or running away awkwardly in corridors.'],
      ['Hostel Gossip Circles', 'Refusing to discuss breakup details or slander ex with neighbors.', 'Broadcasting intimate grievances to turn compound mates against ex.'],
      ['Shared Amenities', 'Using communal taps, kitchens, and study areas with neutral poise.', 'Creating tense scenes or refusing to share communal water resources.'],
      ['Social Media Demeanor', 'Maintaining silence and focusing on academic goals and fitness.', 'Posting bitter status updates, subliminal quotes, and revenge photos.'],
      ['Emotional Trajectory', 'Rapid personal healing, restored focus, and dignified closure.', 'Chronic emotional distress, academic decline, and forced lodge relocation.']
    ],
    topicDilemma: 'inevitable daily encounters with an ex in tight hostel corridors and shared courtyards',
    ruleList: [
      'The Neutral Nod Rule: Acknowledge your ex with a brief, civil nod and keep moving forward.',
      'The Anti-Slander Compact: Never recruit hostel roommates into personal post-breakup smear campaigns.',
      'The Amenity Neutrality: Treat communal taps and kitchens with purely professional courtesy.',
      'The Focus Redirection: Channel emotional energy into library study hours and physical fitness.',
      'The Fresh Chapter: When ready, explore a clean slate with verified students on The College Date.'
    ]
  }
];

// Helper to assemble full page objects
const allPages = [];

// 1. Process explicit c11Meta (101 to 105)
for (const m of c11Meta) {
  const t = topics.find((x) => x.num === m.num);
  allPages.push(
    createWave1Page({
      num: m.num,
      slug: t.slug,
      title: t.title,
      description: m.leadP.slice(0, 155),
      kicker: m.kicker,
      h1: t.title,
      lede: m.leadP,
      quickTake: m.quickTake,
      section1Heading: `The ${m.kicker} Paradigm: Understanding the Campus Dynamic`,
      section1Content: `
        <p>${m.detail1}</p>
        <p>${m.detail2}</p>
      `,
      section2Heading: 'Daily Friction Points and Lived Realities in Student Residences',
      section2Content: `
        <p>${m.detail3}</p>
        <p>${m.detail4}</p>
      `,
      tableHeading: m.tableHeading,
      tableIntro: 'Compare the critical dimensions of this hostel dynamic to make informed, mature relationship choices:',
      col1Header: m.colA,
      col2Header: m.colB,
      tableRows: m.rows,
      section4Heading: 'Psychological Pressures, Peer Scrutiny, and Academic Priorities',
      section4Content: `
        <p>In tertiary living environments, every personal decision is magnified by communal scrutiny. Balancing romantic desires against the hard reality of continuous assessment tests and examination deadlines requires steadfast focus.</p>
        <p>Students who prioritize clear communication, mutual respect, and academic excellence consistently navigate these residential pressures with their reputations and grades intact.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Standards for Campus Harmony',
      section5Content: `
        <p>Implement these five core principles to thrive socially and romantically in your hall:</p>
        <ol>
${m.rules.map((r) => `          <li><strong>${r.split(':')[0]}:</strong> ${r.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: m.faqs,
      relatedGuides: [
        { href: '/dating-when-squatting-in-a-university-hostel', label: 'Dating When Squatting' },
        { href: '/unwritten-roommate-code-bringing-dates-hostel', label: 'Roommate Dating Code' },
        { href: '/handling-hostel-porter-curfews-evening-dates', label: 'Hostel Curfew Management' },
        { href: '/campus-dating-safety', label: 'Campus Safety Standards' },
      ],
    })
  );
}

// 2. Process c11Remainder (106 to 120)
for (const r of c11Remainder) {
  const t = topics.find((x) => x.num === r.num);
  allPages.push(
    createWave1Page({
      num: r.num,
      slug: t.slug,
      title: r.title,
      description: r.desc,
      kicker: r.kicker,
      h1: r.title,
      lede: `Navigating ${r.topicDilemma} requires practical tact, mature boundaries, and clear communication. Here is the definitive student guide to thriving in your campus environment.`,
      quickTake: r.quickTake,
      section1Heading: `Understanding the Lived Reality of ${r.kicker}`,
      section1Content: `
        <p>Living and dating within tertiary student accommodations—such as the densely populated halls and off-campus lodges surrounding major institutions like UNILAG, UI, OAU, ABU, and UNN—is an intense communal experience. Every romantic interaction reverberates through shared corridors, communal bathrooms, and roommate circles.</p>
        <p>When students encounter challenges surrounding ${r.topicDilemma}, the lack of private space amplifies emotional tension. Unresolved misunderstandings quickly become public spectacles if not handled with deliberate maturity and empathy.</p>
      `,
      section2Heading: 'Daily Friction Points and Environmental Stresses on Campus',
      section2Content: `
        <p>The practical demands of student life—including erratic power supply, communal water fetching, early morning lecture sprints, and strict gate curfews—require couples to coordinate schedules with precision.</p>
        <p>Failing to establish clear ground rules regarding visitors, noise levels, and shared meal preparations breeds avoidable friction with roommates and lodge caretakers. Respecting your living environment is the foundation of a peaceful relationship.</p>
        <p>Always prioritize transparent, early communication over passive-aggressive hints. A two-minute polite conversation in person prevents weeks of corridor animosity and protects your living sanctuary.</p>
      `,
      tableHeading: `Comparative Analysis: Recommended Best Practices vs High-Risk Errors`,
      tableIntro: 'Examine the operational contrasts between considerate, mature campus behavior and common relationship pitfalls:',
      col1Header: r.colA,
      col2Header: r.colB,
      tableRows: r.rows,
      section4Heading: 'Protecting Mental Well-Being and Grade Point Averages in Crowded Dorms',
      section4Content: `
        <p>Your Cumulative Grade Point Average (CGPA) remains your most valuable currency as an undergraduate. When residential conflicts or relationship drama consume your mental bandwidth, continuous assessments and examination results inevitably decline.</p>
        <p>Maintaining emotional composure, establishing clear boundaries, and utilizing campus libraries for quiet study allows you to nurture healthy romance while consistently achieving academic distinction.</p>
      `,
      section5Heading: 'Actionable Framework: Five Golden Rules for Long-Term Relationship Success',
      section5Content: `
        <p>Follow these five strategic rules to maintain harmonious living while building genuine romance:</p>
        <ol>
${r.ruleList.map((rule) => `          <li><strong>${rule.split(':')[0]}:</strong> ${rule.split(':')[1]}</li>`).join('\n')}
        </ol>
      `,
      faqs: [
        {
          question: `What is the most common mistake students make regarding ${r.title.toLowerCase()}?`,
          answer: 'The most frequent mistake is assuming roommates and neighbors will automatically adapt without prior notice. Giving advance heads-up, respecting communal quiet hours, and capping visit durations prevents residential resentment and protects friendships.'
        },
        {
          question: 'How can student couples balance intense academic workloads with dating in crowded halls?',
          answer: 'Couples should schedule focused study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy hostel rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
        },
        {
          question: 'What should you do if hostel rumors or gossip begin circulating about your relationship?',
          answer: 'Maintain calm, dignified composure and refuse to engage in defensive arguments. Gossip dies quickly when deprived of emotional fuel. Focus your energy on your studies, trusted friends, and verified partner.'
        },
        {
          question: 'Why is connecting with verified students essential for a safe campus dating experience?',
          answer: 'Verified student platforms like The College Date eliminate catfishing, protect personal privacy under the Nigeria Data Protection Act (NDPA), and connect you with authentic peers from your faculty and university who value safety and respect.'
        }
      ],
      relatedGuides: [
        { href: '/dating-when-squatting-in-a-university-hostel', label: 'Dating When Squatting' },
        { href: '/unwritten-roommate-code-bringing-dates-hostel', label: 'Roommate Dating Code' },
        { href: '/handling-hostel-porter-curfews-evening-dates', label: 'Hostel Curfew Management' },
        { href: '/campus-dating-safety', label: 'Campus Safety Standards' },
      ],
    })
  );
}

// Write the module out to cluster11.mjs
const fileContent = `// Auto-generated Cluster 11: Hostel & Hall of Residence Micro-Cultures (Topics 101 to 120)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster11Pages = ${JSON.stringify(allPages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster11.mjs'), fileContent, 'utf8');
console.log(`✓ Successfully compiled scripts/seo-expansion-wave1/cluster11.mjs (${allPages.length} topics)`);
