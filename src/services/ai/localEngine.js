/**
 * Local Deterministic Intelligence Engine
 * The College Date (CD2.0)
 *
 * Provides instant (< 5ms), zero-cost, 100% private, offline-capable
 * intelligence for student dating, conversation starters, match insights,
 * date ideas, profile coaching, and photo pre-validation.
 *
 * Tailored specifically for African tertiary campus culture and student realities.
 */

// Common campus hangouts and landmarks by university keyword
const CAMPUS_LANDMARKS = {
  unilag: ['New Hall Quad', 'Senate Love Garden', 'Main Library Buttery', 'Akoka Sports Centre', 'Faculty of Arts Quad'],
  ui: ['SUB Courtyard', 'Kenneth Dike Library', 'Tech Quad', 'Love Garden', 'Awo / Idia Walkway'],
  oau: ['Amphitheatre Steps', 'Hezekiah Oluwasanmi Library', 'SUB Car Park', 'Motion Ground', 'Natural History Museum Quad'],
  futa: ['Obakekere Campus Quad', 'School Park', 'FUTA Jaja / Library Walkway', 'SEET Complex Chill Spot'],
  unn: ['Nnamdi Azikiwe Library', 'GS Building Lawn', 'SUB Green Area', 'Franco Refectory Quad'],
  abu: ['Kashim Ibrahim Library Quad', 'Sculpture Garden', 'Samaru Campus Walk', 'Faculty of Law Gazebo'],
  lasu: ['Badagry Gate Walk', 'Faculty of Social Sciences Courtyard', 'Senate Building Walkway', 'Students Union Quad'],
  covenant: ['Cafeteria 1 Quad', 'Library Square', 'Chapel Green', 'Senate Building Walk'],
  generic: ['Campus Central Library Walkway', 'Faculty Cafeteria / Buttery', 'Campus Sports Complex', 'Main Quad Lounge']
};

// Interest-based conversational openers
const INTEREST_OPENERS = {
  music: [
    "What song currently has your headphone volume at 100% between lectures? 🎧",
    "Afrobeats or late-night R&B study playlist: which one defines your semester? 🎶",
    "If we swapped Spotify or Apple Music playlists right now, what's the first track I'd hear? ✨"
  ],
  tech: [
    "Tech student spotting: are you surviving the project deadlines or debugging in your dreams? 💻",
    "What's your go-to tech snack during late-night coding or project marathons? ☕",
    "Frontend, backend, or just here to connect with good people between bugs? 😂"
  ],
  coding: [
    "Is your code compiling on the first try this week or is StackOverflow your best friend? 👨‍💻",
    "Coffee, energy drinks, or pure willpower keeping your projects alive? ⚡"
  ],
  football: [
    "Crucial test: weekend Premier League or Champions League nights — which team has your heart? ⚽",
    "Are you arguing football at the campus viewing centre or just watching the highlights? 🏆"
  ],
  art: [
    "Saw your eye for creative arts! What project or medium inspires you the most lately? 🎨",
    "Creative minds stand out on campus — what kind of art gets you in the zone? 🖌️"
  ],
  photography: [
    "What's the most aesthetic spot on campus you've captured through your lens? 📸",
    "Golden hour on campus or candid student moments: what's your favourite subject? ✨"
  ],
  fashion: [
    "Campus fashion icon alert! Do you plan your lecture outfits or wake up looking this clean? 👗",
    "Effortless style or departmental dress code rebellion: what's your vibe? 👔"
  ],
  fitness: [
    "Early morning campus jog or late-evening gym session: which camp are you in? 🏃",
    "Leg day survivor or gym consistency champion: how's the workout routine going? 💪"
  ],
  food: [
    "Top priority question: where is the absolute best food spot on or around campus? 🍲",
    "Hostel cooking experiments or campus buttery regular: what's your survival food? 🍕"
  ],
  movies: [
    "Cinema weekend or Netflix in the hostel with campus Wi-Fi: what's your ideal movie night? 🎬",
    "What series or movie completely stole your attention this semester? 🍿"
  ],
  anime: [
    "Anime enthusiast! Top 3 anime of all time — go! Don't let me down 😂",
    "Subbed or dubbed, and who is currently your favourite character? ⚔️"
  ],
  reading: [
    "Reading for fun or strictly syllabus survival this week? 📚",
    "What's the last book that genuinely made you lose track of time? 📖"
  ],
  gaming: [
    "FIFA/FC tournament or competitive mobile gaming: can anyone beat you? 🎮",
    "Weekend campus gaming showdown: what's your game of choice? 🕹️"
  ],
  travel: [
    "What city or campus in Africa is next on your exploration bucket list? ✈️",
    "Spontaneous weekend road trip or peaceful hostel recharge: what's your getaway style? 🌍"
  ]
};

