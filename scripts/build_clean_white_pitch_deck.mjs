import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const assetsDir = path.join(publicDir, 'pitch-deck-assets');

const brainDir = path.resolve(
  process.env.USERPROFILE || 'C:/Users/DELL',
  '.gemini/antigravity/brain/3ea16d0b-a418-4a5d-9859-b3f3d44c905a'
);

console.log('[1/4] Encoding visual screenshot assets to base64 data URIs...');

function toBase64Uri(filename) {
  const filePath = path.join(assetsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.error('Error: Asset not found at', filePath);
    process.exit(1);
  }
  const ext = path.extname(filename).replace('.', '') || 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${data}`;
}

const images = {
  heroMatch: toBase64Uri('hero_match.png'),
  chatInbox: toBase64Uri('chat_inbox.png'),
  chatTray: toBase64Uri('chat_tray.png'),
  voiceCall: toBase64Uri('voice_call.png'),
  giftStore: toBase64Uri('gift_store.png'),
  walletPage: toBase64Uri('wallet_page.png'),
  reportModal: toBase64Uri('report_modal.png'),
  locationModal: toBase64Uri('location_modal.png'),
  confessions: toBase64Uri('confessions.png'),
  godswill: toBase64Uri('founder_godswill.jpg'),
  sokepirim: toBase64Uri('cofounder_sokepirim.png')
};

console.log('[1/4] All 11 visual assets verified and encoded to base64.');

// 16 Slides with Clean White Background, Zero Purple, and High-Contrast Typography
const slides = [
  // SLIDE 1: Cover / Executive Overview
  {
    tag: "EXECUTIVE SUMMARY",
    title: "The Campus Social & Micro-Economy Network",
    subtitle: "Connecting 2.1 Million Nigerian Students Through Hyperlocal Trust & Peer Commerce",
    isCover: true,
    notes: "Good morning. I am Godswill Godlife Onah, founder and architect of The College Date. There are over 2.1 million full-time university students in Nigeria. They are the most digitally active youth cohort in Africa, yet their campus social lives are broken by scams, catfishing, and expensive data usage on Western apps. We built The College Date: an ultra-lean 10MB mobile ecosystem that turns campus discovery into real student trust and peer income. Our production Android app is hardened, signed, and ready for commercial rollout.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 flex flex-col justify-between h-full py-1">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold tracking-wide uppercase mb-3">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Play Release 2.2.48 • Verified Pre-Seed
            </div>
            <h1 class="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              The Campus Social &amp;<br>
              <span class="text-blue-600">Micro-Economy Network</span>
            </h1>
            <p class="text-xs text-slate-600 font-medium mt-2 leading-relaxed max-w-xl">
              Global dating apps fail African campuses. The College Date delivers verified student discovery, low-latency Agora calls, and an integrated student economy where students earn through cultural gifts and academic freelance escrow.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 my-3">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
              <div class="text-xl font-black text-blue-600">2.1M+</div>
              <div class="text-[10px] font-bold text-slate-900 uppercase mt-0.5">Target Undergrads</div>
              <div class="text-[9.5px] text-slate-500">Across 170+ accredited Nigerian universities</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
              <div class="text-xl font-black text-slate-800">10.09 MB</div>
              <div class="text-[10px] font-bold text-slate-900 uppercase mt-0.5">Ultra-Lean Bundle</div>
              <div class="text-[9.5px] text-slate-500">Runs smoothly on low-cost 3G/4G phones</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
              <div class="text-xl font-black text-emerald-600">Production Ready</div>
              <div class="text-[10px] font-bold text-slate-900 uppercase mt-0.5">Signed Release AAB</div>
              <div class="text-[9.5px] text-slate-500">Version Code 44/45 physically QA verified</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
              <div class="text-xl font-black text-amber-600">$150,000 USD</div>
              <div class="text-[10px] font-bold text-slate-900 uppercase mt-0.5">Pre-Seed Target</div>
              <div class="text-[9.5px] text-slate-500">18-month runway to 50k students &amp; breakeven</div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Founders: <strong class="text-slate-800">Godswill Godlife Onah</strong> &amp; <strong class="text-slate-800">SOKEPIRIM Jackreece</strong></span>
            <span class="font-mono text-blue-600 font-bold">www.thecollegedate.com</span>
          </div>
        </div>

        <div class="col-span-5 flex justify-center items-center">
          <div class="relative w-52 rounded-[32px] p-2 bg-slate-900 shadow-xl border-2 border-slate-800">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-950 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[24px] bg-slate-950 h-[330px] w-full">
              <img src="${images.heroMatch}" alt="College Date Live App" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="absolute -bottom-2.5 -left-3 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-md text-[9px] text-slate-800 font-bold flex items-center gap-1">
              <span class="text-blue-600 font-bold">✦</span> Live Android Discovery
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 2: The Problem
  {
    tag: "THE PROBLEM",
    title: "Mainstream Apps Fail African Campuses",
    subtitle: "4 Structural Realities Why Tinder, Bumble & Generic Apps Break in Higher Education",
    notes: "Tinder and Bumble were built for working professionals in London and New York. On an African campus, when a student opens Tinder, they get matched with someone 40 miles away across Lagos traffic, run into scammers, and burn expensive mobile data on an 85MB app. Campuses are dense, closed communities of 30,000 to 50,000 students. They need campus-first trust and tools adapted to student economic reality.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-2.5">
          <div class="p-3 rounded-xl bg-red-50/70 border border-red-200 shadow-sm">
            <div class="flex items-center gap-2 text-red-700 font-bold text-xs">
              <span class="p-1 rounded bg-red-100 text-[10px]">⚠️</span>
              1. Rampant Catfishing &amp; Safety Paralyzation
            </div>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Anonymous, unverified accounts create extortion risks and fake profiles. Over 70% of female university students report feeling unsafe on open, generalist dating platforms.
            </p>
          </div>

          <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200 shadow-sm">
            <div class="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <span class="p-1 rounded bg-amber-100 text-[10px]">📶</span>
              2. Crippling Cellular Data &amp; Battery Overhead
            </div>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Western apps are 85MB–120MB data hogs built for Western 5G. Students paying ₦1,500/GB cannot afford constant background tracking and oversized mobile binaries.
            </p>
          </div>

          <div class="p-3 rounded-xl bg-blue-50/70 border border-blue-200 shadow-sm">
            <div class="flex items-center gap-2 text-blue-800 font-bold text-xs">
              <span class="p-1 rounded bg-blue-100 text-[10px]">📍</span>
              3. Zero Hyperlocal Campus Proximity
            </div>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Swiping across a 50-mile city radius matches students with distant strangers across horrible traffic, rather than peers walking across their actual faculty, library, or hostel quad.
            </p>
          </div>

          <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm">
            <div class="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <span class="p-1 rounded bg-emerald-100 text-[10px]">💸</span>
              4. Trapped Student Hustle &amp; Unmonetized Peer Talents
            </div>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Students have valuable freelance skills (tutoring, design, assignments) and romantic appreciation, but zero escrow-protected peer rails to transact safely without scam risks.
            </p>
          </div>
        </div>

        <div class="col-span-5 flex flex-col justify-between h-full py-1">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-md">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 font-mono">The Campus Reality In Numbers</div>
            <div class="space-y-3">
              <div>
                <div class="text-3xl font-black text-red-600">70%</div>
                <div class="text-[11px] text-slate-600 font-medium">Female undergrads fearful of meeting unverified strangers</div>
              </div>
              <div class="pt-2 border-t border-slate-200">
                <div class="text-2xl font-black text-amber-600">120 MB vs 10 MB</div>
                <div class="text-[11px] text-slate-600 font-medium">Incumbent app weight vs College Date data-sparing binary</div>
              </div>
              <div class="pt-2 border-t border-slate-200">
                <div class="text-2xl font-black text-blue-600">50 Miles vs 500m</div>
                <div class="text-[11px] text-slate-600 font-medium">Generic citywide mismatch vs walkable campus quad discovery</div>
              </div>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-[10.5px] text-slate-600 leading-relaxed text-center italic">
            "Campuses are dense micro-cities of 30,000+ students with unique cultural codes. Global apps ignore their realities."
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 3: The Solution
  {
    tag: "THE SOLUTION",
    title: "The College Date: A High-Trust Sanctuary",
    subtitle: "Built Specifically Around African Campus Demographics, Infrastructure & Culture",
    notes: "We solved this by creating a closed, high-trust digital campus. Every profile belongs to a student. Photos are validated by AI to ensure every user is a real person. And most importantly, we turned social connection into peer economic empowerment: students can send cultural gifts that cash out as real money into student bank accounts, or safely hire classmates for tutoring.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-4 flex justify-center">
          <div class="relative w-52 rounded-[32px] p-2 bg-slate-900 shadow-xl border-2 border-slate-800">
            <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-950 rounded-full z-10"></div>
            <div class="overflow-hidden rounded-[24px] bg-slate-950 h-[330px] w-full">
              <img src="${images.heroMatch}" alt="Match Discovery" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
        </div>

        <div class="col-span-8 grid grid-cols-2 gap-3.5">
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold mb-1.5 text-xs">
              🎓
            </div>
            <h3 class="text-xs font-bold text-slate-900">Closed Campus Boundaries</h3>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Geofenced to accredited institutions (UNILAG, UI, UNIPORT, RSU). Discovery is instant, hyper-local, and relevant to the student's actual physical campus.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold mb-1.5 text-xs">
              🛡️
            </div>
            <h3 class="text-xs font-bold text-slate-900">Vision AI Profile Gate</h3>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Automated AI face validation ensures candidate pictures contain exactly one genuine human face. Cars, memes, anime, and group photos are blocked before upload.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold mb-1.5 text-xs">
              ⚡
            </div>
            <h3 class="text-xs font-bold text-slate-900">10MB Ultra-Lean Binary</h3>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Engineered for low-cost Android hardware and cellular efficiency. Sub-second load times on 3G/4G networks with client-side caching.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold mb-1.5 text-xs">
              🤝
            </div>
            <h3 class="text-xs font-bold text-slate-900">Integrated Micro-Economy</h3>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Cultural virtual gifting (80% cashout to student bank accounts) and escrow-protected academic tutoring deals (5% platform fee).
            </p>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 4: Market Sizing
  {
    tag: "MARKET OPPORTUNITY",
    title: "Market Sizing: Grounded in First Principles",
    subtitle: "Demographic Reality Reconstructed from NUC & NBS Higher-Education Census",
    notes: "Let's be completely rigorous with the numbers. In Nigeria, there are 2.1 million accredited university undergraduates. The average student receives between ₦25,000 and ₦45,000 a month in pocket money. After food and transit, students spend ₦3,000 to ₦6,000 a month on data, airtime, and entertainment. That is a $56.7 million addressable annual spend in Nigeria alone. In our initial 10-campus beachhead of 350,000 students, capturing 15% penetration represents nearly ₦600 million in annual platform transaction volume.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-8 space-y-3.5">
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <span class="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">TAM • SUB-SAHARAN AFRICA HIGHER ED</span>
              <div class="text-2xl font-black text-slate-900 mt-0.5">$367.5M USD / Year</div>
              <div class="text-[11px] text-slate-600 mt-0.5">10.5M tertiary students across 11 nations @ $35/student/year social &amp; discretionary spend.</div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold">10.5M Students</span>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex justify-between items-center shadow-sm">
            <div>
              <span class="text-[9.5px] font-bold text-blue-700 uppercase tracking-widest font-mono">SAM • NIGERIAN ACCREDITED UNDERGRADS</span>
              <div class="text-2xl font-black text-blue-900 mt-0.5">$56.7M USD (₦85.05 Billion NGN)</div>
              <div class="text-[11px] text-slate-700 mt-0.5">2.1M full-time undergrads @ ₦4,500 ($3/mo) social discretionary budget × 9 academic months.</div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-white border border-blue-300 text-blue-800 font-mono text-xs font-bold">2.1M Students</span>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <span class="text-[9.5px] font-bold text-amber-700 uppercase tracking-widest font-mono">SOM • 10-CAMPUS LAUNCH BEACHHEAD</span>
              <div class="text-2xl font-black text-slate-900 mt-0.5">₦590.6M NGN ($393,750 USD) Annual GMV</div>
              <div class="text-[11px] text-slate-600 mt-0.5">350,000 student pool @ 15% penetration (52,500 users) spending ₦1,250/mo on platform.</div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 rounded bg-white border border-slate-300 text-amber-800 font-mono text-xs font-bold">52.5K Students</span>
            </div>
          </div>

          <div class="text-[9.5px] text-slate-500 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono">
            *Source: Verified enrollments from National Universities Commission (NUC 2024 Directory) &amp; National Bureau of Statistics (NBS) Youth Budget Survey.
          </div>
        </div>

        <div class="col-span-4 flex flex-col justify-center h-full">
          <div class="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-md">
            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Average Student Budget</div>
            <div class="space-y-2.5">
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div class="text-[10px] text-slate-500">Monthly Pocket Money</div>
                <div class="text-base font-extrabold text-slate-900">₦35,000 – ₦50,000</div>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div class="text-[10px] text-slate-500">Airtime &amp; Data Discretionary</div>
                <div class="text-base font-extrabold text-blue-600">₦4,500 / month</div>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div class="text-[10px] text-slate-500">Target Platform Share</div>
                <div class="text-base font-extrabold text-emerald-600">27.7% (₦1,250/mo)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 5: Core Product Experience
  {
    tag: "PRODUCT SHOWCASE",
    title: "The Campus Social Trifecta",
    subtitle: "Discovery, WhatsApp-Grade Chat & Agora RTC Low-Latency Calling",
    notes: "Our product is tailored for how African students actually communicate. Our chat features a WhatsApp-style tray that supports assignment PDFs, ephemeral view-once media, and real-time live location sharing for safe first dates. Agora RTC powers low-latency calls with automatic avatar fallback when cameras are turned off. And our Confessions Wall is a viral engagement driver where students share unfiltered campus news and banter.",
    html: `
      <div class="grid grid-cols-3 gap-6 items-center h-full">
        <!-- Phone 1: Campus Messages Inbox -->
        <div class="flex flex-col items-center">
          <div class="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 font-mono">1. Campus Messages Inbox</div>
          <div class="w-44 rounded-[26px] p-1.5 bg-slate-900 border-2 border-slate-800 shadow-xl">
            <div class="overflow-hidden rounded-[20px] h-[300px] bg-slate-950 w-full">
              <img src="${images.chatInbox}" alt="Campus Messages Inbox" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
          <div class="text-[10px] text-slate-600 text-center mt-1.5 font-mono">
            Peer messaging with unread &amp; match filters
          </div>
        </div>

        <!-- Phone 2: WhatsApp Chat -->
        <div class="flex flex-col items-center">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 font-mono">2. WhatsApp-Grade Sheet</div>
          <div class="w-44 rounded-[26px] p-1.5 bg-slate-900 border-2 border-slate-800 shadow-xl">
            <div class="overflow-hidden rounded-[20px] h-[300px] bg-slate-950 w-full">
              <img src="${images.chatTray}" alt="WhatsApp Attachment Sheet" class="w-full h-full object-cover object-bottom block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
          <div class="text-[10px] text-slate-600 text-center mt-1.5 font-mono">
            Media, PDF slides, Escrow &amp; AI Assist
          </div>
        </div>

        <!-- Phone 3: Agora Calling -->
        <div class="flex flex-col items-center">
          <div class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5 font-mono">3. Low-Latency Calling</div>
          <div class="w-44 rounded-[26px] p-1.5 bg-slate-900 border-2 border-slate-800 shadow-xl">
            <div class="overflow-hidden rounded-[20px] h-[300px] bg-slate-950 w-full">
              <img src="${images.voiceCall}" alt="Agora RTC Call" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
          <div class="text-[10px] text-slate-600 text-center mt-1.5 font-mono">
            Agora audio &amp; camera-off avatar stage
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 6: Safety & Trust Architecture
  {
    tag: "SAFETY & VERIFICATION",
    title: "Trust, Safety & Verification Architecture",
    subtitle: "Multi-Layered Protection: Vision AI Gating, Confidential Reports & Live GPS Meetup Shield",
    notes: "Safety is our primary competitive moat. Unlike generalist dating apps where anyone can upload a cartoon or celebrity picture, College Date verifies profile authenticity through a multi-layered security architecture: server-authoritative Vision AI photo validation preventing non-human images, in-app confidential reporting with automatic mutual match severance, native live GPS location sharing for safe in-person campus meetups, and on-device biometric authentication.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-3.5">
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1 font-mono">Two-Stage Vision AI Photo Promotion Lifecycle</div>
            <div class="flex items-center gap-2 text-[11px] text-slate-700 font-mono">
              <span class="p-1 rounded bg-slate-100 border border-slate-200">Upload</span> →
              <span class="p-1 rounded bg-amber-50 text-amber-800 border border-amber-200">pending-avatars</span> →
              <span class="p-1 rounded bg-blue-50 text-blue-800 border border-blue-200">AI Check</span> →
              <span class="p-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">profile-photos</span>
            </div>
            <p class="text-[10.5px] text-slate-600 mt-1.5 leading-relaxed">
              Zero-overwrite safety: candidate pictures stay in isolated staging. Active profile avatar remains 100% untouched until approved by Vision AI.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-red-50/70 border border-red-200 shadow-sm">
              <div class="text-xs font-bold text-red-700 uppercase font-mono">Confidential Reporting</div>
              <p class="text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                Categorized abuse reporting with automatic mutual block &amp; chat suppression via DB triggers.
              </p>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-sm">
              <div class="text-xs font-bold text-emerald-700 uppercase font-mono">Live GPS Location</div>
              <p class="text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                15m, 30m, 1h battery-throttled GPS sharing for verified, safe physical campus dates.
              </p>
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
            <span><strong>Biometric Protection:</strong> Fingerprint &amp; Face Unlock re-authentication on native devices.</span>
            <span class="text-blue-700 font-mono font-bold">Capacitor Native</span>
          </div>
        </div>

        <div class="col-span-5 flex justify-center gap-3">
          <!-- Evidence 1: In-App Report -->
          <div class="w-36 rounded-2xl p-1.5 bg-slate-900 border border-slate-700 shadow-lg">
            <div class="overflow-hidden rounded-xl h-[280px] bg-slate-950 w-full">
              <img src="${images.reportModal}" alt="In-App Report & Auto-Block" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="text-[9px] text-red-400 font-bold text-center mt-1 font-mono">🛡️ Report &amp; Auto-Block</div>
          </div>

          <!-- Evidence 2: Live Location -->
          <div class="w-36 rounded-2xl p-1.5 bg-slate-900 border border-slate-700 shadow-lg">
            <div class="overflow-hidden rounded-xl h-[280px] bg-slate-950 w-full">
              <img src="${images.locationModal}" alt="Live GPS Location Sharing" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="text-[9px] text-emerald-400 font-bold text-center mt-1 font-mono">📍 Live GPS Meetup</div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 7: The Campus Micro-Economy
  {
    tag: "MONETIZATION ENGINE",
    title: "The Campus Micro-Economy",
    subtitle: "Turning Social Appreciation & Peer Skills into Real Student Income",
    notes: "Dating apps traditionally rely on one thing: charging desperate users for more swipes. We created a real economy. In Nigeria, campus appreciation is expressed through treats: a cold Zobo, hot suya, or airtime. Students buy CD Coins and send these digital gifts directly in chat. The recipient gets 80% of the cash value deposited into their wallet, and College Date retains a 20% gross spread. On top of that, students hire classmates for tutoring and campus services using our built-in escrow ledger, where we take a 5% fee on every completed deal.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-7 space-y-3.5">
          <!-- Gifting -->
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono">1. Cultural Virtual Gifting (80/20)</span>
              <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">20% Margin</span>
            </div>
            <p class="text-[11px] text-slate-600 leading-relaxed mb-1.5">
              Students buy CD Coins to send campus-favorite treats: <em>Digital Rose (20c)</em>, <em>Cold Zobo (20c)</em>, <em>Hot Suya (50c)</em>, <em>Airtime (100c)</em>, <em>Bouquet (200c)</em>, and <em>Royal Crown (500c)</em>.
            </p>
            <div class="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[10.5px] text-blue-900">
              <strong>Split:</strong> 80% converted to real Naira in recipient student wallet; 20% platform margin + breakage.
            </div>
          </div>

          <!-- Escrow -->
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider font-mono">2. Academic Freelance Escrow (5%)</span>
              <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">5% Take Rate</span>
            </div>
            <p class="text-[11px] text-slate-600 leading-relaxed mb-1.5">
              Students hire peers for tutoring, assignment formatting, design, and campus errands directly in chat. Automated safety filter blocks academic cheating ("exam runz").
            </p>
            <div class="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[10.5px] text-emerald-900">
              <strong>Protection:</strong> Funds held in escrow until mutual completion; 5% deducted upon fund release.
            </div>
          </div>

          <div class="text-[10px] text-slate-500 p-1.5 rounded bg-slate-50 border border-slate-200 text-center font-mono">
            *Liquidity: Batch bank withdrawals processed weekly on Fridays (₦15,000 minimum threshold).
          </div>
        </div>

        <div class="col-span-5 flex justify-center gap-3">
          <div class="w-36 rounded-2xl p-1.5 bg-slate-900 border border-slate-800 shadow-lg">
            <div class="overflow-hidden rounded-xl h-[280px] bg-slate-950 w-full">
              <img src="${images.giftStore}" alt="Gift Store" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="text-[9px] text-amber-400 font-bold text-center mt-1 font-mono">🎁 Campus Gifts</div>
          </div>

          <div class="w-36 rounded-2xl p-1.5 bg-slate-900 border border-slate-800 shadow-lg">
            <div class="overflow-hidden rounded-xl h-[280px] bg-slate-950 w-full">
              <img src="${images.walletPage}" alt="Student Wallet" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="text-[9px] text-emerald-400 font-bold text-center mt-1 font-mono">💳 Student Wallet</div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 8: Business Model
  {
    tag: "BUSINESS MODEL",
    title: "Diversified Business Model",
    subtitle: "4 High-Margin Non-Advertising Revenue Streams",
    notes: "We have zero reliance on digital advertising. Our revenue model has four distinct engines. Committed students pay ₦2,900 a month for our Elite subscription to unlock admirers and unlimited swipes. Occasional users purchase a ₦500 Super Swipe or ₦1,000 Boost. High-intent admirers send virtual gifts where we make a 20% margin, and campus freelance deals generate a 5% transaction levy. Both Google Play IAP and Paystack local debit cards are fully integrated.",
    html: `
      <div class="space-y-4 h-full flex flex-col justify-between py-1">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left text-slate-700 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <thead class="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold tracking-wider font-mono">
              <tr>
                <th class="p-3">Revenue Channel</th>
                <th class="p-3">Pricing Structure</th>
                <th class="p-3">Target Student Cohort</th>
                <th class="p-3 text-right">Gross Margin</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr>
                <td class="p-3 font-semibold text-slate-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                  Tiered Subscriptions
                </td>
                <td class="p-3 text-blue-700 font-mono">₦2,900/mo • ₦7,200/qtr • ₦31,800/yr</td>
                <td class="p-3 text-slate-600">Active daters seeking unlimited swipes &amp; admirer unlocks</td>
                <td class="p-3 text-right text-emerald-600 font-bold font-mono">90%+</td>
              </tr>
              <tr>
                <td class="p-3 font-semibold text-slate-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-slate-700"></span>
                  Consumable Boosts
                </td>
                <td class="p-3 text-slate-800 font-mono">Super Swipe: ₦500 • 24h Boost: ₦1,000</td>
                <td class="p-3 text-slate-600">Students wanting instant priority spotlight visibility</td>
                <td class="p-3 text-right text-emerald-600 font-bold font-mono">90%+</td>
              </tr>
              <tr>
                <td class="p-3 font-semibold text-slate-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  Virtual Gifting Spread
                </td>
                <td class="p-3 text-amber-700 font-mono">20% retained take on ₦200–₦5,000 gifts</td>
                <td class="p-3 text-slate-600">High-intent admirers sending campus appreciation</td>
                <td class="p-3 text-right text-emerald-600 font-bold font-mono">20% Spread</td>
              </tr>
              <tr>
                <td class="p-3 font-semibold text-slate-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Freelance Escrow Take
                </td>
                <td class="p-3 text-emerald-700 font-mono">5% fee on completed deals (₦500–₦20,000)</td>
                <td class="p-3 text-slate-600">Peer tutors, researchers, campus freelancers</td>
                <td class="p-3 text-right text-emerald-600 font-bold font-mono">5% Levy</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div class="text-xl">💳</div>
            <div>
              <div class="text-xs font-bold text-slate-900">Dual Payment Gateway Redundancy</div>
              <div class="text-[10.5px] text-slate-600 mt-0.5">Google Play Billing (RevenueCat) + Paystack direct card fallback (Mastercard/Visa/Verve).</div>
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3">
            <div class="text-xl">🛡️</div>
            <div>
              <div class="text-xs font-bold text-emerald-800">Zero Advertising Dependency</div>
              <div class="text-[10.5px] text-slate-600 mt-0.5">100% user-funded marketplace economics. No spammy ad banners ruining student experience.</div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 9: Unit Economics
  {
    tag: "UNIT ECONOMICS",
    title: "Unit Economics & Campus ARPU",
    subtitle: "Low Data Overhead Meets Multi-Stream Student Monetization",
    notes: "Because of our grassroots campus distribution channels, our blended customer acquisition cost is just ₦350—less than 25 cents. When a paying user converts, they spend an average of ₦3,850 a month across subscriptions, boosts, and gifts. Even assuming a conservative 6% conversion rate, our blended monthly ARPU across all registered students is ₦231, against a server infrastructure cost of just ₦18 per user. That delivers a 5.2x LTV-to-CAC ratio with payback in under six weeks.",
    html: `
      <div class="space-y-4 h-full flex flex-col justify-between py-1">
        <div class="grid grid-cols-4 gap-3.5">
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Blended CAC</div>
            <div class="text-2xl font-black text-blue-600 mt-1">₦350</div>
            <div class="text-[10.5px] text-slate-600 mt-0.5 font-mono">$0.23 USD / User</div>
            <div class="text-[9.5px] text-slate-400 mt-1">Campus reps</div>
          </div>
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Paying ARPPU</div>
            <div class="text-2xl font-black text-slate-900 mt-1">₦3,850</div>
            <div class="text-[10.5px] text-slate-600 mt-0.5 font-mono">$2.56 USD / Month</div>
            <div class="text-[9.5px] text-slate-400 mt-1">Subs + Gifts + Boosts</div>
          </div>
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Server Cost / MAU</div>
            <div class="text-2xl font-black text-emerald-600 mt-1">₦18</div>
            <div class="text-[10.5px] text-slate-600 mt-0.5 font-mono">$0.012 USD / Month</div>
            <div class="text-[9.5px] text-slate-400 mt-1">Supabase Edge</div>
          </div>
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">LTV:CAC Ratio</div>
            <div class="text-2xl font-black text-amber-600 mt-1">5.2x</div>
            <div class="text-[10.5px] text-slate-600 mt-0.5 font-mono">₦1,848 Student LTV</div>
            <div class="text-[9.5px] text-slate-400 mt-1">&lt;45-day payback</div>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-mono">Cohort Economics &amp; Breakeven Threshold</div>
          <div class="grid grid-cols-3 gap-3 text-xs text-slate-600">
            <div>• <strong>Lifecycle:</strong> 8-month active session per academic year.</div>
            <div>• <strong>Conversion:</strong> Conservative 6% paying student conversion.</div>
            <div>• <strong>Blended ARPU:</strong> ₦231/mo ($0.15) across entire user base.</div>
          </div>
          <div class="pt-2 text-[11px] text-emerald-800 font-medium leading-relaxed border-t border-slate-200">
            <strong>Breakeven Target:</strong> At 50,000 active students and 3,000 subscribers, monthly platform run-rate reaches <strong>₦12.5M ($8,330 USD)</strong>, covering all server, team, and operational costs.
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 10: Go-To-Market
  {
    tag: "DISTRIBUTION FLYWHEEL",
    title: "Go-To-Market: The Ambassador & Media Moat",
    subtitle: "Zero-Dollar Customer Acquisition Through Co-Founder Community Assets",
    notes: "Dating apps that spend money on Facebook and Instagram ads die from infinite CAC. We don't acquire users that way. My co-founder, SOKEPIRIM Jackreece, already runs Official Students O'clock, a student news platform with over 50,000 daily active student followers on WhatsApp. In addition, we deploy 10 paid student ambassadors per campus—half of them female student leaders—who earn referral bounties. When you combine that with our anonymous Confessions Wall, which students constantly screenshot and repost to their WhatsApp status, our acquisition flywheel runs organically.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-8 grid grid-cols-2 gap-3.5">
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[10px] font-bold text-blue-700 uppercase mb-1 font-mono">1. Co-Founder Media Channel</div>
            <div class="text-xs font-bold text-slate-900 mb-1">Official Students O'clock</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Co-Founder SOKEPIRIM Jackreece reaches <strong>50,000+ daily student followers</strong> across university WhatsApp channels. Zero-cost instant broadcast from Day 1.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[10px] font-bold text-slate-800 uppercase mb-1 font-mono">2. 10-Campus Ambassador Corps</div>
            <div class="text-xs font-bold text-slate-900 mb-1">100 Student Leaders</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              10 reps per campus (50% female student leaders) across student union governments and faculty departments, incentivized with ₦500 referral bounties.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[10px] font-bold text-emerald-700 uppercase mb-1 font-mono">3. Freshers' Orientation Blitz</div>
            <div class="text-xs font-bold text-slate-900 mb-1">Matriculation Activation</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Launches timed to annual matriculation weeks, onboarding incoming freshmen when friend groups and campus networks are actively formed.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[10px] font-bold text-amber-700 uppercase mb-1 font-mono">4. Confessions Viral Loop</div>
            <div class="text-xs font-bold text-slate-900 mb-1">WhatsApp Status Reposts</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Relatable, unfiltered campus banter gets screenshotted and shared directly to students' WhatsApp Statuses, driving zero-CAC inbound app installs.
            </p>
          </div>
        </div>

        <div class="col-span-4 flex justify-center">
          <div class="w-44 rounded-[26px] p-1.5 bg-slate-900 border-2 border-slate-800 shadow-xl">
            <div class="overflow-hidden rounded-[20px] h-[300px] bg-slate-950 w-full">
              <img src="${images.confessions}" alt="Confessions Wall" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div class="text-[9.5px] text-slate-700 font-bold text-center mt-1 font-mono">🤫 Confessions Viral Wall</div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 11: Competitive Defensibility
  {
    tag: "COMPETITIVE MOAT",
    title: "Competitive Defensibility",
    subtitle: "Why Global Incumbents Cannot Compete on African Campuses",
    notes: "Why can't Tinder or Bumble crush us? Because they cannot adapt their global mass-market model to the physical realities of African universities. Tinder cannot integrate local Nigerian Verve debit cards, they cannot offer culturally resonant gifts like Suya and Zobo, they cannot shrink their 85MB app down to 10MB, and they cannot enforce campus-specific academic freelance escrow. We are not competing on global scale; we are winning on hyper-local trust, cultural resonance, and peer utility.",
    html: `
      <div class="space-y-4 h-full flex flex-col justify-between py-1">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left text-slate-700 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <thead class="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold tracking-wider font-mono">
              <tr>
                <th class="p-2.5">Feature / Dimension</th>
                <th class="p-2.5 text-blue-800 font-extrabold bg-blue-50">The College Date</th>
                <th class="p-2.5">Tinder / Bumble</th>
                <th class="p-2.5">Badoo</th>
                <th class="p-2.5">Campus WhatsApp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr>
                <td class="p-2 font-semibold text-slate-900">Verified Campus Boundaries</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ Native Geofence</td>
                <td class="p-2 text-red-600">❌ Citywide Only</td>
                <td class="p-2 text-red-600">❌ Citywide Only</td>
                <td class="p-2 text-amber-700">⚠️ Cluttered Groups</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">AI Single-Human Face Gate</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ Native Edge AI</td>
                <td class="p-2 text-red-600">❌ Basic Selfie</td>
                <td class="p-2 text-red-600">❌ Basic</td>
                <td class="p-2 text-red-600">❌ None</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">Cultural Gifts (Zobo / Suya)</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ Native CD Coins</td>
                <td class="p-2 text-red-600">❌ None</td>
                <td class="p-2 text-red-600">❌ Generic Credits</td>
                <td class="p-2 text-red-600">❌ None</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">Student Cashout (80% Split)</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ Direct Bank Payout</td>
                <td class="p-2 text-red-600">❌ No Cashout</td>
                <td class="p-2 text-red-600">❌ No Cashout</td>
                <td class="p-2 text-amber-700">⚠️ Manual Transfers</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">Freelance Escrow Protection</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ 5% Platform Fee</td>
                <td class="p-2 text-red-600">❌ No Escrow</td>
                <td class="p-2 text-red-600">❌ No Escrow</td>
                <td class="p-2 text-red-600">❌ Rampant Scams</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">Lean Binary Footprint</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ 10.09 MB</td>
                <td class="p-2 text-red-600">❌ 85MB–120MB</td>
                <td class="p-2 text-red-600">❌ 80MB+</td>
                <td class="p-2">N/A</td>
              </tr>
              <tr>
                <td class="p-2 font-semibold text-slate-900">Local Payment Rails</td>
                <td class="p-2 text-emerald-700 font-bold bg-blue-50/50">✅ Paystack + Verve</td>
                <td class="p-2 text-red-600">❌ USD Blocked</td>
                <td class="p-2 text-amber-700">⚠️ Card Only</td>
                <td class="p-2 text-amber-700">⚠️ Manual Transfer</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <span><strong>Summary:</strong> Global incumbents cannot adapt their high-overhead models to local student purchasing power and cultural needs.</span>
          <span class="text-blue-800 font-bold font-mono">Structural Moat</span>
        </div>
      </div>
    `
  },

  // SLIDE 12: Technology Architecture
  {
    tag: "TECHNICAL AUDIT",
    title: "Technology Architecture & Engineering Readiness",
    subtitle: "Production-Hardened Architecture Built for African Infrastructure Realities",
    notes: "Our technology stack is completely modern and production-tested. We run React 19 with Capacitor 8, delivering a signed 10MB Android binary that runs smoothly even on older Android 7 devices. Our backend uses Supabase PostgreSQL with 21 atomic security-definer RPCs and full row-level security. Calls are powered by Agora RTC NG, and payments are dual-routed through RevenueCat for Google Play and Paystack for local debit cards. The engineering heavy-lifting is finished.",
    html: `
      <div class="grid grid-cols-2 gap-3.5 h-full py-1">
        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono">Client Architecture</span>
              <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">10.09 MB AAB</span>
            </div>
            <div class="text-xs font-bold text-slate-900 mb-1">React 19 + Capacitor 8 Native Bridge</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Minified 8.09 MB APK / 10.09 MB AAB. Supports Android 7.0+ (API 24 to 36), covering 97.8% of active smartphones in Africa. Cryptographically signed with release keystore.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Verified on physical Pixel 2, Pixel 3a &amp; Pixel 4a emulators
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Backend &amp; Security</span>
              <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-200">21 RPCs</span>
            </div>
            <div class="text-xs font-bold text-slate-900 mb-1">Supabase PostgreSQL 15 &amp; Realtime PubSub</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              21 atomic Security-Definer RPCs. Strict Row Level Security enforces tenant isolation. <code>REPLICA IDENTITY FULL</code> powers sub-50ms chat receipt and reaction delivery.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Live database: gedoyoleoscgxgdqszzc
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider font-mono">Voice &amp; Video Calling</span>
              <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">Agora RTC NG</span>
            </div>
            <div class="text-xs font-bold text-slate-900 mb-1">Low-Latency Global RTC Playout</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              STUN/WebRTC media engine with dynamic token exchange via Supabase Edge Function. Dynamic camera-off profile card fallback saves 85% mobile video bandwidth.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Sub-150ms bidirectional voice latency across Nigeria
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-amber-700 uppercase tracking-wider font-mono">Payments &amp; Ledger</span>
              <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">Dual Rails</span>
            </div>
            <div class="text-xs font-bold text-slate-900 mb-1">RevenueCat + Paystack Browser Fallback</div>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              Native Google Play Store billing via RevenueCat SDK, with automated Paystack hosted browser checkout fallback for local Verve and Mastercard debit cards.
            </p>
          </div>
          <div class="pt-2 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Atomic double-entry ledger in PostgreSQL
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 13: Traction Truth & Diligence Honesty
  {
    tag: "DILIGENCE HONESTY",
    title: "Traction Truth & Due-Diligence Honesty",
    subtitle: "Completely Transparent Pre-Launch Disclosure vs 12-Month Post-Funding Targets",
    notes: "We believe in complete transparency with our investors. Today, we are pre-revenue. The 511 profiles currently in our database represent a seeded demonstration pool and developer stress-test accounts created during engineering sprints between February and September 2026. We are not asking you to fund technology R&D or guess if the app will work. The software is finished, hardened, and signed. You are investing in commercial execution: turning on our campus marketing engine to take this product to 50,000 students across 10 universities.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-6 space-y-3.5">
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-amber-700 uppercase tracking-wider font-mono">Current Status (September 2026)</span>
              <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">Pre-Revenue / Staging</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed mb-3">
              The 511 profiles in our database represent a seeded demonstration campus pool and automated QA stress-test accounts created during engineering sprints between February and September 2026. Current organic MRR is <strong>₦0</strong>.
            </p>
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
              <strong>The Reality:</strong> The engineering heavy-lifting is complete. The app is not a wireframe or concept; it is a signed, functional production artifact ready for deployment.
            </div>
          </div>
        </div>

        <div class="col-span-6 space-y-3.5">
          <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 shadow-sm">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-bold text-blue-800 uppercase tracking-wider font-mono">12-Month Targets Post Capital</span>
              <span class="px-2 py-0.5 rounded bg-white text-blue-800 text-[10px] font-mono font-bold border border-blue-300">Execution Plan</span>
            </div>
            <div class="grid grid-cols-2 gap-3 text-center">
              <div class="p-2.5 rounded-lg bg-white border border-slate-200">
                <div class="text-xl font-black text-slate-900">10</div>
                <div class="text-[9.5px] text-slate-500 uppercase font-bold mt-0.5">Campuses</div>
                <div class="text-[9.5px] text-slate-400">Lagos, Ibadan, Port Harcourt</div>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-slate-200">
                <div class="text-xl font-black text-slate-900">50,000</div>
                <div class="text-[9.5px] text-slate-500 uppercase font-bold mt-0.5">Active Students</div>
                <div class="text-[9.5px] text-slate-400">15% beachhead penetration</div>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-slate-200">
                <div class="text-xl font-black text-blue-600">3,000</div>
                <div class="text-[9.5px] text-slate-500 uppercase font-bold mt-0.5">Subscribers</div>
                <div class="text-[9.5px] text-slate-400">6% conversion rate</div>
              </div>
              <div class="p-2.5 rounded-lg bg-white border border-slate-200">
                <div class="text-xl font-black text-emerald-600">₦12.5M</div>
                <div class="text-[9.5px] text-slate-500 uppercase font-bold mt-0.5">Monthly Run-Rate</div>
                <div class="text-[9.5px] text-emerald-600 font-bold">Cashflow Breakeven</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 14: Team
  {
    tag: "FOUNDING TEAM",
    title: "Founding Team & Domain DNA",
    subtitle: "Software Architecture Mastery Meets Grassroots Campus Media Leadership",
    notes: "We have the exact combination of skills required to win this market. I bring over 5 years of software architecture and digital marketing experience. I personally architected our backend, our Agora video calling, our database RPCs, and our payment integrations. My co-founder, SOKEPIRIM Jackreece, is a mobile developer and the founder of Official Students O'clock, which gives him daily direct communication with over 50,000 Nigerian students. Together, we have the technical ability to build at enterprise grade and the social capital to capture the campus quad.",
    html: `
      <div class="grid grid-cols-2 gap-8 items-center h-full">
        <!-- Founder 1 -->
        <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shadow-md bg-slate-100 shrink-0">
                <img src="${images.godswill}" alt="Godswill Godlife Onah" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">Godswill Godlife Onah</h3>
                <div class="text-xs text-blue-700 font-semibold">Founder &amp; System Architect</div>
                <div class="text-[9.5px] text-slate-500 font-mono">godswill@thecollegedate.com</div>
              </div>
            </div>
            <ul class="text-xs text-slate-700 space-y-2 leading-relaxed">
              <li class="flex items-start gap-1.5">
                <span class="text-blue-600 font-bold">•</span>
                <span><strong>5+ years experience</strong> in software engineering, cloud architecture, and growth marketing.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-blue-600 font-bold">•</span>
                <span>Founder of <strong>Neway Marketing Enterprise</strong>, delivering consumer technology solutions.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-blue-600 font-bold">•</span>
                <span>Personally architected the entire College Date backend, 21 PostgreSQL RPCs, Agora WebRTC engine, and Vision AI pipeline.</span>
              </li>
            </ul>
          </div>
          <div class="pt-2.5 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Focus: Core Infrastructure, Security &amp; Engineering Operations
          </div>
        </div>

        <!-- Founder 2 -->
        <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center gap-3.5 mb-3">
              <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-400 shadow-md bg-slate-100 shrink-0">
                <img src="${images.sokepirim}" alt="SOKEPIRIM Jackreece" class="w-full h-full object-cover object-top block" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">SOKEPIRIM Jackreece</h3>
                <div class="text-xs text-slate-800 font-semibold">Co-Founder &amp; Head of Campus Growth</div>
                <div class="text-[9.5px] text-slate-500 font-mono">jackreece@thecollegedate.com</div>
              </div>
            </div>
            <ul class="text-xs text-slate-700 space-y-2 leading-relaxed">
              <li class="flex items-start gap-1.5">
                <span class="text-slate-800 font-bold">•</span>
                <span>Mobile software developer specializing in youth engagement and digital community applications.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-slate-800 font-bold">•</span>
                <span>Founder of <strong>Official Students O'clock</strong>, reaching <strong>50,000+ daily student readers</strong> across Nigerian university WhatsApp channels.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-slate-800 font-bold">•</span>
                <span>Direct relationships with Student Union Governments (SUG), faculty leaders, and hall executives.</span>
              </li>
            </ul>
          </div>
          <div class="pt-2.5 border-t border-slate-200 text-[9.5px] text-slate-500 font-mono">
            Focus: Campus Distribution, Ambassador Corps &amp; Growth Flywheel
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 15: The Pre-Seed Ask
  {
    tag: "THE ASK",
    title: "The Pre-Seed Ask & Capital Allocation",
    subtitle: "$150,000 USD (₦225,000,000 NGN) for 18-Month Runway to Cashflow Breakeven",
    notes: "We are raising $150,000 USD—or 225 million Naira—in Pre-Seed financing to fund an 18-month commercial runway. 45% of this capital goes directly into campus distribution: deploying 100 student ambassadors across our top 10 universities and sponsoring Freshers' orientation events. 25% goes to trust and safety operations, 20% to infrastructure and Agora calling quotas, and 10% to formalizing our corporate and regulatory structure. Our target is to reach 50,000 active students and cashflow breakeven within 12 months.",
    html: `
      <div class="grid grid-cols-12 gap-8 items-center h-full">
        <div class="col-span-6 space-y-3">
          <div class="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex justify-between items-center shadow-sm">
            <div>
              <div class="text-xs font-bold text-slate-900">Campus Ambassador Network &amp; Growth Blitz</div>
              <div class="text-[9.5px] text-blue-700">100 campus reps across 10 universities, orientation activations</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-blue-700 font-mono">45% ($67.5k)</div>
              <div class="text-[9.5px] text-slate-500 font-mono">₦101.25M NGN</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <div class="text-xs font-bold text-slate-900">Trust, Safety Operations &amp; Moderation</div>
              <div class="text-[9.5px] text-slate-500">Vision AI inference quotas, human escalation review</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-slate-800 font-mono">25% ($37.5k)</div>
              <div class="text-[9.5px] text-slate-500 font-mono">₦56.25M NGN</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <div class="text-xs font-bold text-slate-900">Cloud Infrastructure &amp; Calling Quotas</div>
              <div class="text-[9.5px] text-slate-500">Agora RTC minutes, Supabase compute, CDN edge bandwidth</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-slate-800 font-mono">20% ($30.0k)</div>
              <div class="text-[9.5px] text-slate-500 font-mono">₦45.00M NGN</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <div class="text-xs font-bold text-slate-900">Legal, NDPR &amp; PSSP Partnership</div>
              <div class="text-[9.5px] text-slate-500">Data privacy audits, trademark protection, payment partnerships</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-slate-800 font-mono">10% ($15.0k)</div>
              <div class="text-[9.5px] text-slate-500 font-mono">₦22.50M NGN</div>
            </div>
          </div>
        </div>

        <div class="col-span-6 flex flex-col justify-between h-full py-1">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
            <div class="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">18-Month Execution Milestones</div>
            <div class="space-y-2.5 text-xs">
              <div class="flex items-start gap-2">
                <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[9.5px]">M3</span>
                <span class="text-slate-700 text-[11px]"><strong>3-Campus Pilot:</strong> UNILAG, RSU, UNIPORT → 10,000 Verified Students.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold text-[9.5px]">M6</span>
                <span class="text-slate-700 text-[11px]"><strong>10-Campus Rollout:</strong> 25,000 Active Students, ₦4M/mo MRR.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[9.5px]">M12</span>
                <span class="text-emerald-800 text-[11px]"><strong>Cashflow Breakeven:</strong> 50,000 Students, 3k Subscribers, ₦12.5M/mo MRR.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[9.5px]">M18</span>
                <span class="text-slate-700 text-[11px]"><strong>Regional Expansion:</strong> 100,000 Students, Ghana &amp; Kenya expansion.</span>
              </div>
            </div>
          </div>

          <div class="p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] text-slate-500 text-center font-mono">
            Instrument: SAFE or Convertible Note • $1.5M Valuation Cap
          </div>
        </div>
      </div>
    `
  },

  // SLIDE 16: Long-Term Vision
  {
    tag: "LONG-TERM VISION",
    title: "From Dating Wedge to Campus Super-App",
    subtitle: "Owning the Consumer & Financial Operating System for African Higher Education",
    notes: "Dating is just our wedge. It is the single highest-intent, highest-frequency problem on campus. But once you have the student's identity, their campus network, and their wallet, you own the consumer operating system for higher education. We can expand into student housing, event ticketing, and student financial services. We are building the super-app for the next generation of African leaders. Thank you, and I look forward to your questions.",
    html: `
      <div class="space-y-4 h-full flex flex-col justify-between py-1">
        <div class="space-y-3">
          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
              01
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900">Phase 1: The High-Frequency Social Wedge (Today)</div>
              <div class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Hyperlocal campus dating, real-time Agora calling, anonymous confessions wall, and cultural virtual gifting. Rapid, organic student acquisition across universities.
              </div>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
              02
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900">Phase 2: The Campus Transaction Marketplace (Year 2)</div>
              <div class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Academic tutoring escrow, off-campus hostel &amp; roommate finder, campus event ticketing, and student-to-student textbook and gadget classifieds.
              </div>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
              03
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900">Phase 3: The Higher-Ed Financial Operating System (Year 3+)</div>
              <div class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Student digital banking, campus merchant discount debit cards, and educational micro-credit backed by verified student peer cashflows.
              </div>
            </div>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-slate-900 uppercase tracking-wider">Invest In The Future of African Campus Life</div>
            <div class="text-[11px] text-slate-600 mt-0.5">Contact: <strong>Godswill Godlife Onah</strong> • godswill@thecollegedate.com • Lagos &amp; Port Harcourt, Nigeria</div>
          </div>
          <a href="https://www.thecollegedate.com" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-sm">
            Visit www.thecollegedate.com ↗
          </a>
        </div>
      </div>
    `
  }
];

console.log('[2/4] Generating interactive presentation HTML (Clean White Theme)...');

const interactiveHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The College Date — Investor Pitch Deck (Pre-Seed)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
    }
    .slide-enter {
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.995); }
      to { opacity: 1; transform: scale(1); }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 min-h-screen flex flex-col justify-between select-none">

  <!-- Top Navigation Bar -->
  <header class="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-6 flex items-center justify-between z-20 shadow-sm">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-sm text-xs">
        CD
      </div>
      <div>
        <span class="font-extrabold tracking-tight text-slate-900 text-sm">THE COLLEGE DATE</span>
        <span class="text-[10px] text-blue-700 font-bold ml-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 uppercase">PRE-SEED DECK</span>
      </div>
    </div>

    <!-- Center Slide Counter -->
    <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 font-mono">
      <span>SLIDE <span id="current-slide-num" class="text-blue-600 text-sm font-bold">1</span> OF <span id="total-slides-num">${slides.length}</span></span>
    </div>

    <!-- Header Actions -->
    <div class="flex items-center gap-3">
      <button onclick="toggleNotes()" id="notes-btn" class="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
        <span>🎙️</span> <span>Speaker Notes</span>
      </button>
      <a href="TheCollegeDate-Investor-Pitch-Deck.pdf" download="TheCollegeDate-Investor-Pitch-Deck.pdf" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm flex items-center gap-1.5">
        <span>📥</span> <span>Download PDF</span>
      </a>
      <a href="https://www.thecollegedate.com" target="_blank" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm">
        Live Web ↗
      </a>
    </div>
  </header>

  <!-- Slide Display Stage -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex items-center justify-center">
    <div id="slide-container" class="w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl min-h-[580px] flex flex-col justify-between slide-enter relative overflow-hidden">
      <!-- Injected by JavaScript -->
    </div>
  </main>

  <!-- Speaker Notes Drawer (Collapsible) -->
  <div id="notes-drawer" class="hidden fixed bottom-16 inset-x-0 mx-auto max-w-3xl bg-white border-2 border-blue-500 rounded-2xl p-5 shadow-2xl z-30 text-xs leading-relaxed text-slate-800 backdrop-blur-md">
    <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-blue-700 font-bold uppercase tracking-wider font-mono">
      <span>🎙️ Founder Talking Track &amp; Delivery Script</span>
      <button onclick="toggleNotes()" class="text-slate-400 hover:text-slate-700">✕</button>
    </div>
    <p id="speaker-notes-content"></p>
  </div>

  <!-- Bottom Presentation Controls -->
  <footer class="h-16 border-t border-slate-200 bg-white/95 px-6 flex items-center justify-between z-20 shadow-sm">
    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold transition-all flex items-center gap-1 text-slate-800">
        ← Prev
      </button>
      <button onclick="nextSlide()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold transition-all shadow-sm flex items-center gap-1 text-white">
        Next →
      </button>
      <span class="text-xs text-slate-500 ml-3 hidden md:inline">Use arrow keys (← / →)</span>
    </div>

    <!-- Thumbnail Progress Dots -->
    <div id="dots-container" class="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
      <!-- Generated via JS -->
    </div>

    <div class="text-xs text-slate-500 font-mono hidden md:block">
      v2.2.48 • Verified Pre-Seed
    </div>
  </footer>

  <script>
    const slides = ${JSON.stringify(slides, null, 2)};
    let currentSlide = 0;
    let showNotes = false;

    function renderSlide(index) {
      const slide = slides[index];
      const container = document.getElementById('slide-container');
      const slideNum = (index + 1).toString().padStart(2, '0');
      const totalNum = slides.length.toString().padStart(2, '0');
      
      let headerHtml = '';
      if (!slide.isCover) {
        headerHtml = \`
          <div class="mb-2">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-[10px] font-bold uppercase tracking-widest text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono">\${slide.tag}</span>
              <span class="text-xs font-mono text-slate-500 font-bold">\${slideNum} / \${totalNum}</span>
            </div>
            <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">\${slide.title}</h2>
            <h3 class="text-xs text-slate-600 font-medium mt-0.5">\${slide.subtitle}</h3>
          </div>
        \`;
      }
      
      container.innerHTML = \`
        \${headerHtml}

        <div class="flex-1 flex flex-col justify-center py-2">
          \${slide.html}
        </div>

        <div class="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>THE COLLEGE DATE (CD2.0) • CONFIDENTIAL PRE-SEED PRESENTATION</span>
          <span>com.collegedate.app</span>
        </div>
      \`;

      document.getElementById('current-slide-num').textContent = index + 1;
      document.getElementById('speaker-notes-content').textContent = slide.notes;

      // Update Dots
      const dots = document.querySelectorAll('.slide-dot');
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.className = 'slide-dot w-6 h-1.5 rounded-full bg-blue-600 transition-all';
        } else {
          dot.className = 'slide-dot w-1.5 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-all cursor-pointer';
        }
      });
    }

    function initDots() {
      const container = document.getElementById('dots-container');
      container.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'slide-dot w-1.5 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-all';
        dot.onclick = () => goToSlide(i);
        container.appendChild(dot);
      });
    }

    function goToSlide(i) {
      if (i >= 0 && i < slides.length) {
        currentSlide = i;
        window.location.hash = 'slide-' + (i + 1);
        renderSlide(currentSlide);
      }
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        goToSlide(currentSlide + 1);
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
      }
    }

    function toggleNotes() {
      showNotes = !showNotes;
      const drawer = document.getElementById('notes-drawer');
      const btn = document.getElementById('notes-btn');
      if (showNotes) {
        drawer.classList.remove('hidden');
        btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.remove('bg-slate-50', 'text-slate-700');
      } else {
        drawer.classList.add('hidden');
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('bg-slate-50', 'text-slate-700');
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'n' || e.key === 'N') {
        toggleNotes();
      }
    });

    window.goToSlide = goToSlide;
    window.nextSlide = nextSlide;
    window.prevSlide = prevSlide;

    window.addEventListener('hashchange', () => {
      const match = window.location.hash.match(/slide-(\\d+)/);
      if (match) {
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < slides.length && idx !== currentSlide) {
          currentSlide = idx;
          renderSlide(currentSlide);
        }
      }
    });

    initDots();
    const hashMatch = window.location.hash.match(/slide-(\\d+)/);
    const initialSlide = hashMatch ? parseInt(hashMatch[1], 10) - 1 : 0;
    renderSlide(Math.max(0, Math.min(slides.length - 1, initialSlide)));
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'pitch-deck.html'), interactiveHtml, 'utf8');
fs.writeFileSync(path.join(brainDir, 'college_date_pitch_deck.html'), interactiveHtml, 'utf8');
console.log('[2/4] Wrote clean white interactive pitch-deck.html.');

// [3/4] Generate printable HTML for headless Chrome
console.log('[3/4] Generating printable landscape A4 document (Clean White)...');

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
      background-color: #ffffff !important;
      color: #0f172a !important;
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
      background-color: #ffffff !important;
      color: #0f172a !important;
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
      background: linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #059669 100%);
    }

    .tag-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 9px;
      border-radius: 999px;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
    }

    .slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    .footer-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5px;
      color: #64748b;
    }

    img {
      image-rendering: -webkit-optimize-contrast;
    }
  </style>
  <script>
    // Ensure all images are fully decoded before printing
    window.addEventListener('load', async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
      document.documentElement.classList.add('all-images-decoded');
    });
  </script>
</head>
<body class="bg-white text-slate-900">

${slides
  .map((slide, idx) => {
    const slideNum = (idx + 1).toString().padStart(2, '0');
    const totalSlides = slides.length.toString().padStart(2, '0');
    let headerBlock = '';
    if (!slide.isCover) {
      headerBlock = `
    <!-- Slide Header -->
    <div class="relative z-10 mb-1">
      <div class="flex items-center justify-between gap-2 mb-0.5">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-blue-600 flex items-center justify-center font-black text-white text-[9px] shadow-sm">
            CD
          </div>
          <span class="tag-badge">${slide.tag}</span>
        </div>
        <span class="slide-counter">SLIDE ${slideNum} / ${totalSlides}</span>
      </div>
      <h1 class="text-xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">${slide.title}</h1>
      <h2 class="text-[11px] text-slate-600 font-medium mt-0.5">${slide.subtitle}</h2>
    </div>
      `;
    }
    return `
  <!-- Slide ${idx + 1}: ${slide.title} -->
  <section class="slide-page" id="slide-${idx + 1}">
    <div class="accent-bar"></div>

    ${headerBlock}

    <!-- Slide Body -->
    <div class="flex-1 flex flex-col justify-center py-1 relative z-10">
      ${slide.html}
    </div>

    <!-- Slide Footer -->
    <div class="pt-1.5 border-t border-slate-200 flex items-center justify-between footer-text relative z-10">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-700">THE COLLEGE DATE (CD2.0)</span>
        <span>•</span>
        <span>CONFIDENTIAL PRE-SEED PRESENTATION</span>
        <span>•</span>
        <span>SEPTEMBER 2026</span>
      </div>
      <div class="flex items-center gap-3">
        <span>com.collegedate.app</span>
        <span>•</span>
        <span class="text-blue-600 font-bold">www.thecollegedate.com</span>
      </div>
    </div>
  </section>
`;
  })
  .join('\n')}

</body>
</html>
`;

const printablePath = path.join(publicDir, 'pitch-deck-printable.html');
fs.writeFileSync(printablePath, printableHtml, 'utf8');
console.log('[3/4] Wrote clean white printable HTML to:', printablePath);

// [4/4] Render PDF using Chrome Headless
console.log('[4/4] Compiling high-resolution Clean White PDF via headless Chrome...');

const outputPdfRoot = path.join(projectRoot, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfPublic = path.join(publicDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfArtifact = path.join(brainDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fileUrl = 'file:///' + printablePath.replace(/\\/g, '/');

const chromeArgs = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--run-all-compositor-stages-before-draw',
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
  console.error('Error: PDF was not generated at', outputPdfRoot);
  process.exit(1);
}

const stats = fs.statSync(outputPdfRoot);
console.log(`[4/4] PDF created successfully at root! File size: ${(stats.size / 1024).toFixed(1)} KB`);

fs.copyFileSync(outputPdfRoot, outputPdfPublic);
fs.copyFileSync(outputPdfRoot, outputPdfArtifact);

// Verify page count
const pdfBuffer = fs.readFileSync(outputPdfRoot);
const pdfContent = pdfBuffer.toString('latin1');
const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
const pageCount = pageMatches ? pageMatches.length : 'unknown';

console.log('[SUCCESS] All Clean White outputs generated and verified!');
console.log(JSON.stringify({
  rootFile: outputPdfRoot,
  publicFile: outputPdfPublic,
  artifactFile: outputPdfArtifact,
  sizeBytes: stats.size,
  sizeKB: `${(stats.size / 1024).toFixed(1)} KB`,
  detectedPages: pageCount
}, null, 2));
