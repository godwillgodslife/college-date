import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './AndroidUXComparison.css';

// ── Nigerian Campus Mock Profiles ──────────────────────────────────
const PROFILES = {
  ada: {
    name: 'Ada Okonkwo',
    age: 21,
    school: 'UNILAG',
    faculty: 'Law',
    level: '300L',
    bio: 'Future corporate attorney ⚖️ • Foodie • Coffee & Afrobeats 🎶 • Let us get suya at Akoka gate!',
    interests: ['Law', 'Debate', 'Afrobeats', 'Suya', 'Photography'],
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    distance: '0.8 km away (Library)',
    badge: 'Campus Royalty',
    isLive: true,
  },
  kemi: {
    name: 'Kemi Adeyemi',
    age: 20,
    school: 'LASU',
    faculty: 'Mass Comm',
    level: '200L',
    bio: 'Podcast host 🎙️ • Campus journalist • Drama-free vibes only 💅',
    interests: ['Journalism', 'Fashion', 'Podcasts', 'Netflix'],
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    distance: '2.4 km away',
    badge: 'Gold',
    isLive: false,
  },
  tunde: {
    name: 'Tunde Bello',
    age: 22,
    school: 'UI Ibadan',
    faculty: 'Computer Science',
    level: '400L',
    bio: 'Building web apps by day 💻 • Chess player • Arsenal FC 🔴⚪',
    interests: ['Coding', 'Chess', 'Arsenal', 'Tech'],
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
    distance: 'On Campus',
    badge: 'Gold',
    isLive: true,
  },
  ify: {
    name: 'Ify Nwosu',
    age: 21,
    school: 'UNIBEN',
    faculty: 'Medicine',
    level: '300L',
    bio: 'Future surgeon 🩺 • Loves dancing & gospel concerts • Big foodie 🍛',
    interests: ['Medicine', 'Dance', 'Cooking', 'Travel'],
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    distance: '3.1 km away',
    badge: 'Silver',
    isLive: true,
  },
  chike: {
    name: 'Chike Obi',
    age: 23,
    school: 'FUTA',
    faculty: 'Mechanical Eng',
    level: '500L',
    bio: 'Finalist 🎓 • Formula Student engineer • Afrobeats DJ on weekends 🎧',
    interests: ['Engineering', 'Music', 'Fitness', 'Gaming'],
    verified: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    distance: '1.2 km away',
    badge: 'Bronze',
    isLive: false,
  },
  blessing: {
    name: 'Blessing Eze',
    age: 20,
    school: 'OAU',
    faculty: 'Pharmacy',
    level: '200L',
    bio: 'Pharmacy student 💊 • Bookworm • Loves spontaneous road trips 🚗',
    interests: ['Pharmacy', 'Books', 'Travel', 'Art'],
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    distance: '0.4 km away (Hezekiah)',
    badge: 'Royalty',
    isLive: true,
  }
};