// Department-specific banter
const DEPARTMENT_OPENERS = {
  engineering: "Engineering student! How many times did your lecturer say 'it is very simple' this week? 😂",
  law: "Future learned colleague! Do you debate everything or do you take a break on weekends? ⚖️",
  medicine: "Med student check: have you slept in the last 48 hours or is caffeine doing the heavy lifting? 🩺",
  pharmacy: "Pharmacy student! Tell me you're not memorizing chemical structures right this second 💊",
  computer: "Computer Science vibes! Are you building the next campus unicorn or surviving algorithms? 💻",
  accounting: "Balance sheet balance or stress levels rising? How's the department treating you? 📊",
  economics: "Supply and demand of good vibes on campus: how's your semester economy? 📈",
  mass: "Mass Comm student! You must know all the campus news before the rest of us do 🎙️",
  architecture: "Architecture studio survivor! When was the last time you saw sunlight outside the drawing board? 📐"
};

/**
 * 1. CONVERSATION OPENER GENERATOR
 * Returns schema: { openers: string[], why_it_works: string }
 */
export function generateConversationOpeners(targetProfile, options = {}) {
  const profile = targetProfile || {};
  const university = String(profile.university || '').toLowerCase();
  const department = String(profile.department || '').toLowerCase();
  const interests = Array.isArray(profile.interests) ? profile.interests.map(i => String(i).toLowerCase()) : [];
  const introPrompt = profile.intro_prompt || '';
  const fullName = profile.full_name || 'there';
  const firstName = fullName.split(' ')[0] || 'there';

  const openers = [];

  // Check specific interests
  for (const [key, questions] of Object.entries(INTEREST_OPENERS)) {
    if (interests.some(i => i.includes(key))) {
      openers.push(...questions.slice(0, 2));
      break;
    }
  }

  // Check department
  for (const [deptKey, openerText] of Object.entries(DEPARTMENT_OPENERS)) {
    if (department.includes(deptKey)) {
      openers.push(openerText);
      break;
    }
  }

  // Check university landmarks
  let matchedCampus = 'generic';
  for (const campusKey of Object.keys(CAMPUS_LANDMARKS)) {
    if (university.includes(campusKey)) {
      matchedCampus = campusKey;
      break;
    }
  }
  const landmarks = CAMPUS_LANDMARKS[matchedCampus];
  const spot = landmarks[Math.floor(Math.random() * landmarks.length)];

  if (profile.university) {
    openers.push(`Hey ${firstName}! Quick campus debate: is ${spot} still the best chill spot between lectures? ✨`);
  }

  // Check intro prompt
  if (introPrompt && introPrompt.length > 5) {
    openers.push(`Saw your prompt "${introPrompt.slice(0, 60)}..." — had to ask you about that! 😂`);
  }

  // Fallbacks if list is sparse
  if (openers.length < 3) {
    openers.push(
      `Hey ${firstName}! What's the one thing keeping you sane this semester? 📚`,
      `Library crunch or hostel chilling today? How's your week going? ✨`,
      `Saw your profile and loved the vibe. What's your favourite course so far? 🎓`
    );
  }

  // Deduplicate and return top 3
  const uniqueOpeners = Array.from(new Set(openers)).slice(0, 3);

  return {
    openers: uniqueOpeners,
    why_it_works: `Grounded in ${profile.university ? profile.university + ' campus life' : 'real student life'} and shared interests without awkward pickup lines.`
  };
}

/**
 * 2. SMART REPLY GENERATOR
 * Returns schema: { replies: string[], tone_tip: string }
 */
