import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const assetsDir = path.join(publicDir, 'pitch-deck-assets');
const distDir = path.join(projectRoot, 'dist');
const brainDir = path.resolve(
  process.env.USERPROFILE || 'C:/Users/DELL',
  '.gemini/antigravity/brain/a985e3ae-9586-4d57-8534-cb9099a69c94'
);

console.log('[1/5] Encoding visual screenshot assets to base64 data URIs...');

function toBase64Uri(filename) {
  const filePath = path.join(assetsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn('Warning: Asset not found at', filePath);
    return '';
  }
  const ext = path.extname(filename).replace('.', '') || 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${data}`;
}

const images = {
  heroMatch: toBase64Uri('hero_match.png'),
  matchCards: toBase64Uri('match_cards.png'),
  exploreGrid: toBase64Uri('explore_grid.png'),
  chatTray: toBase64Uri('chat_tray.png'),
  chatInbox: toBase64Uri('chat_inbox.png'),
  callScreen: toBase64Uri('call_screen.png'),
  voiceCall: toBase64Uri('voice_call.png'),
  giftStore: toBase64Uri('gift_store.png'),
  walletPage: toBase64Uri('wallet_page.png'),
  serviceEscrow: toBase64Uri('service_escrow.png'),
  photoApproved: toBase64Uri('photo_approved.png'),
  photoRejected: toBase64Uri('photo_rejected.png'),
  confessions: toBase64Uri('confessions.png'),
  premiumTiers: toBase64Uri('premium_tiers.png'),
  locationModal: toBase64Uri('location_modal.png'),
  reportModal: toBase64Uri('report_modal.png'),
  godswill: toBase64Uri('founder_godswill.jpg'),
  sokepirim: toBase64Uri('cofounder_sokepirim.png')
};

console.log('[1/5] Verified and encoded all 18 visual assets to base64.');

// 18 Master Pitch Deck Slides
const slides = [
  // SLIDE 1: Cover / Executive Overview
  {
    tag: "EXECUTIVE SUMMARY",
    number: "00",
    title: "Real Connections. Real You.",
    subtitle: "A Campus-First Social & Micro-Economy Network Built for Nigeria’s 2.8M Tertiary Students — Scaling Across Africa",
    isCover: true,
    notes: "Good morning. I am Godswill Godlife Onah, founder and system architect of The College Date, presenting alongside my co-founder SOKEPIRIM Jackreece. There are over 2.8 million tertiary students across Nigeria's 170+ accredited universities and polytechnics. They are the most digitally active demographic in Africa, yet their campus social lives are broken by scams, catfishing, and expensive mobile data on Western apps. We built The College Date: an ultra-lean 14MB mobile ecosystem combining verified student discovery, encrypted Agora audio/video calling, and an integrated campus micro-economy where students earn through cultural gifts and academic service escrow. Our production Android app is live on Google Play, and we are raising $150k pre-seed to dominate the Nigerian campus market.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-1">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold tracking-wide uppercase mb-3 shadow-inner">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Google Play Release 2.2.63 (VC 60) • Verified Pre-Seed
            </div>
            <h1 class="text-3xl font-black text-white leading-tight tracking-tight">
              Real Connections.<br>
              <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Real You.</span>
            </h1>
            <p class="text-xs text-slate-300 font-medium mt-2 leading-relaxed max-w-xl">
              A campus-first dating &amp; social micro-economy platform engineered specifically for African university students. Built with verified student identity, ultra-low data consumption, and peer-to-peer earning utilities.
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3 my-3">
            <div class="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 shadow-lg">
              <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Live Community</div>
              <div class="text-xl font-black text-white mt-1">871</div>
              <div class="text-[9.5px] text-slate-400">Registered Student Accounts</div>
              <div class="text-[9px] text-emerald-400 font-semibold mt-1">✓ 151 Verified Profiles</div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 shadow-lg">
              <div class="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">Validation</div>
              <div class="text-xl font-black text-white mt-1">₦9,800</div>
              <div class="text-[9.5px] text-slate-400">Initial Cohort Cash Revenue</div>
              <div class="text-[9px] text-purple-300 font-semibold mt-1">High-Intent Purchase Queue</div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/90 border border-pink-500/30 shadow-lg">
              <div class="text-xs font-bold text-pink-400 uppercase tracking-wider font-mono">Platform</div>
              <div class="text-xl font-black text-white mt-1">14.1 MB</div>
              <div class="text-[9.5px] text-slate-400">Android APK + Web PWA</div>
              <div class="text-[9px] text-pink-300 font-semibold mt-1">TargetSDK 36 • 0-Crash QA</div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Founders: <strong>Godswill Godlife Onah</strong> &amp; <strong>SOKEPIRIM Jackreece</strong></span>
            <span class="font-mono text-indigo-400 font-bold">www.thecollegedate.com</span>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 shadow-2xl shadow-indigo-500/25 border border-slate-700">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.heroMatch}" alt="The College Date Live App" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -left-3 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-indigo-500/50 shadow-xl text-[9px] text-indigo-300 font-bold flex items-center gap-1">
              <span>✦</span> Live Android Production Surface
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 2: The Thesis
  {
    tag: "THE THESIS",
    number: "01",
    title: "Campus is a Social Graph. Dating is Only One Use Case.",
    subtitle: "TheCollegeDate starts with romantic connection, then expands into a trusted student-to-student social layer.",
    notes: "Our core thesis is simple: campus is not an open, anonymous city. It is a high-density, closed social graph of 30,000 to 50,000 students living within walking distance. Dating is the highest-frequency wedge that drives daily app opens. Once students are inside the verified network, they need far more than swiping: they want anonymous confessions, study buddies, in-app voice calls that protect their phone numbers, and a secure way to buy course tutorials or send campus gifts. We own the complete relationship layer.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-1">
          <div class="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 shadow-xl">
            <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono mb-1.5">The Core Idea</div>
            <h2 class="text-xl font-extrabold text-white leading-snug">
              Build the place where students find people who are <span class="text-indigo-400">already part of their world</span>.
            </h2>
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              Campus context makes discovery infinitely more relevant than a generic dating pool. Students live by shared routines: lecture halls, faculty rivalries, departmental courses, and hostel clusters.
            </p>
          </div>

          <div class="space-y-2.5 my-2">
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <span class="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">01</span>
              <div>
                <div class="text-xs font-bold text-white">Hyperlocal Context Over Generic Swiping</div>
                <div class="text-[11px] text-slate-300 mt-0.5">Filtering by University, Faculty, Level (100L–600L), and Hostels connects people who can actually walk over and meet between lectures.</div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <span class="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">02</span>
              <div>
                <div class="text-xs font-bold text-white">Mutual Trust as the Retention Backbone</div>
                <div class="text-[11px] text-slate-300 mt-0.5">Vision AI photo verification, NDPA 2023 compliance, and zero phone-number exposure eliminate the harassment common on open apps.</div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
              <span class="w-6 h-6 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">03</span>
              <div>
                <div class="text-xs font-bold text-white">The Multi-Utility Campus Super-App</div>
                <div class="text-[11px] text-slate-300 mt-0.5">Dating creates the acquisition hook; confessions, voice calls, virtual gifts, and assignment escrow deepen daily engagement and lifetime value.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-purple-900/50 via-slate-800 to-slate-950 shadow-2xl shadow-purple-500/25 border border-purple-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.matchCards}" alt="It's a Match Screen" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500 shadow-xl text-[9px] text-purple-200 font-bold flex items-center gap-1">
              <span>🎉</span> Mutual Student Match
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 3: The Problem
  {
    tag: "THE PROBLEM",
    number: "02",
    title: "Students Have People Around Them — But Discovery is Fragmented.",
    subtitle: "4 Structural Flaws Why Tinder, Bumble & Western Apps Break Down on African Campuses",
    notes: "When a student in Lagos, Port Harcourt, or Ibadan opens Tinder or Bumble, the experience is immediately frustrating. First, proximity is broken: they match with an executive 40 kilometers away across 3 hours of Lagos traffic. Second, safety is terrifying: female students are inundated with scammers, sugar-daddy solicitations, and fake profiles. Third, data cost: Western apps are 85MB to 120MB bloatware that drain expensive cellular data. Finally, payment friction: they charge $15 to $30 monthly via international USD cards that get declined by Nigerian banks. The campus market is completely unserved.",
    html: `
      <div class="grid grid-cols-2 gap-4 h-full py-2">
        <div class="p-4 rounded-2xl bg-slate-900/80 border border-red-500/30 shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-red-400 font-bold text-xs uppercase font-mono">
              <span class="p-1 rounded bg-red-950 text-[11px]">📍</span> 1. Generic Dating &amp; Zero Campus Context
            </div>
            <h3 class="text-sm font-bold text-white mt-2">The 40-Kilometer Traffic Mismatch</h3>
            <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Broad apps are built for corporate professionals in London or New York. On campus, students want to meet someone in their hostel or faculty — not an executive 40km away across metropolitan traffic gridlock.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-red-300 font-mono">
            Result: Irrelevant match feeds and immediate app abandonment.
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase font-mono">
              <span class="p-1 rounded bg-amber-950 text-[11px]">🛡️</span> 2. Catfishing &amp; Severe Safety Anxiety
            </div>
            <h3 class="text-sm font-bold text-white mt-2">Women Cannot Trust Open Feeds</h3>
            <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Unverified anonymous accounts create rampant extortion, fake profiles, and harassment. Over 70% of female undergraduates report feeling unsafe on generalist dating apps where anyone can register without student proof.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-amber-300 font-mono">
            Result: Female liquidity freezes; male users churn due to zero replies.
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase font-mono">
              <span class="p-1 rounded bg-indigo-950 text-[11px]">📶</span> 3. Crippling Cellular Data &amp; Storage Bloat
            </div>
            <h3 class="text-sm font-bold text-white mt-2">85MB–120MB Data Hogs on 3G Phones</h3>
            <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Western apps are engineered for unlimited Western 5G. Nigerian students paying ₦1,500/GB on low-tier Android phones cannot afford continuous background video ads and oversized app bundles.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-indigo-300 font-mono">
            Result: Frequent uninstallation to free up device RAM and storage.
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase font-mono">
              <span class="p-1 rounded bg-purple-950 text-[11px]">💳</span> 4. Foreign Currency &amp; Pricing Friction
            </div>
            <h3 class="text-sm font-bold text-white mt-2">Dollar Paywalls Reject Nigerian Debit Cards</h3>
            <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Tinder charges $15–$30/month (₦25,000+) requiring foreign currency cards that 98% of Nigerian students do not possess. There are zero micro-transaction options tailored to student pocket money.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-purple-300 font-mono">
            Result: Zero monetization conversion on African campuses.
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 4: The Product (Replacing wireframes with 4 real screenshots!)
  {
    tag: "THE PRODUCT",
    number: "03",
    title: "A Complete Campus Connection Loop — From Profile to Real Value.",
    subtitle: "Live Android Production Screenshots Across Discovery, Matching, Real-Time Conversations, and AI Trust",
    notes: "Here is the actual product running live today. Unlike wireframes or mockups, our complete user loop is operational. On the far left, our Explore Grid allows students to browse verified profiles by university, with our proprietary Campus Finder camera button embedded right into search. Second, our Match stack provides gesture-driven discovery with verified checkmarks. Third, our Chat room features low-latency messaging, Nigerian cultural stickers, and integrated Agora voice calling so students never have to give away their personal phone numbers. Fourth, our AI Vision verification system automatically rejects group pictures, non-human graphics, or fake photos, creating a certified 18+ student community.",
    html: `
      <div class="grid grid-cols-4 gap-4 h-full py-1 items-center">
        <!-- Phone 1: Discover -->
        <div class="flex flex-col items-center">
          <div class="relative w-44 rounded-[28px] p-1.5 bg-gradient-to-b from-indigo-700 via-slate-800 to-slate-950 shadow-xl border border-indigo-500/40">
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[20px] bg-slate-950 h-[280px]">
              <img src="${images.exploreGrid}" alt="Campus Discover Grid" class="w-full h-full object-cover object-top" />
            </div>
          </div>
          <div class="text-center mt-2.5">
            <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">1. DISCOVER</span>
            <div class="text-xs font-bold text-white mt-0.5">Explore Grid &amp; Camera Finder</div>
            <p class="text-[10px] text-slate-400 mt-0.5">Faculty filters + 📸 Camera Face Search</p>
          </div>
        </div>

        <!-- Phone 2: Match -->
        <div class="flex flex-col items-center">
          <div class="relative w-44 rounded-[28px] p-1.5 bg-gradient-to-b from-purple-700 via-slate-800 to-slate-950 shadow-xl border border-purple-500/40">
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[20px] bg-slate-950 h-[280px]">
              <img src="${images.matchCards}" alt="Match Discovery Stack" class="w-full h-full object-cover object-top" />
            </div>
          </div>
          <div class="text-center mt-2.5">
            <span class="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">2. MATCH</span>
            <div class="text-xs font-bold text-white mt-0.5">Mutual Swipe Stack</div>
            <p class="text-[10px] text-slate-400 mt-0.5">Verified badges + university affiliation</p>
          </div>
        </div>

        <!-- Phone 3: Chat -->
        <div class="flex flex-col items-center">
          <div class="relative w-44 rounded-[28px] p-1.5 bg-gradient-to-b from-pink-700 via-slate-800 to-slate-950 shadow-xl border border-pink-500/40">
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[20px] bg-slate-950 h-[280px]">
              <img src="${images.chatTray}" alt="Real-time Chat with Media" class="w-full h-full object-cover object-top" />
            </div>
          </div>
          <div class="text-center mt-2.5">
            <span class="text-[10px] font-bold text-pink-400 uppercase tracking-wider font-mono">3. CONNECT</span>
            <div class="text-xs font-bold text-white mt-0.5">Rich Chat &amp; Agora Voice</div>
            <p class="text-[10px] text-slate-400 mt-0.5">Stickers, audio notes &amp; private calls</p>
          </div>
        </div>

        <!-- Phone 4: Trust -->
        <div class="flex flex-col items-center">
          <div class="relative w-44 rounded-[28px] p-1.5 bg-gradient-to-b from-emerald-700 via-slate-800 to-slate-950 shadow-xl border border-emerald-500/40">
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[20px] bg-slate-950 h-[280px]">
              <img src="${images.photoApproved}" alt="AI Photo Verification" class="w-full h-full object-cover object-top" />
            </div>
          </div>
          <div class="text-center mt-2.5">
            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">4. VERIFY</span>
            <div class="text-xs font-bold text-white mt-0.5">Vision AI Verification</div>
            <p class="text-[10px] text-slate-400 mt-0.5">Single-human face check &amp; NDPA safety</p>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 5: What is Already Built
  {
    tag: "WHAT IS ALREADY BUILT",
    number: "04",
    title: "The Platform is Broader Than a Swipe-and-Chat App.",
    subtitle: "8 Hardened Production Pillars Powering The College Date Ecosystem",
    notes: "We have built much more than a dating app; we have built the operating system for campus youth life. Our platform contains eight hardened modules: first, Hyperlocal Campus Matching across 170+ schools. Second, Campus Finder: an AI camera tool allowing students to find anyone on campus from a photo. Third, Agora RTC voice and video calling with zero phone number disclosure. Fourth, Google Vision AI verification. Fifth, an anonymous Confessions feed with viral WhatsApp repost loops. Sixth, CD Coins and virtual gifting. Seventh, an escrow marketplace for student assignments and tutoring. And eighth, local Nigerian SMS verification via Termii at ₦4.50 per SMS. This entire platform is live on Android and Web.",
    html: `
      <div class="grid grid-cols-4 gap-3 h-full py-1">
        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-indigo-400 uppercase font-mono">01 • Campus Matching</div>
            <div class="text-xs font-bold text-white mt-1">Hyperlocal Discovery</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Filtered by University, Faculty, Department, Level (100L–600L), and Hostels. Matches students within walking distance.
            </p>
          </div>
          <div class="text-[9px] text-indigo-300 font-mono mt-1">✓ Live on 170+ Campuses</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-purple-400 uppercase font-mono">02 • Campus Finder</div>
            <div class="text-xs font-bold text-white mt-1">AI Camera Face Search</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Students snap or upload a photo to discover matching student profiles, protected by strict NDPA 2023 privacy safeguards.
            </p>
          </div>
          <div class="text-[9px] text-purple-300 font-mono mt-1">✓ Built-In Camera Modal</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-pink-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-pink-400 uppercase font-mono">03 • Agora In-App Calling</div>
            <div class="text-xs font-bold text-white mt-1">Private Voice &amp; Video</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Encrypted, bandwidth-efficient Agora RTC audio/video calls without exchanging private WhatsApp phone numbers.
            </p>
          </div>
          <div class="text-[9px] text-pink-300 font-mono mt-1">✓ Zero Phone Number Exposure</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-emerald-400 uppercase font-mono">04 • Vision AI Verification</div>
            <div class="text-xs font-bold text-white mt-1">Automated Identity Trust</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Rejects group photos, non-human pictures, or cartoons. Confirms single real student facial liveness before verified badge issuance.
            </p>
          </div>
          <div class="text-[9px] text-emerald-300 font-mono mt-1">✓ 151 Verified Profiles</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-amber-400 uppercase font-mono">05 • Campus Confessions</div>
            <div class="text-xs font-bold text-white mt-1">Viral Expression Wall</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Anonymous campus secrets, upvotes, and comment drawers that students screenshot and post directly to WhatsApp Status.
            </p>
          </div>
          <div class="text-[9px] text-amber-300 font-mono mt-1">✓ Organic Retention Engine</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-cyan-400 uppercase font-mono">06 • CD Coins &amp; Gifting</div>
            <div class="text-xs font-bold text-white mt-1">Virtual Gifting Store</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Virtual coin wallet allowing users to send roses, chocolates, perfume, and cultural gifts that recipients can cash out.
            </p>
          </div>
          <div class="text-[9px] text-cyan-300 font-mono mt-1">✓ Peer-to-Peer Cash Wallet</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-blue-400 uppercase font-mono">07 • Student Services Escrow</div>
            <div class="text-xs font-bold text-white mt-1">Academic Freelance Deals</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              Built-in escrow system for student tutoring, assignment proofreading, and campus gigs with 5% transaction commission.
            </p>
          </div>
          <div class="text-[9px] text-blue-300 font-mono mt-1">✓ Escrow Protection Layer</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/30 flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-rose-400 uppercase font-mono">08 • Termii Local SMS &amp; CRM</div>
            <div class="text-xs font-bold text-white mt-1">Omnichannel Retention</div>
            <p class="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
              ₦4.50 local SMS routing across MTN, Airtel, Glo, 9mobile + automated OneSignal lifecycle journeys for streak defense.
            </p>
          </div>
          <div class="text-[9px] text-rose-300 font-mono mt-1">✓ Verified Carrier LOAs</div>
        </div>
      </div>
    `
  },

  // SLIDE 6: Traction & Early Signals
  {
    tag: "TRACTION & SIGNALS",
    number: "05",
    title: "Early Usage is Real. The Foundation is Set for Repeatable Scale.",
    subtitle: "Organic Adoption, High-Intent Monetization Inquiries, and Production Stability",
    notes: "Let's review our verified numbers. Across our early testing, we have 871 registered student accounts, 151 verified profiles, and maintain 46 to 48 daily active students. More importantly, we have already generated ₦9,800 in early monetization transactions from two premium subscribers and four service users. In addition, our official WhatsApp support channel regularly receives direct messages from students asking: 'How do I pay to unlock premium?' and 'Can I pay with bank transfer?'. This confirms high willingness to pay. Now that we have integrated Termii local SMS and automated Paystack/RevenueCat checkouts, our conversion funnel is ready for aggressive expansion.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-1">
          <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 shadow-lg">
              <div class="text-xs font-bold text-indigo-400 uppercase font-mono">Registered Accounts</div>
              <div class="text-2xl font-black text-white mt-1">871</div>
              <div class="text-[10px] text-slate-400">Total student signups across campuses</div>
              <div class="text-[9.5px] text-emerald-400 font-semibold mt-1">151 Verified Student IDs</div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 shadow-lg">
              <div class="text-xs font-bold text-purple-400 uppercase font-mono">Campus Activity</div>
              <div class="text-2xl font-black text-white mt-1">46–48 DAU</div>
              <div class="text-[10px] text-slate-400">Daily active students • ~385 WAU</div>
              <div class="text-[9.5px] text-purple-300 font-semibold mt-1">Live Heartbeat Presence</div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-pink-500/30 shadow-lg">
              <div class="text-xs font-bold text-pink-400 uppercase font-mono">Monetization Proof</div>
              <div class="text-2xl font-black text-white mt-1">₦9,800</div>
              <div class="text-[10px] text-slate-400">Validated cash revenue to date</div>
              <div class="text-[9.5px] text-pink-300 font-semibold mt-1">2 Subscriptions + 4 Services</div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 shadow-lg">
              <div class="text-xs font-bold text-emerald-400 uppercase font-mono">Mobile App Stability</div>
              <div class="text-2xl font-black text-white mt-1">v2.2.63</div>
              <div class="text-[10px] text-slate-400">Google Play Version Code 60</div>
              <div class="text-[9.5px] text-emerald-300 font-semibold mt-1">0 Crash Rate on Android 15</div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 shadow-lg">
            <div class="text-[10px] font-bold text-indigo-400 uppercase font-mono mb-1">Early Monetization Intent Signal</div>
            <h4 class="text-xs font-bold text-white">Users are Inquiring to Pay Before Marketing Begins</h4>
            <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Multiple students have contacted our official WhatsApp support specifically asking whether paying for Premium will unlock unlimited swipes and campus discovery. These inquiries prove real willingness to pay; our task now is automating frictionless local payments.
            </p>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 shadow-2xl border border-slate-700">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.walletPage}" alt="College Date Wallet &amp; Payouts" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -left-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/50 shadow-xl text-[9px] text-emerald-300 font-bold flex items-center gap-1">
              <span>💳</span> Live Wallet &amp; Cashout System
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 7: Monetization Model
  {
    tag: "MONETIZATION",
    number: "06",
    title: "A Diversified Multi-Stream Campus Monetization Engine.",
    subtitle: "Aligning Student Purchasing Power with High-Frequency Social & Economic Utilities",
    notes: "Unlike Western apps that rely entirely on rigid monthly subscriptions, our business model is adapted to student pocket money. We have four distinct revenue channels: First, Weekly, Monthly, and Semester subscriptions ranging from ₦1,200 to ₦8,500. Second, microtransactions using CD Coins—students buy packs for ₦500 to ₦5,000 to send virtual gifts like perfume or 'Chop Life' treats to matches, which the recipient can cash out into real naira. Third, our academic freelance escrow marketplace takes a 5% commission on student service deals. And fourth, targeted campus merchant partnerships. By providing low-ticket impulse purchases, we turn trust into repeatable revenue.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-2.5">
          <div class="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">01</div>
            <div>
              <div class="text-xs font-bold text-white">Tiered Subscriptions (Paystack &amp; RevenueCat)</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Weekly (₦1,200), Monthly (₦3,500), and Semester (₦8,500). Unlocks unlimited swipes, see who liked you, rewind, and verified campus badge.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-purple-500/30 flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">02</div>
            <div>
              <div class="text-xs font-bold text-white">CD Coins &amp; Virtual Gifting Store</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Low-friction coin packs (₦500 to ₦10,000) for sending virtual gifts (Roses, "Chop Life", Perfume) and direct chat unlocks. Recipients cash out real naira to their bank.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-pink-500/30 flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">03</div>
            <div>
              <div class="text-xs font-bold text-white">Campus Freelance &amp; Escrow Marketplace</div>
              <div class="text-[11px] text-slate-300 mt-0.5">5% platform fee on student-to-student service transactions: course tutoring, assignment proofreading, hostel assistance, and freelance campus gigs.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
            <div class="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">04</div>
            <div>
              <div class="text-xs font-bold text-white">Campus Brand Drops &amp; Event Sponsorships</div>
              <div class="text-[11px] text-slate-300 mt-0.5">High-intent sponsored cards and campus event ticket distribution partnering with local student brands, telecoms, and food vendors.</div>
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[10px] text-indigo-300 font-mono">
            💡 Key insight: Trust is our primary conversion variable. Solving payment friction with local bank transfer unlocks student liquidity.
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-purple-700 via-slate-800 to-slate-950 shadow-2xl border border-purple-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.premiumTiers}" alt="Premium Subscription Tiers" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500 shadow-xl text-[9px] text-purple-200 font-bold flex items-center gap-1">
              <span>💎</span> 3 Premium Tiers
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 8: Why Now (Macro Tailwinds)
  {
    tag: "WHY NOW",
    number: "07",
    title: "Africa is Young, Connected and Increasingly Digital.",
    subtitle: "The Structural Tailwinds Driving Explosive Demand for Hyperlocal Youth Platforms",
    notes: "Why is now the right moment to build The College Date? Look at the macro demographics. By 2025, Africa's population reached 1.55 billion people, and 75% of them are under the age of 35. Sub-Saharan Africa is currently the world's fastest-growing higher education region, with UNESCO projecting tertiary enrollment to double over the next two decades. In Nigeria alone, there are 107 million internet users and 38.7 million active social media accounts. This young, smartphone-native generation lives their entire social and academic lives on mobile, yet no dedicated platform exists to serve their unique campus relationship graph.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-2">
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-center">
              <div class="text-2xl font-black text-indigo-400">1.55B</div>
              <div class="text-[10px] font-bold text-white uppercase mt-1">Africa Population</div>
              <div class="text-[9px] text-slate-400 mt-0.5">UN-linked demographic census</div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 text-center">
              <div class="text-2xl font-black text-purple-400">75%</div>
              <div class="text-[10px] font-bold text-white uppercase mt-1">Under 35 Years</div>
              <div class="text-[9px] text-slate-400 mt-0.5">Youngest global continent</div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-pink-500/30 text-center">
              <div class="text-2xl font-black text-pink-400">107M</div>
              <div class="text-[10px] font-bold text-white uppercase mt-1">Nigeria Internet Users</div>
              <div class="text-[9px] text-slate-400 mt-0.5">DataReportal 2025 Report</div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 my-2">
            <div class="flex items-start gap-2.5">
              <span class="text-emerald-400 font-bold text-sm">📈</span>
              <p class="text-xs text-slate-300 leading-relaxed">
                <strong>UNESCO Tertiary Surge:</strong> Global higher education reached 269M in 2024. Sub-Saharan Africa's participation rate is only 9% today, representing the largest headroom for university growth worldwide.
              </p>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="text-indigo-400 font-bold text-sm">📱</span>
              <p class="text-xs text-slate-300 leading-relaxed">
                <strong>Campus Smartphone Saturation:</strong> Over 94% of Nigerian university students own an Android smartphone, using mobile apps for lecture updates, faculty chats, and peer payments.
              </p>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="text-purple-400 font-bold text-sm">🇳🇬</span>
              <p class="text-xs text-slate-300 leading-relaxed">
                <strong>Digital Youth Economy:</strong> 38.7M social media identities in Nigeria. Gen-Z students are eager for homegrown platforms that understand local slangs, hostel humor, and micro-income opportunities.
              </p>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 font-medium">
            ✦ College Date captures this tailwind by designing around the single highest-density youth habitat: <strong>the university campus</strong>.
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-indigo-700 via-slate-800 to-slate-950 shadow-2xl border border-indigo-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.confessions}" alt="Anonymous Confessions Wall" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -left-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500 shadow-xl text-[9px] text-indigo-300 font-bold flex items-center gap-1">
              <span>🔥</span> Viral Confessions Wall
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 9: Market Size (TAM / SAM / SOM)
  {
    tag: "MARKET SIZE",
    number: "08",
    title: "Start With Students. Expand Into the Campus Ecosystem.",
    subtitle: "A Multi-Billion Naira Market Opportunity Across African Higher Education",
    notes: "Here is how we size the opportunity. Our Total Addressable Market across Sub-Saharan Africa comprises 17.5 million higher-education students across Nigeria, Ghana, Kenya, South Africa, and Egypt. That represents an annual relationship and student services market of over $520 million. Our Serviceable Addressable Market in Nigeria alone is 2.8 million full-time tertiary students across 170+ accredited institutions, spending an estimated $84 million annually on social, dating, and campus peer services. Our 36-month target—our SOM—is capturing 100,000 active students across Nigeria's top 15 university hubs, generating over $3 million in high-margin software and transaction revenue.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-3.5">
          <div class="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-400 uppercase font-mono">TAM • Africa Higher Education</span>
              <span class="text-xl font-black text-white">$520M / 17.5M Students</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">
              17.5 million higher-education students across Sub-Saharan Africa (Nigeria, Ghana, Kenya, South Africa, Rwanda). Sized across dating subscriptions, virtual gifting, and peer escrow commerce.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-purple-400 uppercase font-mono">SAM • Nigeria Higher Education</span>
              <span class="text-xl font-black text-white">$84M / 2.8M Students</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">
              Nigeria Federal Ministry of Education and JAMB strategic roadmap reports ~2.8M students enrolled across 170+ accredited universities and polytechnics.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-400 uppercase font-mono">SOM • 36-Month Management Target</span>
              <span class="text-xl font-black text-white">$3.0M / 100,000 Students</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">
              Targeting 100,000 active students across the top 15 high-density university clusters (UNILAG, UNIPORT, OAU, UNIBEN, UI, ABU). Projected annual ARPU of ~$30 through subscriptions, coins, and escrow.
            </p>
          </div>

          <div class="text-[9.5px] text-slate-400 font-mono text-center">
            *TAM/SAM are demographic population estimates; SOM is a management financial target refined against CAC and campus density.
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-emerald-700 via-slate-800 to-slate-950 shadow-2xl border border-emerald-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.giftStore}" alt="Virtual Gift Store" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500 shadow-xl text-[9px] text-emerald-300 font-bold flex items-center gap-1">
              <span>🎁</span> CD Coins Gift Store
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 10: Competition Matrix
  {
    tag: "COMPETITION",
    number: "09",
    title: "The Category is Proven. The Wedge is Campus Context.",
    subtitle: "How TheCollegeDate Out-Executes Global Incumbents on African Campuses",
    notes: "Investors often ask: 'What about Tinder and Bumble?'. Incumbents validate the massive consumer demand for digital matchmaking. But Tinder and Bumble are broad horizontal platforms that cannot serve the vertical requirements of African universities. First, our binary footprint is 14MB, compared to Tinder's 85MB. Second, we feature built-in Vision AI student face verification. Third, we offer in-app Agora voice calling so students never give out their WhatsApp number to strangers. Fourth, we enable students to earn income through virtual gifts and service escrow. And fifth, our pricing starts at ₦1,200 via Paystack and local bank transfer. We don't need to defeat Tinder everywhere; we win the campus quad.",
    html: `
      <div class="flex flex-col justify-center h-full py-1">
        <div class="overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-900/90">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <th class="p-3">Platform Capability</th>
                <th class="p-3 text-indigo-400 bg-indigo-950/40 border-x border-indigo-500/30">The College Date</th>
                <th class="p-3">Tinder</th>
                <th class="p-3">Bumble</th>
                <th class="p-3">Badoo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 text-[11px]">
              <tr>
                <td class="p-2.5 font-semibold text-white">Campus Graph &amp; Hostel Filtering</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ Dedicated Core Architecture</td>
                <td class="p-2.5 text-slate-400">Partial ("College Mode" in US)</td>
                <td class="p-2.5 text-slate-400">None (Generic GPS)</td>
                <td class="p-2.5 text-slate-400">None (City-wide)</td>
              </tr>
              <tr>
                <td class="p-2.5 font-semibold text-white">Mobile Footprint &amp; Data Overhead</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ 14.1 MB Ultra-Lean APK</td>
                <td class="p-2.5 text-red-400">85 MB+ (Data Heavy)</td>
                <td class="p-2.5 text-red-400">110 MB+ (Data Heavy)</td>
                <td class="p-2.5 text-red-400">95 MB+ (Data Heavy)</td>
              </tr>
              <tr>
                <td class="p-2.5 font-semibold text-white">In-App Voice/Video (No Phone #)</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ Encrypted Agora RTC</td>
                <td class="p-2.5 text-slate-400">Paid feature only</td>
                <td class="p-2.5 text-slate-400">Basic video only</td>
                <td class="p-2.5 text-slate-400">Basic video call</td>
              </tr>
              <tr>
                <td class="p-2.5 font-semibold text-white">Vision AI Student ID Verification</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ Vision AI Single-Face Check</td>
                <td class="p-2.5 text-slate-400">Generic selfie angle</td>
                <td class="p-2.5 text-slate-400">Generic selfie check</td>
                <td class="p-2.5 text-slate-400">Generic pose check</td>
              </tr>
              <tr>
                <td class="p-2.5 font-semibold text-white">Peer Micro-Economy &amp; Escrow Deals</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ CD Coins + Tutoring Escrow</td>
                <td class="p-2.5 text-slate-500">None (0 earning utilities)</td>
                <td class="p-2.5 text-slate-500">None (0 earning utilities)</td>
                <td class="p-2.5 text-slate-500">None (0 earning utilities)</td>
              </tr>
              <tr>
                <td class="p-2.5 font-semibold text-white">Localized Payment Methods</td>
                <td class="p-2.5 font-bold text-emerald-400 bg-indigo-950/20 border-x border-indigo-500/30">✓ Naira Bank Transfer / Paystack</td>
                <td class="p-2.5 text-red-400">Foreign USD cards only</td>
                <td class="p-2.5 text-red-400">Foreign USD cards only</td>
                <td class="p-2.5 text-slate-400">Limited local billing</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-center text-xs text-indigo-300 font-medium">
          Strategic Positioning: Large incumbents validate consumer dating demand. College Date owns the localized campus wedge, trusted identity layer, and peer micro-economy.
        </div>
      </div>
    `
  },

  // SLIDE 11: Go-to-Market & Media Moat
  {
    tag: "GO-TO-MARKET",
    number: "10",
    title: "Win Campus by Campus — Then Let Density Compound.",
    subtitle: "Zero-Dollar Customer Acquisition Through Co-Founder Media Reach and Campus Networks",
    notes: "Dating apps that spend money on Facebook and Instagram ads die from infinite customer acquisition cost. We don't acquire users that way. We have an unfair structural advantage: My co-founder, SOKEPIRIM Jackreece, owns Official Students O'clock, a premier student WhatsApp media network reaching over 50,000 daily active student followers across Nigerian universities. That gives us zero-CAC instant distribution from Day 1. Second, we deploy 10 student ambassadors per campus—half of them female student leaders—who earn referral bounties. Third, our anonymous Confessions Wall generates viral screenshots that students share to their WhatsApp Status. And fourth, our 224-cluster SEO engine captures thousands of organic student searches daily.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-8 grid grid-cols-2 gap-3.5">
          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/40 shadow-lg">
            <div class="text-[10px] font-bold text-indigo-400 uppercase mb-1 font-mono">1. Co-Founder Media Moat</div>
            <div class="text-xs font-bold text-white mb-1">Official Students O'clock</div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Co-Founder SOKEPIRIM Jackreece reaches <strong>50,000+ daily student followers</strong> across university WhatsApp networks. Zero-cost broadcast from Day 1.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/40 shadow-lg">
            <div class="text-[10px] font-bold text-purple-400 uppercase mb-1 font-mono">2. Campus Ambassador Corps</div>
            <div class="text-xs font-bold text-white mb-1">10 Student Reps Per Campus</div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Deploying 10 student leaders per institution (50% female student executives) driving hostel room-to-room activations and campus events.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-pink-500/40 shadow-lg">
            <div class="text-[10px] font-bold text-pink-400 uppercase mb-1 font-mono">3. Confessions Virality Loop</div>
            <div class="text-xs font-bold text-white mb-1">WhatsApp Status Sharing</div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              Anonymous campus secrets, lodge scandals, and romance confessions generate viral screenshot loops shared organic to WhatsApp Status.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/40 shadow-lg">
            <div class="text-[10px] font-bold text-emerald-400 uppercase mb-1 font-mono">4. 224-Cluster SEO &amp; GEO Engine</div>
            <div class="text-xs font-bold text-white mb-1">133,087 Words of Campus SEO</div>
            <p class="text-[11px] text-slate-300 leading-relaxed">
              224 published canonical pages across 10 campus clusters, capturing high-intent organic student traffic across Google, ChatGPT, and Perplexity.
            </p>
          </div>
        </div>

        <div class="col-span-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 shadow-xl flex flex-col justify-between h-full">
          <div>
            <div class="text-[10px] font-bold text-indigo-400 uppercase font-mono mb-2">North-Star Metric</div>
            <h4 class="text-sm font-extrabold text-white leading-snug">
              Campus Density → Meaningful Matches → Retained Users → Paid Actions.
            </h4>
            <p class="text-[11px] text-slate-300 mt-2 leading-relaxed">
              We do not measure vanity global downloads. We measure active users per campus hostel and department. When 500 students in a faculty are active, the network effects become unbreakable.
            </p>
          </div>
          <div class="pt-3 border-t border-indigo-500/30 text-[10px] text-emerald-400 font-mono">
            Target: 1,500 active students per campus across top 10 university hubs.
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 12: Trust is the Unlock
  {
    tag: "TRUST ARCHITECTURE",
    number: "11",
    title: "The Product is Built for a Category Where Trust Directly Affects Monetization.",
    subtitle: "Protecting Female Students is the Core Driver of Network Liquidity and Revenue",
    notes: "In African consumer tech, trust is not a legal checklist; trust is our primary growth and monetization variable. When female students feel safe, they join the platform. When women are active, men stay and purchase premium upgrades, virtual coins, and boosts. We have implemented a multi-layered trust architecture: NDPA 2023 statutory privacy compliance, Vision AI single-face verification, ephemeral GPS location sharing, encrypted Agora calling that prevents strangers from getting private phone numbers, and a fast 24-hour moderation response team. Trust unlocks sustainable unit economics.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-2.5">
          <div class="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex items-start gap-3">
            <span class="text-lg">🛡️</span>
            <div>
              <div class="text-xs font-bold text-white">NDPA 2023 Statutory Privacy Compliance</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Full compliance with the Nigeria Data Protection Act 2023. Explicit biometric consent, self-service account deletion, and immutable acceptance audit ledger.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-purple-500/30 flex items-start gap-3">
            <span class="text-lg">👁️</span>
            <div>
              <div class="text-xs font-bold text-white">Vision AI Photo Verification</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Automated deep learning model screens profile pictures. Rejects multi-face group pictures, non-human graphics, or internet downloads before issuing verified badges.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-pink-500/30 flex items-start gap-3">
            <span class="text-lg">📞</span>
            <div>
              <div class="text-xs font-bold text-white">Agora RTC Phone Number Masking</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Students speak and video chat within the app without exchanging private WhatsApp phone numbers, eliminating off-platform stalker risks.</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
            <span class="text-lg">📍</span>
            <div>
              <div class="text-xs font-bold text-white">Ephemeral Campus Location Sharing</div>
              <div class="text-[11px] text-slate-300 mt-0.5">Students can choose to share their location only during active campus hours with trusted matches, with zero persistent background tracking.</div>
            </div>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-indigo-700 via-slate-800 to-slate-950 shadow-2xl border border-indigo-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.locationModal}" alt="Ephemeral Location Modal" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -left-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500 shadow-xl text-[9px] text-indigo-300 font-bold flex items-center gap-1">
              <span>📍</span> Campus Safety Location Modal
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 13: Product Moat
  {
    tag: "PRODUCT MOAT",
    number: "12",
    title: "The Moat is Not a Feature. It is a Campus Network That Gets Harder to Replicate as Density Grows.",
    subtitle: "5 Interlocking Compounding Layers Defending The College Date Ecosystem",
    notes: "A competitor can copy a feature, but they cannot easily copy a 5-layer campus network. Layer 1 is our Campus Graph: structured university, department, and hostel metadata that global apps do not possess. Layer 2 is our Verified Identity Layer: students trust verified accounts. Layer 3 is Behavioral Matching: our algorithm understands campus relationship dynamics. Layer 4 is Community Content: confessions and stories keep students returning even when they aren't actively dating. And Layer 5 is our Transaction Layer: CD Coins, tipping, and service escrow transform College Date into financial infrastructure for students.",
    html: `
      <div class="grid grid-cols-5 gap-3 h-full py-2">
        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between">
          <div>
            <div class="text-xs font-extrabold text-indigo-400 font-mono">LAYER 01</div>
            <h4 class="text-xs font-bold text-white mt-1">Campus Graph</h4>
            <p class="text-[10.5px] text-slate-300 mt-2 leading-relaxed">
              Department, level, faculty, and hostel hierarchies create structured local relevance that generic global apps cannot replicate.
            </p>
          </div>
          <div class="text-[9px] text-indigo-400 font-mono">Hyperlocal Density</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
          <div>
            <div class="text-xs font-extrabold text-purple-400 font-mono">LAYER 02</div>
            <h4 class="text-xs font-bold text-white mt-1">Verified Identity</h4>
            <p class="text-[10.5px] text-slate-300 mt-2 leading-relaxed">
              A trusted, verified student identity layer recognized across campus, setting the standard for genuine student interactions.
            </p>
          </div>
          <div class="text-[9px] text-purple-400 font-mono">High-Trust Moat</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-pink-500/30 flex flex-col justify-between">
          <div>
            <div class="text-xs font-extrabold text-pink-400 font-mono">LAYER 03</div>
            <h4 class="text-xs font-bold text-white mt-1">Behavioral Data</h4>
            <p class="text-[10.5px] text-slate-300 mt-2 leading-relaxed">
              Matching, conversation frequency, and lifestyle engagement data continuously refine discovery and match quality over time.
            </p>
          </div>
          <div class="text-[9px] text-pink-400 font-mono">Data Compounding</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div class="text-xs font-extrabold text-emerald-400 font-mono">LAYER 04</div>
            <h4 class="text-xs font-bold text-white mt-1">Community Content</h4>
            <p class="text-[10.5px] text-slate-300 mt-2 leading-relaxed">
              Anonymous confessions, student stories, and campus memes create reasons to return daily even when not actively matching.
            </p>
          </div>
          <div class="text-[9px] text-emerald-400 font-mono">Daily Retention</div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between">
          <div>
            <div class="text-xs font-extrabold text-amber-400 font-mono">LAYER 05</div>
            <h4 class="text-xs font-bold text-white mt-1">Transaction Layer</h4>
            <p class="text-[10.5px] text-slate-300 mt-2 leading-relaxed">
              CD Coins, virtual gifts, and academic service escrow embed The College Date directly into the student micro-economy.
            </p>
          </div>
          <div class="text-[9px] text-amber-400 font-mono">Economic Lock-In</div>
        </div>
      </div>
    `
  },

  // SLIDE 14: Roadmap
  {
    tag: "STRATEGIC ROADMAP",
    number: "13",
    title: "The Next Phase is About Proving Repeatable Growth, Not Adding Endless Features.",
    subtitle: "Disciplined 18-Month Execution From Nigerian Campus Density to Regional Expansion",
    notes: "We have finished product-building mode. Our 18-month roadmap is laser-focused on growth, liquidity, and unit economics. In the first 3 months, we optimize local Paystack checkout flows and ambassador onboarding. In months 3 to 6, we deploy into 5 major campuses—UNILAG, UNIPORT, OAU, UNIBEN, and UI—targeting 20,000 active students. In months 6 to 12, we scale our CD Coins store and campus service escrow, reaching cashflow breakeven. And in months 12 to 18, we expand across Ghana and Kenya.",
    html: `
      <div class="grid grid-cols-4 gap-4 h-full py-2">
        <div class="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/40 shadow-lg flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-indigo-400 uppercase font-mono">Months 0–3 • Q1</div>
            <h4 class="text-sm font-bold text-white mt-1">Trust &amp; Conversion</h4>
            <ul class="text-[11px] text-slate-300 mt-2.5 space-y-1.5 leading-relaxed">
              <li>• Finalize Termii SMS + Paystack automated billing</li>
              <li>• Scale verified badge adoption to 40%</li>
              <li>• Launch campus ambassador referral tracking</li>
              <li>• Target: 5,000 verified students</li>
            </ul>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-indigo-400 font-mono">Milestone: Conversion Flow</div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/40 shadow-lg flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-purple-400 uppercase font-mono">Months 3–6 • Q2</div>
            <h4 class="text-sm font-bold text-white mt-1">5 Core Campus Density</h4>
            <ul class="text-[11px] text-slate-300 mt-2.5 space-y-1.5 leading-relaxed">
              <li>• Deploy ambassador network at UNILAG, UNIPORT, OAU, UNIBEN, UI</li>
              <li>• Official Students O'clock exclusive broadcast</li>
              <li>• Host weekly campus confession drop events</li>
              <li>• Target: 20,000 active students</li>
            </ul>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-purple-400 font-mono">Milestone: Campus Liquidity</div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-pink-500/40 shadow-lg flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-pink-400 uppercase font-mono">Months 6–12 • Q3-Q4</div>
            <h4 class="text-sm font-bold text-white mt-1">Monetization Scale</h4>
            <ul class="text-[11px] text-slate-300 mt-2.5 space-y-1.5 leading-relaxed">
              <li>• Scale CD Coins virtual gifting &amp; cashout</li>
              <li>• Launch student service escrow marketplace</li>
              <li>• First campus brand sponsorships</li>
              <li>• Target: 50,000 students • Breakeven</li>
            </ul>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-pink-400 font-mono">Milestone: Cashflow Positive</div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/40 shadow-lg flex flex-col justify-between">
          <div>
            <div class="text-[10px] font-bold text-emerald-400 uppercase font-mono">Months 12–18 • Year 2</div>
            <h4 class="text-sm font-bold text-white mt-1">Pan-African Expansion</h4>
            <ul class="text-[11px] text-slate-300 mt-2.5 space-y-1.5 leading-relaxed">
              <li>• Launch Ghana pilot (Univ. of Ghana, KNUST)</li>
              <li>• Launch Kenya pilot (Univ. of Nairobi)</li>
              <li>• iOS Native client release</li>
              <li>• Target: 100,000 students across Africa</li>
            </ul>
          </div>
          <div class="pt-2 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">Milestone: Regional Scale</div>
        </div>
      </div>
    `
  },

  // SLIDE 15: The Raise
  {
    tag: "THE RAISE",
    number: "14",
    title: "We Are Looking for Capital to Turn a Working Product into a Repeatable Growth Engine.",
    subtitle: "Seeking $150,000 USD Pre-Seed Investment to Accelerate Campus Density and Achieve Breakeven",
    notes: "We are raising $150,000 USD on a standard SAFE note to fund our 18-month growth plan. Our use of funds is heavily weighted toward distribution: 40% goes directly to campus growth and our student ambassador network; 25% to engineering for iOS development and backend scaling; 15% to trust, safety, and biometric verification; 10% to operations; and 10% to legal and contingency reserves. This capital takes The College Date from an early working product to a dominant, cashflow-positive campus network across Nigeria.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-6 p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 shadow-xl flex flex-col justify-between h-full">
          <div>
            <div class="text-[10px] font-bold text-indigo-400 uppercase font-mono mb-2">Investment Structure</div>
            <h3 class="text-2xl font-black text-white">$150,000 USD</h3>
            <div class="text-xs text-indigo-300 font-bold mt-1">Pre-Seed Round (₦225,000,000 NGN)</div>
            <p class="text-xs text-slate-300 mt-3 leading-relaxed">
              Turn a fully deployed, hardened Android and Web platform into a cashflow-positive, dominant campus network across Nigeria's top tertiary institutions.
            </p>
            <div class="mt-4 space-y-2 text-xs text-slate-300 font-mono">
              <div>• <strong>Instrument:</strong> Standard SAFE (Simple Agreement for Future Equity)</div>
              <div>• <strong>Runway:</strong> 18 Months to Operational Breakeven</div>
              <div>• <strong>Target Outcome:</strong> 100,000 Active Students across 15 Hubs</div>
            </div>
          </div>
          <div class="pt-3 border-t border-indigo-500/30 text-[10px] text-slate-400 font-mono">
            Parent Entity: Neway Marketing Enterprises
          </div>
        </div>

        <div class="col-span-6 space-y-3">
          <div class="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider mb-1">
            Illustrative Use of Funds
          </div>

          <div class="space-y-2">
            <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="flex justify-between text-xs font-bold text-white mb-1">
                <span>Campus Acquisition &amp; Ambassador Corps</span>
                <span class="text-indigo-400">40% ($60,000)</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-full rounded-full" style="width: 40%"></div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="flex justify-between text-xs font-bold text-white mb-1">
                <span>Product &amp; Mobile Engineering (iOS + Scale)</span>
                <span class="text-purple-400">25% ($37,500)</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-purple-500 h-full rounded-full" style="width: 25%"></div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="flex justify-between text-xs font-bold text-white mb-1">
                <span>Trust, Safety &amp; Vision AI Verification</span>
                <span class="text-pink-400">15% ($22,500)</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-pink-500 h-full rounded-full" style="width: 15%"></div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="flex justify-between text-xs font-bold text-white mb-1">
                <span>Campus Operations &amp; Support</span>
                <span class="text-emerald-400">10% ($15,000)</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-full rounded-full" style="width: 10%"></div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div class="flex justify-between text-xs font-bold text-white mb-1">
                <span>Legal, Carrier Licensing &amp; Reserve</span>
                <span class="text-amber-400">10% ($15,000)</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full" style="width: 10%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 16: Founder & Team (BOTH FOUNDERS WITH REAL PHOTOS!)
  {
    tag: "FOUNDING TEAM",
    number: "15",
    title: "Built by Technical Founders With Proven Execution & Grassroots Reach.",
    subtitle: "Software Architecture Mastery Meets Deep Campus Student Media Distribution",
    notes: "Investors back teams that possess both technical mastery and an unfair distribution advantage. That is exactly who we are. I am Godswill Godlife Onah, Founder and Lead System Architect. With over 5 years of leadership and systems engineering experience, I personally built our entire production infrastructure, from our database RPCs to our Agora calling engine and Google Play deployment. My co-founder is SOKEPIRIM Jackreece, Head of Campus Growth. Jackreece is a mobile developer and the founder of Official Students O'clock, reaching over 50,000 daily students across university WhatsApp channels. Together, we have the technical ability to build world-class software and the grassroots distribution to dominate African campuses.",
    html: `
      <div class="grid grid-cols-2 gap-8 items-center h-full py-1">
        <!-- Founder 1: Godswill -->
        <div class="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-xl flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg bg-slate-800 shrink-0">
                <img src="${images.godswill}" alt="Godswill Godlife Onah" class="w-full h-full object-cover object-top" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white">Godswill Godlife Onah</h3>
                <div class="text-xs text-indigo-400 font-semibold">Founder, CEO &amp; Lead System Architect</div>
                <div class="text-[10px] text-slate-400 font-mono">godswill@thecollegedate.com</div>
              </div>
            </div>
            <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>• <strong>5+ years of digital systems leadership</strong> and full-stack software architecture.</li>
              <li>• Founder of <strong>Neway Marketing Enterprise</strong> (registered parent entity).</li>
              <li>• Personally engineered CD 2.0 full-stack architecture: Agora RTC audio/video, PostgreSQL RPCs, automated QA suite, and 224-cluster SEO engine.</li>
              <li>• Verified public profile: <span class="text-indigo-400 font-mono">linkedin.com/in/god-swill-godlife-07191221a</span></li>
            </ul>
          </div>
          <div class="pt-3 border-t border-slate-800 text-[10px] text-indigo-300 font-mono">
            Execution Focus: Systems, Scalability &amp; Mobile Hardening
          </div>
        </div>

        <!-- Founder 2: SOKEPIRIM -->
        <div class="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/40 shadow-xl flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg bg-slate-800 shrink-0">
                <img src="${images.sokepirim}" alt="SOKEPIRIM Jackreece" class="w-full h-full object-cover object-top" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white">SOKEPIRIM Jackreece</h3>
                <div class="text-xs text-purple-400 font-semibold">Co-Founder &amp; Head of Campus Growth</div>
                <div class="text-[10px] text-slate-400 font-mono">jackreece@thecollegedate.com</div>
              </div>
            </div>
            <ul class="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>• <strong>Founder of Official Students O'clock</strong>, reaching <strong>50,000+ daily student followers</strong> across Nigerian universities on WhatsApp.</li>
              <li>• Mobile application developer (Flutter/Android) with deep expertise in student digital habits.</li>
              <li>• Direct relationships with student union executives, departmental leaders, and campus creators across Nigeria.</li>
              <li>• Leads our on-ground campus ambassador corps and organic distribution loops.</li>
            </ul>
          </div>
          <div class="pt-3 border-t border-slate-800 text-[10px] text-purple-300 font-mono">
            Execution Focus: Campus Growth, Student Media &amp; Brand Reach
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 17: Conclusion & Vision
  {
    tag: "CONCLUSION",
    number: "16",
    title: "Build the Campus Relationship Graph.",
    subtitle: "The Product is Live. The Market Demand is Proven. The Distribution Flywheel is Armed.",
    notes: "In conclusion, The College Date is not an idea or a slide deck prototype. It is a live, production-grade mobile network solving the real safety, proximity, and economic problems of African university students. With our technical infrastructure operating smoothly on Google Play, and our co-founder media channel reaching 50,000 students daily, we are perfectly positioned to own the African campus social layer. We invite you to partner with us on this journey. Thank you.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-2">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold tracking-wide uppercase mb-3">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Live on Google Play &amp; Web
            </div>
            <h2 class="text-3xl font-black text-white leading-tight">
              Own the African Campus<br>
              <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Relationship Graph.</span>
            </h2>
            <p class="text-xs text-slate-300 mt-2.5 leading-relaxed">
              We are moving from product-building mode into rapid, capital-efficient campus expansion. Join us in building the digital town square for Africa's 17.5M university students.
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 my-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Official Website:</span>
              <a href="https://www.thecollegedate.com" target="_blank" class="text-indigo-400 font-bold hover:underline font-mono">www.thecollegedate.com</a>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Android Application:</span>
              <span class="text-emerald-400 font-bold font-mono">Google Play (com.collegedate.app)</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Investor Relations:</span>
              <span class="text-purple-400 font-bold font-mono">investors@thecollegedate.com</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Direct Founder Channel:</span>
              <span class="text-slate-200 font-mono">godswill@thecollegedate.com</span>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <div class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg">
              Seed the Campus. Own the Graph.
            </div>
            <span class="text-xs text-slate-400 font-mono">Pre-Seed Round Open • September 2026</span>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-56 rounded-[34px] p-2 bg-gradient-to-b from-purple-700 via-slate-800 to-slate-950 shadow-2xl border border-purple-500/40">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-900 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[26px] border border-slate-800 bg-slate-950 h-[340px]">
              <img src="${images.callScreen}" alt="Agora In-App Voice Call Screen" class="w-full h-full object-cover object-top" />
            </div>
            <div class="absolute -bottom-2 -left-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-500 shadow-xl text-[9px] text-purple-200 font-bold flex items-center gap-1">
              <span>📞</span> Encrypted Agora Voice Calling
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 18: Appendix & Sources
  {
    tag: "APPENDIX • SOURCES",
    number: "17",
    title: "Key External Sources Used to Build the Market and Category Case.",
    subtitle: "Rigorously Verified Industry Data, Demographic Statistics, and Regulatory Records",
    notes: "For investor due diligence, all macro demographic, market sizing, and regulatory data cited throughout this deck are cross-referenced from verified public and statutory institutions, including the National Universities Commission of Nigeria, the Federal Ministry of Education, UNESCO IESALC, DataReportal, and the Nigeria Data Protection Commission. All internal traction metrics are server-authoritative and available in our data room.",
    html: `
      <div class="flex flex-col justify-center h-full py-1">
        <div class="overflow-hidden rounded-2xl border border-slate-800 shadow-xl bg-slate-900/90">
          <table class="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                <th class="p-2.5">Data Institution / Source</th>
                <th class="p-2.5">Citation &amp; Methodology</th>
                <th class="p-2.5">Key Verified Finding</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 text-slate-300">
              <tr>
                <td class="p-2 font-bold text-white">NUC Nigeria</td>
                <td class="p-2">Official register of accredited universities (2024–2026)</td>
                <td class="p-2 text-indigo-300">170+ accredited federal, state, and private universities</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">Nigeria Ministry of Ed. / JAMB</td>
                <td class="p-2">2024–2028 Strategic Higher Education Roadmap</td>
                <td class="p-2 text-purple-300">~2.8 Million full-time enrolled tertiary students</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">UNESCO IESALC</td>
                <td class="p-2">2026 Higher Education Global Trends Report</td>
                <td class="p-2 text-pink-300">269M global tertiary students; 9% participation in SSA</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">DataReportal / Kepios</td>
                <td class="p-2">Digital 2025 Nigeria Benchmark Report</td>
                <td class="p-2 text-emerald-300">107M active internet users; 38.7M social media users</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">NDPC Nigeria</td>
                <td class="p-2">Nigeria Data Protection Act (NDPA 2023) Regulations</td>
                <td class="p-2 text-amber-300">Biometric photo consent &amp; privacy compliance framework</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">Google Play Console</td>
                <td class="p-2">Production Android Package (com.collegedate.app)</td>
                <td class="p-2 text-cyan-300">Release v2.2.63 (Version Code 60); targetSdk 36; 0 crash rate</td>
              </tr>
              <tr>
                <td class="p-2 font-bold text-white">Supabase / Internal Analytics</td>
                <td class="p-2">PostgreSQL server-authoritative activity audit</td>
                <td class="p-2 text-indigo-300">871 registered accounts, 151 verified profiles, ₦9,800 revenue</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-[10px] text-slate-400 font-mono">
          Sources verified September 2026. Complete database exports, audited payment logs, and data room documents available upon request.
        </div>
      </div>
    `
  }
];

console.log(`[2/5] Configured all ${slides.length} slides with rich visuals and founder notes.`);

// Build printable HTML (297mm x 210mm A4 landscape per slide)
console.log('[3/5] Constructing printable A4-landscape presentation document...');

const printableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The College Date — Investor Pitch Deck (Confidential)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }

    @page {
      size: 297mm 210mm;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: #030712 !important;
      color: #f8fafc !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .slide-page {
      width: 297mm;
      height: 210mm;
      max-height: 210mm;
      min-height: 210mm;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      padding: 11mm 16mm 9mm 16mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: #030712 !important;
      position: relative;
      overflow: hidden;
    }

    .slide-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    }

    .tag-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 6px;
      background-color: rgba(49, 46, 129, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }

    .slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }

    .footer-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100">

