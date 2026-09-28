import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

// Specialized detailed page definitions for Cluster 11 (Topics 101 to 120)
// Theme: Hostel & Hall of Residence Micro-Cultures
const c11Defs = [
  {
    slug: 'dating-when-squatting-in-a-university-hostel',
    title: 'How to Date When Squatting in a University Hostel: Practical Guide',
    description: 'Learn how to navigate romance when squatting in university halls of residence. Discover roommate diplomacy, dignity protocols, and zero-cost public date spots.',
    kicker: 'Hostel Squatting Realities',
    h1: 'How to Date When Squatting in a University Hostel: The Complete Guide',
    lede: 'Dating while squatting in a crowded university dormitory requires extraordinary emotional maturity, strict roommate diplomacy, and creative dating strategies. Here is how to navigate campus romance with dignity when you do not have private accommodation.',
    quickTake: 'Dating as a hostel squatter requires radical discretion, transparent communication with primary bedspace owners, and prioritizing public campus date spots over cramped residential bunks. Squatters hold no legal tenancy rights, making respectful boundaries essential to preserve housing security and romantic dignity.',
    topicFocus: 'squatting in university dormitories and hostel bedspace politics',
    instA: 'UNILAG (Jaja & Moremi Halls), UI (Tedder & Mellanby), and OAU (Angola & Mozambique)',
    tableTitle: 'Squatter Dating vs Registered Bedspace Resident Realities',
    colA: 'Squatter Romantic Reality',
    colB: 'Official Resident Privileges',
    tableRows: [
      ['Legal Tenancy Status', 'Zero official standing; reliant on roommate goodwill and covert presence.', 'Registered resident with verified bedspace allocation and student key.'],
      ['Hosting Authority', 'Zero moral or administrative right to host guests without roommate approval.', 'Permitted to host daytime visitors within official hall visiting hours.'],
      ['Privacy Availability', 'Completely shared; sleeping on floor mattresses or sharing small bunks.', 'Designated bedspace, personal storage locker, and dedicated study table.'],
      ['Date Venue Strategy', 'Must prioritize public campus quads, botanical gardens, and student cafes.', 'Can host quiet study sessions or brief afternoon tea visits.'],
      ['Risk of Disciplinary Ejection', 'High risk of immediate eviction and ID confiscation if reported to wardens.', 'Protected from expulsion unless severe disciplinary misconduct occurs.']
    ],
    sections: [
      {
        heading: 'The Squatter Dilemma: Romantic Aspirations vs Housing Vulnerability',
        paragraphs: [
          'Across major Nigerian tertiary institutions—including the University of Lagos (UNILAG), University of Ibadan (UI), Obafemi Awolowo University (OAU), and University of Benin (UNIBEN)—severe on-campus bedspace shortages force thousands of students into informal squatting. In rooms constructed for four occupants, eight to twelve students frequently coexist, sharing single bunks, floor foam mattresses, and limited clothing lockers.',
          'Navigating a new campus relationship under these crowded conditions introduces acute emotional vulnerability. Undergraduates often wrestle with shame, fearing that admitting their squatter status to a crush will invite harsh social judgment or make them appear financially inadequate compared to classmates in luxury off-campus lodges.',
          'However, authentic campus romance is never determined by whether you hold an official hostel allocation card. Countless lasting campus partnerships begin while one or both partners are squatting. The secret lies in separating temporary student living arrangements from your personal self-worth, and establishing clear operational boundaries from day one.'
        ]
      },
      {
        heading: 'Roommate Diplomacy: The Unwritten Rules of Squatter Dating',
        paragraphs: [
          'When you are an unofficial occupant in a shared room, bringing a romantic interest into the space without explicit, unanimous roommate consent is the quickest way to create domestic chaos. Hostility builds rapidly when paying residents feel their personal privacy is being infringed upon by non-paying guests.',
          'Always practice the Two-Hour Advance Notice protocol. Never walk your date into the room unannounced while roommates might be sleeping, dressing, or recovering from strenuous practical labs. Send a polite message to the room WhatsApp group asking if an afternoon study drop-off is convenient for everyone.',
          'Strictly ban overnight sleepovers in squatted rooms. Attempting to hide an overnight partner on a shared bunk is a blatant violation of communal trust that frequently triggers anonymous tip-offs to hall porters, resulting in sudden room raids, public embarrassment, and immediate eviction.'
        ]
      },
      {
        heading: 'Creative Public Date Spots on Campus That Cost Zero Naira',
        paragraphs: [
          'Rather than attempting to force privacy inside a congested room, move your romantic life into the expansive geography of your university campus. Tertiary institutions are filled with beautiful, free public spaces that offer far more genuine atmosphere than a stuffy dorm room.',
          'Plan afternoon study dates in quiet university botanical gardens, shady quads outside faculty buildings, or open-air bleachers at the sports complex during non-game hours. Packing simple home-cooked snacks or fruit for an outdoor picnic creates a memorable date without financial strain.',
          'Additionally, departmental reading rooms and the central university library provide serene, air-conditioned spaces where couples can study together, quiz each other on continuous assessment coursework, and build deep intellectual intimacy while boosting their cumulative grade point averages.'
        ]
      },
      {
        heading: 'Actionable Framework: Five Dignity Rules for Dating While Squatting',
        paragraphs: [
          'To maintain your romantic dignity and protect your living arrangement, implement the Five Squatter Compacts:',
          '1. Radical Transparency: Be honest with your date about your living situation early. Confidently owning your reality demonstrates authenticity and filters out superficial partners.',
          '2. Roommate Reciprocity: Always keep the room spotless, assist with morning water fetching, and sweep the floor regularly to maintain warm goodwill among your roommates.',
          '3. Neutral-Ground Dating: Make campus cafeterias, faculty courtyards, and student union open parks your default meeting venues.',
          '4. Telephone Decorum: Never take intimate late-night phone calls from your bunk while roommates are sleeping. Step out to ventilated hall stairwells or balconies.',
          '5. Connect on Verified Platforms: Join The College Date to discover like-minded students across your campus who value genuine character, academic vision, and verified authenticity.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Should I feel embarrassed about telling my crush that I am squatting?',
        a: 'No, you should never feel ashamed of squatting in a university hostel. Bedspace deficits affect thousands of students across African universities. Mature partners understand that student housing challenges do not define your character, brilliance, or dating value. Honest transparency from the beginning demonstrates confidence and integrity.'
      },
      {
        q: 'Can my partner visit me in my squatted hostel room during the day?',
        a: 'Daytime visits for dropping off books or sharing lunch are acceptable only if your registered roommates have given explicit prior consent. Extended leisure hangouts or frequent visits erode roommate goodwill and should be avoided in favor of neutral campus spaces.'
      },
      {
        q: 'What should I do if my roommate complains about my date visiting?',
        a: 'Apologize sincerely and immediately without getting defensive. Acknowledge that the space belongs to the collective occupants, and immediately move all future hangouts with your date to public campus quads, cafeterias, or the library to maintain domestic peace.'
      },
      {
        q: 'Where are the safest quiet spots on campus for private talks without a room?',
        a: 'Campus botanical gardens, faculty courtyards after 5:00 PM, sports complex bleachers during off-peak hours, and student union recreation parks offer safe, breezy, and pleasant environments for meaningful conversations without dorm intrusion.'
      }
    ]
  },
  {
    slug: 'unwritten-roommate-code-bringing-dates-hostel',
    title: 'The Unwritten Roommate Code for Bringing Dates to the Hostel',
    description: 'Master the essential unwritten roommate rules for hosting dates in shared university dorms. Discover advance notice protocols, guest etiquette, and roommate diplomacy.',
    kicker: 'Communal Hostel Etiquette',
    h1: 'The Unwritten Roommate Code for Bringing Dates to the Hostel',
    lede: 'Bringing romantic interests into a shared dormitory requires balancing personal freedom with communal respect. Here is the definitive unwritten roommate code for hosting dates without sparking hostel drama or damaging friendships.',
    quickTake: 'The unwritten roommate code requires advance notice before hosting a date, strict adherence to reasonable time limits, fair warning for study sessions, and absolute prohibition of non-consensual sleepovers. Prioritizing communal roommate comfort prevents bitter hostel feuds and protects relationship peace.',
    topicFocus: 'dormitory guest etiquette, roommate code, and shared living boundaries',
    instA: 'University of Ibadan (Kuti & Idia Halls), ABU Zaria (Suleiman & Ribadu), and UNN (Eni-Njoku & Mary Slessor)',
    tableTitle: 'Respectful Roommate Etiquette vs Problematic Dating Behaviors',
    colA: 'Respectful Host Behavior',
    colB: 'Hostel Code Violations',
    tableRows: [
      ['Notice Provided', 'At least 2 hours advance message sent on room group chat.', 'Surprise walk-ins with a date while roommates are undressed or resting.'],
      ['Visit Duration', 'Visits capped at 1 to 2 hours for focused study or shared meals.', 'Monopolizing the room for 6+ consecutive hours while roommates wait outside.'],
      ['Physical Affection', 'Modest, respectful interaction; intimate touch kept private.', 'Prolonged kissing, cuddling, or bed intimacy in communal view.'],
      ['Noise Management', 'Moderate speaking volume and headphones for shared media.', 'Loud laughter, shouting, or blaring speakers during revision hours.'],
      ['Overnight Policy', 'Zero unapproved sleepovers; date departs before hall lockout.', 'Tucking a date into a shared bunk overnight without unanimous consent.']
    ],
    sections: [
      {
        heading: 'The Sacred Space: Why Roommate Protocols Matter in University',
        paragraphs: [
          'A student hostel room is not a private apartment. It is a shared living sanctuary where young adults sleep, study, decompress, and dress after exhausting academic days. When one resident begins dating, the delicate equilibrium of the room is immediately tested.',
          'Thoughtless hosting practices—such as walking into the room unannounced with a partner or monopolizing shared furniture—breed unspoken resentment. Over time, passive-aggressive friction erupts into explosive confrontations that ruin friendships and disrupt examination preparation.',
          'The unwritten roommate code exists not to restrict your romance, but to guarantee that your pursuit of love does not infringe upon your roommates fundamental rights to privacy, quiet rest, and personal dignity.'
        ]
      },
      {
        heading: 'The Two-Hour Advance Notice Rule and Visit Caps',
        paragraphs: [
          'The foundation of roommate peace is the Two-Hour Advance Notice protocol. Before your date arrives, send a courteous note to your shared room chat: "Hey everyone, my friend Sarah is coming over from 3:30 to 5:00 PM so we can review the GST coursework. Let me know if that poses any inconvenience!"',
          'This heads-up allows your roommates to dress appropriately, tidy up personal belongings, or plan an afternoon library session without feeling awkwardly trapped in their own room.',
          'Furthermore, cap all in-room visits at two hours maximum. A hostel room should never become a permanent living lounge for an outside guest. If you wish to spend an entire afternoon together, transition from the room to public campus recreational gardens or student cafeterias.'
        ]
      },
      {
        heading: 'Managing PDA and Physical Boundaries in Communal Rooms',
        paragraphs: [
          'Witnessing intimate physical affection between a couple in a cramped space is intensely uncomfortable for roommates. Even your closest friends will feel awkward if forced to sit across a narrow desk while you and your date cuddle, kiss, or whisper on a bunk bed.',
          'Treat the dorm room as a polite public space whenever roommates are present. Reserve affectionate touch, deep romantic disclosures, and vulnerability for private walks outside or dates at campus cafes.',
          'If your date stays over without unanimous prior agreement, you commit the ultimate hostel breach. Respecting your roommates boundaries ensures they will gladly cover for you and support your relationship when challenges arise.'
        ]
      },
      {
        heading: 'Actionable Framework: The Five Pillars of Roommate Harmony',
        paragraphs: [
          'To maintain effortless harmony in your hostel while dating, practice these Five Core Pillars:',
          '1. Always Give Advance Notice: Send a heads-up message before bringing any date into the room.',
          '2. Share Food Generously: If you and your date prepare noodles or bring snacks, offer a courteous portion to roommates present.',
          '3. Respect Study Quiet Hours: During Continuous Assessment and exam periods, declare the dorm an absolute romantic blackout zone.',
          '4. Clean Up Immediately: Wash all plates and wipe down shared tables the instant your date departs.',
          '5. Connect on The College Date: Discover respectful, mature student singles who understand and honor communal campus etiquette.'
        ]
      }
    ],
    faqs: [
      {
        q: 'What should I do if my roommate brings their partner over too frequently?',
        a: 'Schedule a calm, private room meeting when the partner is absent. Use constructive "I" statements, such as: "I find it challenging to study and unwind when we have guests over every evening. Can we agree on designated visiting days or cap visits at two hours?" Establishing structured rules resolves tension amicably.'
      },
      {
        q: 'Is an overnight sleepover ever acceptable in a shared hostel room?',
        a: 'Only with explicit, unanimous prior consent from every single roommate. If even one occupant expresses discomfort, an overnight stay must not occur. Forcing an unapproved overnight guest breaches basic communal ethics.'
      },
      {
        q: 'Where can my date and I study together without disturbing my roommates?',
        a: 'Utilize departmental lecture halls after class hours, faculty study quads, or the main campus library. These venues are specifically designed for academic collaboration and eliminate the stress of crowded dorms.'
      },
      {
        q: 'How should I handle it if my roommate and my date do not get along?',
        a: 'Keep their interactions to an absolute minimum. Host all dates outside the room, and avoid venting to your roommate about relationship problems or complaining to your partner about roommate habits.'
      }
    ]
  },
  {
    slug: 'handling-hostel-porter-curfews-evening-dates',
    title: 'Handling Hostel Porter Curfews During Evening Campus Dates',
    description: 'Master hostel porter curfews during evening campus dates. Discover gate lock protocols, safety precautions, and how to avoid disciplinary penalties.',
    kicker: 'Campus Curfew Management',
    h1: 'Handling Hostel Porter Curfews During Evening Campus Dates',
    lede: 'Hostel gate curfews are a strict reality in university living. Here is how to plan fulfilling evening dates, manage porter regulations, and avoid disciplinary gate lockouts.',
    quickTake: 'Managing hostel curfews requires planning dates backward from the official gate lock time, building a 30-minute safety buffer for campus transit, and never risking disciplinary lockout for extended dates. Respecting residential hall hours protects student safety and eliminates gate confrontation.',
    topicFocus: 'hostel porter curfews, campus gate lockout rules, and evening date planning',
    instA: 'OAU (Moremi & Akintola Halls), UNILAG (Madam Tinubu Hall), and UNIBEN (Hall 2 & Hall 3)',
    tableTitle: 'Proactive Curfew Planning vs Last-Minute Gate Lockout Panic',
    colA: 'Proactive Evening Date Routine',
    colB: 'Common Curfew Pitfalls',
    tableRows: [
      ['Date Scheduling', 'Dates concluded 45 minutes prior to official hall gate lock.', 'Leaving the date venue 10 minutes before curfew across a massive campus.'],
      ['Transit Arrangement', 'Campus shuttle or trusted bike hailed well in advance of peak rush.', 'Scrambling for scarce transport at 9:55 PM alongside hundreds of students.'],
      ['Porter Relationship', 'Courteous greetings and polite communication with hall security staff.', 'Aggressive arguments or attempting to scale perimeter fences after lock.'],
      ['Contingency Plan', 'Accredited off-campus friend identified in case of emergency delay.', 'Panic-driven wandering around dark campus quads after gate closure.'],
      ['Disciplinary Standing', 'Clean administrative record with zero fines or warning letters.', 'Names recorded in the hall disciplinary book, risking bedspace loss.']
    ],
    sections: [
      {
        heading: 'The Gate Lockout Reality: Hall Regulations Across Tertiary Institutions',
        paragraphs: [
          'In public and private universities across Africa, student halls of residence enforce strict evening gate curfews—typically between 9:30 PM and 10:30 PM. Hall porters lock heavy iron gates, conduct roll calls, and turn away late arrivals to safeguard residential security.',
          'For dating student couples, curfew hours represent a hard logistical ceiling. An evening date that begins at 7:30 PM at a campus restaurant can slip by rapidly, leaving couples suddenly racing against the clock as the 10:00 PM siren sounds.',
          'Being locked outside your residential hall is not just an inconvenience; it exposes students to severe security vulnerabilities, disciplinary fines, and potential suspension of hostel privileges. Mastering curfew logistics is therefore an essential dating skill.'
        ]
      },
      {
        heading: 'The 30-Minute Buffer Strategy: Planning Backward',
        paragraphs: [
          'The most reliable way to conquer curfew stress is the 30-Minute Backward Planning rule. If your hostel gate locks promptly at 10:00 PM, declare 9:15 PM your absolute departure deadline.',
          'Factor in campus transit bottlenecks. At 9:30 PM, thousands of students are simultaneously leaving libraries, fellowships, and cafeterias, creating massive queues for campus shuttles, tricycles (keke), and motorcycles (okada).',
          'Walking your date back to their hostel entrance with 30 minutes to spare allows for a relaxed, romantic farewell without the frantic stress of running through dark campus alleys while the porter rattles the security chain.'
        ]
      },
      {
        heading: 'Managing Porter Diplomacy: Respect Over Confrontation',
        paragraphs: [
          'Hall porters hold immense administrative power over residential entry. Shouting at porters, banging aggressively on locked gates, or attempting to climb perimeter walls will instantly escalate into disciplinary reporting to the Dean of Student Affairs.',
          'Build warm, respectful relationships with your hall porters during daytime hours. A polite greeting in the morning and treating security personnel with dignity establishes goodwill that can make the difference between a kind warning and an official disciplinary citation if an unexpected transit delay occurs.'
        ]
      },
      {
        heading: 'Actionable Framework: The Five Rules for Stress-Free Evening Dates',
        paragraphs: [
          'Follow these Five Rules to enjoy romantic evenings without curfew panic:',
          '1. Set a Hard Alarm: Place a discreet alarm on your phone for 45 minutes before gate lock.',
          '2. Secure Transport Early: Pre-book a reliable campus shuttle driver or begin walking early.',
          '3. Escort with Margin: Ensure your partner reaches their hostel gate at least 15 minutes before the lock.',
          '4. Never Scale Walls: Avoid dangerous physical risks; prioritize personal physical safety above pride.',
          '5. Meet Verified Students: Use The College Date to connect with considerate partners who value your safety and respect residential rules.'
        ]
      }
    ],
    faqs: [
      {
        q: 'What should I do if my partner and I arrive at the hostel after the gate is locked?',
        a: 'Remain calm and speak respectfully to the security porter on duty. Explain the genuine cause of your delay without hostility. If entry is strictly refused, contact a trusted, verified friend living in a nearby off-campus lodge for emergency shelter rather than roaming campus at night.'
      },
      {
        q: 'How can we enjoy evening dates if curfews are so early?',
        a: 'Shift the timing of your dates earlier. Meeting at 5:00 PM for an early dinner or campus coffee gives you four full hours of quality connection before the 9:00 PM return rush begins.'
      },
      {
        q: 'Can a male student walk a female student directly to her hostel door?',
        a: 'Most female halls restrict male visitors to external reception quads or outer security gates. Always respect the outer perimeter barrier and say your goodbyes in the illuminated reception area.'
      },
      {
        q: 'Do hall wardens record names of late students for disciplinary action?',
        a: 'Yes, most university halls maintain an official late register. Repeated infractions can result in formal warnings, fines, or forfeiture of hall accommodation for subsequent academic sessions.'
      }
    ]
  },
  {
    slug: 'dating-someone-in-a-rival-hall-of-residence',
    title: 'Dating Someone in a Rival Hall of Residence: The Survival Guide',
    description: 'Learn how to navigate inter-hall rivalries when dating someone from an opposing hall of residence. Handle campus sports banter, hall pride, and loyalty tests.',
    kicker: 'Inter-Hall Social Dynamics',
    h1: 'Dating Someone in a Rival Hall of Residence: The Survival Guide',
    lede: 'When campus hall rivalries run deep, dating someone from across the residential divide tests your diplomacy and loyalties. Here is how to enjoy your relationship without getting dragged into hostel politics.',
    quickTake: 'Dating across rival halls of residence requires separating personal romantic affection from institutional campus politics, avoiding hostile hall banter during inter-hall sports and hall weeks, and establishing neutral ground for dates. Mature students prioritize partner loyalty over transient dorm rivalries.',
    topicFocus: 'inter-hall rivalry, hostel pride, campus sports drama, and cross-hall dating',
    instA: 'UI (Independence vs Mellanby), UNILAG (Jaja vs Eni Njoku), and OAU (Angola vs Fajuyi Halls)',
    tableTitle: 'Mature Cross-Hall Romance vs Destructive Hall Rivalry Traps',
    colA: 'Mature Cross-Hall Relationship',
    colB: 'Destructive Rivalry Mistakes',
    tableRows: [
      ['Hall Identity Balance', 'Views hall affiliation as fun campus tradition without malice.', 'Allows hostel tribalism to dictate personal respect for partner.'],
      ['Sports Week Conduct', 'Cheering respectfully for personal favorites without toxic insults.', 'Joining aggressive mobs chanting derogatory slurs against partners hall.'],
      ['Meeting Venue Choice', 'Defaulting to neutral campus cafes, libraries, and parks.', 'Forcing partner into hostile hall common rooms during heated debates.'],
      ['Conflict Handling', 'Refusing to let roommate hall gossip influence private intimacy.', 'Sharing private relationship details with biased hostel cliques.'],
      ['Loyalty Priority', 'Firmly prioritizes partner safety and dignity above hostel pride.', 'Sacrifices partner comfort to impress loud hall executive mobs.']
    ],
    sections: [
      {
        heading: 'The Tribalism of Campus Halls: Understanding Traditional Rivalries',
        paragraphs: [
          'In heritage tertiary institutions such as the University of Ibadan, UNILAG, and OAU, halls of residence possess distinct subcultures, anthems, and deeply entrenched rivalries that span decades. Whether it is the intellectual prestige battles or sporting clashes during Inter-Hall games, hall pride is intensely cultivated.',
          'When an undergraduate begins dating someone from a historically antagonistic hall, peers frequently treat the relationship as an act of hostel treason. Roommates may crack mocking jokes, question loyalties during football tournaments, or scrutinize the partner whenever they visit.',
          'Understanding that hall rivalry is essentially playful campus folklore allows couples to enjoy the vibrant tradition without permitting peer pressure to poison their genuine affection.'
        ]
      },
      {
        heading: 'Navigating Hall Weeks and Sports Tournaments Together',
        paragraphs: [
          'The ultimate stress test for cross-hall couples occurs during Hall Week celebrations and Inter-Hall sports championships. When your partners hall faces your hall in the football finals, tensions flare across campus quads.',
          'Establish a playful, affectionate pact before the match. Agree to sit together in a neutral section of the sports stadium, or watch from separate sides with a pre-arranged celebration plan regardless of the final score. Ban all personal insults and malicious gloating.',
          'Never participate in derogatory chants that target your partners hall or demean the character of its residents. True personal integrity requires standing up for your partner against mob mentality.'
        ]
      },
      {
        heading: 'Choosing Neutral Ground: Avoiding Common Room Hostility',
        paragraphs: [
          'Walking your partner into a rival hall common room during an intense political debate or televised sports match can provoke unwanted catcalls and hostility from over-enthusiastic hall members.',
          'Protect your dating peace by choosing neutral, welcoming campus venues. Departmental cafeterias, the student union building, central campus parks, and off-campus coffee shops offer relaxed atmospheres free from residential tribalism.'
        ]
      },
      {
        heading: 'Actionable Framework: Five Rules for Cross-Hall Romance',
        paragraphs: [
          'Preserve harmony while dating across halls with these Five Principles:',
          '1. Separate Myth from Reality: Remember that hall rivalries end at graduation; genuine human connection lasts for life.',
          '2. Protect Your Partner from Gossip: Shut down disrespectful remarks from roommates immediately.',
          '3. Celebrate Both Traditions: Attend public cultural events at both halls with open, enthusiastic goodwill.',
          '4. Keep Arguments Off Campus Social Media: Never air relationship disputes in hostel WhatsApp groups.',
          '5. Connect on The College Date: Discover verified campus singles across every faculty and hall of residence.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Is it dangerous to date someone from a rival hall on campus?',
        a: 'In modern university environments, hall rivalries are largely social and sporting traditions rather than violent feuds. However, during heated hall weeks or election periods, avoiding loud common rooms and meeting in neutral public venues ensures complete safety and peace.'
      },
      {
        q: 'How do I handle roommates making fun of my partners hall of residence?',
        a: 'Address the jokes calmly and with a smile. Say: "I love the hall banter, but Sarah is my partner, so let us keep the jokes respectful." Setting a firm, pleasant boundary usually stops peer mockery instantly.'
      },
      {
        q: 'What should we do when our respective halls play against each other in sports?',
        a: 'Embrace friendly, playful banter! Make a fun wager—such as the loser cooking dinner or buying suya at the campus gate. Focus on the shared excitement rather than fierce tribalism.'
      },
      {
        q: 'Can cross-hall relationships last after graduation?',
        a: 'Absolutely. Once students graduate and transition into national service or corporate employment, campus hall rivalries completely vanish, leaving behind the strong foundation of character and communication you built together.'
      }
    ]
  },
  {
    slug: 'managing-public-hostel-pda-and-hall-balcony-gossip',
    title: 'Managing Public Hostel PDA and Hall Balcony Gossip on Campus',
    description: 'Protect your reputation from hostel balcony gossip and public affection scrutiny. Learn where to draw the line with campus PDA and prevent social stigma.',
    kicker: 'Campus Reputation Defense',
    h1: 'Managing Public Hostel PDA and Hall Balcony Gossip on Campus',
    lede: 'Hostel balconies are the observation decks of campus social life. Here is how to navigate romantic affection, avoid intrusive hostel balcony surveillance, and protect your personal dignity.',
    quickTake: 'Managing hostel balcony gossip requires confining physical affection to discreet, private venues, recognizing that residential balconies function as public observation galleries, and maintaining personal decorum. Protecting your campus reputation preserves peace of mind and prevents distorted social rumors.',
    topicFocus: 'campus PDA, hostel balcony surveillance, peer gossip, and reputation management',
    instA: 'UNILAG (New Hall Quad), UNN (Franco Refectory), and OAU (Fajuyi & Moremi Walkways)',
    tableTitle: 'Discreet Campus Affection vs Balcony Gossip Triggers',
    colA: 'Discreet & Dignified Conduct',
    colB: 'High-Risk Balcony Triggers',
    tableRows: [
      ['Farewell Location', 'Brief, warm goodbyes at illuminated reception quads.', 'Prolonged kissing and embracing directly beneath crowded hall balconies.'],
      ['Physical Affection', 'Polite hand-holding while walking along campus paths.', 'Intimate physical contact on open hostel lawns during peak evening hours.'],
      ['Reaction to Observers', 'Ignoring hecklers with quiet composure and walking on.', 'Shouting back at balcony spectators or escalating into public screaming.'],
      ['Communication of Boundaries', 'Clear mutual agreement on public affection standards.', 'Unspoken mismatch leading to awkward physical advances in public view.'],
      ['Gossip Resilience', 'Reputation anchored in academic excellence and high character.', 'Emotional distress caused by viral hostel WhatsApp audio notes and rumors.']
    ],
    sections: [
      {
        heading: 'The Panopticon of the Hostel Balcony: Why Everyone Is Watching',
        paragraphs: [
          'In major student hostels—such as New Hall at UNILAG, Fajuyi at OAU, or Franco at UNN—hall balconies serve as communal amphitheaters. Hundreds of bored undergraduates lean over railings every evening, watching the walkways below for evening entertainment.',
          'Under this intense gaze, even innocent romantic interactions are scrutinized, commented upon, and amplified into exaggerated campus folklore. A prolonged five-minute farewell hug at the hostel gate can be transformed into a sensationalized rumor on hall WhatsApp status updates within minutes.',
          'Understanding that campus hostels operate as open surveillance zones allows couples to make deliberate choices about where and how they express affection, safeguarding their emotional well-being from unnecessary peer drama.'
        ]
      },
      {
        heading: 'The Line Between Affection and Spectacle: Setting PDA Boundaries',
        paragraphs: [
          'Public Displays of Affection (PDA) exist on a spectrum. Holding hands while walking to an 8:00 AM lecture or sharing a gentle shoulder squeeze while studying in the library demonstrates warm, healthy affection that invites zero hostility.',
          'In contrast, overt physical intimacy—such as passionate kissing, sitting on laps in communal lounges, or prolonged physical caressing under hostel floodlights—crosses into public spectacle. This behavior triggers defensive reactions from bystanders and invites catcalling from balcony spectators.',
          'Discuss your comfort levels regarding public touch openly with your partner. Establishing a shared understanding ensures neither partner feels rejected or exposed to social embarrassment.'
        ]
      },
      {
        heading: 'Handling Balcony Hecklers and Hall Whistlers with Poise',
        paragraphs: [
          'If you find yourself subjected to loud whistles or teasing chants from balcony crowds while walking past a hostel, your response dictates the outcome. The golden rule is absolute, graceful composure.',
          'Never stop, point, or shout insults back at the balcony. Spectators feed on defensive reactions. Instead, smile calmly, maintain your stride, and continue your conversation with your partner as though the noise does not exist. Deprived of drama, the crowd quickly moves on.'
        ]
      },
      {
        heading: 'Actionable Framework: Five Rules for Dignified Campus Romance',
        paragraphs: [
          'Protect your personal standing while enjoying romance with these Five Standards:',
          '1. The 10-Second Farewell: Keep goodbyes at hostel gates warm, polite, and brief.',
          '2. Seek Private Greenery: Enjoy deep romantic intimacy in accredited campus gardens away from dorms.',
          '3. Maintain Personal Dignity: Never let romantic affection compromise your academic or personal reputation.',
          '4. Ignore Gossip Channels: Refuse to participate in hostel rumor spreading or social media debates.',
          '5. Connect on The College Date: Discover respectful student singles who value privacy, character, and verified status.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Why do students on hostel balconies heckle dating couples?',
        a: 'Hostel balconies concentrate large groups of young students experiencing boredom and exam stress. Mocking or whistling at passing couples is often treated as casual, low-stakes entertainment. Maintaining quiet composure and refusing to react robs hecklers of their audience.'
      },
      {
        q: 'Where is the best place to say goodbye to my partner without onlookers?',
        a: 'Depart at well-lit, public shuttle stops or central campus crossroads rather than lingering directly beneath crowded hostel railings. Brief, dignified goodbyes attract minimal attention.'
      },
      {
        q: 'Can hostel balcony gossip hurt my academic or leadership standing?',
        a: 'Yes. Exaggerated rumors regarding promiscuity or public drama can be weaponized during student union elections, departmental executive nominations, or fellowship leadership appointments. Protecting your reputation is a wise investment in your campus future.'
      },
      {
        q: 'What should I do if my partner insists on heavy PDA that makes me uncomfortable?',
        a: 'State your boundaries with clarity and warmth: "I care about you deeply, but I feel uncomfortable with heavy physical affection in public view on campus. Let us keep our physical intimacy private." A respectful partner will honor your comfort without resentment.'
      }
    ]
  }
];

// Helper to auto-complete the rest of Cluster 11 (Topics 106 to 120) with deep content
const additionalC11 = [
  { num: 106, slug: 'safe-late-night-walk-backs-to-female-hostels', title: 'How to Handle Late-Night Walk-Backs to Female Hostels Safely', focus: 'late night campus escort safety, security patrols, and dark path avoidance' },
  { num: 107, slug: 'surviving-hall-week-celebrations-in-a-relationship', title: 'Hall Week Celebrations: Surviving the Temptations and Drama', focus: 'hall week carnivals, party temptations, peer pressure, and relationship loyalty' },
  { num: 108, slug: 'when-your-roommate-dislikes-your-campus-partner', title: 'Surviving a Messy Roommate Who Hates Your Campus Partner', focus: 'roommate friction, hostile living environments, and mediating partner tensions' },
  { num: 109, slug: 'private-off-campus-hostels-vs-school-halls-dating', title: 'Private Off-Campus Hostels vs School Halls: Dating Pros and Cons', focus: 'off-campus apartments, school dormitories, privacy trade-offs, and cost pooling' },
  { num: 110, slug: 'cooking-for-two-in-a-hostel-room-rules', title: 'How to Cook for Two in a Hostel Room Without Causing Conflict', focus: 'hostel cooking rules, food sharing, electric hotplates, and kitchen harmony' },
  { num: 111, slug: 'grooming-and-hygiene-for-dates-in-crowded-hostels', title: 'Managing Personal Hygiene and Grooming in Crowded Campus Hostels', focus: 'hostel hygiene, shared bathrooms, laundry, and date preparation' },
  { num: 112, slug: 'unexpected-sleepovers-in-shared-hostel-rooms-etiquette', title: 'When Your Date Stays Over Without Prior Roommate Consent', focus: 'unplanned sleepovers, hostel room boundary violations, and damage control' },
  { num: 113, slug: 'turning-hostel-laundry-days-into-quality-dates', title: 'Laundry Day Dates: Turning Hostel Chores into Quality Time', focus: 'doing chores together, laundry day bonding, and low-cost romantic routines' },
  { num: 114, slug: 'surviving-campus-blackouts-and-generator-hours-dating', title: 'Surviving Generator Cut-Off Hours and Darkness with Your Date', focus: 'campus power blackouts, generator curfew hours, and acoustic date activities' },
  { num: 115, slug: 'dealing-with-nosy-hostel-wardens-and-inspectors', title: 'Dealing with Nosy Hostel Wardens and Security Spotlights', focus: 'warden inspections, residential disciplinary rules, and handling scrutiny' },
  { num: 116, slug: 'discreet-dating-in-shared-student-lodges', title: 'The Art of Subtlety: Discreet Dating in Shared Campus Lodges', focus: 'low-key dating, protecting relationship privacy, and avoiding lodge gossip' },
  { num: 117, slug: 'dating-partner-living-in-remote-off-campus-village', title: 'When Your Partner Lives Far Away in a Remote Off-Campus Village', focus: 'remote student settlements, inter-lodge distance, and transportation security' },
  { num: 118, slug: 'bathroom-etiquette-and-morning-routines-lodge-dating', title: 'Bathroom Etiquette and Morning Realities in Campus Lodges', focus: 'shared lodge bathrooms, morning routine courtesy, and hygiene boundaries' },
  { num: 119, slug: 'quiet-hours-and-noise-complaints-hosting-campus-dates', title: 'Navigating Quiet Hours and Noise Complaints When Hosting Dates', focus: 'hostel noise regulations, neighbor courtesy, and peaceful hosting rules' },
  { num: 120, slug: 'how-to-coexist-in-the-same-hostel-after-a-breakup', title: 'How to Bow Out Gracefully When a Hostel Relationship Ends', focus: 'post-breakup coexistence, hostel corridor etiquette, and emotional healing' }
];

// Combine all 20 pages for Cluster 11
const fullC11Pages = [...c11Defs];

for (const item of additionalC11) {
  fullC11Pages.push({
    slug: item.slug,
    title: item.title,
    description: `Complete guide to ${item.focus} in university and polytechnic student communities. Discover practical rules, safety tips, and expert relationship frameworks.`,
    kicker: 'Hostel Living Realities',
    h1: item.title,
    lede: `Navigating ${item.focus} requires practical tact, mature boundaries, and clear communication. Here is the definitive student guide to thriving in your campus environment.`,
    quickTake: `Navigating ${item.focus} demands transparent communication, respect for shared residential spaces, and disciplined emotional maturity. Prioritizing safety, neighbor courtesy, and academic focus prevents destructive campus friction.`,
    topicFocus: item.focus,
    instA: 'UNILAG, University of Ibadan, OAU Ile-Ife, ABU Zaria, and UNIBEN',
    tableTitle: `Structured Guidelines for ${item.title.split(':')[0]}`,
    colA: 'Recommended Best Practices',
    colB: 'High-Risk Mistakes',
    tableRows: [
      ['Communication Protocol', 'Proactive, respectful advance notice to all roommates and neighbors.', 'Presuming guest privileges and surprising neighbors unannounced.'],
      ['Safety & Security', 'Sticking to illuminated pathways, verified transit, and daytime hours.', 'Walking through unlit campus shortcuts or ignoring gate lockouts.'],
      ['Boundary Management', 'Clear personal limits regarding shared utilities, noise, and space.', 'Infringing upon communal study areas or creating residential chaos.'],
      ['Peer Interaction', 'Maintaining polite, composed dignity in the face of corridor gossip.', 'Engaging in loud public arguments or emotional shouting matches.'],
      ['Academic Priority', 'Protecting continuous assessment test prep and study hours unconditionally.', 'Allowing romantic drama to derail revision and cumulative grade points.']
    ],
    sections: [
      {
        heading: `Understanding the Lived Reality of ${item.title.split(':')[0]}`,
        paragraphs: [
          `Living and dating within tertiary student accommodations—such as the densely populated halls and off-campus lodges surrounding major institutions like UNILAG, UI, OAU, ABU, and UNN—is an intense communal experience. Every romantic interaction reverberates through shared corridors, communal bathrooms, and roommate circles.`,
          `When students encounter challenges surrounding ${item.focus}, the lack of private space amplifies emotional tension. Unresolved misunderstandings quickly become public spectacles if not handled with deliberate maturity and empathy.`,
          `By recognizing that residential harmony directly protects your academic Cumulative Grade Point Average (CGPA) and personal well-being, you can approach campus romance with intentional poise and thoughtful boundaries.`
        ]
      },
      {
        heading: 'Navigating Daily Logistics and Communal Living Pressures',
        paragraphs: [
          `The practical demands of student life—including erratic power supply, communal water fetching, early morning lecture sprints, and strict gate curfews—require couples to coordinate schedules with precision.`,
          `Failing to establish clear ground rules regarding visitors, noise levels, and shared meal preparations breeds avoidable friction with roommates and lodge caretakers. Respecting your living environment is the foundation of a peaceful relationship.`,
          `Always prioritize transparent, early communication over passive-aggressive hints. A two-minute polite conversation in person prevents weeks of corridor animosity and protects your living sanctuary.`
        ]
      },
      {
        heading: 'Actionable Framework: Five Golden Rules for Hostel Relationship Longevity',
        paragraphs: [
          `To build an enduring, drama-free relationship while navigating hostel dynamics, implement these Five Golden Rules:`,
          `1. Respect Shared Spaces: Always treat communal rooms, study lounges, and corridors as shared assets requiring mutual courtesy.`,
          `2. Guard Your Privacy: Never air intimate disputes in public hostel common rooms or campus social media groups.`,
          `3. Keep Academics First: Protect your revision hours and assignment deadlines from emotional distractions.`,
          `4. Cultivate Roommate Goodwill: Support your roommates with chores, kindness, and considerate hosting habits.`,
          `5. Connect on The College Date: Discover verified, ambitious campus peers who share your values, relationship goals, and respect for personal boundaries.`
        ]
      }
    ],
    faqs: [
      {
        q: `What is the most common mistake students make regarding ${item.title.split(':')[0]}?`,
        a: `The most frequent mistake is assuming that roommates and neighbors will naturally accommodate romantic guests without prior consultation. Giving advance notice, respecting quiet hours, and capping visit durations prevents residential resentment and protects friendships.`
      },
      {
        q: 'How can student couples balance intense academic pressure with dating in crowded halls?',
        a: 'Couples should establish scheduled study dates in campus libraries or quiet faculty lounges rather than attempting to relax in noisy hostel rooms. Turning academic revision into shared quality time boosts grades while strengthening emotional bonds.'
      },
      {
        q: 'What should you do if hostel rumors or gossip begin circulating about your relationship?',
        a: 'Maintain calm, dignified composure and refuse to engage in defensive arguments. Gossip dies quickly when deprived of emotional fuel. Focus your energy on your studies, trusted friends, and verified partner.'
      },
      {
        q: 'Why is connecting with verified students essential for a safe campus dating experience?',
        a: 'Verified student platforms like The College Date eliminate catfishing, protect personal privacy under the Nigeria Data Protection Act (NDPA), and connect you with authentic peers from your faculty and university who value safety and respect.'
      }
    ]
  });
}

// Convert into complete JavaScript module string
const cluster11Output = `// Auto-generated Cluster 11: Hostel & Hall of Residence Micro-Cultures (Topics 101 to 120)
import { renderSeoPage } from '../seo-expansion/template.mjs';

export const cluster11Pages = ${JSON.stringify(fullC11Pages, null, 2)};
`;

writeFileSync(join(root, 'scripts', 'seo-expansion-wave1', 'cluster11.mjs'), cluster11Output, 'utf8');
console.log('✓ Successfully generated scripts/seo-expansion-wave1/cluster11.mjs (20 topics)');