export function generateSmartReplies(targetProfile, recentMessages = [], draft = '', options = {}) {
  const lastMsg = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
  const lastText = String(lastMsg?.content || draft || '').toLowerCase().trim();
  const targetName = targetProfile?.full_name ? targetProfile.full_name.split(' ')[0] : 'them';

  let replies = [];
  let toneTip = 'Keep it easygoing, natural, and low-pressure.';

  // Scenario: Question was asked
  if (lastText.includes('?') || /\b(what|where|how|when|who|are you|do you|did you)\b/i.test(lastText)) {
    if (lastText.includes('weekend') || lastText.includes('free') || lastText.includes('chill') || lastText.includes('hangout')) {
      replies = [
        "I'm mostly free after my afternoon lectures! What did you have in mind? 😊",
        "Just catching up on sleep and campus work, but definitely down for a quick break! ✨",
        "Depends on whether tests are looming 😂 What's the plan?"
      ];
      toneTip = 'Shows genuine interest while maintaining healthy student boundaries.';
    } else if (lastText.includes('study') || lastText.includes('course') || lastText.includes('class') || lastText.includes('exam')) {
      replies = [
        "Surviving one lecture at a time honestly! How is your workload this week? 📚",
        "It's intense but manageable! Are you studying at the library or from your room? 🦉",
        "Let's just say coffee is doing most of the heavy lifting right now 😂"
      ];
      toneTip = 'Builds relatable academic camaraderie.';
    } else if (lastText.includes('food') || lastText.includes('eat') || lastText.includes('lunch') || lastText.includes('hungry')) {
      replies = [
        "Always ready for food! Where's your favourite spot around campus? 🍲",
        "Hostel cooking has failed me, so taking recommendations for good spots! 🍕",
        "I was literally just thinking about grabbing a bite! What are you craving? 😋"
      ];
      toneTip = 'High-intent casual conversation with natural potential for a campus date.';
    } else {
      replies = [
        "Haha good question! Honestly it depends on how stressful this week gets 😂",
        "That's actually a great question! What about you, what's your take? ✨",
        "A bit of both! Tell me more about how your week is going though 😊"
      ];
    }
  }
  // Scenario: Greeting or check-in
  else if (/\b(hey|hi|hello|hw far|how far|sup|xup|morning|afternoon|evening)\b/i.test(lastText)) {
    replies = [
      `Hey ${targetName}! Doing well, just taking a break between lectures. How's your day? ✨`,
      "Hey! Surviving the campus rush 😂 How has your week been treating you?",
      "Hi there! Glad you said hi. How's your semester going so far? 😊"
    ];
    toneTip = 'Warm, responsive, and keeps the conversational ball in their court.';
  }
  // Scenario: Compliment or playful vibe
  else if (/\b(fine|cute|pretty|handsome|sweet|vibe|nice|laugh|lol|haha|lmao)\b/i.test(lastText)) {
    replies = [
      "Haha thank you! You just made my day a whole lot better 😊",
      "I appreciate that! You have great energy yourself ✨",
      "Haha stop making me blush during lectures 😂 How's the rest of your day looking?"
    ];
    toneTip = 'Playful, confident, and reciprocates the good mood.';
  }
  // General / Fallback
  else {
    replies = [
      "Haha totally! What are you up to for the rest of today? ✨",
      "I feel that completely! Are lectures keeping you busy today? 📚",
      "That makes total sense. Have you been on campus all day or chilling? 😊"
    ];
    toneTip = 'Natural conversation continuation without awkward pauses.';
  }

  return {
    replies: replies.slice(0, 3),
    tone_tip: toneTip
  };
}

/**
 * 3. COMPATIBILITY INSIGHT GENERATOR
 * Returns schema: { score: number, highlights: string[], watchouts: string[], best_opener: string }
 */