// ── Screen Definitions ─────────────────────────────────────────────
const SCREENS = [
  // ── Authentication
  {
    id: 'splash',
    category: 'AUTH',
    title: 'Splash Screen',
    categoryLabel: 'Authentication',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed during Phase 3 forensic audit on Pixel 4a (android_phase3_00)',
    sourceImproved: 'Phase 4.1 Implementation in src/styles/androidPolish.css',
    whatChanged: [
      'Added typographic brand lockup "College Date — Campus Dating & Connection"',
      'Added subtle Nigerian university pulse indicator ("Connecting to UNILAG...")',
      'Configured safe-area inset reservation to prevent abrupt cold-boot flash'
    ],
    whyBetter: [
      'Reinforces campus trust immediately on boot',
      'Eliminates perceived cold-boot latency with smooth transition'
    ]
  },
  {
    id: 'welcome',
    category: 'AUTH',
    title: 'Welcome / Landing',
    categoryLabel: 'Authentication',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed during Phase 3 audit on Pixel 4a (android_phase3_00_ready)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Landing.jsx / androidPolish.css',
    whatChanged: [
      'Enriched value badges: "15+ Campuses", "Verified Student Identity", "Anonymous Confessions"',
      'High-contrast Obsidian Neon CTA buttons with 52dp minimum touch target',
      'Lowered CTA placement into natural ergonomic thumb comfort zone'
    ],
    whyBetter: [
      'Clear student-only exclusivity signals',
      'Zero finger strain when tapping Get Started or Sign In'
    ]
  },
  {
    id: 'signup',
    category: 'AUTH',
    title: 'Signup & Referral Code',
    categoryLabel: 'Authentication',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed in Phase 3 audit on Pixel 4a with corrupted UTF-8 (android_screen_31)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Signup.jsx',
    whatChanged: [
      'Fixed corrupted UTF-8 mojibake byte sequence (ðŸ¤  → 🎁)',
      'Added clear referral placeholder (CD-ABCDE)',
      'Enlarged Guy/Lady role selector pills with 48dp+ tap targets'
    ],
    whyBetter: [
      'Eliminates broken Unicode visual bug',
      'Clear, accessible form fields on all screen densities'
    ]
  },
  {
    id: 'login',
    category: 'AUTH',
    title: 'Login Screen',
    categoryLabel: 'Authentication',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed during Phase 3 forensic audit (android_screen_30)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Login.jsx',
    whatChanged: [
      'Obsidian glass card styling with subtle ambient glow',
      'High-contrast Google One-Tap sign in button with SVG icon',
      'Safe keyboard bottom spacing preventing button clipping'
    ],
    whyBetter: [
      'Faster login comprehension',
      'No visual overlap with Android system navigation'
    ]
  },

  // ── Discovery
  {
    id: 'match',
    category: 'DISCOVERY',
    title: 'Match / Swipe Stack',
    categoryLabel: 'Discovery',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed in Phase 3 audit (android_screen_32)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Match.jsx / SwipeCard.css',
    whatChanged: [
      'Full-bleed 3:4 profile card container (94% width) with rich campus details',
      'Swipe action buttons (Pass ❌, Super Swipe ⭐, Like 💖) positioned below card in thumb arc',
      'Floating bottom navigation clearance to prevent card content occlusion'
    ],
    whyBetter: [
      'Easy one-handed swiping without stretching thumb to center',
      'Student faculty, level, and campus badge are always fully visible'
    ]
  },
  {
    id: 'explore',
    category: 'DISCOVERY',
    title: 'Explore Grid (2-Col vs 3-Col)',
    categoryLabel: 'Discovery',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed in Phase 3 audit with cramped 3-column grid (android_screen_33)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Explore.css / androidPolish.css',
    whatChanged: [
      'Upgraded from cramped 3-column micro-cards to balanced 2-column masonry grid',
      'Increased card row height to 220px for high facial recognition',
      'Sticky blurred category pills (All, UNILAG, LASU, UI, Freshers, Finalists)'
    ],
    whyBetter: [
      'Faces and names are immediately recognizable without squinting',
      'Tap accuracy on student profile cards increased significantly'
    ]
  },
  {
    id: 'filters',
    category: 'DISCOVERY',
    title: 'Filter & Search Panel',
    categoryLabel: 'Discovery',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed filter dialog in Phase 3 audit',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Explore.jsx',
    whatChanged: [
      'Elevated bottom sheet drawer with rounded top corners',
      'Campus selector pills (UNILAG, LASU, UI Ibadan, UNIBEN, FUTA, OAU)',
      'Clear Reset & Apply buttons with tactile haptic cues'
    ],
    whyBetter: [
      'Instant campus filtering for authentic student matchmaking',
      'Clean dismissal with downward swipe or backdrop tap'
    ]
  },

  // ── Messaging
  {
    id: 'chat_list',
    category: 'MESSAGING',
    title: 'Chat Inbox / Recent Chats',
    categoryLabel: 'Messaging',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed in Phase 3 audit on Pixel 4a (android_screen_34)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Chat.jsx',
    whatChanged: [
      'Top Live Stories / Campus Status bubbles row with glowing emerald presence rings',
      'High-contrast conversation items with campus badge, timestamp, and unread indicator',
      'Swipe-to-archive / pin gesture affordance'
    ],
    whyBetter: [
      'Instant visibility of who is online on your campus right now',
      'Clean separation between active conversations and new matches'
    ]
  },
  {
    id: 'chat_dm',
    category: 'MESSAGING',
    title: 'Individual Chat / DM',
    categoryLabel: 'Messaging',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed in Phase 3 audit',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Chat.jsx / androidPolish.css',
    whatChanged: [
      'Full-width composer with dedicated voice note, media, and send buttons',
      'Obsidian chat bubbles with gradient highlight for sent messages and double checkmarks',
      'Header with student photo, campus, active status, and audio/video call shortcuts'
    ],
    whyBetter: [
      'Modern messaging ergonomics matching student communication expectations',
      'Comfortable typing area with clear call actions'
    ]
  },
  {
    id: 'chat_keyboard',
    category: 'MESSAGING',
    title: 'Keyboard Open Chat Interaction',
    categoryLabel: 'Messaging',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Directly observed during keyboard focus testing in Phase 3',
    sourceImproved: 'Phase 4.1 Implementation in src/styles/androidPolish.css (--keyboard-offset)',
    whatChanged: [
      'Composer smoothly translates above virtual Android keyboard using --keyboard-offset',
      'Message history remains scrollable without visual jumps',
      'Floating bottom nav automatically hides while typing'
    ],
    whyBetter: [
      'Zero layout clipping or input hiding behind Android Gboard',
      'Maximum message viewport retained during active conversation'
    ]
  },

  // ── Profile
  {
    id: 'profile',
    category: 'PROFILE',
    title: 'User Profile & Settings',
    categoryLabel: 'Profile',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed in Phase 3 audit with bottom nav covering action cards (android_screen_35)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Profile.jsx / androidPolish.css',
    whatChanged: [
      'Hero cover photo with verified campus badge and completion gauge',
      'Wallet & Referrals summary cards with instant reward status (₦ Balance, Super Swipes)',
      'Added 96px bottom reserve so profile action cards are never occluded by bottom nav'
    ],
    whyBetter: [
      'Complete visibility of profile management, settings, and wallet actions',
      'Encourages profile completion and campus peer referrals'
    ]
  },

  // ── Social
  {
    id: 'confessions',
    category: 'SOCIAL',
    title: 'Campus Confessions',
    categoryLabel: 'Social',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed in Phase 3 audit (android_screen_36)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Confessions.jsx',
    whatChanged: [
      'Deep obsidian card with campus tag (e.g. 🏛️ UNILAG Confession)',
      'Inline emoji reaction bar (🔥 84, 💀 42, 😱 19, ❤️ 105)',
      'Ergonomic Post Secret FAB floating cleanly above the bottom navigation'
    ],
    whyBetter: [
      'Higher campus engagement and authentic student anonymity',
      'Clean scrolling feed without FAB collision with bottom navigation'
    ]
  },
  {
    id: 'leaderboard',
    category: 'SOCIAL',
    title: 'Hall of Fame / Leaderboard',
    categoryLabel: 'Social',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed notch clipping "Hall . . . ame" in Phase 3 audit (android_screen_37)',
    sourceImproved: 'Phase 4.1 Implementation in src/pages/Leaderboard.jsx / androidPolish.css',
    whatChanged: [
      'Applied --safe-top padding so "🏆 Hall of Fame" title clears camera cutouts',
      'Illuminated 3D podium with 1st, 2nd, and 3rd place crown badges',
      'Weekly reset live countdown widget ("⏱ Leaderboard resets in 2d 14h 10m")'
    ],
    whyBetter: [
      'Title and league status are 100% visible on notched and punch-hole displays',
      'Competitive weekly ranking drives campus viral retention'
    ]
  },

  // ── System & Navigation
  {
    id: 'toast',
    category: 'SYSTEM',
    title: 'In-App Notifications & Toasts',
    categoryLabel: 'System',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed toast floating over headers at y=140-380px in Phase 3 (android_screen_38)',
    sourceImproved: 'Phase 4.1 Implementation in src/styles/androidPolish.css / Toast.css',
    whatChanged: [
      'Anchored toast container to calc(var(--safe-top) + 8px) with max-width 440px',
      'Container set to pointer-events: none so background header buttons remain clickable',
      'Obsidian frosted glass card with glowing violet border and student avatar preview'
    ],
    whyBetter: [
      'Notification cards never block back buttons, search bars, or filter triggers',
      'High-priority alerts (Matches, Super Swipes, DMs) are clearly legible'
    ]
  },
  {
    id: 'bottom_nav',
    category: 'SYSTEM',
    title: 'Bottom Navigation System',
    categoryLabel: 'System',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed horizontal label smash "MATCHEXPLORECHATCONFESSPROFI" on Pixel 4a in Phase 3',
    sourceImproved: 'Phase 4.1 Implementation in src/components/BottomNav.jsx / androidPolish.css',
    whatChanged: [
      'Adaptive icon-first navigation with active illuminated micro-pill indicator',
      'Hidden persistent text labels on small viewports while preserving ARIA accessibility',
      'Floating glass capsule container anchored with max(10px, var(--safe-bottom))'
    ],
    whyBetter: [
      'Completely eliminates horizontal text overlap on Android phone screens',
      'Generous 48dp+ tap targets with haptic tactile response'
    ]
  },
  {
    id: 'empty_states',
    category: 'SYSTEM',
    title: 'Empty States & Loading',
    categoryLabel: 'System',
    type: 'EXISTING FUNCTION — VISUAL IMPROVEMENT',
    sourceCurrent: 'Observed standard generic spinners in Phase 3',
    sourceImproved: 'Phase 4.1 Implementation in src/styles/androidPolish.css',
    whatChanged: [
      'Branded radar search pulse for empty swipe discovery ("Finding students near UNILAG...")',
      'Actionable profile completion nudge card when matches are low',
      'Frosted obsidian skeleton loaders matching actual component geometry'
    ],
    whyBetter: [
      'Replaces dead-ends with actionable next steps',
      'Reduces perceived loading latency'
    ]
  }
];

