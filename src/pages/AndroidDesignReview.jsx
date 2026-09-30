import React, { useState, useEffect } from 'react';
import './AndroidDesignReview.css';

// ════════════════════════════════════════════════════════════════════
// COLLEGE DATE — WORLD-CLASS ANDROID UX/UI REDESIGN (PHASE 2)
// DESIGN DIRECTOR / PRODUCT DESIGN LAB
// ════════════════════════════════════════════════════════════════════

export const SCREEN_DATABASE = [
  {
    id: 'match',
    category: 'CORE DISCOVERY',
    number: '01',
    title: 'Match Swipe Deck',
    route: '/match',
    actualImg: '/evidence_baseline/01_live_match.png',
    actualFallback: '/evidence_baseline/01_live_match.png',
    primaryGoal: 'Fast, intuitive evaluation of student profiles with effortless romantic decision-making (Pass, Like, Super Swipe).',
    mostImportantInfo: 'High-res face photo, Student Name & Age, University & Faculty, Shared Interests, Online Presence, Bio/Intent.',
    whatIsDistracting: 'Clustered top filter pills (Live Near Me, Women, ∞ Swipes) crowding the brand header; floating action buttons overlaid awkwardly across profile text.',
    whatCreatesFriction: 'Swiping gesture threshold is ambiguous; info drawer requires finding a small (i) button; no cue if this student already liked you.',
    whatFeelsGeneric: 'Dated floating circular action buttons resembling 2016 dating apps with no tactile hierarchy or campus personality.',
    whatFeelsVisuallyWeak: 'Flat dark gradient overlay at the bottom with cramped, small typography and weak contrast on bright photos.',
    whatFeelsInconsistent: 'Pills have inconsistent border radii, text styles differ between top bar and bottom card.',
    whatShouldRemain: 'Full-viewport immersive photo card and the 3 core actions (Pass, Super Like, Like).',
    whatShouldBeRethought: 'Integrate verified university crest, faculty tag, and shared campus tags directly into a structured glassmorphic identity card; ergonomic thumb-arc action bar with clear tactile visual hierarchy.',
    missedOpportunity: 'Introducing "Campus Compatibility Pulse" (e.g., "Both at UNILAG • Faculty of Science • Loves Afrobeats & Tech") to immediately ignite conversation.'
  },
  {
    id: 'explore',
    category: 'CORE DISCOVERY',
    number: '02',
    title: 'Explore & Campus Discovery',
    route: '/explore',
    actualImg: '/evidence_baseline/02_live_explore.png',
    actualFallback: '/evidence_baseline/02_live_explore.png',
    primaryGoal: 'Explore students across universities, filter by faculty, intent, or presence, and discover new connections outside the swipe deck.',
    mostImportantInfo: 'Student photos, verified campus badge, faculty/department, live presence badge, intention tags (Serious, Casual, Friends).',
    whatIsDistracting: 'Erratic masonry grid heights causing chaotic visual jumps during scrolling; cramped filter button jammed into search box.',
    whatCreatesFriction: 'Hard to filter by specific university faculty (e.g. Law, Medicine, Engineering); card taps lack clear visual feedback.',
    whatFeelsGeneric: 'Generic Pinterest-style layout that treats student lives like static catalogue thumbnails.',
    whatFeelsVisuallyWeak: 'Clipped university tags, tiny font sizes, absence of campus context or shared connection cues.',
    whatFeelsInconsistent: 'Pills and cards have mixed rounded corners and inconsistent badge placement.',
    whatShouldRemain: 'Fast 2-column visual browsing and flexible multi-criteria search.',
    whatShouldBeRethought: 'Structured editorial discovery grid with consistent aspect ratio, vibrant live-presence radar rings, and curated campus shelves ("Trending on UNILAG", "Freshmen Faces", "Night Owls").',
    missedOpportunity: 'Campus Quad browsing mode—see who is active right now in your faculty or favorite campus study spot.'
  },
  {
    id: 'chat',
    category: 'COMMUNICATION',
    number: '03',
    title: 'Messages & Matches Hub',
    route: '/chat',
    actualImg: '/evidence_baseline/03_live_chat.png',
    actualFallback: '/evidence_baseline/03_live_chat.png',
    primaryGoal: 'Quickly access ongoing conversations, review new matches, and unlock secret admirers.',
    mostImportantInfo: 'New Matches tray, unread message badges, last message preview, presence indicators, secret admirer count.',
    whatIsDistracting: 'Plain circular Likes/Views bubbles looking like secondary utility icons rather than high-value romantic monetization hooks.',
    whatCreatesFriction: 'Empty state is an intimidating black void with zero onboarding prompts or campus icebreakers.',
    whatFeelsGeneric: 'Default messaging list with plain sans-serif typography and zero campus warmth.',
    whatFeelsVisuallyWeak: 'No visual separation between mutual matches vs unread inbound requests; muted gray dividers.',
    whatFeelsInconsistent: 'Inconsistent spacing between header, category pills, and conversation list.',
    whatShouldRemain: 'Top row for fast access to likes/views/matches and clean chronological message feed.',
    whatShouldBeRethought: 'Transform top tray into a cinematic "Campus Crush & Matches Carousel" with gold ring pulses for new matches; add high-contrast message rows with campus tags and voice note previews.',
    missedOpportunity: 'Campus Icebreaker Prompts—auto-suggest playful conversation starters based on mutual campus classes and interests.'
  },
  {
    id: 'conversation',
    category: 'COMMUNICATION',
    number: '04',
    title: 'Direct Chat & Voice Call',
    route: '/chat/c_alex',
    actualImg: '/evidence_baseline/03_live_chat.png',
    actualFallback: '/evidence_baseline/03_live_chat.png',
    primaryGoal: 'Comfortable, private, real-time messaging, photo sharing, and voice/video calling between matched students.',
    mostImportantInfo: 'Chat bubbles with clear sender hierarchy, timestamps, read receipts, calling action buttons, student verification badge.',
    whatIsDistracting: 'Harsh default borders on chat bubbles and generic web-like input bar.',
    whatCreatesFriction: 'Keyboard opening shifts elements unpredictably; media attachments feel clunky.',
    whatFeelsGeneric: 'Basic chat interface lacking campus-specific playfulness or voice messaging prominence.',
    whatFeelsVisuallyWeak: 'Single flat bubble color with poor contrast against dark backgrounds.',
    whatFeelsInconsistent: 'Call icons and header details do not match the design language of the main navigation.',
    whatShouldRemain: 'Clean message bubble thread, instant send button, voice call and video call quick buttons.',
    whatShouldBeRethought: 'Bespoke conversational space with rich velvet chat bubbles, audio waveform preview, mutual campus banner at top, and built-in "Date Invite" interactive card.',
    missedOpportunity: 'Campus Date Invite cards: "Meet at Senate Cafe? ☕" with 1-tap accept or reschedule.'
  },
  {
    id: 'confessions',
    category: 'CAMPUS CULTURE',
    number: '05',
    title: 'Campus Secrets (Confessions)',
    route: '/confessions',
    actualImg: '/evidence_baseline/04_live_confessions.png',
    actualFallback: '/evidence_baseline/04_live_confessions.png',
    primaryGoal: 'Read unfiltered, anonymous campus confessions, gossip, and crush posts; post thoughts with total anonymity.',
    mostImportantInfo: 'Confession text, campus tag, time ago, community reaction counts, comment discussions.',
    whatIsDistracting: 'Massive permanent post composer box consuming over 45% of the mobile viewport, pushing the social feed below the fold.',
    whatCreatesFriction: 'Reaction emojis are small, tightly packed text buttons with confusing tap boundaries.',
    whatFeelsGeneric: 'Standard rectangular cards resembling an outdated forum or generic Facebook wall.',
    whatFeelsVisuallyWeak: 'Flat dark gray cards with uniform typography that fails to evoke mystery or campus excitement.',
    whatFeelsInconsistent: 'Category pills do not reflect live campus trends.',
    whatShouldRemain: '100% student anonymity, campus badge, category filtering, and community reactions.',
    whatShouldBeRethought: 'Ephemeral "Campus Whispers" feed with expressive editorial typography, mysterious mask avatars (Akoka Owl, Moremi Ghost), and an expandable floating composer button that frees up the entire screen.',
    missedOpportunity: 'Weekly Campus Hot Topics and anonymous replies to crush confessions.'
  },
  {
    id: 'profile',
    category: 'IDENTITY',
    number: '06',
    title: 'My Profile & Identity Hub',
    route: '/profile',
    actualImg: '/evidence_baseline/05_live_profile.png',
    actualFallback: '/evidence_baseline/05_live_profile_scrolled3.png',
    primaryGoal: 'View personal dating profile as others see it, track profile completeness, access wallet/monetization, and manage account.',
    mostImportantInfo: 'User photos, name, age, campus & department, verification badge, profile strength meter, wallet balance.',
    whatIsDistracting: 'Blinding white 0% Profile Strength banner right at the top of a dark-themed app; sudden clash with neon-pink wallet card below.',
    whatCreatesFriction: '8 disparate utility tiles in the lower half feel like an administrative dashboard rather than an attractive dating identity.',
    whatFeelsGeneric: 'Small circular avatar thumbnail that fails to showcase the user photo.',
    whatFeelsVisuallyWeak: 'Conflicting gradients, harsh white backgrounds, and disjointed button styles.',
    whatFeelsInconsistent: 'Tile icons have differing stroke weights and inconsistent spacing.',
    whatShouldRemain: 'Profile strength progress, AI coach access, wallet summary, and direct links to key hubs.',
    whatShouldBeRethought: 'Cinematic Personal Identity Hero with dual-mode toggle ("Public Preview" vs "Edit Identity"), dark harmonious completion ring, and an organized 3-cluster command center (Finance, Social Status, Account Security).',
    missedOpportunity: 'Personal Dating Analytics: see how many students viewed your profile or swiped right this week.'
  },
  {
    id: 'edit_profile',
    category: 'IDENTITY',
    number: '07',
    title: 'Edit Profile & Prompt Studio',
    route: '/profile/edit',
    actualImg: '/evidence_baseline/05_live_profile_scrolled3.png',
    actualFallback: '/evidence_baseline/05_live_profile_scrolled3.png',
    primaryGoal: 'Effortlessly upload and reorder 6 profile photos, edit bio, campus department, year of study, and prompt answers.',
    mostImportantInfo: '6-photo upload grid with primary photo badge, prompt response cards, campus badges, interests tags.',
    whatIsDistracting: 'Long utilitarian web form with small text inputs and unclear saving states.',
    whatCreatesFriction: 'Reordering photos is clunky; prompt selection lacks fun, personality-driven questions.',
    whatFeelsGeneric: 'Standard form inputs with zero visual polish or encouragement.',
    whatFeelsVisuallyWeak: 'Missing real-time preview of how profile cards look when rendered to potential matches.',
    whatFeelsInconsistent: 'Input borders and select menus do not match mobile-native design patterns.',
    whatShouldRemain: 'Photo grid, prompt selector, campus details, and interest tags.',
    whatShouldBeRethought: 'Interactive "Profile Studio" with drag-and-drop photo cards, smart photo scoring, instant prompt picker chips, and a live mini card preview at the bottom.',
    missedOpportunity: 'AI Photo Enhancer & Prompt Polish suggestions tailored to Nigerian university culture.'
  },
  {
    id: 'leaderboard',
    category: 'STATUS & STATUS',
    number: '08',
    title: 'Campus Leaderboard & Fame',
    route: '/leaderboard',
    actualImg: '/evidence_baseline/06_live_leaderboard.png',
    actualFallback: '/evidence_baseline/06_live_leaderboard.png',
    primaryGoal: 'Check the most popular and influential students on campus, view rankings, and climb the leaderboards.',
    mostImportantInfo: 'Top 3 podium students, user rank, fan points, reward incentives, weekly countdown.',
    whatIsDistracting: 'Heavy brown/gray slab podium blocks with flat, dated styling and harsh contrast.',
    whatCreatesFriction: 'No explanation of how to earn points or what winning provides; missing weekly reset timer.',
    whatFeelsGeneric: 'Basic rectangular podium graphic with small crown clip art.',
    whatFeelsVisuallyWeak: 'Rank 4+ list feels like an afterthought; muted dark styling with poor energy.',
    whatFeelsInconsistent: 'Podium heights and crown placements feel mechanically stacked.',
    whatShouldRemain: '3-tier podium spotlight, Most Wanted vs Spenders tabs, and ranked student list.',
    whatShouldBeRethought: 'Luminous metallic 3D podium with champagne gold, polished silver, and burnished bronze accents; weekly reward banner ("Top 3 Win 1 Month Free Premium + Gold Crown"); sticky user rank bar at bottom.',
    missedOpportunity: 'Inter-campus rivalry: UNILAG vs UI vs OAU live battle standings.'
  },
  {
    id: 'premium',
    category: 'MONETIZATION',
    number: '09',
    title: 'Premium Upgrade & Elite Pass',
    route: '/premium',
    actualImg: '/evidence_baseline/10_live_premium_loaded.png',
    actualFallback: '/evidence_baseline/10_live_premium_loaded.png',
    primaryGoal: 'Understand the power of upgrading, choose a student-friendly plan, and checkout effortlessly via Google Play.',
    mostImportantInfo: 'Elite benefits (Unlimited Swipes, See Secret Admirers, 5x Campus Boost), pricing cards, 1-tap Google Play CTA.',
    whatIsDistracting: 'Giant red ✕ marks making free users feel penalized; long SaaS comparison table squeezed onto mobile.',
    whatCreatesFriction: 'Pricing tiers are obscured; benefits read like a technical contract rather than exciting romantic upgrades.',
    whatFeelsGeneric: 'Basic desktop comparison table transposed into a mobile view.',
    whatFeelsVisuallyWeak: 'Flat diamond icon with no emotional resonance or luxury feeling.',
    whatFeelsInconsistent: 'Table styling clashes with the rest of the dark card system.',
    whatShouldRemain: 'Clear feature comparison, verified student testimonials, and Google Play integration.',
    whatShouldBeRethought: 'The "College Date Elite Pass": Velvet obsidian backdrop with glowing champagne gold gradients, interactive benefit cards with visual unlock teasers, and a 3-tier pricing carousel (Weekly, Monthly, Semester Pass).',
    missedOpportunity: 'Campus Semester Pass: "One payment covers your entire school semester — less than a campus pizza."'
  },
  {
    id: 'wallet',
    category: 'MONETIZATION',
    number: '10',
    title: 'Student Wallet & Earnings',
    route: '/wallet',
    actualImg: '/evidence_baseline/09_live_wallet.png',
    actualFallback: '/evidence_baseline/09_live_wallet.png',
    primaryGoal: 'Check balance, withdraw gift earnings to Nigerian bank accounts, and top up credits for digital features.',
    mostImportantInfo: 'Available balance (₦), quick Deposit/Withdraw buttons, payout countdown timer, recent transaction ledger.',
    whatIsDistracting: 'Payout countdown timer dominates the screen even for non-earning dating users.',
    whatCreatesFriction: 'HTML dropdown select for top-up amounts; confusing disclaimer regarding web vs Android payments.',
    whatFeelsGeneric: 'Utilitarian billing portal with generic gray cards and zero financial polish.',
    whatFeelsVisuallyWeak: 'Numbers look like plain plain text with no visual trust indicators or bank-grade finish.',
    whatFeelsInconsistent: 'Button colors clash with the primary brand palette.',
    whatShouldRemain: 'Clear balance display, pending earnings, transparent transaction feed, and bank transfer support.',
    whatShouldBeRethought: 'Fintech-grade virtual campus card with iridescent shimmer, instant preset top-up chips (₦1k, ₦2.5k, ₦5k), and a segmented tab separating Dating Credits from Creator Earnings.',
    missedOpportunity: 'Instant campus gifting: send a virtual drink or recharge card to your match in 1 tap.'
  },
  {
    id: 'referrals',
    category: 'GROWTH',
    number: '11',
    title: 'Campus Referrals & Squad',
    route: '/referrals',
    actualImg: '/evidence_baseline/12_live_referrals.png',
    actualFallback: '/evidence_baseline/12_live_referrals.png',
    primaryGoal: 'Share invite link with campus friends, track claimed invites, and earn free swipes and cash rewards.',
    mostImportantInfo: 'Referral code, 1-tap WhatsApp share button, milestone rewards bar, invited friends list.',
    whatIsDistracting: 'Monolithic red-pink box with harsh visual contrast; empty gray statistic blocks.',
    whatCreatesFriction: 'Only provides a raw "Copy Link" button; missing direct WhatsApp and Telegram share actions.',
    whatFeelsGeneric: 'Standard affiliate dashboard with no campus community energy.',
    whatFeelsVisuallyWeak: 'Cold stat cards that fail to celebrate earned bonuses.',
    whatFeelsInconsistent: 'Referral code font looks like a technical token.',
    whatShouldRemain: 'Free swipe incentive, unique code display, and friends joined list.',
    whatShouldBeRethought: 'Vibrant "Campus Squad Rewards" hub featuring 1-tap "Share to WhatsApp Status & Chats", a gamified milestone roadmap (Invite 3 = 1 Wk Premium; Invite 5 = Verified Crown), and reward claim animations.',
    missedOpportunity: 'One-tap WhatsApp Status Story Card generator with your photo and campus link.'
  },
  {
    id: 'settings',
    category: 'SETTINGS & SAFETY',
    number: '12',
    title: 'Settings & Campus Safety',
    route: '/settings',
    actualImg: '/evidence_baseline/08_live_settings.png',
    actualFallback: '/evidence_baseline/08_live_settings.png',
    primaryGoal: 'Manage account security, campus privacy, notification preferences, and student safety tools.',
    mostImportantInfo: 'Campus verification status, Incognito/Ghost mode, push alert toggles, safety & block center, logout.',
    whatIsDistracting: 'Giant nested cards for just 4 toggle switches; Wallet banner monopolizing the top of settings.',
    whatCreatesFriction: 'Crucial settings like privacy, discovery filters, and account deletion are hard to find.',
    whatFeelsGeneric: 'Bare-bones toggle list with no grouped structure.',
    whatFeelsVisuallyWeak: 'Vast empty space with awkward margins and poor information density.',
    whatFeelsInconsistent: 'Switch components have non-standard alignment.',
    whatShouldRemain: 'Granular notification switches and fast logout action.',
    whatShouldBeRethought: 'Modular Material 3 / iOS-standard grouped settings with clean icon badges: Account & University ID, Discovery & Ghost Mode, Notifications, Safety & Child Protection, and Support.',
    missedOpportunity: '"Campus Ghost Mode"—hide your profile from coursemates in your specific department.'
  },
  {
    id: 'auth',
    category: 'ONBOARDING',
    number: '13',
    title: 'Welcome, Auth & University Verify',
    route: '/login',
    actualImg: '/evidence_baseline/live_settled.png',
    actualFallback: '/evidence_baseline/live_login_form.png',
    primaryGoal: 'Fast, secure student authentication via Google or email with campus affiliation confirmation.',
    mostImportantInfo: 'Brand identity, 1-tap Google sign-in, university email / matric verification prompt, trust badges.',
    whatIsDistracting: 'Generic badges pushing action buttons down; multiple nested cards in login forms.',
    whatCreatesFriction: 'Password entry errors create unexpected layout shifts; lack of clear campus validation cues.',
    whatFeelsGeneric: 'Standard landing page with static stock-feel elements.',
    whatFeelsVisuallyWeak: 'Low contrast on dark text fields; generic button states.',
    whatFeelsInconsistent: 'Buttons and inputs use disparate font sizes.',
    whatShouldRemain: 'Fast 1-tap Google Auth, email option, and Nigerian student focus.',
    whatShouldBeRethought: 'Cinematic onboarding hero with live Nigerian campus badge ticker (UNILAG, LASU, UI, OAU), instant Google 1-tap with biometric fallback, and seamless 3-step profile builder.',
    missedOpportunity: 'Instant student verification by selecting university and faculty during signup.'
  },
  {
    id: 'states',
    category: 'SYSTEM & EDGE STATES',
    number: '14',
    title: 'Empty, Loading & Toast States',
    route: '/states',
    actualImg: '/evidence_baseline/03_live_chat.png',
    actualFallback: '/evidence_baseline/01_live_match.png',
    primaryGoal: 'Deliver informative, delightful feedback when data is loading, empty, or an error occurs.',
    mostImportantInfo: 'What happened, why it happened, and the exact next action the student should take.',
    whatIsDistracting: 'Blank empty voids or generic browser-like spinners that make the app feel broken.',
    whatCreatesFriction: 'Toasts sometimes cover headers or bottom navigation bars.',
    whatFeelsGeneric: 'Plain text alert dialogs with no visual charm.',
    whatFeelsVisuallyWeak: 'Absence of engaging illustrations or campus-themed animations.',
    whatFeelsInconsistent: 'Different screens handle loading with completely different spinner styles.',
    whatShouldRemain: 'Fast error recovery and clear notification delivery.',
    whatShouldBeRethought: 'Bespoke empty states with playful campus illustrations ("You have cleared the quad!", "No messages yet — send an icebreaker!"), shimmering skeleton screens, and non-intrusive floating haptic toasts.',
    missedOpportunity: 'Proactive recommendations during empty states (e.g., "Out of swipes? Try Campus Secrets while you wait!").'
  }
];