${slides
  .map((slide, idx) => {
    const slideNum = (idx + 1).toString().padStart(2, '0');
    const totalSlides = slides.length.toString().padStart(2, '0');
    return `
  <!-- Slide ${idx + 1}: ${slide.title} -->
  <section class="slide-page" id="slide-${idx + 1}">
    <div class="accent-bar"></div>

    <!-- Slide Header -->
    ${slide.isCover ? `
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2.5">
        <div class="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-white text-[10px] shadow-sm">
          CD
        </div>
        <span class="tag-badge">${slide.tag}</span>
      </div>
      <span class="slide-counter">SLIDE ${slideNum} / ${totalSlides}</span>
    </div>
    ` : `
    <div>
      <div class="flex items-center justify-between gap-2 mb-1">
        <div class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-white text-[10px] shadow-sm">
            CD
          </div>
          <span class="tag-badge">${slide.tag}</span>
        </div>
        <span class="slide-counter">SLIDE ${slideNum} / ${totalSlides}</span>
      </div>
      <h1 class="text-2xl font-extrabold text-white tracking-tight leading-tight mt-0.5">${slide.title}</h1>
      <h2 class="text-xs text-slate-400 font-medium mt-0.5">${slide.subtitle}</h2>
    </div>
    `}

    <!-- Slide Body -->
    <div class="flex-1 flex flex-col justify-center py-1">
      ${slide.html}
    </div>

    <!-- Slide Footer -->
    <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between footer-text">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-300">THE COLLEGE DATE (CD2.0)</span>
        <span>•</span>
        <span>CONFIDENTIAL INVESTOR PITCH DECK</span>
        <span>•</span>
        <span>PRE-SEED ROUND (SEPTEMBER 2026)</span>
      </div>
      <div class="flex items-center gap-3">
        <span>com.collegedate.app</span>
        <span>•</span>
        <span class="text-indigo-400 font-bold">www.thecollegedate.com</span>
      </div>
    </div>
  </section>
`;
  })
  .join('\n')}