export default function AndroidUXComparison() {
  const [activeScreenId, setActiveScreenId] = useState('match');
  const [viewMode, setViewMode] = useState('side_by_side'); // 'current', 'side_by_side', 'improved', 'gallery'
  const [zoomScale, setZoomScale] = useState(0.88); // Scale for desktop viewing
  const [verdicts, setVerdicts] = useState({}); // { [screenId]: 'better' | 'revision' | 'worse' }
  const [notes, setNotes] = useState({});

  const activeScreen = useMemo(
    () => SCREENS.find((s) => s.id === activeScreenId) || SCREENS[0],
    [activeScreenId]
  );

  const categories = useMemo(() => {
    const map = {};
    SCREENS.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, []);

  const handleVerdict = (screenId, value) => {
    setVerdicts((prev) => ({ ...prev, [screenId]: value }));
  };

  const reviewedCount = Object.keys(verdicts).length;

  return (
    <div className="ux-lab-container">
      {/* ── Top Header & Review Banner ── */}
      <header className="ux-lab-header">
        <div className="ux-lab-header-top">
          <div className="ux-lab-brand">
            <span className="ux-lab-logo">🎓💖</span>
            <div>
              <h1 className="ux-lab-title">College Date</h1>
              <span className="ux-lab-subtitle">Android UX Approval Lab • Local Host Visual Inspector</span>
            </div>
          </div>

          <div className="ux-lab-controls">
            {/* View Mode Toggle */}
            <div className="ux-view-toggle">
              <button
                className={`ux-toggle-btn ${viewMode === 'current' ? 'active' : ''}`}
                onClick={() => setViewMode('current')}
                title="Inspect only pre-redesign baseline"
              >
                Pre-Redesign
              </button>
              <button
                className={`ux-toggle-btn ${viewMode === 'side_by_side' ? 'active' : ''}`}
                onClick={() => setViewMode('side_by_side')}
                title="Side-by-side Pixel 4a comparison"
              >
                Side-by-Side
              </button>
              <button
                className={`ux-toggle-btn ${viewMode === 'improved' ? 'active' : ''}`}
                onClick={() => setViewMode('improved')}
                title="Inspect only redesigned Android UI"
              >
                New Redesign
              </button>
              <button
                className={`ux-toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
                onClick={() => setViewMode('gallery')}
                title="All core screens in a single overview"
              >
                Full Gallery
              </button>
            </div>

            {/* Zoom Slider */}
            <div className="ux-zoom-ctrl">
              <button onClick={() => setZoomScale((z) => Math.max(0.65, z - 0.08))} className="ux-zoom-btn">− Zoom</button>
              <span className="ux-zoom-val">{Math.round(zoomScale * 100)}%</span>
              <button onClick={() => setZoomScale((z) => Math.min(1.15, z + 0.08))} className="ux-zoom-btn">+ Zoom</button>
            </div>
          </div>
        </div>

        {/* ── Status Banner (AWAITING HUMAN REVIEW) ── */}
        <div className="ux-status-banner">
          <div className="ux-status-indicator">
            <span className="ux-pulse-dot" />
            <span className="ux-status-title">DESIGN APPROVAL STATUS:</span>
            <strong className="ux-status-highlight">AWAITING HUMAN REVIEW</strong>
          </div>
          <div className="ux-status-meta">
            <span>Pixel 4a Reference Frame (1080×2340 px • 440 dpi)</span>
            <span className="ux-tally-badge">Reviewed: {reviewedCount}/{SCREENS.length} Screens</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout: Sidebar Navigation + Comparison Stage ── */}
      <div className="ux-lab-main">
        {/* Sidebar */}
        <aside className="ux-lab-sidebar">
          <div className="ux-sidebar-nav">
            {Object.entries(categories).map(([cat, items]) => (
              <div key={cat} className="ux-nav-group">
                <span className="ux-nav-header">{cat}</span>
                {items.map((item) => {
                  const isSelected = activeScreenId === item.id;
                  const v = verdicts[item.id];
                  return (
                    <button
                      key={item.id}
                      className={`ux-nav-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setActiveScreenId(item.id);
                        if (viewMode === 'gallery') setViewMode('side_by_side');
                      }}
                    >
                      <span className="ux-nav-item-title">{item.title}</span>
                      {v === 'better' && <span className="ux-v-badge better">👍</span>}
                      {v === 'revision' && <span className="ux-v-badge revision">🤔</span>}
                      {v === 'worse' && <span className="ux-v-badge worse">👎</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Comparison Stage */}
        <main className="ux-lab-stage">
          {viewMode === 'gallery' ? (
            /* ── Overall Gallery View ── */
            <div className="ux-gallery-view">
              <div className="ux-gallery-header">
                <h2>OVERALL ANDROID REDESIGN GALLERY</h2>
                <p>Complete visual overview of core application screens comparing pre-redesign vs redesigned layouts.</p>
              </div>
              <div className="ux-gallery-grid">
                {SCREENS.map((screen) => (
                  <div key={screen.id} className="ux-gallery-card" onClick={() => { setActiveScreenId(screen.id); setViewMode('side_by_side'); }}>
                    <div className="ux-gallery-card-header">
                      <span className="ux-gallery-screen-title">{screen.title}</span>
                      <span className="ux-gallery-tag">{screen.category}</span>
                    </div>
                    <div className="ux-gallery-preview-pair" style={{ transform: 'scale(0.55)', transformOrigin: 'top center', height: '520px' }}>
                      <Pixel4aFrame type="current" screenId={screen.id} />
                      <Pixel4aFrame type="improved" screenId={screen.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Focused Single Screen Comparison ── */
            <div className="ux-focused-view">
              {/* Screen Top Bar */}
              <div className="ux-screen-meta-bar">
                <div className="ux-screen-title-group">
                  <span className="ux-cat-tag">{activeScreen.categoryLabel}</span>
                  <h2>{activeScreen.title}</h2>
                  <span className="ux-feature-type-tag">{activeScreen.type}</span>
                </div>

                {/* Verdict Controls */}
                <div className="ux-verdict-box">
                  <span className="ux-verdict-label">Your Verdict:</span>
                  <button
                    className={`ux-verdict-btn ${verdicts[activeScreen.id] === 'better' ? 'selected better' : ''}`}
                    onClick={() => handleVerdict(activeScreen.id, 'better')}
                  >
                    👍 Better
                  </button>
                  <button
                    className={`ux-verdict-btn ${verdicts[activeScreen.id] === 'revision' ? 'selected revision' : ''}`}
                    onClick={() => handleVerdict(activeScreen.id, 'revision')}
                  >
                    🤔 Needs Revision
                  </button>
                  <button
                    className={`ux-verdict-btn ${verdicts[activeScreen.id] === 'worse' ? 'selected worse' : ''}`}
                    onClick={() => handleVerdict(activeScreen.id, 'worse')}
                  >
                    👎 Worse
                  </button>
                </div>
              </div>

              {/* Device Comparison Viewports */}
              <div className="ux-device-comparison-stage" style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}>
                {(viewMode === 'side_by_side' || viewMode === 'current') && (
                  <div className="ux-device-column current-column">
                    <div className="ux-column-header">
                      <span className="ux-col-badge current">CURRENT — PRE-REDESIGN</span>
                      <span className="ux-col-source">{activeScreen.sourceCurrent}</span>
                    </div>
                    <Pixel4aFrame type="current" screenId={activeScreen.id} />
                  </div>
                )}

                {(viewMode === 'side_by_side' || viewMode === 'improved') && (
                  <div className="ux-device-column improved-column">
                    <div className="ux-column-header">
                      <span className="ux-col-badge improved">IMPROVED — NEW ANDROID UI</span>
                      <span className="ux-col-source">{activeScreen.sourceImproved}</span>
                    </div>
                    <Pixel4aFrame type="improved" screenId={activeScreen.id} />
                  </div>
                )}
              </div>

              {/* Design Explanation Panel */}
              <div className="ux-explanation-panel">
                <div className="ux-explanation-grid">
                  <div className="ux-explanation-col">
                    <h3>🔍 WHAT CHANGED?</h3>
                    <ul>
                      {activeScreen.whatChanged.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="ux-explanation-col">
                    <h3>💡 WHY IT MAY BE BETTER</h3>
                    <ul>
                      {activeScreen.whyBetter.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="ux-explanation-col feedback-col">
                    <h3>📝 REVIEWER NOTES</h3>
                    <textarea
                      className="ux-notes-input"
                      placeholder="Add personal notes or specific screen feedback here..."
                      value={notes[activeScreen.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [activeScreen.id]: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Realistic Google Pixel 4a Device Frame ─────────────────────────
function Pixel4aFrame({ type, screenId }) {
  const isImproved = type === 'improved';

  return (
    <div className={`pixel-device-frame ${type}`}>
      {/* Device Hardware Bezel */}
      <div className="pixel-bezel">
        {/* Top Status Bar with Camera Punch-Hole */}
        <div className="pixel-status-bar">
          <span className="pixel-time">9:41</span>
          <div className="pixel-camera-hole" />
          <div className="pixel-status-icons">
            <span className="pixel-icon">5G</span>
            <span className="pixel-icon">📶</span>
            <span className="pixel-icon">🔋 98%</span>
          </div>
        </div>

        {/* Screen Content Window */}
        <div className="pixel-screen-viewport">
          <ScreenRenderer screenId={screenId} isImproved={isImproved} />
        </div>

        {/* Bottom System Gesture Navigation Bar */}
        <div className="pixel-gesture-bar">
          <div className="pixel-home-pill" />
        </div>
      </div>
    </div>
  );
}

// ── Screen Content Mockup Engine ───────────────────────────────────
function ScreenRenderer({ screenId, isImproved }) {
  switch (screenId) {
    case 'splash':
      return <SplashMock isImproved={isImproved} />;
    case 'welcome':
      return <WelcomeMock isImproved={isImproved} />;
    case 'signup':
      return <SignupMock isImproved={isImproved} />;
    case 'login':
      return <LoginMock isImproved={isImproved} />;
    case 'match':
      return <MatchMock isImproved={isImproved} />;
    case 'explore':
      return <ExploreMock isImproved={isImproved} />;
    case 'filters':
      return <FiltersMock isImproved={isImproved} />;
    case 'chat_list':
      return <ChatListMock isImproved={isImproved} />;
    case 'chat_dm':
      return <ChatDmMock isImproved={isImproved} />;
    case 'chat_keyboard':
      return <ChatKeyboardMock isImproved={isImproved} />;
    case 'profile':
      return <ProfileMock isImproved={isImproved} />;
    case 'confessions':
      return <ConfessionsMock isImproved={isImproved} />;
    case 'leaderboard':
      return <LeaderboardMock isImproved={isImproved} />;
    case 'toast':
      return <ToastMock isImproved={isImproved} />;
    case 'bottom_nav':
      return <BottomNavMock isImproved={isImproved} />;
    case 'empty_states':
      return <EmptyStatesMock isImproved={isImproved} />;
    default:
      return <MatchMock isImproved={isImproved} />;
  }
}

// ── 1. Splash Screen Mock ──────────────────────────────────────────
function SplashMock({ isImproved }) {
  return (
    <div className={`mock-screen splash-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="splash-center">
        <div className="splash-logo-squircle">
          <span>💖</span>
        </div>
        {isImproved ? (
          <div className="splash-brand-text">
            <h2>College Date</h2>
            <p>Campus Dating & Connection</p>
            <div className="splash-campus-pill">
              <span className="pulse-dot-sm" /> Connecting to UNILAG...
            </div>
          </div>
        ) : (
          <div className="current-defect-marker">
            <span className="defect-tag">CURRENT BASELINE</span>
            <p className="defect-sub">Raw logo only • No campus typography</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Welcome Screen Mock ─────────────────────────────────────────
function WelcomeMock({ isImproved }) {
  return (
    <div className={`mock-screen welcome-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="welcome-hero">
        <h1 className="welcome-title">Find your<br /><span className="text-gradient">campus crush.</span></h1>
        <p className="welcome-sub">Swipe. Match. Connect.</p>

        <div className="welcome-badges-stack">
          <div className="welcome-badge-item">🚀 Exclusive to Students</div>
          <div className="welcome-badge-item">🔒 {isImproved ? 'Verified Student Identity' : '100% Verified Profiles'}</div>
          <div className="welcome-badge-item">🔥 100% Anonymous Confessions</div>
          {isImproved && (
            <div className="welcome-badge-item highlight">🏛️ UNILAG • LASU • UI • UNIBEN • FUTA</div>
          )}
        </div>
      </div>

      <div className="welcome-actions-container">
        <button className="btn-welcome-primary">
          {isImproved ? 'Get Started — Join Your Campus' : 'Get Started'}
        </button>
        <button className="btn-welcome-secondary">
          I already have an account
        </button>
        <div className="welcome-footer-tag">DESIGNED FOR NIGERIAN UNIVERSITIES 🇳🇬</div>
      </div>
    </div>
  );
}

// ── 3. Signup & Referral Mock ──────────────────────────────────────
function SignupMock({ isImproved }) {
  return (
    <div className={`mock-screen signup-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="signup-header">
        <div className="brand-icon-sm">💖</div>
        <h2>Join College Date</h2>
        <p>Create your account and start meeting students</p>
      </div>

      <div className="signup-form-body">
        <div className="mock-input-group">
          <label>Email</label>
          <div className="mock-input">📧 student@unilag.edu.ng</div>
        </div>

        <div className="mock-input-group">
          <label>I am a...</label>
          <div className="mock-role-grid">
            <div className="mock-role-btn active">🙋‍♂️ Guy</div>
            <div className="mock-role-btn">🙋‍♀️ Lady</div>
          </div>
        </div>

        <div className="mock-input-group">
          <label>Password</label>
          <div className="mock-input">🔒 ••••••••••</div>
        </div>

        <div className="mock-input-group">
          <label>Referral code (optional)</label>
          {isImproved ? (
            <div className="mock-input highlight-success">
              <span>🎁</span>
              <span className="input-val">CD-UNILAG</span>
              <span className="check-icon">✓ (5 Super Swipes)</span>
            </div>
          ) : (
            <div className="mock-input current-mojibake">
              <span>ðŸ¤ </span>
              <span className="mojibake-text">CD-ABCDE</span>
              <span className="defect-callout">🚨 UTF-8 Mojibake Bug</span>
            </div>
          )}
        </div>

        <button className="btn-primary-block">Create Account</button>
      </div>
    </div>
  );
}

// ── 4. Login Screen Mock ───────────────────────────────────────────
function LoginMock({ isImproved }) {
  return (
    <div className={`mock-screen login-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="signup-header">
        <div className="brand-icon-sm">💖</div>
        <h2>Welcome Back</h2>
        <p>Sign in to your campus account</p>
      </div>

      <div className="signup-form-body">
        <div className="mock-input-group">
          <label>Email</label>
          <div className="mock-input">📧 ada@unilag.edu.ng</div>
        </div>

        <div className="mock-input-group">
          <label>Password</label>
          <div className="mock-input">🔒 ••••••••••</div>
        </div>

        <button className="btn-primary-block">Sign In</button>
        <div className="mock-divider"><span>or continue with</span></div>
        <button className="btn-google-block">
          <span className="g-icon">G</span> Continue with Google
        </button>
      </div>
    </div>
  );
}

// ── 5. Match Screen Mock ───────────────────────────────────────────
function MatchMock({ isImproved }) {
  const p = PROFILES.ada;
  return (
    <div className={`mock-screen match-screen ${isImproved ? 'improved' : 'current'}`}>
      {/* Top Match Rail */}
      <div className="match-top-rail">
        <div className="live-chip">🔴 Live Near Me</div>
        <div className="gender-chip">👩 Women ▾</div>
        <div className="swipes-counter">⚡ <b>20</b> Left</div>
      </div>

      {/* Swipe Stack Card */}
      <div className={`match-card-viewport ${isImproved ? 'spacious-ergonomic' : 'high-cramped'}`}>
        <div className="mock-swipe-card">
          <img src={p.avatar} alt={p.name} className="swipe-card-img" />
          <div className="swipe-card-gradient" />
          
          <div className="swipe-card-details">
            <div className="swipe-header-row">
              <h3>{p.name}, {p.age} {p.verified && '✓'}</h3>
              <span className="campus-tag-badge">🎓 {p.school}</span>
            </div>
            <p className="swipe-sub-meta">📚 {p.faculty} • {p.level}</p>
            <p className="swipe-bio-snip">{p.bio}</p>
            <div className="swipe-interests-row">
              {p.interests.slice(0, 3).map((int, i) => (
                <span key={i} className="mini-interest-pill">{int}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="match-action-row">
          <button className="action-btn pass">❌</button>
          <button className="action-btn super">⭐</button>
          <button className="action-btn like">💖</button>
        </div>
      </div>

      {/* Bottom Nav Simulation */}
      <MockBottomNav activeTab="match" isImproved={isImproved} />
    </div>
  );
}

// ── 6. Explore Screen Mock ─────────────────────────────────────────
function ExploreMock({ isImproved }) {
  return (
    <div className={`mock-screen explore-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="explore-search-bar">
        <span>🔍 Search campus, faculty, interests...</span>
      </div>

      <div className="explore-categories-row">
        <span className="cat-pill active">All</span>
        <span className="cat-pill">UNILAG</span>
        <span className="cat-pill">LASU</span>
        <span className="cat-pill">UI</span>
        <span className="cat-pill">Law</span>
      </div>

      {/* Grid: 2-Col vs 3-Col */}
      <div className={`explore-grid-container ${isImproved ? 'two-col' : 'three-col'}`}>
        {Object.values(PROFILES).map((prof, idx) => (
          <div key={idx} className="explore-mock-card">
            <img src={prof.avatar} alt={prof.name} />
            <div className="explore-card-info">
              <span className="explore-name">{prof.name.split(' ')[0]}, {prof.age}</span>
              <span className="explore-school">{prof.school}</span>
            </div>
          </div>
        ))}
      </div>

      <MockBottomNav activeTab="explore" isImproved={isImproved} />
    </div>
  );
}

// ── 7. Filter Sheet Mock ───────────────────────────────────────────
function FiltersMock({ isImproved }) {
  return (
    <div className={`mock-screen filters-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="backdrop-dim" />
      <div className="filter-sheet-panel">
        <div className="sheet-handle" />
        <h3>Filter Campus Matches</h3>
        
        <div className="filter-group">
          <label>Campus</label>
          <div className="filter-pills-wrap">
            <span className="f-pill active">All Campuses</span>
            <span className="f-pill">UNILAG</span>
            <span className="f-pill">LASU</span>
            <span className="f-pill">UI Ibadan</span>
          </div>
        </div>

        <div className="filter-group">
          <label>Gender Preference</label>
          <div className="filter-pills-wrap">
            <span className="f-pill active">Women</span>
            <span className="f-pill">Men</span>
            <span className="f-pill">Everyone</span>
          </div>
        </div>

        <button className="btn-primary-block">Apply Filters</button>
      </div>
    </div>
  );
}

// ── 8. Chat List Mock ──────────────────────────────────────────────
function ChatListMock({ isImproved }) {
  return (
    <div className={`mock-screen chat-list-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="chat-list-header">
        <h2>Messages</h2>
        <span className="unread-badge">3 New</span>
      </div>

      {/* Live Status Stories */}
      {isImproved && (
        <div className="chat-stories-strip">
          <div className="story-item active">
            <div className="story-ring"><img src={PROFILES.ada.avatar} alt="" /></div>
            <span>Ada (UNILAG)</span>
          </div>
          <div className="story-item active">
            <div className="story-ring"><img src={PROFILES.tunde.avatar} alt="" /></div>
            <span>Tunde (UI)</span>
          </div>
          <div className="story-item">
            <div className="story-ring"><img src={PROFILES.kemi.avatar} alt="" /></div>
            <span>Kemi (LASU)</span>
          </div>
        </div>
      )}

      <div className="conversation-list">
        <div className="conv-item unread">
          <img src={PROFILES.ada.avatar} alt="" className="conv-avatar" />
          <div className="conv-info">
            <div className="conv-top">
              <strong>Ada Okonkwo</strong>
              <span className="conv-time">2m ago</span>
            </div>
            <p className="conv-preview">Are you around the faculty of law today?</p>
          </div>
          <span className="conv-dot" />
        </div>

        <div className="conv-item">
          <img src={PROFILES.kemi.avatar} alt="" className="conv-avatar" />
          <div className="conv-info">
            <div className="conv-top">
              <strong>Kemi Adeyemi</strong>
              <span className="conv-time">1h ago</span>
            </div>
            <p className="conv-preview">Loved your music playlist on your bio!</p>
          </div>
        </div>
      </div>

      <MockBottomNav activeTab="chat" isImproved={isImproved} />
    </div>
  );
}

// ── 9. Chat DM Mock ────────────────────────────────────────────────
function ChatDmMock({ isImproved }) {
  return (
    <div className={`mock-screen chat-dm-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="dm-header">
        <span className="dm-back">←</span>
        <img src={PROFILES.ada.avatar} alt="" className="dm-header-avatar" />
        <div className="dm-header-info">
          <strong>Ada Okonkwo</strong>
          <span className="dm-online-status">🟢 Online • UNILAG Law</span>
        </div>
        <div className="dm-call-actions">
          <span>📞</span>
          <span>📹</span>
        </div>
      </div>

      <div className="dm-message-stream">
        <div className="msg-bubble received">
          <p>Hey! Saw you are also in 300L at Akoka 😄</p>
          <span className="msg-time">10:14 AM</span>
        </div>
        <div className="msg-bubble sent">
          <p>Yes! Computer Science faculty. How is contract law treating you?</p>
          <span className="msg-time">10:15 AM ✓✓</span>
        </div>
      </div>

      <div className="dm-composer-area">
        <span className="dm-media-btn">📎</span>
        <input type="text" placeholder="Type message..." defaultValue="Let us meet at the library cafeteria" />
        <span className="dm-voice-btn">🎙️</span>
        <button className="dm-send-btn">➤</button>
      </div>
    </div>
  );
}

// ── 10. Keyboard Open Chat Mock ────────────────────────────────────
function ChatKeyboardMock({ isImproved }) {
  return (
    <div className={`mock-screen chat-keyboard-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="dm-header compact">
        <strong>Ada Okonkwo</strong>
        <span className="dm-online-status">🟢 Typing...</span>
      </div>

      <div className="dm-message-stream compressed">
        <div className="msg-bubble received"><p>Are you free after 4pm?</p></div>
        <div className="msg-bubble sent"><p>Yes, let me finish my lab session!</p></div>
      </div>

      {/* Composer pinned to top of keyboard */}
      <div className="dm-composer-area pinned-keyboard">
        <input type="text" placeholder="Type message..." defaultValue="See you at Akoka gate at 4:30!" />
        <button className="dm-send-btn">➤</button>
      </div>

      {/* Simulated Android Gboard */}
      <div className="mock-android-keyboard">
        <div className="kb-suggest-strip">
          <span>Sure!</span>
          <span>See you</span>
          <span>Akoka</span>
        </div>
        <div className="kb-keys-layout">
          <div className="kb-row"><span>Q</span><span>W</span><span>E</span><span>R</span><span>T</span><span>Y</span><span>U</span><span>I</span><span>O</span><span>P</span></div>
          <div className="kb-row"><span>A</span><span>S</span><span>D</span><span>F</span><span>G</span><span>H</span><span>J</span><span>K</span><span>L</span></div>
          <div className="kb-row"><span className="kb-special">⇧</span><span>Z</span><span>X</span><span>C</span><span>V</span><span>B</span><span>N</span><span>M</span><span className="kb-special">⌫</span></div>
          <div className="kb-space-row"><span className="kb-key">?123</span><span className="kb-space">English (US)</span><span className="kb-enter">⏎</span></div>
        </div>
      </div>
    </div>
  );
}

// ── 11. Profile Mock ───────────────────────────────────────────────
function ProfileMock({ isImproved }) {
  return (
    <div className={`mock-screen profile-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="profile-hero-card">
        <img src={PROFILES.ada.avatar} alt="" className="profile-hero-img" />
        <div className="profile-hero-info">
          <h2>Ada Okonkwo, 21</h2>
          <p>🎓 UNILAG • Law • 300L</p>
        </div>
      </div>

      <div className="profile-stat-grid">
        <div className="profile-stat-box">
          <span className="stat-val">₦12,500</span>
          <span className="stat-lbl">Wallet Balance</span>
        </div>
        <div className="profile-stat-box">
          <span className="stat-val">5 ⭐</span>
          <span className="stat-lbl">Super Swipes</span>
        </div>
      </div>

      <div className="profile-menu-list">
        <div className="menu-item"><span>👤 Edit Profile</span><span>→</span></div>
        <div className="menu-item"><span>🎁 Refer Friends (Earn ₦1,000)</span><span>→</span></div>
        <div className="menu-item"><span>🔒 Safety & Verification</span><span>→</span></div>
      </div>

      <MockBottomNav activeTab="profile" isImproved={isImproved} />
    </div>
  );
}

// ── 12. Confessions Mock ───────────────────────────────────────────
function ConfessionsMock({ isImproved }) {
  return (
    <div className={`mock-screen confessions-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="confessions-header">
        <h2>Campus Confessions</h2>
        <span className="conf-shield">100% Anonymous 🔒</span>
      </div>

      <div className="confession-card">
        <div className="conf-card-top">
          <span className="conf-campus-tag">🏛️ UNILAG</span>
          <span className="conf-time">15m ago</span>
        </div>
        <p className="conf-text">
          "To the guy in 400L Mechanical Eng wearing the black hoodie at Akoka library yesterday... I have been crushing on you all semester 🙈"
        </p>
        <div className="conf-reactions-row">
          <span className="reaction-pill">🔥 84</span>
          <span className="reaction-pill">💀 42</span>
          <span className="reaction-pill">❤️ 105</span>
        </div>
      </div>

      <MockBottomNav activeTab="confess" isImproved={isImproved} />
    </div>
  );
}

// ── 13. Leaderboard Mock ───────────────────────────────────────────
function LeaderboardMock({ isImproved }) {
  return (
    <div className={`mock-screen leaderboard-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className={`lb-header ${isImproved ? 'safe-notch' : 'clipped-notch'}`}>
        <span className="lb-badge">🏆 Premium Elite</span>
        <h1 className="lb-title">{isImproved ? 'Hall of Fame' : 'Hall . . . ame'}</h1>
        {isImproved && <span className="lb-timer">⏱ Resets in 2d 14h 10m</span>}
      </div>

      {/* Podium */}
      <div className="lb-podium-row">
        <div className="podium-col second">
          <img src={PROFILES.kemi.avatar} alt="" />
          <span className="podium-rank">2</span>
          <span className="podium-name">Kemi</span>
          <span className="podium-score">118 Fans</span>
        </div>
        <div className="podium-col first">
          <span className="crown">👑</span>
          <img src={PROFILES.ada.avatar} alt="" />
          <span className="podium-rank">1</span>
          <span className="podium-name">Ada</span>
          <span className="podium-score">142 Fans</span>
        </div>
        <div className="podium-col third">
          <img src={PROFILES.tunde.avatar} alt="" />
          <span className="podium-rank">3</span>
          <span className="podium-name">Tunde</span>
          <span className="podium-score">97 Fans</span>
        </div>
      </div>

      <MockBottomNav activeTab="leaderboard" isImproved={isImproved} />
    </div>
  );
}

// ── 14. Toast Mock ─────────────────────────────────────────────────
function ToastMock({ isImproved }) {
  return (
    <div className={`mock-screen toast-screen ${isImproved ? 'improved' : 'current'}`}>
      {/* Toast Notification Simulation */}
      <div className={`simulated-toast-card ${isImproved ? 'safe-inset' : 'colliding-header'}`}>
        <img src={PROFILES.ada.avatar} alt="" className="toast-avatar" />
        <div className="toast-content">
          <strong>New Match! 💖</strong>
          <p>You and Ada Okonkwo (UNILAG) liked each other!</p>
        </div>
        <span className="toast-time">Now</span>
      </div>

      {/* Underlying Page Content */}
      <div className="underlying-page-mock">
        <div className="mock-nav-header">
          <span>← Back</span>
          <h3>Explore Discovery</h3>
          <span>⚙️ Filter</span>
        </div>
        <div className="mock-grid-sample">
          <div className="mock-card-ph" />
          <div className="mock-card-ph" />
        </div>
      </div>

      <MockBottomNav activeTab="match" isImproved={isImproved} />
    </div>
  );
}

// ── 15. Bottom Nav Mock ────────────────────────────────────────────
function BottomNavMock({ isImproved }) {
  return (
    <div className={`mock-screen bottom-nav-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="bottom-nav-stage-info">
        <h3>Bottom Navigation Inspection</h3>
        <p>{isImproved ? 'Icon-first with active illuminated micro-pill indicator.' : 'Persistent text labels with horizontal label smash defect on small viewports.'}</p>
      </div>

      <MockBottomNav activeTab="match" isImproved={isImproved} standalone />
    </div>
  );
}

// ── 16. Empty States Mock ──────────────────────────────────────────
function EmptyStatesMock({ isImproved }) {
  return (
    <div className={`mock-screen empty-states-screen ${isImproved ? 'improved' : 'current'}`}>
      <div className="empty-state-card">
        <div className="radar-pulse">🔍</div>
        <h2>No more profiles</h2>
        <p>We could not find anyone new matching your filters right now.</p>
        <button className="btn-primary-block">Adjust Filters</button>
      </div>
      <MockBottomNav activeTab="match" isImproved={isImproved} />
    </div>
  );
}

// ── Shared Bottom Navigation Bar Simulation ─────────────────────────
function MockBottomNav({ activeTab, isImproved, standalone = false }) {
  return (
    <div className={`simulated-bottom-nav ${isImproved ? 'improved' : 'current'} ${standalone ? 'standalone' : ''}`}>
      <div className={`nav-tab ${activeTab === 'match' ? 'active' : ''}`}>
        <span className="nav-icon">🔥</span>
        {!isImproved && <span className="nav-lbl">MATCH</span>}
        {isImproved && activeTab === 'match' && <span className="nav-pill-dot" />}
      </div>
      <div className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`}>
        <span className="nav-icon">🧭</span>
        {!isImproved && <span className="nav-lbl">EXPLORE</span>}
        {isImproved && activeTab === 'explore' && <span className="nav-pill-dot" />}
      </div>
      <div className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}>
        <span className="nav-icon">💬</span>
        <span className="nav-badge">3</span>
        {!isImproved && <span className="nav-lbl">CHAT</span>}
        {isImproved && activeTab === 'chat' && <span className="nav-pill-dot" />}
      </div>
      <div className={`nav-tab ${activeTab === 'confess' ? 'active' : ''}`}>
        <span className="nav-icon">🙊</span>
        {!isImproved && <span className="nav-lbl">CONFESS</span>}
        {isImproved && activeTab === 'confess' && <span className="nav-pill-dot" />}
      </div>
      <div className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}>
        <span className="nav-icon">👤</span>
        {!isImproved && <span className="nav-lbl">PROFI</span>}
        {isImproved && activeTab === 'profile' && <span className="nav-pill-dot" />}
      </div>
    </div>
  );
}