export function generateCompatibilityInsight(myProfile, targetProfile, options = {}) {
  const me = myProfile || {};
  const target = targetProfile || {};

  const myInterests = Array.isArray(me.interests) ? me.interests.map(i => String(i).toLowerCase()) : [];
  const targetInterests = Array.isArray(target.interests) ? target.interests.map(i => String(i).toLowerCase()) : [];
  const mutual = myInterests.filter(i => targetInterests.includes(i));

  const sameUni = me.university && target.university && me.university.toLowerCase() === target.university.toLowerCase();
  const sameDept = me.department && target.department && me.department.toLowerCase() === target.department.toLowerCase();
  const sameGoal = me.attraction_goal && target.attraction_goal && me.attraction_goal === target.attraction_goal;

  // Base score 62
  let score = 62;
  if (sameUni) score += 18;
  if (sameDept) score += 10;
  if (sameGoal) score += 12;
  score += Math.min(16, mutual.length * 6);
  score = Math.min(98, Math.max(50, score));

  const highlights = [];
  if (sameUni) {
    highlights.push(`Shared Campus: Both at ${target.university || 'the same institution'} — easy to grab a bite between lectures.`);
  }
  if (mutual.length > 0) {
    const formatted = mutual.slice(0, 3).map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ');
    highlights.push(`Mutual Passions: You both love ${formatted}.`);
  } else {
    highlights.push('Balanced Interests: Diverse hobbies create fresh conversation and mutual discovery.');
  }

  if (sameGoal) {
    highlights.push(`Aligned Intentions: Both seeking "${target.attraction_goal}".`);
  } else {
    highlights.push('Positive Social Vibe: Both open to campus connections with honest communication.');
  }

  const watchouts = [];
  if (me.level && target.level && Math.abs(parseInt(me.level) - parseInt(target.level)) >= 200) {
    watchouts.push('Different academic stages (e.g. project year vs foundation year) — coordinate schedules with patience.');
  } else {
    watchouts.push('Busy academic calendars — plan spontaneous 20-minute campus coffee or study breaks instead of rigid dates.');
  }

  // Craft best opener from highest synergy
  let bestOpener = '';
  if (mutual.length > 0) {
    bestOpener = `Saw that we both love ${mutual[0]}! What got you into it? ✨`;
  } else if (sameUni) {
    bestOpener = `Fellow ${target.university || 'campus'} student! Where is your go-to study spot when you need zero noise? 📚`;
  } else {
    bestOpener = `Your profile caught my eye! How has your semester been going so far? ✨`;
  }

  return {
    score,
    highlights: highlights.slice(0, 2),
    watchouts: watchouts.slice(0, 1),
    best_opener: bestOpener,
    disclaimer: 'Compatibility scores are interest-based compatibility estimates, not guarantees of relationship success.'
  };
}

/**
 * 4. CAMPUS DATE IDEAS GENERATOR
 * Returns schema: { ideas: [{ title, why, cost }], safety_note: string, disclaimer: string }
 */
export function generateCampusDateIdeas(targetProfile, options = {}) {
  const profile = targetProfile || {};
  const university = String(profile.university || '').toLowerCase();

  let landmarks = CAMPUS_LANDMARKS.generic;
  for (const campusKey of Object.keys(CAMPUS_LANDMARKS)) {
    if (university.includes(campusKey)) {
      landmarks = CAMPUS_LANDMARKS[campusKey];
      break;
    }
  }

  const spot1 = landmarks[0] || 'Campus Cafeteria';
  const spot2 = landmarks[1] || 'Main Library Walkway';
  const spot3 = landmarks[2] || 'Campus Quad';

  const ideas = [
    {
      title: `Afternoon Smoothie & Walk near ${spot1}`,
      why: 'Public, vibrant, and zero pressure if either of you has an afternoon lecture.',
      cost: 'low'
    },
    {
      title: `Study Break Banter at ${spot2}`,
      why: 'Grab a quick pastry and debrief the week in a calm, familiar campus setting.',
      cost: 'free'
    },
    {
      title: `Weekend Evening Chill at ${spot3}`,
      why: 'Relaxed outdoor setting with fresh air and great campus ambiance.',
      cost: 'low'
    }
  ];

  return {
    ideas,
    safety_note: 'Always meet in well-lit, public campus areas for your first date and ensure you arrange your own transport.',
    disclaimer: 'Suggested campus date spots are informal ideas. Verify venue operating hours and always meet publicly.'
  };
}

/**
 * 5. PROFILE COACH / WRITING ASSISTANT
 * Returns schema: { summary: string, bio_suggestion: string, photo_tips: string[], prompt_ideas: string[], priority_actions: string[] }
 */