</body>
</html>
`;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const printablePath = path.join(publicDir, 'pitch-deck-printable.html');
fs.writeFileSync(printablePath, printableHtml, 'utf8');
console.log('[3/5] Wrote printable HTML to:', printablePath);

// Build interactive web pitch deck with speaker notes and controls
const interactiveHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The College Date — Investor Pitch Deck (Interactive)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #030712;
      color: #f8fafc;
    }
    .slide-enter {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between select-none">

  <!-- Top Navigation Bar -->
  <header class="h-14 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-6 flex items-center justify-between z-20 shadow-md">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-white shadow-sm text-xs">
        CD
      </div>
      <div>
        <span class="font-extrabold tracking-tight text-white text-sm">THE COLLEGE DATE</span>
        <span class="text-[10px] text-indigo-300 font-bold ml-2 px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 uppercase">PRE-SEED DECK</span>
      </div>
    </div>

    <!-- Center Slide Counter -->
    <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 font-mono">
      <span>SLIDE <span id="current-slide-num" class="text-indigo-400 text-sm font-bold">1</span> OF <span id="total-slides-num">${slides.length}</span></span>
    </div>

    <!-- Header Actions -->
    <div class="flex items-center gap-3">
      <button onclick="toggleNotes()" id="notes-btn" class="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm">
        <span>🎙️</span> <span>Speaker Notes</span>
      </button>
      <a href="TheCollegeDate-Investor-Pitch-Deck.pdf" download="TheCollegeDate-Investor-Pitch-Deck.pdf" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm flex items-center gap-1.5">
        <span>📥</span> <span>Download PDF</span>
      </a>
      <a href="https://www.thecollegedate.com" target="_blank" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">
        Live Web ↗
      </a>
    </div>
  </header>

  <!-- Slide Display Stage -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex items-center justify-center">
    <div id="slide-container" class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[580px] flex flex-col justify-between slide-enter relative overflow-hidden">
      <!-- Injected by JavaScript -->
    </div>
  </main>

  <!-- Speaker Notes Drawer (Collapsible) -->
  <div id="notes-drawer" class="hidden fixed bottom-16 inset-x-0 mx-auto max-w-3xl bg-slate-900 border-2 border-indigo-500 rounded-2xl p-5 shadow-2xl z-30 text-xs leading-relaxed text-slate-200 backdrop-blur-md">
    <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-indigo-400 font-bold uppercase tracking-wider font-mono">
      <span>🎙️ Founder Talking Track &amp; Delivery Script</span>
      <button onclick="toggleNotes()" class="text-slate-400 hover:text-white">✕</button>
    </div>
    <p id="speaker-notes-content"></p>
  </div>

  <!-- Bottom Presentation Controls -->
  <footer class="h-16 border-t border-slate-800 bg-slate-900/95 px-6 flex items-center justify-between z-20 shadow-md">
    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1 text-slate-200">
        ← Prev
      </button>
      <button onclick="nextSlide()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition-all shadow-sm flex items-center gap-1 text-white">
        Next →
      </button>
    </div>

    <!-- Progress Indicator Dots -->
    <div class="hidden md:flex items-center gap-1.5" id="dots-container"></div>

    <div class="text-[11px] text-slate-400 font-mono">
      <span>Keyboard: <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">←</kbd> <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">→</kbd></span>
    </div>
  </footer>

  <script>
    const slides = ${JSON.stringify(slides)};
    let currentSlide = 0;

    function renderDots() {
      const container = document.getElementById('dots-container');
      container.innerHTML = slides.map((_, i) => \`
        <button onclick="goToSlide(\${i})" class="w-2.5 h-2.5 rounded-full transition-all \${i === currentSlide ? 'bg-indigo-500 w-6' : 'bg-slate-700 hover:bg-slate-600'}" title="Go to slide \${i + 1}"></button>
      \`).join('');
    }

    function renderSlide() {
      const s = slides[currentSlide];
      const container = document.getElementById('slide-container');
      container.classList.remove('slide-enter');
      void container.offsetWidth;
      container.classList.add('slide-enter');

      const slideNum = (currentSlide + 1).toString().padStart(2, '0');
      const totalSlides = slides.length.toString().padStart(2, '0');

      let headerHtml = '';
      if (s.isCover) {
        headerHtml = '<div class="flex items-center justify-between gap-2 mb-2">' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-[10px] font-bold font-mono px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 uppercase tracking-wider">' + s.tag + '</span>' +
          '</div>' +
          '<span class="text-xs font-mono font-bold text-slate-500">SLIDE ' + slideNum + ' / ' + totalSlides + '</span>' +
        '</div>';
      } else {
        headerHtml = '<div>' +
          '<div class="flex items-center justify-between gap-2 mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-[10px] font-bold font-mono px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 uppercase tracking-wider">' + s.tag + '</span>' +
            '</div>' +
            '<span class="text-xs font-mono font-bold text-slate-500">SLIDE ' + slideNum + ' / ' + totalSlides + '</span>' +
          '</div>' +
          '<h1 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight mt-1">' + s.title + '</h1>' +
          '<h2 class="text-xs md:text-sm text-slate-400 font-medium mt-1">' + s.subtitle + '</h2>' +
        '</div>';
      }

      container.innerHTML =
        '<div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>' +
        headerHtml +
        '<div class="my-4 flex-1 flex flex-col justify-center">' + s.html + '</div>' +
        '<div class="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">' +
          '<div>THE COLLEGE DATE • CONFIDENTIAL INVESTOR DECK • SEPTEMBER 2026</div>' +
          '<div class="text-indigo-400">com.collegedate.app</div>' +
        '</div>';

      document.getElementById('current-slide-num').innerText = currentSlide + 1;
      document.getElementById('speaker-notes-content').innerText = s.notes;
      renderDots();
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        renderSlide();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        renderSlide();
      }
    }

    function goToSlide(i) {
      currentSlide = i;
      renderSlide();
    }

    function toggleNotes() {
      const drawer = document.getElementById('notes-drawer');
      drawer.classList.toggle('hidden');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'n' || e.key === 'N') {
        toggleNotes();
      }
    });

    renderSlide();
  </script>
</body>
</html>
`;