export default function AndroidDesignReview() {
  const [activeScreenId, setActiveScreenId] = useState('match');
  const [viewMode, setViewMode] = useState('sideBySide');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [showDiagnosisDrawer, setShowDiagnosisDrawer] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const [swipeState, setSwipeState] = useState({ cardIndex: 0, liked: false, passed: false, superLiked: false });
  const [activeTab, setActiveTab] = useState('match');
  const [exploreFilter, setExploreFilter] = useState('ALL');
  const [confessionTab, setConfessionTab] = useState('trending');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');
  const [profilePreviewMode, setProfilePreviewMode] = useState('preview');
  const [chatSearchText, setChatSearchText] = useState('');
  const [walletTab, setWalletTab] = useState('credits');

  const currentScreen = SCREEN_DATABASE.find(s => s.id === activeScreenId) || SCREEN_DATABASE[0];

  const categories = ['ALL', 'CORE DISCOVERY', 'COMMUNICATION', 'CAMPUS CULTURE', 'IDENTITY', 'STATUS & STATUS', 'MONETIZATION', 'GROWTH', 'SETTINGS & SAFETY'];
  const filteredScreens = filterCategory === 'ALL' 
    ? SCREEN_DATABASE 
    : SCREEN_DATABASE.filter(s => s.category === filterCategory);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        const idx = SCREEN_DATABASE.findIndex(s => s.id === activeScreenId);
        if (idx < SCREEN_DATABASE.length - 1) setActiveScreenId(SCREEN_DATABASE[idx + 1].id);
      } else if (e.key === 'ArrowLeft') {
        const idx = SCREEN_DATABASE.findIndex(s => s.id === activeScreenId);
        if (idx > 0) setActiveScreenId(SCREEN_DATABASE[idx - 1].id);
      } else if (e.key === '1') setViewMode('current');
      else if (e.key === '2') setViewMode('proposed');
      else if (e.key === '3') setViewMode('sideBySide');
      else if (e.key === '4') setViewMode('overlay');
      else if (e.key === '5') setViewMode('fullscreen');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreenId]);

  return (
    <div className="design-lab-root">
      <header className="design-lab-header">
        <div className="header-brand-cluster">
          <div className="brand-badge">
            <span className="brand-dot"></span>
            <span className="brand-text">CD 2.0 • ANDROID UX/UI DESIGN LAB</span>
          </div>
          <h1 className="header-title">World-Class Android Experience</h1>
          <span className="header-tag">Phase 2 — Immutable Verified Baseline vs Proposed Redesign</span>
        </div>

        <div className="header-controls-cluster">
          <div className="mode-toggle-group">
            <button 
              className={`mode-btn ${viewMode === 'current' ? 'active' : ''}`}
              onClick={() => setViewMode('current')}
              title="View Verified Pixel 4a Live Baseline [Key 1]"
            >
              <span className="mode-icon">📱</span> 1. Verified Live
            </button>
            <button 
              className={`mode-btn ${viewMode === 'proposed' ? 'active' : ''}`}
              onClick={() => setViewMode('proposed')}
              title="View Proposed Redesign [Key 2]"
            >
              <span className="mode-icon">✨</span> 2. Proposed
            </button>
            <button 
              className={`mode-btn ${viewMode === 'sideBySide' ? 'active' : ''}`}
              onClick={() => setViewMode('sideBySide')}
              title="Side-by-Side Comparison [Key 3]"
            >
              <span className="mode-icon">⚖️</span> 3. Side-by-Side
            </button>
            <button 
              className={`mode-btn ${viewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setViewMode('overlay')}
              title="Forensic Layered Overlay [Key 4]"
            >
              <span className="mode-icon">🔬</span> 4. Overlay Slider
            </button>
            <button 
              className={`mode-btn ${viewMode === 'fullscreen' ? 'active' : ''}`}
              onClick={() => setViewMode('fullscreen')}
              title="Immersive Native Viewport [Key 5]"
            >
              <span className="mode-icon">🚀</span> 5. Fullscreen
            </button>
          </div>

          <div className="header-actions">
            <button 
              className="action-btn secondary"
              onClick={() => setShowDirectionModal(true)}
            >
              🎨 Design System & Rationale
            </button>
            <button 
              className={`action-btn primary ${showDiagnosisDrawer ? 'active' : ''}`}
              onClick={() => setShowDiagnosisDrawer(!showDiagnosisDrawer)}
            >
              📋 Screen UX Diagnosis ({currentScreen.number})
            </button>
          </div>
        </div>
      </header>

      <nav className="screen-selector-strip">
        <div className="category-filter-chips">
          {categories.map(cat => (
            <button 
              key={cat}
              className={`cat-chip ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="screen-tabs-scroller">
          {filteredScreens.map(screen => (
            <button
              key={screen.id}
              className={`screen-nav-item ${activeScreenId === screen.id ? 'active' : ''}`}
              onClick={() => setActiveScreenId(screen.id)}
            >
              <span className="nav-num">{screen.number}</span>
              <span className="nav-title">{screen.title}</span>
              <span className="nav-cat">{screen.category}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="design-lab-stage">
        {viewMode === 'current' && (
          <div className="stage-single-container">
            <div className="device-podium">
              <div className="podium-meta">
                <span className="podium-badge live-badge">IMMUTABLE SOURCE OF TRUTH</span>
                <h3 className="podium-title">Live Android Pixel 4a Capture</h3>
                <p className="podium-desc">Actual verified running screen on Google Pixel 4a (API 34, 1080×2340)</p>
              </div>
              <div className="pixel-device-frame">
                <div className="pixel-speaker-cutout"></div>
                <div className="pixel-screen-viewport">
                  <img 
                    src={currentScreen.actualImg} 
                    alt={currentScreen.title} 
                    className="baseline-raw-image"
                    onError={(e) => { e.target.src = currentScreen.actualFallback; }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'proposed' && (
          <div className="stage-single-container">
            <div className="device-podium">
              <div className="podium-meta">
                <span className="podium-badge proposed-badge">NEW PROPOSED EXPERIENCE</span>
                <h3 className="podium-title">World-Class Android Architecture</h3>
                <p className="podium-desc">Direction C: Campus Atelier & Midnight Velvet • High-Fidelity Interactive Prototype</p>
              </div>
              <div className="pixel-device-frame proposed-glow">
                <div className="pixel-speaker-cutout"></div>
                <div className="pixel-screen-viewport proposed-viewport">
                  <ProposedScreenRenderer 
                    screenId={currentScreen.id}
                    swipeState={swipeState}
                    setSwipeState={setSwipeState}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    exploreFilter={exploreFilter}
                    setExploreFilter={setExploreFilter}
                    confessionTab={confessionTab}
                    setConfessionTab={setConfessionTab}
                    leaderboardPeriod={leaderboardPeriod}
                    setLeaderboardPeriod={setLeaderboardPeriod}
                    profilePreviewMode={profilePreviewMode}
                    setProfilePreviewMode={setProfilePreviewMode}
                    chatSearchText={chatSearchText}
                    setChatSearchText={setChatSearchText}
                    walletTab={walletTab}
                    setWalletTab={setWalletTab}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'sideBySide' && (
          <div className="stage-side-by-side-container">
            <div className="comparison-column left-column">
              <div className="column-header">
                <div className="header-status-indicator red-status"></div>
                <div>
                  <h3 className="col-title">CURRENT APPLICATION (LIVE BASELINE)</h3>
                  <p className="col-sub">Verified Pixel 4a Capture ({currentScreen.number}. {currentScreen.title})</p>
                </div>
              </div>

              <div className="pixel-device-frame baseline-frame">
                <div className="pixel-speaker-cutout"></div>
                <div className="pixel-screen-viewport">
                  <img 
                    src={currentScreen.actualImg} 
                    alt="Current Live Baseline" 
                    className="baseline-raw-image"
                    onError={(e) => { e.target.src = currentScreen.actualFallback; }}
                  />
                </div>
              </div>

              <div className="column-quick-critique">
                <h4>🔴 Baseline Forensic Issues:</h4>
                <ul>
                  <li><strong>Hierarchy:</strong> {currentScreen.whatFeelsVisuallyWeak}</li>
                  <li><strong>Friction:</strong> {currentScreen.whatCreatesFriction}</li>
                  <li><strong>Distraction:</strong> {currentScreen.whatIsDistracting}</li>
                </ul>
              </div>
            </div>

            <div className="comparison-column right-column">
              <div className="column-header">
                <div className="header-status-indicator green-status"></div>
                <div>
                  <h3 className="col-title">PROPOSED REDESIGN (WORLD-CLASS)</h3>
                  <p className="col-sub">Direction C: Campus Atelier • Directional Leap</p>
                </div>
              </div>

              <div className="pixel-device-frame proposed-frame">
                <div className="pixel-speaker-cutout"></div>
                <div className="pixel-screen-viewport proposed-viewport">
                  <ProposedScreenRenderer 
                    screenId={currentScreen.id}
                    swipeState={swipeState}
                    setSwipeState={setSwipeState}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    exploreFilter={exploreFilter}
                    setExploreFilter={setExploreFilter}
                    confessionTab={confessionTab}
                    setConfessionTab={setConfessionTab}
                    leaderboardPeriod={leaderboardPeriod}
                    setLeaderboardPeriod={setLeaderboardPeriod}
                    profilePreviewMode={profilePreviewMode}
                    setProfilePreviewMode={setProfilePreviewMode}
                    chatSearchText={chatSearchText}
                    setChatSearchText={setChatSearchText}
                    walletTab={walletTab}
                    setWalletTab={setWalletTab}
                  />
                </div>
              </div>

              <div className="column-quick-critique proposed-benefits">
                <h4>🟢 Proposed Architectural Improvements:</h4>
                <ul>
                  <li><strong>Transformation:</strong> {currentScreen.whatShouldBeRethought}</li>
                  <li><strong>Opportunity Captured:</strong> {currentScreen.missedOpportunity}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="stage-overlay-container">
            <div className="overlay-slider-control-card">
              <div className="slider-label-group">
                <span>Current Baseline (0%)</span>
                <span className="slider-value-pill">Opacity: {overlayOpacity}% Proposed</span>
                <span>Proposed Redesign (100%)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="forensic-range-slider"
              />
            </div>

            <div className="pixel-device-frame overlay-frame">
              <div className="pixel-speaker-cutout"></div>
              <div className="pixel-screen-viewport overlay-viewport">
                <img 
                  src={currentScreen.actualImg} 
                  alt="Baseline Underlayer"
                  className="overlay-underlayer-image"
                  style={{ opacity: 1 - overlayOpacity / 100 }}
                  onError={(e) => { e.target.src = currentScreen.actualFallback; }}
                />

                <div 
                  className="overlay-overlayer-component"
                  style={{ opacity: overlayOpacity / 100 }}
                >
                  <ProposedScreenRenderer 
                    screenId={currentScreen.id}
                    swipeState={swipeState}
                    setSwipeState={setSwipeState}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    exploreFilter={exploreFilter}
                    setExploreFilter={setExploreFilter}
                    confessionTab={confessionTab}
                    setConfessionTab={setConfessionTab}
                    leaderboardPeriod={leaderboardPeriod}
                    setLeaderboardPeriod={setLeaderboardPeriod}
                    profilePreviewMode={profilePreviewMode}
                    setProfilePreviewMode={setProfilePreviewMode}
                    chatSearchText={chatSearchText}
                    setChatSearchText={setChatSearchText}
                    walletTab={walletTab}
                    setWalletTab={setWalletTab}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'fullscreen' && (
          <div className="stage-fullscreen-container">
            <div className="fullscreen-phone-wrap">
              <div className="pixel-device-frame immersive-frame">
                <div className="pixel-speaker-cutout"></div>
                <div className="pixel-screen-viewport proposed-viewport">
                  <ProposedScreenRenderer 
                    screenId={currentScreen.id}
                    swipeState={swipeState}
                    setSwipeState={setSwipeState}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    exploreFilter={exploreFilter}
                    setExploreFilter={setExploreFilter}
                    confessionTab={confessionTab}
                    setConfessionTab={setConfessionTab}
                    leaderboardPeriod={leaderboardPeriod}
                    setLeaderboardPeriod={setLeaderboardPeriod}
                    profilePreviewMode={profilePreviewMode}
                    setProfilePreviewMode={setProfilePreviewMode}
                    chatSearchText={chatSearchText}
                    setChatSearchText={setChatSearchText}
                    walletTab={walletTab}
                    setWalletTab={setWalletTab}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showDiagnosisDrawer && (
        <aside className="diagnosis-drawer">
          <div className="drawer-header">
            <div className="drawer-title-group">
              <span className="drawer-sub">SCREEN-BY-SCREEN FORENSIC UX AUDIT</span>
              <h2 className="drawer-title">{currentScreen.number} — {currentScreen.title}</h2>
            </div>
            <button className="drawer-close-btn" onClick={() => setShowDiagnosisDrawer(false)}>✕</button>
          </div>

          <div className="drawer-body">
            <section className="drawer-card">
              <h3 className="section-label">1. Primary User Goal</h3>
              <p className="section-desc">{currentScreen.primaryGoal}</p>
            </section>

            <section className="drawer-card">
              <h3 className="section-label">2. Most Important Information</h3>
              <p className="section-desc">{currentScreen.mostImportantInfo}</p>
            </section>

            <section className="drawer-card warning-card">
              <h3 className="section-label">3. What is Distracting?</h3>
              <p className="section-desc">{currentScreen.whatIsDistracting}</p>
            </section>

            <section className="drawer-card warning-card">
              <h3 className="section-label">4. What Creates Friction?</h3>
              <p className="section-desc">{currentScreen.whatCreatesFriction}</p>
            </section>

            <section className="drawer-card alert-card">
              <h3 className="section-label">5. What Feels Generic & Visually Weak?</h3>
              <p className="section-desc"><strong>Generic:</strong> {currentScreen.whatFeelsGeneric}</p>
              <p className="section-desc"><strong>Weak:</strong> {currentScreen.whatFeelsVisuallyWeak}</p>
            </section>

            <section className="drawer-card">
              <h3 className="section-label">6. Inconsistencies Identified</h3>
              <p className="section-desc">{currentScreen.whatFeelsInconsistent}</p>
            </section>

            <section className="drawer-card success-card">
              <h3 className="section-label">7. Retained vs Completely Rethought</h3>
              <p className="section-desc"><strong>Retained:</strong> {currentScreen.whatShouldRemain}</p>
              <p className="section-desc"><strong>Rethought:</strong> {currentScreen.whatShouldBeRethought}</p>
            </section>

            <section className="drawer-card gold-card">
              <h3 className="section-label">8. Captured High-Value Opportunity</h3>
              <p className="section-desc">{currentScreen.missedOpportunity}</p>
            </section>
          </div>
        </aside>
      )}

      {showDirectionModal && (
        <div className="modal-backdrop" onClick={() => setShowDirectionModal(false)}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-tag">DESIGN ARCHITECTURE</span>
                <h2 className="modal-title">College Date Android Design System</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDirectionModal(false)}>✕</button>
            </div>

            <div className="modal-body-content">
              <h3 className="modal-section-h3">Design Direction Exploration</h3>
              <div className="directions-grid">
                <div className="direction-card">
                  <span className="dir-tag">CONCEPT A</span>
                  <h4>Midnight Editorial Luxury</h4>
                  <p className="dir-desc">Understated, high typographic contrast, subtle slate-black surfaces, champagne lines, whisper rose ambient glow.</p>
                  <div className="dir-pros-cons">
                    <span className="pro">✓ Ultra-premium feel</span>
                    <span className="con">✗ Too formal for casual campus culture</span>
                  </div>
                </div>

                <div className="direction-card">
                  <span className="dir-tag">CONCEPT B</span>
                  <h4>Kinetic Campus Pulse</h4>
                  <p className="dir-desc">Dynamic fluid cards, high-energy neon coral (#FF3B6C) and radioactive lime (#10B981), soundwave motifs, slang chips.</p>
                  <div className="dir-pros-cons">
                    <span className="pro">✓ High student vitality</span>
                    <span className="con">✗ Can induce visual fatigue on text-dense screens</span>
                  </div>
                </div>

                <div className="direction-card winning-card">
                  <span className="dir-tag winning-tag">WINNING SYSTEM 🏆</span>
                  <h4>Direction C: Campus Atelier & Velvet Obsidian</h4>
                  <p className="dir-desc">The synthesis of premium luxury architecture and authentic Nigerian campus resonance. Deep midnight backdrop (#08080C), velvety elevated surfaces (#12121A, #1A1A24), warm Sunset Rose (#FF3B6C) blending to Electric Violet (#8B5CF6), punctuated by University Crest badges and Champagne Gold status accents.</p>
                  <div className="dir-pros-cons">
                    <span className="pro">✓ Perfect balance of luxury & campus excitement</span>
                    <span className="pro">✓ 100% single-thumb ergonomic reach</span>
                    <span className="pro">✓ Scales seamlessly from dating cards to bank-grade wallet</span>
                  </div>
                </div>
              </div>

              <h3 className="modal-section-h3">Color Architecture</h3>
              <div className="color-swatches-grid">
                <div className="swatch-item"><div className="swatch-box" style={{ background: '#08080C' }}></div><span>Obsidian #08080C (Canvas)</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: '#12121A' }}></div><span>Velvet Card #12121A</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: '#1A1A26' }}></div><span>Elevated #1A1A26</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: 'linear-gradient(135deg, #FF3B6C, #FF6584)' }}></div><span>Sunset Rose #FF3B6C</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}></div><span>Campus Violet #8B5CF6</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)' }}></div><span>Champagne Gold #F59E0B</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: '#10B981' }}></div><span>Campus Live #10B981</span></div>
                <div className="swatch-item"><div className="swatch-box" style={{ background: '#FFFFFF' }}></div><span>Text Pure #FFFFFF</span></div>
              </div>

              <h3 className="modal-section-h3">Typography & Spacing Scale</h3>
              <div className="type-hierarchy-table">
                <div className="type-row"><span>Display / Hero</span><strong>32px / Bold 800 (Inter / Plus Jakarta Sans)</strong></div>
                <div className="type-row"><span>Page Titles</span><strong>22px / SemiBold 700</strong></div>
                <div className="type-row"><span>Section Headers</span><strong>16px / Medium 600</strong></div>
                <div className="type-row"><span>Card Headlines</span><strong>18px / SemiBold 700</strong></div>
                <div className="type-row"><span>Body Text</span><strong>14px / Regular 400 (Line-height: 1.5)</strong></div>
                <div className="type-row"><span>Badges / Tags</span><strong>11px / SemiBold 600 (Letter-spacing: 0.5px)</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProposedScreenRenderer(props) {
  const { screenId } = props;

  switch (screenId) {
    case 'match':
      return <ProposedMatchScreen {...props} />;
    case 'explore':
      return <ProposedExploreScreen {...props} />;
    case 'chat':
      return <ProposedChatHubScreen {...props} />;
    case 'conversation':
      return <ProposedConversationScreen {...props} />;
    case 'confessions':
      return <ProposedConfessionsScreen {...props} />;
    case 'profile':
      return <ProposedProfileScreen {...props} />;
    case 'edit_profile':
      return <ProposedEditProfileScreen {...props} />;
    case 'leaderboard':
      return <ProposedLeaderboardScreen {...props} />;
    case 'premium':
      return <ProposedPremiumScreen {...props} />;
    case 'wallet':
      return <ProposedWalletScreen {...props} />;
    case 'referrals':
      return <ProposedReferralsScreen {...props} />;
    case 'settings':
      return <ProposedSettingsScreen {...props} />;
    case 'auth':
      return <ProposedAuthScreen {...props} />;
    case 'states':
      return <ProposedStatesScreen {...props} />;
    default:
      return <ProposedMatchScreen {...props} />;
  }
}

function ProposedMatchScreen({ swipeState, setSwipeState, activeTab, setActiveTab }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);

  const student = {
    name: 'Khalil',
    age: 23,
    verified: true,
    university: 'University of Lagos (UNILAG)',
    faculty: 'Environmental Sciences',
    department: 'Architecture & Design',
    distance: 'On Campus • 450m away',
    bio: 'Designing spaces by day, hunting for the best suya spots by night. Let us grab coffee at Senate Building and argue about Afrobeats playlists.',
    interests: ['🎨 3D Design', '🎵 Burna Boy', '☕ Black Coffee', '📸 Street Photography', '🏀 Hoops'],
    compatibilityBadge: '🔥 94% Campus Compatibility',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80'
    ]
  };

  const handleAction = (type) => {
    if (type === 'pass') {
      setSwipeState({ ...swipeState, passed: true, liked: false, superLiked: false });
      setTimeout(() => setSwipeState({ ...swipeState, passed: false }), 700);
    } else if (type === 'like') {
      setSwipeState({ ...swipeState, liked: true, passed: false, superLiked: false });
      setTimeout(() => setSwipeState({ ...swipeState, liked: false }), 700);
    } else if (type === 'super') {
      setSwipeState({ ...swipeState, superLiked: true, liked: false, passed: false });
      setTimeout(() => setSwipeState({ ...swipeState, superLiked: false }), 700);
    }
  };

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>

      <div className="campus-app-header">
        <div className="header-logo-group">
          <div className="app-flame-emblem">CD</div>
          <span className="app-brand-name">College Date</span>
        </div>

        <div className="header-pill-controls">
          <div className="live-campus-pulse-chip">
            <span className="pulse-dot"></span>
            <span>UNILAG</span>
          </div>
          <div className="vip-tier-chip">
            <span className="vip-star">★</span>
            <span>Unlimited</span>
          </div>
          <button className="header-icon-btn" title="Campus Radar Filter">
            <span>⚙️</span>
          </button>
        </div>
      </div>

      <div className="match-card-stage">
        <div className={`match-student-card ${swipeState.liked ? 'swiping-like' : ''} ${swipeState.passed ? 'swiping-pass' : ''} ${swipeState.superLiked ? 'swiping-super' : ''}`}>
          <div 
            className="card-photo-hero"
            style={{ backgroundImage: `url(${student.photos[photoIndex]})` }}
            onClick={() => setPhotoIndex((photoIndex + 1) % student.photos.length)}
          >
            <div className="photo-progress-segments">
              {student.photos.map((_, i) => (
                <div key={i} className={`progress-seg ${i === photoIndex ? 'active' : ''}`}></div>
              ))}
            </div>

            <div className="compatibility-ribbon">
              <span>{student.compatibilityBadge}</span>
            </div>

            <div className="live-presence-tag">
              <span className="green-radar-ping"></span>
              <span>Active on Campus Now</span>
            </div>

            <div className="card-identity-scrim">
              <div className="identity-header-row">
                <div className="name-age-wrap">
                  <h2 className="student-name">{student.name}, <span className="student-age">{student.age}</span></h2>
                  {student.verified && <span className="verified-blue-badge" title="Verified Nigerian Student">✓</span>}
                </div>
                <button 
                  className="card-expand-btn" 
                  onClick={(e) => { e.stopPropagation(); setShowFullBio(!showFullBio); }}
                >
                  {showFullBio ? '✕' : 'ℹ️'}
                </button>
              </div>

              <div className="campus-affiliation-row">
                <span className="campus-crest">🎓</span>
                <span className="campus-name">{student.university}</span>
              </div>

              <div className="department-tag-row">
                <span className="faculty-pill">{student.faculty}</span>
                <span className="distance-pill">{student.distance}</span>
              </div>

              {showFullBio && (
                <div className="expanded-student-bio">
                  <p className="bio-text">{student.bio}</p>
                  <div className="student-interest-chips">
                    {student.interests.map((int, idx) => (
                      <span key={idx} className="student-chip">{int}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {swipeState.liked && <div className="feedback-stamp like-stamp">LIKE</div>}
            {swipeState.passed && <div className="feedback-stamp pass-stamp">NOPE</div>}
            {swipeState.superLiked && <div className="feedback-stamp super-stamp">SUPER SWIPE</div>}
          </div>
        </div>
      </div>

      <div className="ergonomic-action-bar">
        <button 
          className="tactile-action-btn btn-rewind" 
          title="Rewind Last Student"
          onClick={() => handleAction('rewind')}
        >
          <span>↺</span>
        </button>

        <button 
          className="tactile-action-btn btn-pass" 
          title="Pass / Next"
          onClick={() => handleAction('pass')}
        >
          <span>✕</span>
        </button>

        <button 
          className="tactile-action-btn btn-super" 
          title="Super Swipe (Direct Alert)"
          onClick={() => handleAction('super')}
        >
          <span>★</span>
        </button>

        <button 
          className="tactile-action-btn btn-like" 
          title="Like Student"
          onClick={() => handleAction('like')}
        >
          <span>♥</span>
        </button>

        <button 
          className="tactile-action-btn btn-boost" 
          title="Campus Boost (5x Views)"
          onClick={() => alert('Campus Boost Activated! Your profile is now top 10% on UNILAG.')}
        >
          <span>⚡</span>
        </button>
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'match'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedExploreScreen({ exploreFilter, setExploreFilter, activeTab, setActiveTab }) {
  const students = [
    { name: 'Chioma', age: 19, uni: 'UNILAG', faculty: 'Law', badge: 'Casual Vibe 🔥', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', isLive: true },
    { name: 'James', age: 22, uni: 'LASU', faculty: 'Engineering', badge: 'Freshman ✨', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80', isLive: false },
    { name: 'Victory', age: 20, uni: 'UI Ibadan', faculty: 'Medicine', badge: 'Study Buddy 📚', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80', isLive: true },
    { name: 'Tobi', age: 23, uni: 'UNILAG', faculty: 'Computer Sci', badge: 'Serious Intent 💍', img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=600&auto=format&fit=crop&q=80', isLive: true },
    { name: 'Amara', age: 21, uni: 'OAU Ife', faculty: 'Pharmacy', badge: 'Night Owl 🦉', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80', isLive: false },
    { name: 'Femi', age: 24, uni: 'UNILAG', faculty: 'Economics', badge: 'Live Near Me 📍', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80', isLive: true }
  ];

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="explore-header-container">
        <div className="explore-title-row">
          <h2 className="screen-main-title">Campus Discovery</h2>
          <span className="active-students-counter">🟢 3,840 Online</span>
        </div>

        <div className="sleek-search-bar">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search by student, faculty, department..." 
            className="search-text-input"
          />
          <button className="search-filter-trigger">
            <span>⚙️</span>
          </button>
        </div>

        <div className="explore-filter-scroller">
          {['ALL', '🔴 LIVE NOW', 'UNILAG QUAD', 'NEWEST', 'LAW & MED', 'NEAR ME'].map(chip => (
            <button 
              key={chip} 
              className={`filter-pill-chip ${exploreFilter === chip ? 'active' : ''}`}
              onClick={() => setExploreFilter(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-grid-scroller">
        <div className="discovery-shelf-banner">
          <span className="shelf-fire">🔥</span>
          <div className="shelf-text-wrap">
            <span className="shelf-title">Trending at UNILAG This Week</span>
            <span className="shelf-sub">Students active in New Hall & Faculty of Science</span>
          </div>
        </div>

        <div className="structured-student-grid">
          {students.map((st, i) => (
            <div key={i} className="student-grid-card">
              <div 
                className="grid-card-thumbnail"
                style={{ backgroundImage: `url(${st.img})` }}
              >
                {st.isLive && (
                  <span className="live-grid-tag">
                    <span className="pulse-green"></span> LIVE
                  </span>
                )}
                <span className="intent-grid-badge">{st.badge}</span>
                <div className="grid-card-bottom-info">
                  <h4 className="grid-student-name">{st.name}, {st.age}</h4>
                  <div className="grid-student-campus">🎓 {st.uni} • {st.faculty}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'explore'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedChatHubScreen({ activeTab, setActiveTab }) {
  const matches = [
    { name: 'Adanna', uni: 'UNILAG', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', isNew: true },
    { name: 'Zainab', uni: 'LASU', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', isNew: true },
    { name: 'Daniel', uni: 'UI Ibadan', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', isNew: false },
    { name: 'Blessing', uni: 'OAU', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80', isNew: false }
  ];

  const threads = [
    { id: 1, name: 'Adanna Okafor', uni: 'UNILAG (Law)', lastMsg: 'Are you in the library today? 😂', time: '2m ago', unread: 2, isOnline: true, img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
    { id: 2, name: 'Chioma Nwosu', uni: 'UNILAG (Sci)', lastMsg: '🎤 Voice note (0:42)', time: '18m ago', unread: 0, isOnline: true, img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80' },
    { id: 3, name: 'Zainab Bello', uni: 'LASU (Arts)', lastMsg: 'I saw your confession! That was hilarious.', time: '2h ago', unread: 0, isOnline: false, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' },
    { id: 4, name: 'Daniel Ade', uni: 'UI Ibadan', lastMsg: 'Let us link up after your exam tomorrow.', time: '1d ago', unread: 0, isOnline: false, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' }
  ];

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="chat-hub-header">
        <div className="chat-title-row">
          <h2 className="screen-main-title">Messages</h2>
          <div className="chat-header-actions">
            <button className="chat-search-trigger">🔍</button>
            <button className="chat-shield-trigger" title="Safety Center">🛡️</button>
          </div>
        </div>

        <div className="crush-monetization-row">
          <div className="crush-bubble-card likes-card">
            <div className="crush-icon-glow">❤️</div>
            <div className="crush-info">
              <span className="crush-count">14 Crushes</span>
              <span className="crush-label">Liked your profile</span>
            </div>
            <span className="unlock-badge">Unlock</span>
          </div>

          <div className="crush-bubble-card views-card">
            <div className="crush-icon-glow">👀</div>
            <div className="crush-info">
              <span className="crush-count">48 Views</span>
              <span className="crush-label">Checked your profile</span>
            </div>
            <span className="unlock-badge">See</span>
          </div>
        </div>

        <div className="new-matches-tray">
          <span className="tray-label">NEW MATCHES</span>
          <div className="matches-avatars-scroller">
            {matches.map((m, i) => (
              <div key={i} className="match-avatar-item">
                <div 
                  className={`avatar-ring ${m.isNew ? 'gold-pulse-ring' : ''}`}
                  style={{ backgroundImage: `url(${m.img})` }}
                ></div>
                <span className="avatar-name">{m.name}</span>
                <span className="avatar-campus">{m.uni}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="conversation-threads-list">
        <span className="conversations-label">RECENT CONVERSATIONS</span>
        {threads.map(t => (
          <div key={t.id} className={`conversation-row-card ${t.unread > 0 ? 'has-unread' : ''}`}>
            <div className="thread-avatar-wrap">
              <div className="thread-avatar" style={{ backgroundImage: `url(${t.img})` }}></div>
              {t.isOnline && <span className="thread-online-dot"></span>}
            </div>

            <div className="thread-content-wrap">
              <div className="thread-name-time">
                <span className="thread-name">{t.name}</span>
                <span className="thread-time">{t.time}</span>
              </div>
              <span className="thread-campus-badge">{t.uni}</span>
              <p className="thread-last-message">{t.lastMsg}</p>
            </div>

            {t.unread > 0 && (
              <span className="thread-unread-pill">{t.unread}</span>
            )}
          </div>
        ))}
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'chat'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedConversationScreen() {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="chat-room-nav-bar">
        <button className="chat-back-btn">←</button>
        <div className="chat-partner-info">
          <div className="chat-avatar-thumb" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80')` }}></div>
          <div>
            <h4 className="chat-partner-name">Adanna Okafor ✓</h4>
            <span className="chat-partner-status">🎓 UNILAG (Law) • Active Now</span>
          </div>
        </div>
        <div className="chat-call-actions">
          <button className="call-btn-voice" title="Start Free Voice Call">📞</button>
          <button className="call-btn-video" title="Start HD Video Call">📹</button>
        </div>
      </div>

      <div className="conversation-campus-banner">
        <span>🎉 You matched on UNILAG Campus! Both love 🎵 Burna Boy & 🍕 Domino's</span>
      </div>

      <div className="chat-messages-feed">
        <div className="message-group inbound">
          <div className="bubble-inbound">
            Hey! I saw you are also in Law faculty. Are you taking Commercial Law this semester? 📚
            <span className="bubble-timestamp">9:32 AM</span>
          </div>
        </div>

        <div className="message-group outbound">
          <div className="bubble-outbound">
            Haha yes! The lectures with Prof. Adeleke are wild. Are you surviving? 😂
            <span className="bubble-timestamp">9:34 AM • ✓✓</span>
          </div>
        </div>

        <div className="message-group inbound">
          <div className="bubble-inbound">
            Barely! We should grab coffee at Senate Cafe before the 2pm class.
            <span className="bubble-timestamp">9:38 AM</span>
          </div>
        </div>

        <div className="date-invite-card">
          <div className="date-invite-header">
            <span>☕ Campus Coffee Invite</span>
            <span className="invite-tag">UNILAG Quad</span>
          </div>
          <p className="invite-text">Meet at Senate Cafe • Today at 1:30 PM</p>
          <div className="invite-btn-row">
            <button className="invite-btn-accept">Accept & Match Time</button>
            <button className="invite-btn-reschedule">Suggest Time</button>
          </div>
        </div>
      </div>

      <div className="chat-composer-bar">
        <button className="composer-attach-btn">📎</button>
        <button className="composer-voice-btn">🎙️</button>
        <input 
          type="text" 
          placeholder="Send a message to Adanna..." 
          className="composer-input"
        />
        <button className="composer-send-btn">➤</button>
      </div>
    </div>
  );
}

function ProposedConfessionsScreen({ confessionTab, setConfessionTab, activeTab, setActiveTab }) {
  const confessions = [
    {
      id: 1,
      mask: '🦉 Akoka Owl',
      faculty: 'Faculty of Law',
      time: '12m ago',
      category: 'Crush 💘',
      content: 'To the guy in the blue vintage jacket reading at Main Library 2nd floor: your smile distracted my entire exam prep today. Please be single. 😭❤️',
      reactions: { fire: 42, laugh: 8, dead: 19, shocked: 14 },
      commentsCount: 16
    },
    {
      id: 2,
      mask: '🎭 Moremi Ghost',
      faculty: 'Sciences',
      time: '45m ago',
      category: 'Lecturers 👨‍🏫',
      content: 'When Prof says "This exam is straight from lecture slides" but Question 1 is from the 1994 Nigerian Constitution syllabus. How far now?! 💀💀',
      reactions: { fire: 89, laugh: 64, dead: 112, shocked: 5 },
      commentsCount: 38
    }
  ];

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="confessions-header-wrap">
        <div className="confessions-top-row">
          <div>
            <span className="confessions-campus-pill">🎓 UNIVERSITY OF LAGOS (UNILAG)</span>
            <h2 className="screen-main-title">Campus Secrets</h2>
          </div>
          <button className="confessions-rules-btn" title="Anonymity Guarantee">🔒 100% Anonymous</button>
        </div>

        <div className="confessions-filter-tabs">
          {['TRENDING 🔥', 'CRUSHES 💘', 'CAMPUS DRAMA 🎭', 'LECTURERS 👨‍🏫'].map(tab => (
            <button 
              key={tab} 
              className={`confession-tab-chip ${confessionTab === tab ? 'active' : ''}`}
              onClick={() => setConfessionTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="confessions-feed-stream">
        {confessions.map(c => (
          <div key={c.id} className="confession-story-card">
            <div className="confession-meta-row">
              <div className="mask-author-wrap">
                <span className="mask-avatar">🎭</span>
                <div>
                  <span className="mask-name">{c.mask}</span>
                  <span className="mask-faculty">{c.faculty} • {c.time}</span>
                </div>
              </div>
              <span className="confession-cat-badge">{c.category}</span>
            </div>

            <p className="confession-story-body">{c.content}</p>

            <div className="confession-reaction-row">
              <button className="reaction-chip">🔥 {c.reactions.fire}</button>
              <button className="reaction-chip">😂 {c.reactions.laugh}</button>
              <button className="reaction-chip">💀 {c.reactions.dead}</button>
              <button className="reaction-chip comments-chip">💬 {c.commentsCount} replies</button>
            </div>
          </div>
        ))}
      </div>

      <div className="floating-composer-dock">
        <button className="spill-the-tea-btn" onClick={() => alert('Opening Anonymous Campus Secret Composer...')}>
          <span>🤫 Spill the Tea Anonymously...</span>
          <span className="pencil-icon">✏️</span>
        </button>
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'confessions'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedProfileScreen({ profilePreviewMode, setProfilePreviewMode, activeTab, setActiveTab }) {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="profile-stage-scroller">
        <div className="profile-view-toggle-bar">
          <button 
            className={`view-mode-pill ${profilePreviewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setProfilePreviewMode('preview')}
          >
            👁️ How Others See Me
          </button>
          <button 
            className={`view-mode-pill ${profilePreviewMode === 'manage' ? 'active' : ''}`}
            onClick={() => setProfilePreviewMode('manage')}
          >
            ⚙️ Manage Profile
          </button>
        </div>

        <div className="profile-hero-showcase">
          <div 
            className="hero-avatar-cover"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80')` }}
          >
            <div className="hero-avatar-overlay">
              <div className="hero-name-row">
                <h2 className="hero-student-name">Alex Davis, 22</h2>
                <span className="hero-verified-badge">✓ Verified</span>
              </div>
              <span className="hero-campus">🎓 University of Lagos (UNILAG)</span>
              <span className="hero-dept">Department of Computer Science • 300 Level</span>
            </div>
          </div>
        </div>

        <div className="profile-strength-panel">
          <div className="strength-header">
            <span className="strength-title">Profile Appeal Score</span>
            <span className="strength-percent">85% • Very High</span>
          </div>
          <div className="strength-progress-track">
            <div className="strength-progress-fill" style={{ width: '85%' }}></div>
          </div>
          <span className="strength-tip">💡 Add 1 voice prompt to reach 100% appeal and 3x your matches.</span>
        </div>

        <div className="ai-coach-card-v2">
          <div className="coach-badge-row">
            <span className="coach-tag">🤖 AI PROFILE COACH</span>
            <span className="coach-action">View Full Report →</span>
          </div>
          <h4 className="coach-heading">Your photos resonate strongly with Faculty of Arts & Sciences!</h4>
          <p className="coach-body">Your first photo has great lighting. Adding a prompt about campus hangout spots will increase conversation starts by 42%.</p>
        </div>

        <div className="profile-wallet-ribbon">
          <div className="ribbon-balance-group">
            <span className="ribbon-label">AVAILABLE WALLET</span>
            <span className="ribbon-amount">₦12,500.00</span>
          </div>
          <button className="ribbon-manage-btn">Manage Wallet →</button>
        </div>

        <div className="profile-hubs-grid">
          <div className="hub-card gold-hub">
            <span className="hub-icon">👑</span>
            <span className="hub-title">Elite Pass</span>
            <span className="hub-sub">Active • Unlimited</span>
          </div>

          <div className="hub-card">
            <span className="hub-icon">📊</span>
            <span className="hub-title">Leaderboard</span>
            <span className="hub-sub">Rank #14 • UNILAG</span>
          </div>

          <div className="hub-card">
            <span className="hub-icon">🎁</span>
            <span className="hub-title">Squad Rewards</span>
            <span className="hub-sub">3 Free Swipes</span>
          </div>

          <div className="hub-card">
            <span className="hub-icon">🛡️</span>
            <span className="hub-title">Campus Safety</span>
            <span className="hub-sub">Ghost Mode & Help</span>
          </div>
        </div>
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'profile'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedEditProfileScreen() {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="edit-profile-header">
        <button className="edit-back-btn">←</button>
        <h2 className="screen-main-title">Profile Studio</h2>
        <button className="edit-save-btn">Save</button>
      </div>

      <div className="edit-profile-scroller">
        <div className="photo-studio-section">
          <div className="section-meta-row">
            <span className="section-h4">YOUR PHOTOS (6 SLOTS)</span>
            <span className="section-hint">Drag to reorder • Slot 1 is Primary</span>
          </div>

          <div className="photo-grid-slots">
            <div className="photo-slot primary-slot" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80')` }}>
              <span className="primary-pill">MAIN</span>
            </div>
            <div className="photo-slot" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80')` }}></div>
            <div className="photo-slot" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80')` }}></div>
            <div className="photo-slot empty-slot"><span>+ Add Photo</span></div>
            <div className="photo-slot empty-slot"><span>+ Add Photo</span></div>
            <div className="photo-slot empty-slot"><span>+ Add Photo</span></div>
          </div>
        </div>

        <div className="edit-input-card">
          <label className="input-label">CAMPUS BIO</label>
          <textarea 
            className="input-textarea"
            defaultValue="Designing spaces by day, hunting for the best suya spots by night. Let us grab coffee at Senate Building and argue about Afrobeats playlists."
            rows="3"
          ></textarea>
        </div>

        <div className="edit-input-card">
          <label className="input-label">CAMPUS & DEPARTMENT</label>
          <div className="readonly-verified-field">
            <span>🎓 University of Lagos (UNILAG)</span>
            <span className="field-locked">Locked (Verified)</span>
          </div>
          <div className="edit-field-row">
            <input type="text" defaultValue="Computer Science" className="edit-text-input" placeholder="Department" />
            <select className="edit-select-input">
              <option>300 Level</option>
              <option>100 Level</option>
              <option>200 Level</option>
              <option>400 Level</option>
              <option>500 Level</option>
            </select>
          </div>
        </div>

        <div className="prompt-studio-card">
          <div className="prompt-header-row">
            <span className="prompt-tag">CAMPUS PROMPT #1</span>
            <span className="prompt-change">Change Prompt</span>
          </div>
          <h4 className="prompt-question">"The best place for a first date on our campus is..."</h4>
          <input 
            type="text" 
            defaultValue="Senate Cafe patio during golden hour with cold zobo."
            className="prompt-answer-input"
          />
        </div>
      </div>
    </div>
  );
}

function ProposedLeaderboardScreen({ leaderboardPeriod, setLeaderboardPeriod, activeTab, setActiveTab }) {
  const topStudents = [
    { rank: 1, name: 'Khalil', score: '1,742 fans', uni: 'UNILAG (Arch)', crown: '👑 1st', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
    { rank: 2, name: 'James', score: '1,226 fans', uni: 'LASU (Engr)', crown: '🥈 2nd', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80' },
    { rank: 3, name: 'Victory', score: '784 fans', uni: 'UI Ibadan', crown: '🥉 3rd', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' }
  ];

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="leaderboard-header">
        <div className="leaderboard-title-row">
          <h2 className="screen-main-title">Campus Fame</h2>
          <span className="countdown-pill">⏳ Resets in 2d 14h</span>
        </div>

        <div className="leaderboard-prize-banner">
          <span>🏆 Top 3 Win 1 Month Free Elite Pass + Gold Crown Badge!</span>
        </div>

        <div className="leaderboard-category-tabs">
          <button className="lb-tab active">Most Wanted 🔥</button>
          <button className="lb-tab">Top Spenders 💸</button>
          <button className="lb-tab">Campus Battle ⚔️</button>
        </div>
      </div>

      <div className="leaderboard-podium-stage">
        <div className="podium-tier rank-2">
          <div className="podium-avatar-ring silver-ring" style={{ backgroundImage: `url(${topStudents[1].img})` }}></div>
          <span className="podium-rank-badge silver-badge">2</span>
          <span className="podium-name">{topStudents[1].name}</span>
          <span className="podium-score">{topStudents[1].score}</span>
          <div className="podium-pillar pillar-silver"></div>
        </div>

        <div className="podium-tier rank-1">
          <span className="gold-crown-icon">👑</span>
          <div className="podium-avatar-ring gold-ring" style={{ backgroundImage: `url(${topStudents[0].img})` }}></div>
          <span className="podium-rank-badge gold-badge">1</span>
          <span className="podium-name">{topStudents[0].name}</span>
          <span className="podium-score">{topStudents[0].score}</span>
          <div className="podium-pillar pillar-gold"></div>
        </div>

        <div className="podium-tier rank-3">
          <div className="podium-avatar-ring bronze-ring" style={{ backgroundImage: `url(${topStudents[2].img})` }}></div>
          <span className="podium-rank-badge bronze-badge">3</span>
          <span className="podium-name">{topStudents[2].name}</span>
          <span className="podium-score">{topStudents[2].score}</span>
          <div className="podium-pillar pillar-bronze"></div>
        </div>
      </div>

      <div className="leaderboard-list-feed">
        <span className="lb-feed-header">RISING STARS</span>
        <div className="lb-list-row">
          <span className="lb-row-rank">04</span>
          <div className="lb-row-avatar" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80')` }}></div>
          <div className="lb-row-info">
            <span className="lb-row-name">Lovie Chidinma</span>
            <span className="lb-row-uni">University of Port Harcourt</span>
          </div>
          <span className="lb-row-score">540 fans</span>
        </div>
      </div>

      <div className="sticky-user-rank-dock">
        <div className="my-rank-info">
          <span className="my-rank-num">#14</span>
          <div>
            <span className="my-rank-label">Your Campus Ranking</span>
            <span className="my-rank-sub">You need 85 fans to enter Top 10</span>
          </div>
        </div>
        <button className="boost-my-rank-btn">Boost Me ⚡</button>
      </div>

      <ProposedBottomNavBar activeTab={activeTab || 'profile'} setActiveTab={setActiveTab} />
    </div>
  );
}

function ProposedPremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="premium-scroller">
        <div className="premium-hero-header">
          <div className="gold-diamond-emblem">💎</div>
          <span className="premium-eyebrow">COLLEGE DATE ELITE PASS</span>
          <h2 className="premium-hero-headline">Own Your Campus Dating Life</h2>
          <p className="premium-hero-sub">Stop guessing who likes you. Get 5x more matches and priority visibility on campus.</p>
        </div>

        <div className="premium-benefits-cards">
          <div className="benefit-card">
            <span className="benefit-icon">👀</span>
            <div>
              <h4 className="benefit-title">See Who Crushed On You</h4>
              <p className="benefit-desc">Instantly view all 14 students who swiped right on your profile and match immediately.</p>
            </div>
          </div>

          <div className="benefit-card">
            <span className="benefit-icon">⚡</span>
            <div>
              <h4 className="benefit-title">Unlimited Campus Swipes</h4>
              <p className="benefit-desc">Never run out of swipes. Discover every student across all faculties with zero daily limits.</p>
            </div>
          </div>

          <div className="benefit-card">
            <span className="benefit-icon">👑</span>
            <div>
              <h4 className="benefit-title">Top 10% Campus Priority</h4>
              <p className="benefit-desc">Your profile is placed at the top of the stack for everyone swiping on your campus.</p>
            </div>
          </div>
        </div>

        <div className="pricing-tiers-wrap">
          <div 
            className={`tier-card ${selectedPlan === 'weekly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('weekly')}
          >
            <span className="tier-duration">1 WEEK</span>
            <span className="tier-price">₦1,500</span>
            <span className="tier-sub">Starter pass</span>
          </div>

          <div 
            className={`tier-card popular-tier ${selectedPlan === 'monthly' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <span className="popular-badge">MOST POPULAR</span>
            <span className="tier-duration">1 MONTH</span>
            <span className="tier-price">₦3,900</span>
            <span className="tier-sub">₦975 / week (Save 35%)</span>
          </div>

          <div 
            className={`tier-card ${selectedPlan === 'semester' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('semester')}
          >
            <span className="tier-duration">SEMESTER PASS</span>
            <span className="tier-price">₦9,500</span>
            <span className="tier-sub">Full Semester (Save 50%)</span>
          </div>
        </div>

        <div className="premium-cta-block">
          <button className="google-play-upgrade-btn">
            <span>Upgrade with Google Play</span>
            <span className="btn-arrow">→</span>
          </button>
          <span className="cancel-anytime-note">🔒 Cancel anytime in Google Play Store • Instant activation</span>
        </div>
      </div>
    </div>
  );
}

function ProposedWalletScreen({ walletTab, setWalletTab }) {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="wallet-stage-scroller">
        <div className="wallet-header">
          <h2 className="screen-main-title">Student Wallet</h2>
          <span className="wallet-support-link">Help & Support</span>
        </div>

        <div className="fintech-virtual-card">
          <div className="card-top-chip-row">
            <span className="card-brand-logo">College Date Pay</span>
            <span className="card-chip-icon">💳</span>
          </div>
          <span className="card-balance-label">AVAILABLE BALANCE</span>
          <h3 className="card-balance-digits">₦12,500.00</h3>
          <div className="card-bottom-info">
            <span>Alex Davis • UNILAG</span>
            <span>ID: CD-9428</span>
          </div>
        </div>

        <div className="wallet-actions-row">
          <button className="wallet-btn-primary">
            <span>+ Add Funds</span>
          </button>
          <button className="wallet-btn-secondary">
            <span>🏦 Withdraw to Bank</span>
          </button>
        </div>

        <div className="quick-topup-section">
          <span className="quick-label">QUICK DEPOSIT PRESETS</span>
          <div className="preset-chips-row">
            <button className="preset-chip">₦1,000</button>
            <button className="preset-chip active">₦2,500</button>
            <button className="preset-chip">₦5,000</button>
            <button className="preset-chip">₦10,000</button>
          </div>
        </div>

        <div className="wallet-ledger-feed">
          <span className="ledger-title">RECENT ACTIVITY</span>
          <div className="ledger-item">
            <div className="ledger-icon-wrap in">⬇</div>
            <div className="ledger-text">
              <span className="ledger-name">Referral Bonus (3 Friends)</span>
              <span className="ledger-date">Today, 2:15 PM</span>
            </div>
            <span className="ledger-amount credit">+₦1,500.00</span>
          </div>

          <div className="ledger-item">
            <div className="ledger-icon-wrap out">⬆</div>
            <div className="ledger-text">
              <span className="ledger-name">Super Swipe (Chioma Law)</span>
              <span className="ledger-date">Yesterday, 8:40 PM</span>
            </div>
            <span className="ledger-amount debit">-₦250.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposedReferralsScreen() {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="referrals-scroller">
        <div className="referrals-hero-card">
          <div className="hero-gift-icon">🎁</div>
          <h2 className="referrals-headline">Invite Friends, Get Free Swipes & Cash</h2>
          <p className="referrals-sub">Give friends 20 free swipes. When they sign up, you get ₦500 and 1 week of free Elite benefits!</p>
        </div>

        <div className="referral-code-card">
          <span className="ref-label">YOUR UNIQUE CAMPUS CODE</span>
          <div className="code-display-row">
            <span className="code-text">CD-ALEX26</span>
            <button className="copy-code-btn">Copy</button>
          </div>
        </div>

        <div className="whatsapp-share-block">
          <button className="whatsapp-share-btn" onClick={() => alert('Opening WhatsApp to share invite...')}>
            <span className="wa-icon">💬</span>
            <span>Share directly on WhatsApp</span>
          </button>
        </div>

        <div className="milestone-tracker-card">
          <span className="milestone-title">SQUAD MILESTONES</span>
          <div className="milestone-steps">
            <div className="milestone-step done">
              <span className="step-check">✓</span>
              <span>1 Friend (20 Swipes)</span>
            </div>
            <div className="milestone-step active">
              <span className="step-num">2</span>
              <span>3 Friends (1 Wk Premium)</span>
            </div>
            <div className="milestone-step">
              <span className="step-num">3</span>
              <span>5 Friends (Verified Crown)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposedSettingsScreen() {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="settings-scroller">
        <div className="settings-top-header">
          <h2 className="screen-main-title">Settings & Privacy</h2>
        </div>

        <div className="settings-group-card">
          <span className="group-header">ACCOUNT & UNIVERSITY</span>
          <div className="setting-item-row">
            <div className="setting-label-group">
              <span className="setting-title">Campus Verification</span>
              <span className="setting-sub">UNILAG • Matric ID verified</span>
            </div>
            <span className="verified-green-tag">✓ Verified</span>
          </div>
          <div className="setting-item-row">
            <div className="setting-label-group">
              <span className="setting-title">Campus Ghost Mode</span>
              <span className="setting-sub">Hide profile from your own department</span>
            </div>
            <input type="checkbox" className="native-switch" />
          </div>
        </div>

        <div className="settings-group-card">
          <span className="group-header">NOTIFICATIONS</span>
          <div className="setting-item-row">
            <div className="setting-label-group">
              <span className="setting-title">New Match & Message Alerts</span>
              <span className="setting-sub">Instant push notifications for chats</span>
            </div>
            <input type="checkbox" defaultChecked className="native-switch" />
          </div>
          <div className="setting-item-row">
            <div className="setting-label-group">
              <span className="setting-title">Campus Crush Activity</span>
              <span className="setting-sub">When someone nearby likes your card</span>
            </div>
            <input type="checkbox" defaultChecked className="native-switch" />
          </div>
        </div>

        <div className="settings-group-card">
          <span className="group-header">SAFETY & COMMUNITY STANDARDS</span>
          <div className="setting-item-row link-row">
            <span>🛡️ Campus Safety Center & Guidelines</span>
            <span className="chevron">›</span>
          </div>
          <div className="setting-item-row link-row">
            <span>🔒 Child Safety & Protection Standards</span>
            <span className="chevron">›</span>
          </div>
          <div className="setting-item-row link-row">
            <span>🚫 Blocked Coursemates (0)</span>
            <span className="chevron">›</span>
          </div>
        </div>

        <div className="settings-group-card">
          <button className="logout-action-btn">Sign Out of Account</button>
          <button className="delete-account-btn">Delete Account & Data</button>
        </div>
      </div>
    </div>
  );
}

function ProposedAuthScreen() {
  return (
    <div className="mobile-app-canvas auth-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="auth-hero-scroller">
        <div className="auth-brand-emblem">CD</div>
        <h1 className="auth-headline">Where Nigerian Campus Connections Happen.</h1>
        <p className="auth-sub">Verified student dating, anonymous campus confessions, and social discovery.</p>

        <div className="campus-ticker-wrap">
          <span className="ticker-label">ACTIVE CAMPUSES</span>
          <div className="ticker-tags">
            <span>🎓 UNILAG</span>
            <span>🎓 LASU</span>
            <span>🎓 UI Ibadan</span>
            <span>🎓 OAU Ife</span>
            <span>🎓 FUTA</span>
          </div>
        </div>

        <div className="auth-actions-wrap">
          <button className="google-auth-btn">
            <span className="google-icon">G</span>
            <span>Continue with Student Google</span>
          </button>
          <button className="email-auth-btn">Sign in with Email</button>
          <span className="auth-trust-notice">🔒 100% Verified University Students • No Bots</span>
        </div>
      </div>
    </div>
  );
}

function ProposedStatesScreen() {
  return (
    <div className="mobile-app-canvas">
      <div className="native-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons"><span>5G</span><span>100%</span></div>
      </div>

      <div className="empty-state-canvas">
        <div className="empty-illustration-badge">🎓</div>
        <h3 className="empty-title">You have Swiped Through the Campus Quad!</h3>
        <p className="empty-desc">You have seen all active profiles in your faculty today. New students join every afternoon.</p>

        <div className="empty-actions-row">
          <button className="empty-btn-primary">Expand to All Faculties</button>
          <button className="empty-btn-secondary">Explore Campus Secrets</button>
        </div>

        <div className="haptic-toast-preview">
          <span className="toast-icon">⚡</span>
          <span>Boost Active: You are being shown to 45 students right now!</span>
        </div>
      </div>
    </div>
  );
}

function ProposedBottomNavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'match', label: 'Match', icon: '🔥' },
    { id: 'explore', label: 'Explore', icon: '🧭' },
    { id: 'chat', label: 'Messages', icon: '💬', badge: 2 },
    { id: 'confessions', label: 'Secrets', icon: '🤫' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <div className="proposed-bottom-nav">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab && setActiveTab(tab.id)}
        >
          <span className="nav-tab-icon">{tab.icon}</span>
          <span className="nav-tab-label">{tab.label}</span>
          {tab.badge && <span className="nav-tab-badge">{tab.badge}</span>}
          {activeTab === tab.id && <span className="nav-active-pill"></span>}
        </button>
      ))}
    </div>
  );
}