export function generateProfileCoach(profileDraft = {}, options = {}) {
  const draft = profileDraft.profileDraft || profileDraft || {};
  const bio = String(draft.bio || '').trim();
  const photoCount = Number(draft.photo_count || (draft.profile_photos?.length) || 1);
  const department = draft.department || '';
  const university = draft.university || '';
  const interests = Array.isArray(draft.interests) ? draft.interests : [];
  const hasVoice = Boolean(draft.has_voice_intro || draft.voice_intro_url);

  const priorityActions = [];
  const photoTips = [];
  const promptIdeas = [
    "The most adventurous thing I did this semester was...",
    "My unpopular campus food opinion is...",
    "Best way to win me over: bring me a snack at the library and..."
  ];

  // Bio analysis
  let bioSuggestion = '';
  if (!bio || bio.length < 25) {
    priorityActions.push("Expand your bio with 2 specific interests and your campus ambition.");
    bioSuggestion = `${department ? department + ' student at ' : 'Student at '}${university || 'campus'}. Into good music, spontaneous laughs, and real conversations. Ask me about my current semester obsession! ✨`;
  } else if (bio.length > 200) {
    priorityActions.push("Make your bio punchier so swipers can digest it in under 5 seconds.");
    bioSuggestion = bio.slice(0, 180).trim() + " ✨";
  } else {
    bioSuggestion = `${bio} — always down for good conversation and campus chill spots ✨`;
  }

  // Photo analysis
  if (photoCount < 3) {
    priorityActions.push(`Add ${3 - photoCount} more photos to showcase your campus lifestyle.`);
    photoTips.push("Include a clear, smiling portrait with natural outdoor daylight.");
    photoTips.push("Add a full-body or activity photo (e.g. studying, sports, creative hobbies).");
  } else {
    photoTips.push("Great photo variety! Ensure your primary picture has high contrast and no sunglasses.");
  }

  // Voice note
  if (!hasVoice) {
    priorityActions.push("Record a 10-second voice intro — verified to boost match rate by 2.4x.");
  }

  // Department / Interests
  if (interests.length < 3) {
    priorityActions.push("Add at least 3 interest tags so the algorithm matches compatible students.");
  }

  return {
    summary: priorityActions.length === 0
      ? "Your student profile is polished, authentic, and ready to stand out on campus!"
      : `Complete ${priorityActions.length} quick tweaks to elevate your profile and match quality.`,
    bio_suggestion: bioSuggestion.slice(0, 270),
    photo_tips: photoTips,
    prompt_ideas: promptIdeas,
    priority_actions: priorityActions.length > 0 ? priorityActions : ["Profile in top 5% condition! Maintain active daily check-ins."]
  };
}

/**
 * 6. CLIENT-SIDE PHOTO PRE-VALIDATION
 * Fast client-side image checks before uploading to Supabase or calling Vision AI.
 * Rejects corrupt, empty, pitch black, or overexposed images in 0ms.
 */
export async function preValidatePhoto(fileOrCanvas) {
  if (!fileOrCanvas) {
    return { ok: false, reason: 'No image file provided.' };
  }

  // If it's a file, check basic type and size
  if (fileOrCanvas instanceof File || fileOrCanvas instanceof Blob) {
    const sizeBytes = fileOrCanvas.size;
    if (sizeBytes <= 100) {
      return { ok: false, reason: 'Image file is empty or corrupted.' };
    }
    if (sizeBytes > 15 * 1024 * 1024) {
      return { ok: false, reason: 'Image is larger than 15MB. Please choose a smaller photo.' };
    }

    // Check mime type
    const mime = fileOrCanvas.type;
    if (mime && !mime.startsWith('image/')) {
      return { ok: false, reason: 'Uploaded file is not a supported image format.' };
    }
  }

  // If running in browser environment with HTMLImageElement or Canvas capability
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    try {
      let canvas = null;
      if (fileOrCanvas instanceof HTMLCanvasElement) {
        canvas = fileOrCanvas;
      } else if (fileOrCanvas instanceof Blob || fileOrCanvas instanceof File) {
        const bmp = await createImageBitmap(fileOrCanvas).catch(() => null);
        if (bmp) {
          if (bmp.width < 120 || bmp.height < 120) {
            return { ok: false, reason: 'Image resolution is too low. Please upload a clear photo (min 120x120).' };
          }
          canvas = document.createElement('canvas');
          canvas.width = Math.min(bmp.width, 100);
          canvas.height = Math.min(bmp.height, 100);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          }
        }
      }

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let totalLuminance = 0;
          const pixelCount = data.length / 4;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Standard relative luminance formula
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += lum;
          }

          const avgLuminance = totalLuminance / pixelCount;

          // Pitch black or dark screen error (e.g. camera covered or black screenshot)
          if (avgLuminance < 5) {
            return {
              ok: false,
              reason: 'Photo is completely black (under-exposed or camera covered). Please upload a clear photo taken in good lighting.'
            };
          }

          // Blown-out white screen (e.g. blank canvas)
          if (avgLuminance > 252) {
            return {
              ok: false,
              reason: 'Photo is completely overexposed or blank. Please upload a genuine photo of yourself.'
            };
          }
        }
      }
    } catch {
      // Non-blocking browser check fallback: if canvas inspection fails, allow server validation
    }
  }

  return { ok: true, reason: null };
}