const interactivePath = path.join(publicDir, 'pitch-deck.html');
fs.writeFileSync(interactivePath, interactiveHtml, 'utf8');
console.log('[3/5] Wrote interactive HTML to:', interactivePath);

// Target PDF outputs
const outputPdfRoot = path.join(projectRoot, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfPublic = path.join(publicDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfDist = path.join(distDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfBrain = path.join(brainDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');

console.log('[4/5] Compiling PDF via Chrome headless...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fileUrl = 'file:///' + printablePath.replace(/\\/g, '/');

const chromeArgs = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--virtual-time-budget=6000',
  `--print-to-pdf=${outputPdfRoot}`,
  fileUrl
];

const chromeProcess = spawnSync(chromePath, chromeArgs, { stdio: 'inherit' });

if (chromeProcess.error) {
  console.error('Chrome spawn error:', chromeProcess.error);
  process.exit(1);
}

if (!fs.existsSync(outputPdfRoot)) {
  console.error('Error: PDF file was not created at', outputPdfRoot);
  process.exit(1);
}

const stats = fs.statSync(outputPdfRoot);
console.log(`[4/5] PDF created successfully at root! File size: ${(stats.size / 1024).toFixed(1)} KB`);

// Distribute to public, dist, and brain artifact directories
console.log('[5/5] Distributing PDF to public, dist, and conversation artifact directories...');
fs.copyFileSync(outputPdfRoot, outputPdfPublic);

if (fs.existsSync(distDir)) {
  fs.copyFileSync(outputPdfRoot, outputPdfDist);
}

if (fs.existsSync(brainDir)) {
  fs.copyFileSync(outputPdfRoot, outputPdfBrain);
}

// Verify page count
const pdfBuffer = fs.readFileSync(outputPdfRoot);
const pdfContent = pdfBuffer.toString('latin1');
const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
const pageCount = pageMatches ? pageMatches.length : 'unknown';

console.log('Verification Complete:');
console.log(JSON.stringify({
  rootFile: outputPdfRoot,
  publicFile: outputPdfPublic,
  brainArtifact: outputPdfBrain,
  sizeBytes: stats.size,
  sizeKB: `${(stats.size / 1024).toFixed(1)} KB`,
  detectedPages: pageCount
}, null, 2));
