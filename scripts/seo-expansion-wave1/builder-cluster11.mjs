import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

// Helper to sanitize strings for meta tags (no raw unescaped single quotes)
function cleanMeta(str) {
  return str.replace(/'/g, '').replace(/"/g, '&quot;');
}

const c11Topics = [
  {
    num: 101,
    title: "How to Date When Squatting in a University Hostel",
    slug: "dating-when-squatting-in-a-university-hostel",
    kicker: "Hostel Squatting Realities",
    h1: "How to Date When Squatting in a University Hostel: The Complete Guide",
    desc: "Complete guide to dating when squatting in university halls of residence. Learn how to manage roommate etiquette, avoid embarrassing encounters, and date with dignity.",
    quickTake: "Dating as a hostel squatter requires radical discretion, transparent communication with primary bedspace owners, and prioritizing public campus date spots over cramped residential bunks. Squatters hold no legal tenancy rights, making respectful boundaries essential to preserve housing security and romantic dignity.",
    theme: "hostel squatting, bedspace politics, and navigating intimacy without private rooms",
    table: {
      dimA: "Squatter Romantic Realities",
      dimB: "Official Bedspace Owner Realities",
      rows: [
        ["Tenancy Status", "Zero official standing; reliant on roommate goodwill.", "Legally registered occupant with administrative bed allocation."],
        ["Hosting Rights", "Zero moral right to host overnight romantic visitors.", "Entitled to host visitors within official hall visiting hours."],
        ["Privacy Level", "Completely communal; sleeping on mattresses or sharing bunks.", "Exclusive control over designated bedspace and storage locker."],
        ["Date Venue Strategy", "Must prioritize public campus quads, gardens, and cafes.", "Can host quiet study sessions during authorized daytime windows."],
        ["Risk of Eviction", "High risk of disciplinary ejection if caught by hall wardens.", "Risk of fines or bedspace forfeiture if squatting rules are breached."]
      ]
    },
    sections: [
      {
        heading: "The Squatter Dilemma: Romantic Aspirations vs Housing Insecurity",
        content: `
          <p>Across major public universities in Nigeria—including the University of Lagos (UNILAG), Obafemi Awolowo University (OAU), University of Ibadan (UI), and University of Benin (UNIBEN)—severe bedspace deficits force tens of thousands of undergraduates into squatting arrangements. In crowded rooms designed for four occupants, eight to twelve students regularly coexist, sharing bunks, floor mattresses, and limited wardrobe lockers.</p>
          <p>Navigating a budding campus romance under these conditions introduces immense psychological vulnerability. Students often experience acute embarrassment about their living conditions, fearing that revealing their squatter status to a campus crush will invite social judgment or appear financially inadequate.</p>
          <p>However, campus romance does not require owning an expensive off-campus self-contained flat. Thousands of successful campus partnerships begin while one or both partners are squatting. The key lies in separating authentic personal self-worth from temporary student accommodation realities.</p>
        `
      },
      {
        heading: "Navigating Roommate Etiquette: The Non-Negotiable Boundaries",
        content: `
          <p>When you are an unofficial occupant in a shared room, bringing a romantic interest into the space without unanimous roommate consent is the fastest way to provoke hostility, social humiliation, and eviction:</p>
          <ul>
            <li><strong>Never Presume Guest Privileges:</strong> As a squatter, your presence is already an act of generosity from the registered bedspace owner. Never invite your partner into the room for intimate hangouts while roommates are resting or revising for continuous assessment tests.</li>
            <li><strong>The Prior Notice Agreement:</strong> If you must bring your partner into the room—such as dropping off lecture notes or sharing an afternoon lunch—give your roommates at least two hours of advance notice via your hostel WhatsApp group.</li>
            <li><strong>Zero Overnight Stays:</strong> Housing an overnight date in a squatted hostel room is an egregious boundary violation that routinely leads to reported complaints to hall porters and sudden confiscation of student identification cards.</li>
            <li><strong>Respect the Reading Sanctuary:</strong> Examine rooms during examination season. If roommates are cramming for 8:00 AM general studies papers, keep all romantic phone conversations and laughter strictly confined to outdoor balconies.</li>
          </ul>
        `
      },
      {
        heading: "Public Campus Date Strategies That Cost Zero Naira",
        content: `
          <p>Instead of struggling to find private moments inside congested dormitories, shift your dating life outward into the rich public geography of your university campus:</p>
          <p>Universities feature serene, open-air environments that offer far more natural romance than a crowded hostel room. Consider afternoon walks through campus botanical gardens, sitting together on shady lawns around administrative quads, or packing homemade sandwiches for study picnics near sports complexes.</p>
          <p>Furthermore, campus libraries and departmental study lounges provide productive, low-pressure environments where couples can read together, exchange notes, and build genuine intellectual chemistry without domestic tension.</p>
        `
      },
      {
        heading: "Actionable Framework: The Five Dignity Rules for Squatter Dating",
        content: `
          <p>To date successfully while squatting on campus, practice the <strong>Five Dignity Compacts</strong>:</p>
          <ol>
            <li><strong>Radical Honesty Early On:</strong> Never fabricate an elaborate story about living in an expensive off-campus lodge. State your housing situation calmly and authentically; partners who value you for your character will respect your resourcefulness.</li>
            <li><strong>Prioritize Public Over Private Spaces:</strong> Make campus cafeterias, faculty benches, and botanical paths your primary meeting venues during the early stages of dating.</li>
            <li><strong>Reciprocate Roommate Kindness:</strong> Keep the room immaculate. Regularly sweep the floor, empty waste bins, and assist with water-fetching so your roommates maintain warm goodwill toward you.</li>
            <li><strong>Establish Voice Call Boundaries:</strong> Never take intimate 11:00 PM romantic phone calls from your bunk while roommates are attempting to sleep. Step outside to ventilated corridors or stairwells.</li>
            <li><strong>Leverage Verified Student Discovery:</strong> Connect with authentic peers on The College Date who share your academic drive and understand the daily socioeconomic realities of tertiary education.</li>
          </ol>
        `
      }
    ],
    faqs: [
      {
        q: "Should I be ashamed of telling my campus crush that I am squatting?",
        a: "No, you should never feel ashamed of squatting in university. Housing shortages are an institutional reality across tertiary institutions. Mature students understand that living arrangements do not define your character, intellect, or dating value. Being honest from the beginning demonstrates confidence and authenticity."
      },
      {
        q: "Can my partner visit me in my squatted hostel room?",
        a: "Daytime visits for quick academic exchanges or lunch are acceptable only if your registered roommates give clear consent beforehand. However, extended leisure hangouts or overnight stays in squatted rooms violate hostel regulations and breach communal roommate trust."
      },
      {
        q: "What should I do if my roommate complains about my date visiting?",
        a: "Apologize immediately and de-escalate without defensiveness. Acknowledge that the space belongs to the collective room occupants. Shift all future interactions with your partner to public campus spaces, cafeterias, or outdoor quads to maintain harmonious living relations."
      },
      {
        q: "Where are the best private places to talk on campus if you have no room?",
        a: "Campus botanical gardens, sports complex bleachers during off-hours, faculty courtyards after 5:00 PM, and student union open-air recreation parks offer safe, breezy, and pleasant environments for meaningful conversations without roommate intrusion."
      }
    ],
    related: [
      { href: "/unwritten-roommate-code-bringing-dates-hostel", label: "Roommate Code for Campus Dates" },
      { href: "/handling-hostel-porter-curfews-evening-dates", label: "Handling Hostel Porter Curfews" },
      { href: "/managing-public-hostel-pda-and-hall-balcony-gossip", label: "Managing Hostel Balcony Gossip" },
      { href: "/campus-dating-safety", label: "Campus Dating Safety Guide" }
    ]
  },
  {
    num: 102,
    title: "The Unwritten Roommate Code for Bringing Dates to the Hostel",
    slug: "unwritten-roommate-code-bringing-dates-hostel",
    kicker: "Communal Hostel Etiquette",
    h1: "The Unwritten Roommate Code for Bringing Dates to the Hostel",
    desc: "Master the unwritten rules of hosting dates in shared university dorms. Discover advance notice protocols, guest etiquette, and roommate diplomacy.",
    quickTake: "The unwritten roommate code requires advance notice before hosting a date, strict adherence to reasonable time limits, fair warning for study sessions, and absolute prohibition of non-consensual sleepovers. Prioritizing communal roommate comfort prevents bitter hostel feuds and protects relationship peace.",
    theme: "shared room etiquette, guest protocols, and roommate diplomacy in university residences",
    table: {
      dimA: "Respectful Host Behavior",
      dimB: "Hostel Code Violations",
      rows: [
        ["Notice Given", "At least 2 hours advance message on room group chat.", "Surprise walk-in with a date while roommates are undressed."],
        ["Visit Duration", "Capped at 1 to 2 hours for focused study or meal.", "Monopolizing the room for 6+ hours while roommates wait outside."],
        ["Intimacy Level", "Respectful conversation and shared study materials.", "Overt physical affection, kissing, or bed intimacy in communal view."],
        ["Noise Control", "Moderate speaking volume; headphones for shared music.", "Loud laughter, shouting, or blaring speakers during revision hours."],
        ["Overnight Policy", "Zero unapproved sleepovers; date departs before lock.", "Quietly tucking a date into a bunk overnight without unanimous consent."]
      ]
    },
    sections: [
      {
        heading: "Communal Living Dynamics: Why the Roommate Code Exists",
        content: `
          <p>Living in student halls of residence—whether at University of Ibadan, UNILAG, Ahmadu Bello University (ABU), or University of Nigeria Nsukka (UNN)—demands extraordinary social diplomacy. A hostel room is simultaneously a bedroom, a study sanctuary, a dressing space, and a dining hall for multiple young adults navigating academic pressure.</p>
          <p>When one student begins dating, the delicate equilibrium of the room is tested. A thoughtless partner who brings romantic interests into the room without regard for roommates can quickly transform a peaceful living environment into a hostile battleground filled with passive-aggressive remarks and locked doors.</p>
          <p>The unwritten roommate code is not designed to stifle your romantic happiness. Rather, it creates clear operational boundaries that allow you to enjoy your relationship while preserving the privacy, dignity, and academic focus of the people sharing your floor space.</p>
        `
      },
      {
        heading: "The Advance Notice Protocol: The 2-Hour Rule",
        content: `
          <p>The cardinal sin of hostel dating is the surprise walk-in. Opening the door with your date while your roommate is resting in nightwear, changing clothes, or recovering from a fever creates instant embarrassment and resentment.</p>
          <p>Adopt the <strong>Two-Hour Advance Notice Protocol</strong>. Send a polite message to your room's private WhatsApp group: <em>"Hey guys, my friend Tobi is stopping by around 3:30 PM for about an hour to drop off our chemistry lab manual and share some lunch. Let me know if that works for everyone!"</em></p>
          <p>This simple habit gives your roommates the agency to tidy up their bunks, put on appropriate clothing, or plan their own study schedule at the faculty library without feeling blindsided.</p>
        `
      },
      {
        heading: "Setting Boundaries: PDA Limits in Shared Rooms",
        content: `
          <p>Physical affection in front of non-consenting spectators is profoundly awkward. Even the closest friends feel uncomfortable when forced to sit across a small room while a couple engages in prolonged cuddling, whispering, or hand-holding on a single bed.</p>
          <p>Establish strict physical boundaries inside the dorm room. Treat the space as a public intellectual zone when others are present. Reserve intimate romantic affection for private dates outside the hostel, campus recreational parks, or private off-campus cafes.</p>
        `
      },
      {
        heading: "Actionable Framework: The Five Pillars of Roommate Peace",
        content: `
          <p>Preserve your hostel friendships while dating by following these <strong>Five Roommate Commandments</strong>:</p>
          <ol>
            <li><strong>The Sock on the Door Modern Equivalent:</strong> Use private digital status signals or quick messages to inform roommates when a date is visiting so nobody walks in unexpectedly.</li>
            <li><strong>Offer Food and Hospitality:</strong> If you and your date cook or bring snacks into the room, always offer a polite portion to any roommates present. Shared food disarms tension instantly.</li>
            <li><strong>Strict Curfew Exit:</strong> Ensure your date departs well before hostel porter curfew hours. Never trap your date in the room due to poor time management.</li>
            <li><strong>Clean Up Instantly:</strong> Wash all plates, wipe down shared study tables, and sweep away crumbs immediately after your date leaves.</li>
            <li><strong>Meet Verified Campus Peers:</strong> Use The College Date to connect with emotionally mature students who respect personal boundaries and understand communal etiquette.</li>
          </ol>
        `
      }
    ],
    faqs: [
      {
        q: "What should I do if my roommate brings their partner over constantly?",
        a: "Call a calm, private room meeting when the partner is not present. Use objective 'I' statements, such as: 'I find it hard to study and relax when we have guests over every evening. Can we agree on designated visiting days or cap visits at two hours?' Establishing structured ground rules resolves friction without hostility."
      },
      {
        q: "Is it ever acceptable for a date to sleep over in a shared room?",
        a: "Only with unanimous, explicit prior consent from every single occupant in the room. If even one roommate expresses discomfort, an overnight stay must not occur. Forcing an unapproved overnight guest breaches basic communal ethics."
      },
      {
        q: "How can I study with my date without annoying my roommates?",
        a: "Utilize faculty study halls, departmental lecture theatres after class hours, or the main campus library. These spaces are purpose-built for academic collaboration and eliminate the stress of crowded hostel dorms."
      },
      {
        q: "What if my date and my roommate simply do not get along?",
        a: "Keep their interactions to an absolute minimum. Host your dates entirely outside the room, and never vent to your roommate about relationship problems or vent to your partner about roommate quirks."
      }
    ],
    related: [
      { href: "/dating-when-squatting-in-a-university-hostel", label: "Dating When Squatting" },
      { href: "/handling-hostel-porter-curfews-evening-dates", label: "Handling Hostel Porter Curfews" },
      { href: "/when-your-roommate-dislikes-your-campus-partner", label: "When Roommates Dislike Your Date" },
      { href: "/campus-dating-safety", label: "Campus Safety Checklist" }
    ]
  }
];

console.log("Compiling wave 1 cluster generator modules...");
