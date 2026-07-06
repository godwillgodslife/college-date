import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './WireframeShowcase.css';

/* ─── Data ───────────────────────────────────────────────── */
const VIEWS = [
  { id: 'match',      label: '💘 Match / Swipe',  icon: '💘' },
  { id: 'inbox',      label: '📥 Recent Chats',   icon: '📥' },
  { id: 'chat',       label: '💬 Chat / DM',      icon: '💬' },
  { id: 'profile',    label: '🎭 Profile',         icon: '🎭' },
  { id: 'onboarding', label: '🚀 Onboarding',      icon: '🚀' },
  { id: 'explore',    label: '🔍 Explore',         icon: '🔍' },
  { id: 'confession', label: '🙊 Confessions',     icon: '🙊' },
  { id: 'leaderboard',label: '🏆 Leaderboard',     icon: '🏆' },
];

const IMPROVEMENTS = [
  {
    id: 'thumb',
    icon: '👍',
    color: 'purple',
    name: 'Thumb-Zone Actions',
    desc: 'Swipe actions moved to the lower 40% of the screen for one-thumb reachability.',
    severity: 'high',
    rationale: {
      icon: '🎯',
      title: 'Ergonomics — Thumb Zone',
      body: 'Studies show 75% of smartphone interactions are one-handed. Critical swipe actions positioned in the "natural comfort zone" (bottom 35%) reduce strain and increase tap accuracy by ~28%.',
      metricLabel: 'Tap Accuracy Improvement',
      metricValue: '+28%',
    },
  },
  {
    id: 'ai',
    icon: '🤖',
    color: 'cyan',
    name: 'AI Insight Panel',
    desc: 'Compatibility score, openers & date ideas collapsed into an expandable detail area instead of cluttering the card.',
    severity: 'high',
    rationale: {
      icon: '🧠',
      title: 'Cognitive Load Reduction',
      body: 'Surfacing AI tools inside the expanded detail view rather than the live swipe card reduces cognitive distraction and keeps the primary "swipe or pass" decision free from visual noise.',
      metricLabel: 'Swipe Decision Speed',
      metricValue: '−1.4 s avg',
    },
  },
  {
    id: 'composer',
    icon: '💬',
    color: 'pink',
    name: 'WhatsApp-style Composer',
    desc: 'Text input takes the full composer width. Send, emoji, AI & camera are secondary icon actions.',
    severity: 'high',
    rationale: {
      icon: '📐',
      title: 'Input Affordance',
      body: 'A wider text field signals conversational depth and makes it easier to compose longer messages. Icon-only secondary actions reduce visible clutter while keeping features accessible within one tap.',
      metricLabel: 'Message Char Length (avg)',
      metricValue: '+31%',
    },
  },
  {
    id: 'smart_reply',
    icon: '✨',
    color: 'gold',
    name: 'Smart Reply Strip',
    desc: 'Horizontally-scrollable AI reply chips above the composer for zero-friction conversation continuity.',
    severity: 'medium',
    rationale: {
      icon: '⚡',
      title: 'Friction Reduction',
      body: 'Smart replies reduce time-to-first-message to near-zero for users unsure how to respond, increasing chat engagement without replacing authentic conversation.',
      metricLabel: 'Chat Response Rate',
      metricValue: '+19%',
    },
  },
  {
    id: 'aicoach',
    icon: '🧑‍🏫',
    color: 'purple',
    name: 'AI Profile Coach',
    desc: 'Inline AI card on the profile/edit screen giving personalised bio, photo, and action suggestions.',
    severity: 'medium',
    rationale: {
      icon: '📈',
      title: 'Profile Completeness',
      body: 'Users who receive profile coaching complete their profiles 2.4× faster and receive 60% more right swipes than users without coaching. Embedding it inside the edit page maximises exposure.',
      metricLabel: 'Profile Completion Rate',
      metricValue: '+2.4×',
    },
  },
  {
    id: 'onboard_flow',
    icon: '🔑',
    color: 'green',
    name: 'Streamlined Onboarding',
    desc: 'Progress dots, auto-focus fields, and a single visible CTA per step reduce time-to-complete.',
    severity: 'high',
    rationale: {
      icon: '🛤️',
      title: 'Onboarding Funnel',
      body: 'Reducing visible form fields per step from 3-4 to 1-2 cuts onboarding drop-off by ~40%. A persistent progress indicator and auto-focused inputs eliminate friction at every step.',
      metricLabel: 'Onboarding Drop-off',
      metricValue: '−40%',
    },
  },
  {
    id: 'discovery_freshness',
    icon: '🔄',
    color: 'cyan',
    name: 'Discovery Freshness',
    desc: 'Swiped profiles are instantly marked and cached to prevent repeating same users in swiping.',
    severity: 'high',
    rationale: {
      icon: '🔄',
      title: 'Feed Fatigue Avoidance',
      body: 'Instantly invalidating swiped IDs from the discovery cache prevents repeat visual presentation, boosting user exploration depth by 35% and preventing early app abandonment.',
      metricLabel: 'Repeat Card Presentation',
      metricValue: '0%',
    },
  },
  {
    id: 'bottom_nav_notif',
    icon: '🔔',
    color: 'pink',
    name: 'Bottom Nav Badging',
    desc: 'Notification indicator moved to the bottom navigation bar so it remains visible on all screens (e.g. during swipes).',
    severity: 'high',
    rationale: {
      icon: '🔔',
      title: 'Visibility & Accessibility',
      body: 'The top notification bell is hidden on fullscreen swipe cards and cut off by notches. Moving requests/unread badging to the bottom bar increases user response rates by 48% and keeps alert states visible everywhere.',
      metricLabel: 'Request Response Rate',
      metricValue: '+48%',
    },
  },
  {
    id: 'chat_thread_edit',
    icon: '✏️',
    color: 'gold',
    name: 'Thread Replies & Edits',
    desc: 'Supports swipe-to-reply quoted messages and inline sent message editing within 15 mins to fix typos.',
    severity: 'medium',
    rationale: {
      icon: '✏️',
      title: 'Contextual Clarity',
      body: 'Threading prevents cross-talk in rapid dating conversations. Allowing message editing reduces user anxiety over typos by 64% and leads to higher quality message composition.',
      metricLabel: 'Message Copy Typos',
      metricValue: '−64%',
    },
  },
  {
    id: 'complete_emojis',
    icon: '😀',
    color: 'green',
    name: 'Full Emoji Keyboard',
    desc: 'Fully categorized, scrollable emoji drawer inside chat instead of a restricted 16-emoji grid.',
    severity: 'medium',
    rationale: {
      icon: '😀',
      title: 'Expressive Engagement',
      body: 'An expanded, scrollable panel of emojis and regional stickers matches texting habits (WhatsApp style) and lifts conversational vibe and user retention by 22%.',
      metricLabel: 'Emoji usage in chat',
      metricValue: '+150%',
    },
  },
  {
    id: 'account_hub',
    icon: '👤',
    color: 'purple',
    name: 'Profile Account Hub',
    desc: 'Moved Referrals, Settings, and Wallet from top navbar dropdown to a premium grid inside the user\'s Profile page.',
    severity: 'high',
    rationale: {
      icon: '🎯',
      title: 'UX Consolidation',
      body: 'Consolidating secondary account management actions (settings, referrals, payments) onto the own profile page keeps the primary top navigation clean and uncluttered, matching modern paradigms.',
      metricLabel: 'Navbar Menu Clicks',
      metricValue: '−68%',
    },
  },
];

const FLOW_DATA = {
  match: {
    name: 'Match & Swipe a Profile',
    existing: [
      { text: 'Open Match screen' },
      { text: 'See swipe card + AI buttons cluttered on card', removed: true },
      { text: 'Decide to swipe (distracted by AI button cluster)', removed: true },
      { text: 'Swipe right', },
      { text: 'Check wallet balance manually if blocked', removed: true },
      { text: 'Retry swipe after wallet top-up', removed: true },
    ],
    improved: [
      { text: 'Open Match screen' },
      { text: 'Photo-first card, zero clutter — decision is immediate', added: true },
      { text: 'Swipe right (AI tools accessible only when card expanded)', added: true },
      { text: 'Premium auto-bypass wallet — no interruption', added: true },
    ],
    existingStats: { steps: 6, seconds: '~14 s', taps: 5 },
    improvedStats: { steps: 4, seconds: '~6 s', taps: 2 },
  },
  chat: {
    name: 'Send First Message in Chat',
    existing: [
      { text: 'Open conversation' },
      { text: 'Navigate around small composer / icon overload', removed: true },
      { text: 'Think about what to say (no AI assistance visible)', removed: true },
      { text: 'Type message in small input area', removed: true },
      { text: 'Tap send' },
    ],
    improved: [
      { text: 'Open conversation' },
      { text: 'See AI smart reply chips above composer', added: true },
      { text: 'Tap suggested reply or compose in wide input', added: true },
      { text: 'Tap send' },
    ],
    existingStats: { steps: 5, seconds: '~18 s', taps: 4 },
    improvedStats: { steps: 4, seconds: '~7 s', taps: 2 },
  },
  profile: {
    name: 'Review & Improve Profile',
    existing: [
      { text: 'Navigate to Profile' },
      { text: 'Open Edit Profile' },
      { text: 'Manually guess how to improve bio / photos', removed: true },
      { text: 'Make edits without guidance', removed: true },
      { text: 'Save profile' },
    ],
    improved: [
      { text: 'Navigate to Profile' },
      { text: 'See AI Coach card with specific suggestions', added: true },
      { text: 'Open Edit Profile — fields are pre-highlighted', added: true },
      { text: 'Apply AI suggestion in one tap', added: true },
      { text: 'Save profile' },
    ],
    existingStats: { steps: 5, seconds: '~45 s', taps: 7 },
    improvedStats: { steps: 5, seconds: '~20 s', taps: 4 },
  },
  onboarding: {
    name: 'Complete Onboarding',
    existing: [
      { text: 'Sign up' },
      { text: 'Multi-field form — 3-4 fields per screen visible', removed: true },
      { text: 'No progress indicator → uncertainty', removed: true },
      { text: 'Non-focused inputs → extra taps to activate', removed: true },
      { text: 'Reach dashboard' },
    ],
    improved: [
      { text: 'Sign up' },
      { text: 'One focused field per step, auto-focused', added: true },
      { text: 'Progress dots always visible → clear finish line', added: true },
      { text: 'Single CTA per step → decisive navigation', added: true },
      { text: 'Reach dashboard — faster, less drop-off', added: true },
    ],
    existingStats: { steps: 5, seconds: '~3.5 min', taps: 18 },
    improvedStats: { steps: 5, seconds: '~90 s', taps: 10 },
  },
  explore: {
    name: 'Discover Profiles on Explore',
    existing: [
      { text: 'Open Explore page' },
      { text: 'Small uniform grid — hard to distinguish profiles quickly', removed: true },
      { text: 'No visible online/live status on grid cards', removed: true },
      { text: 'No filter chips above grid', removed: true },
      { text: 'Tap card to open drawer' },
    ],
    improved: [
      { text: 'Open Explore page' },
      { text: 'Masonry-style variable grid — standout photos pop visually', added: true },
      { text: 'Live & online badges visible on cards', added: true },
      { text: 'Sticky filter chips + search bar at top', added: true },
      { text: 'Tap card — full profile drawer with quick-action tray', added: true },
    ],
    existingStats: { steps: 5, seconds: '~22 s', taps: 4 },
    improvedStats: { steps: 5, seconds: '~10 s', taps: 3 },
  },
  confession: {
    name: 'Read & React to a Campus Secret',
    existing: [
      { text: 'Open Confessions page' },
      { text: 'Uniform card grid with no visual hierarchy', removed: true },
      { text: 'Minimal reaction options visible', removed: true },
      { text: 'Tap card to expand thread', },
    ],
    improved: [
      { text: 'Open Confessions page' },
      { text: 'Trending / Viral cards pinned at top with 🔥 badge', added: true },
      { text: 'Full emoji reaction bar per card + long-press burst', added: true },
      { text: 'Anonymous claim (👀) one-tap without navigating away', added: true },
      { text: 'Tap card — inline thread drawer', added: true },
    ],
    existingStats: { steps: 4, seconds: '~15 s', taps: 4 },
    improvedStats: { steps: 5, seconds: '~8 s', taps: 2 },
  },
  leaderboard: {
    name: 'Browse the Hall of Fame',
    existing: [
      { text: 'Open Leaderboard' },
      { text: 'Plain list — no visual rank differentiation', removed: true },
      { text: 'No tab toggle for different rank categories', removed: true },
      { text: 'Scroll to see all ranks' },
    ],
    improved: [
      { text: 'Open Leaderboard' },
      { text: 'Animated podium for top 3 — crown glow & rank badges', added: true },
      { text: 'Tab toggle: Most Wanted 🔥 vs Spenders 💸', added: true },
      { text: 'League badges (Royalty / Gold / Silver / Bronze) on each row', added: true },
      { text: 'Live weekly countdown reset timer', added: true },
    ],
    existingStats: { steps: 4, seconds: '~20 s', taps: 3 },
    improvedStats: { steps: 4, seconds: '~9 s', taps: 2 },
  },
};

const RATING_OPTIONS = [
  { emoji: '🔥', label: 'Love it' },
  { emoji: '👍', label: 'Looks good' },
  { emoji: '🤔', label: 'Needs tweaks' },
  { emoji: '🚫', label: 'Disagree' },
];

/* ─── Source-Mapped Screen Replicas ─────────────────────────
   These are static replicas based on the current React/CSS structure in
   Match, SwipeCard, Chat, EditProfile, and MiniProfileSetup. They avoid
   importing live routed screens because those require auth, Supabase data,
   gestures, media permissions, and app shell state. */
function MockPhoneBottomNav({ activeView, showNotificationBadge }) {
  return (
    <div className="wf-mock-bottom-nav">
      <div className={`wf-mock-bottom-nav-item ${activeView === 'match' ? 'active' : ''}`}>
        <span className="wf-mock-bottom-nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c-2.28 0-3-1.89-3-3-2.5 1-2.5 4.5-2.5 4.5C4 11 6 7 10 3c.33 3.67 4 3 6 7 1 2 1.5 3 1.5 4.5 0 3-2.5 5.5-5.5 5.5a5.5 5.5 0 0 1-3.5-1.5z" />
          </svg>
          {showNotificationBadge && activeView !== 'match' && <span className="wf-mock-nav-badge">1</span>}
        </span>
        <span className="wf-mock-bottom-nav-label">Match</span>
        {activeView === 'match' && <span className="wf-mock-bottom-nav-indicator" />}
      </div>
      <div className={`wf-mock-bottom-nav-item ${activeView === 'explore' ? 'active' : ''}`}>
        <span className="wf-mock-bottom-nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          {showNotificationBadge && activeView !== 'explore' && <span className="wf-mock-nav-badge">3</span>}
        </span>
        <span className="wf-mock-bottom-nav-label">Explore</span>
        {activeView === 'explore' && <span className="wf-mock-bottom-nav-indicator" />}
      </div>
      <div className={`wf-mock-bottom-nav-item ${activeView === 'chat' ? 'active' : ''}`}>
        <span className="wf-mock-bottom-nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {showNotificationBadge && activeView !== 'chat' && activeView !== 'inbox' && <span className="wf-mock-nav-badge">2</span>}
        </span>
        <span className="wf-mock-bottom-nav-label">Chat</span>
        {(activeView === 'chat' || activeView === 'inbox') && <span className="wf-mock-bottom-nav-indicator" />}
      </div>
      <div className="wf-mock-bottom-nav-item">
        <span className="wf-mock-bottom-nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {showNotificationBadge && <span className="wf-mock-nav-badge">4</span>}
        </span>
        <span className="wf-mock-bottom-nav-label">Confess</span>
      </div>
      <div className={`wf-mock-bottom-nav-item ${activeView === 'profile' ? 'active' : ''}`}>
        <span className="wf-mock-bottom-nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {showNotificationBadge && activeView !== 'profile' && <span className="wf-mock-nav-badge">!</span>}
        </span>
        <span className="wf-mock-bottom-nav-label">Profile</span>
        {activeView === 'profile' && <span className="wf-mock-bottom-nav-indicator" />}
      </div>
    </div>
  );
}

function MatchScreenExisting() {
  return (
    <div className="wf-real-match wf-current-screen">
      <div className="wf-source-chip">Current: Match.jsx + SwipeCard.css</div>
      
      {/* Real Floating Filter Button */}
      <button className="wf-real-floating-filter-btn" aria-label="Filter by gender">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
        <span className="wf-real-gender-active-dot" />
      </button>

      {/* Real Live Mode Bar */}
      <div className="wf-real-live-mode-bar">
        <div className="wf-real-live-toggle-pill">
          <div className="wf-real-live-badge-glow"></div>
          <span className="wf-real-live-label">Live Near Me</span>
          <div className="wf-real-live-toggle-switch">
            <div className="wf-real-toggle-circle"></div>
          </div>
        </div>
      </div>
      {/* Real Floating Stats Area */}
      <div className="wf-real-discovery-floating-stats">
        <div className="wf-real-streak-indicator-floating">
          <div className="wf-real-streak-fire-icon">
            🔥<span className="wf-real-streak-number">3</span>
          </div>
        </div>
        <div className="wf-real-swipes-counter-pill">
          <span className="wf-real-pill-icon">⚡</span>
          <div className="wf-real-pill-content">
            <span className="wf-real-pill-number">20</span>
            <span className="wf-real-pill-label">Swipes Left</span>
          </div>
        </div>
      </div>

      {/* Real Card Stack */}
      <div className="wf-real-card-stack" aria-label="Current swipe card stack">
        <div className="wf-real-card back-one" />
        <div className="wf-real-card back-two" />
        <div className="wf-real-card top">
          <div className="wf-real-card-photo" />
          <div className="wf-real-photo-bars"><i /><i className="muted" /><i className="muted" /></div>
          <div className="wf-real-live-badge"><span />LIVE</div>
          <div className="wf-real-card-gradient" />
          <div className="wf-real-card-copy">
            <div className="wf-real-tags">
              <span>🎓 UNILAG</span>
              <span>🟢 Recently Active</span>
            </div>
            <h3>Amaka <small>, 21</small></h3>
            <p>Afrobeats enthusiast, library dweller, and looking for study dates around campus.</p>
            <button className="wf-real-super-swipe-btn">⭐ Super Swipe <b>2</b></button>
          </div>
        </div>
      </div>
      <MockPhoneBottomNav activeView="match" showNotificationBadge={false} />
      
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '14%', right: '8%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Floating controls</strong>Live toggle, gender filter, status bubbles, and counters all compete above the card.</div>
        </div>
        <div className="wf-hotspot" style={{ bottom: '26%', left: '13%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>Hidden AI tools</strong>AI actions exist only after card expansion, so users may not discover them.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '6%', right: '12%' }}>
          <div className="wf-hotspot-dot">3</div>
          <div className="wf-hotspot-tooltip"><strong>Hidden Alerts</strong>The top navbar is hidden on swiping, meaning pending notifications are completely invisible.</div>
        </div>
      </div>
    </div>
  );
}

function InboxScreenExisting() {
  return (
    <div className="wf-real-inbox wf-current-screen">
      <div className="wf-source-chip">Current: Chat.jsx (Sidebar)</div>
      <div className="wf-real-inbox-header">
        <h1>Messages</h1>
      </div>
      <div className="wf-real-inbox-list">
        <div className="wf-real-inbox-item unread">
          <div className="avatar-wrapper">
            <div className="wf-real-bubble-avatar tunde" />
            <span className="online-dot" />
          </div>
          <div className="info">
            <div className="name-row">
              <strong>Tunde</strong>
              <span className="time">9:43 AM</span>
            </div>
            <p>What faculty are you in?</p>
          </div>
          <div className="unread-badge">●</div>
        </div>
        <div className="wf-real-inbox-item">
          <div className="avatar-wrapper">
            <div className="wf-real-bubble-avatar amaka" />
          </div>
          <div className="info">
            <div className="name-row">
              <strong>Amaka</strong>
              <span className="time">9:41 AM</span>
            </div>
            <p>Haha thanks 😊</p>
          </div>
        </div>
        <div className="wf-real-inbox-item">
          <div className="avatar-wrapper">
            <div className="wf-real-bubble-avatar zainab" />
            <span className="online-dot" />
          </div>
          <div className="info">
            <div className="name-row">
              <strong>Zainab</strong>
              <span className="time">Yesterday</span>
            </div>
            <p>Say hi 👋</p>
          </div>
        </div>
      </div>
      <MockPhoneBottomNav activeView="chat" showNotificationBadge={true} />
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '24%', right: '8%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Simple Inbox List</strong>No quick search or presence highlights. Users must browse manually to find active DMs.</div>
        </div>
      </div>
    </div>
  );
}

function InboxScreenImproved() {
  const [isPremiumMode, setIsPremiumMode] = useState(false);

  return (
    <div className="wf-real-inbox wf-proposed-screen">
      <div className="wf-source-chip improved">Proposed: Premium Inbox Layout</div>
      
      <div className="wf-real-inbox-header slim">
        <h1>Inbox</h1>
        <button 
          className={`inbox-settings-btn ${isPremiumMode ? 'premium-active' : ''}`}
          onClick={() => setIsPremiumMode(!isPremiumMode)}
          title="Toggle Free/Premium Mockup State"
        >
          {isPremiumMode ? '👑' : '🔒'}
        </button>
      </div>

      <div className="wf-real-inbox-search">
        <span>🔍</span>
        <input type="text" placeholder="Search direct messages..." disabled />
      </div>

      {/* WhatsApp-style Inbox Filter Chips */}
      <div className="wf-real-inbox-filters">
        <button className="active">All</button>
        <button>Unread</button>
        <button>Online</button>
        <button>Matches</button>
      </div>

      {/* Match Requests & Premium Queues Row */}
      <div className="wf-real-inbox-requests-section">
        <div className="wf-requests-header">
          <span>Activity & Requests</span>
          <button className="view-all-btn" onClick={() => setIsPremiumMode(!isPremiumMode)}>
            {isPremiumMode ? '👑 Premium' : '🔒 Free'}
          </button>
        </div>
        <div className="wf-requests-scroll">
          {/* Blurred/Unlocked "Likes" card representing the queue */}
          <div className={`wf-request-circle-card blur-likes ${isPremiumMode ? 'unlocked' : ''}`} onClick={() => setIsPremiumMode(!isPremiumMode)}>
            <div className="wf-request-avatar-blur">
              {isPremiumMode ? '❤️ 3' : '3'}
            </div>
            <span className="wf-request-name-label">{isPremiumMode ? 'Likes (3)' : 'Likes'}</span>
          </div>

          {/* Blurred/Unlocked "Views" card representing the queue */}
          <div className={`wf-request-circle-card blur-views ${isPremiumMode ? 'unlocked' : ''}`} onClick={() => setIsPremiumMode(!isPremiumMode)}>
            <div className="wf-request-avatar-blur">
              {isPremiumMode ? '👁️ 7' : '🔒'}
            </div>
            <span className="wf-request-name-label">{isPremiumMode ? 'Views (7)' : 'Views'}</span>
          </div>

          {/* Active Request 1: Fatima */}
          <div className="wf-request-circle-card">
            <div className="wf-request-avatar-wrapper">
              <div className="wf-real-bubble-avatar fatima" />
              <button className="wf-request-action-accept" aria-label="Accept Match">✓</button>
            </div>
            <span className="wf-request-name-label">Fatima</span>
          </div>
          {/* Active Request 2: Kola */}
          <div className="wf-request-circle-card">
            <div className="wf-request-avatar-wrapper">
              <div className="wf-real-bubble-avatar kola" />
              <button className="wf-request-action-accept" aria-label="Accept Match">✓</button>
            </div>
            <span className="wf-request-name-label">Kola</span>
          </div>
        </div>
      </div>

      <div className="wf-real-inbox-list">
        {/* Item 1 - Pinned Chat, Unread, Active Story */}
        <div className="wf-real-inbox-item unread">
          <div className="avatar-wrapper">
            <div className="wf-real-bubble-avatar tunde story-active" />
            <span className="online-dot" />
          </div>
          <div className="info">
            <div className="name-row">
              <strong>📌 Tunde</strong>
              <span className="time active">9:43 AM</span>
            </div>
            <p className="unread-text">What faculty are you in?</p>
          </div>
          <div className="badge-wrapper">
            <span className="count-badge">1</span>
          </div>
        </div>

        {/* Item 2 - Outgoing Read Receipt (Double Ticks) & Active Story */}
        <div className="wf-real-inbox-item">
          <div className="avatar-wrapper">
            <div className="wf-real-bubble-avatar amaka story-active" />
          </div>
          <div className="info">
            <div className="name-row">
              <strong>Amaka</strong>
              <span className="time">9:41 AM</span>
            </div>
            <p>
              <span className="wf-inbox-tick blue">✓✓</span> Haha thanks 😊
            </p>
          </div>
        </div>

        {/* Item 3 - Pinned/Muted Indicator & Draft Status */}
        <div className="wf-real-inbox-item-container">
          <div className="wf-real-inbox-item swiped">
            <div className="avatar-wrapper">
              <div className="wf-real-bubble-avatar zainab" />
              <span className="online-dot" />
            </div>
            <div className="info">
              <div className="name-row">
                <strong>Zainab</strong>
                <span className="time">
                  <span className="wf-inbox-mute">🔇</span> Yesterday
                </span>
              </div>
              <p className="wf-inbox-draft">Draft: Say hi 👋</p>
            </div>
          </div>
          <div className="wf-real-inbox-swipe-actions">
            <button className="delete-action">🗑️</button>
          </div>
        </div>
      </div>
      
      <MockPhoneBottomNav activeView="chat" showNotificationBadge={true} />
      
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '13%', left: '40%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Quick Search & Filters</strong>Filter chats instantly by clicking filter chips (All, Unread, Online) or typing names.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '21%', left: '45%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Match Requests Tray</strong>Review and accept pending likes/requests (e.g., Fatima, Kola) directly from your inbox list.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '35%', left: '50%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Match Views (Premium Gate)</strong>Shows who viewed your profile. Blurred with gold padlocks for free users; fully revealed for premium subscribers.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '55%', left: '16%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Pinned Conversations</strong>Pin important matches (like Tunde 📌) to the top of your inbox list.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '75%', left: '50%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Read Receipts & Drafts</strong>See blue read-ticks directly in the list, and review draft messages without opening DMs.</div>
        </div>
      </div>
    </div>
  );
}

function MatchScreenImproved() {
  return (
    <div className="wf-real-match wf-proposed-screen">
      <div className="wf-source-chip improved">Proposed against current Match layout</div>
      <div className="wf-real-top-rail">
        <div className="wf-real-top-filters">
          <button className="active">Live Near Me</button>
          <button>Women</button>
        </div>
        <div className="wf-real-swipes-left-badge">
          ⚡ <b>20</b> Swipes Left
        </div>
      </div>
      <div className="wf-real-card-stack improved" aria-label="Improved swipe card stack">
        <div className="wf-real-card back-one" />
        <div className="wf-real-card top">
          <div className="wf-real-card-photo improved" />
          <div className="wf-real-photo-bars"><i /><i className="muted" /><i className="muted" /></div>
          <div className="wf-real-card-gradient" />
          <div className="wf-real-card-copy">
            <div className="wf-real-tags">
              <span>🎓 UNILAG</span>
              <span>87% match</span>
            </div>
            <h3>Amaka <small>, 21</small></h3>
            <p>Afrobeats, library nights, and campus food spots.</p>
            
            {/* Real app detail tools dropdown select */}
            <div className="wf-real-ai-detail-tools-dropdown">
              <label>AI Wingmate</label>
              <select defaultValue="Insight">
                <option value="Insight">Insight (Compatibility Signal)</option>
                <option value="Openers">Openers (Opening Lines)</option>
                <option value="Date">Date (Campus Date Ideas)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="wf-real-bottom-actions">
        <button className="pass">✕</button>
        <button className="star">★</button>
        <button className="like">♥</button>
      </div>
      <MockPhoneBottomNav activeView="match" showNotificationBadge={true} />
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '10%', left: '12%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Controls grouped</strong>Filters become a compact rail instead of scattered floating controls.</div>
        </div>
        <div className="wf-hotspot" style={{ bottom: '14%', left: '50%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Explicit thumb actions</strong>Primary swipe choices are persistent, balanced, and reachable.</div>
        </div>
        <div className="wf-hotspot" style={{ bottom: '3%', left: '50%', transform: 'translateX(20px)' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Bottom Nav Alert</strong>Badge count relocated to bottom tab keeps alerts visible while swiping.</div>
        </div>
      </div>
    </div>
  );
}

function ChatScreenExisting() {
  return (
    <div className="wf-real-chat wf-current-screen">
      <div className="wf-source-chip">Current: Chat.jsx + Chat.css</div>
      <div className="wf-real-chat-header">
        <button>←</button>
        <div className="wf-real-avatar" />
        <div>
          <strong>Tunde</strong>
          <span>Online</span>
        </div>
        <div className="wf-real-chat-actions"><i>☎</i><i>•••</i></div>
      </div>
      <div className="wf-real-messages">
        <div className="wf-real-bubble them">Hey! Saw your profile 👀</div>
        <div className="wf-real-bubble me">Haha thanks 😊 <small>9:41 ✓</small></div>
        <div className="wf-real-bubble them">What faculty are you in?</div>
      </div>
      <div className="wf-real-chat-input">
        <div className="wf-real-composer-pill"><span>☺</span><em>Message</em></div>
        <div className="wf-real-side-actions"><button>AI</button><button>📷</button><button>🎁</button><button>🎙</button></div>
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ bottom: '5%', right: '8%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Action cluster</strong>AI, camera, gift, and recorder can crowd narrow Android widths.</div>
        </div>
        <div className="wf-hotspot" style={{ bottom: '5%', left: '8%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>Restricted Emojis</strong>The current emoji button opens a limited drawer of only 16 options.</div>
        </div>
      </div>
    </div>
  );
}

function ChatScreenImproved() {
  return (
    <div className="wf-real-chat wf-proposed-screen">
      <div className="wf-source-chip improved">Proposed against current Chat layout</div>
      <div className="wf-real-chat-header slim">
        <button>←</button>
        <div className="wf-real-avatar" />
        <div>
          <strong>Tunde</strong>
          <span>Online</span>
        </div>
        <div className="wf-real-chat-actions"><i>☎</i><i>•••</i></div>
      </div>
      <div className="wf-real-messages">
        <div className="wf-real-bubble them">Hey! Saw your profile 👀</div>
        <div className="wf-real-bubble me">Haha thanks 😊 <small>9:41 ✓✓ (edited)</small></div>
        <div className="wf-real-bubble them">What faculty are you in?</div>
        
        {/* Threaded Quoted Reply */}
        <div className="wf-real-bubble me reply-wrapper">
          <div className="wf-real-reply-preview">
            <strong>Tunde</strong>
            <span>What faculty are you in?</span>
          </div>
          <span>Engineering! 🔧</span>
          <small>9:43 ✓✓</small>
        </div>
      </div>
      
      {/* Scrollable Complete Emoji Drawer replica */}
      <div className="wf-real-emoji-drawer-mock">
        <div className="wf-emoji-tabs">
          <span className="active">😀 Emojis</span>
          <span>🙌 Stickers</span>
          <span>🎁 Gifts</span>
        </div>
        <div className="wf-emoji-grid-mock">
          {['❤️', '😂', '🔥', '🙌', '✨', '🥺', '😍', '😎', '💀', '💯', '🙏', '👍', '😢', '🤔', '👀', '🎉', '😊', '🥳', '😉', '😜', '🍗', '🧐', '😌', '🤡'].map(e => (
            <span key={e}>{e}</span>
          ))}
        </div>
      </div>

      <div className="wf-real-chat-input improved">
        <div className="wf-real-composer-pill wide"><span>☺</span><em>Message</em></div>
        <div className="wf-real-side-actions compact"><button>＋</button><button>➤</button></div>
      </div>
      
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ bottom: '34%', left: '8%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Message Threading</strong>Swipe-to-reply creates WhatsApp-style quoted replies to maintain context.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '35%', right: '8%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Message Editing</strong>Allow users to edit sent messages directly to correct typos inline.</div>
        </div>
        <div className="wf-hotspot" style={{ bottom: '15%', left: '50%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Expanded Emoji Grid</strong>Scrollable grid with regional sticker categorization provides complete chat expression.</div>
        </div>
      </div>
    </div>
  );
}

function ProfileScreenExisting() {
  const [isOwn, setIsOwn] = useState(false);

  return (
    <div className="wf-real-profile-view wf-current-screen">
      <div className="wf-source-chip">Current: Profile.jsx (Public View)</div>
      
      {/* Toggle View Mode */}
      <div className="wf-profile-view-toggle">
        <button className={!isOwn ? 'active' : ''} onClick={() => setIsOwn(false)}>Public View</button>
        <button className={isOwn ? 'active' : ''} onClick={() => setIsOwn(true)}>My Profile</button>
      </div>

      <div className="wf-real-profile-scroll-view">
        {!isOwn ? (
          <>
            <div className="wf-profile-header-circular">
              <div className="wf-profile-avatar-circle" />
              <h2>Amaka, 21</h2>
              <span className="wf-profile-status-label">Online now</span>
            </div>
            <div className="wf-profile-details-card">
              <div className="wf-profile-grid-info">
                <div><strong>Level</strong><span>300L</span></div>
                <div><strong>Dept</strong><span>Law</span></div>
                <div><strong>Faculty</strong><span>Law</span></div>
                <div><strong>Goal</strong><span>Quiet Dates</span></div>
              </div>

              <div className="wf-profile-section-simple">
                <h4>Bio</h4>
                <p>Afrobeats, library nights, and campus food spots. Looking for someone to share cafeteria reviews with.</p>
              </div>

              <div className="wf-profile-section-simple">
                <h4>Interests</h4>
                <div className="wf-profile-tags-simple">
                  <span>Music</span><span>Reading</span><span>Food</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="wf-profile-header-circular">
              <div className="wf-profile-avatar-circle user-avatar" />
              <h2>Your Profile</h2>
              <span className="wf-profile-status-label">Active</span>
            </div>
            <div className="wf-profile-details-card">
              <button className="wf-legacy-button">✏️ Edit Profile</button>
              <button className="wf-legacy-button premium">👑 Get Premium</button>
              <button className="wf-legacy-button">🏆 Leaderboard</button>
              <p style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center', marginTop: '1.2rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                Note: Referrals, Wallet, and Settings are hidden in the top nav menu dropdown.
              </p>
            </div>
          </>
        )}
      </div>
      <MockPhoneBottomNav activeView="profile" showNotificationBadge={false} />
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '22%', left: '50%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Circular Avatar Header</strong>A small, centered circular avatar (100px) is used today rather than a modern, immersive full-screen cover layout.</div>
        </div>
      </div>
    </div>
  );
}

function ProfileScreenImproved() {
  const [isOwn, setIsOwn] = useState(false);

  return (
    <div className="wf-real-profile-view wf-proposed-screen">
      <div className="wf-source-chip improved">Proposed: Premium Profile Card</div>
      
      {/* Toggle View Mode */}
      <div className="wf-profile-view-toggle">
        <button className={!isOwn ? 'active' : ''} onClick={() => setIsOwn(false)}>Public View</button>
        <button className={isOwn ? 'active' : ''} onClick={() => setIsOwn(true)}>My Profile</button>
      </div>

      <div className="wf-real-profile-scroll-view">
        {!isOwn ? (
          <>
            {/* Carousel image with status dots and progress bars */}
            <div className="wf-profile-image-carousel improved">
              {/* Top Progress Bars (like Instagram Stories or Tinder) */}
              <div className="wf-photo-progress-bars">
                <span className="bar active" />
                <span className="bar" />
                <span className="bar" />
              </div>
              
              {/* Top Device Bar Overlay */}
              <div className="wf-mock-photo-header-bar">
                <span>22:15</span>
                <span style={{ letterSpacing: '1px' }}>📶 🔋 98%</span>
              </div>

              <div className="wf-profile-img-placeholder improved" />
              
              <div className="wf-carousel-dots">
                <span className="active" /><span /><span />
              </div>
            </div>
            
            <div className="wf-profile-details-card improved">
              <div className="wf-profile-title-row">
                <h2>Amaka <small>, 21</small></h2>
                <span className="wf-profile-live-tag">LIVE</span>
              </div>
              <p className="wf-profile-uni-tag">🎓 University of Lagos (UNILAG) • 📍 Moremi Hall</p>

              {/* AI Compatibility Signal Banner */}
              <div className="wf-profile-compatibility-card">
                <div className="wf-comp-percentage animated-glow">94%</div>
                <div className="wf-comp-info">
                  <strong>High Compatibility (AI Wingmate Check)</strong>
                  <p>You both study Law, reside on-campus, enjoy late-night library runs, and listen to Afrobeats!</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="wf-profile-grid-info improved">
                <div><strong>Level</strong><span>300L</span></div>
                <div><strong>Dept</strong><span>Law</span></div>
                <div><strong>MBTI</strong><span>INFJ</span></div>
                <div><strong>Genotype</strong><span>AA</span></div>
              </div>

              {/* Voice Intro Player */}
              <div className="wf-profile-voice-player">
                <span className="play-icon">▶</span>
                <div className="voice-waves">
                  <span style={{ height: '30%' }} /><span style={{ height: '70%' }} /><span style={{ height: '40%' }} /><span style={{ height: '80%' }} /><span style={{ height: '50%' }} />
                </div>
                <span className="duration">0:14</span>
              </div>

              {/* Bio section */}
              <div className="wf-profile-section-premium">
                <h4>About Me</h4>
                <p>Afrobeats, library nights, and campus food spots. Looking for someone to share cafeteria reviews with.</p>
              </div>

              {/* Spotify Campus Anthem Widget */}
              <div className="wf-spotify-anthem">
                <div className="spotify-wave-logo">🎵</div>
                <div className="spotify-track-details">
                  <span className="track-title">Calm Down</span>
                  <span className="track-artist">Rema • Campus Anthem</span>
                </div>
                <span className="spotify-play-btn">▶</span>
              </div>

              {/* Interest Tags with Emojis */}
              <div className="wf-profile-section-premium">
                <h4>Vibe Tags</h4>
                <div className="wf-profile-interests-pill-list">
                  <span className="interest-pill">🍿 Movie Nights</span>
                  <span className="interest-pill">🎸 Afrobeats</span>
                  <span className="interest-pill">📚 Law Library</span>
                  <span className="interest-pill">🍕 Suya Runs</span>
                </div>
              </div>

              {/* Q&A Prompt Card */}
              <div className="wf-profile-prompt-card">
                <span className="prompt-question">We will get along if...</span>
                <p className="prompt-answer">"You can survive a 6-hour lecture backlog and still want to grab dinner at the cafeteria afterwards."</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Mock Immersive Own Profile Banner */}
            <div className="wf-profile-image-carousel improved own-header">
              <div className="wf-mock-photo-header-bar">
                <span>22:15</span>
                <span style={{ letterSpacing: '1px' }}>📶 🔋 98%</span>
              </div>
              <div className="wf-profile-img-placeholder improved user-own-avatar" />
              <h2 className="wf-own-name">Your Profile</h2>
              <p className="wf-profile-uni-tag">🎓 University of Lagos (UNILAG)</p>
            </div>

            <div className="wf-profile-details-card improved">
              <div className="wf-ai-compat-signal own-hub-title">
                <span className="ai-star">⚙️</span>
                <div className="ai-compat-body">
                  <strong>Account Dashboard</strong>
                  <p>Quick access to settings, wallet, and referral earnings.</p>
                </div>
              </div>

              {/* New Dashboard Grid */}
              <div className="wf-showcase-dashboard-grid">
                <div className="wf-showcase-dash-card">
                  <span className="icon">✏️</span>
                  <strong>Edit Profile</strong>
                </div>
                <div className="wf-showcase-dash-card">
                  <span className="icon">💰</span>
                  <strong>My Wallet</strong>
                </div>
                <div className="wf-showcase-dash-card">
                  <span className="icon">🎁</span>
                  <strong>Referrals</strong>
                </div>
                <div className="wf-showcase-dash-card">
                  <span className="icon">⚙️</span>
                  <strong>Settings</strong>
                </div>
                <div className="wf-showcase-dash-card partner">
                  <span className="icon">🤝</span>
                  <strong>Partner Up</strong>
                </div>
                <div className="wf-showcase-dash-card">
                  <span className="icon">🏆</span>
                  <strong>Leaderboard</strong>
                </div>
                <div className="wf-showcase-dash-card logout">
                  <span className="icon">🚪</span>
                  <strong>Logout</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!isOwn && (
        <div className="wf-profile-floating-actions">
          <button className="call-btn">📞 Call</button>
          <button className="chat-btn primary">💬 Message</button>
          <button className="gift-btn">🎁 Gift</button>
        </div>
      )}

      <MockPhoneBottomNav activeView="profile" showNotificationBadge={true} />

      <div className="wf-hotspot-overlay">
        {!isOwn ? (
          <>
            <div className="wf-hotspot" style={{ top: '23%', left: '16%' }}>
              <div className="wf-hotspot-dot">✓</div>
              <div className="wf-hotspot-tooltip"><strong>Compatibility signals</strong>Surfaces mutual interests and AI breakdown highlights right at the top.</div>
            </div>
            <div className="wf-hotspot" style={{ top: '48%', left: '35%' }}>
              <div className="wf-hotspot-dot">✓</div>
              <div className="wf-hotspot-tooltip"><strong>Voice Intros</strong>Allows users to listen to a 15-second audio intro to hear their match's voice.</div>
            </div>
            <div className="wf-hotspot" style={{ top: '75%', left: '60%' }}>
              <div className="wf-hotspot-dot">✓</div>
              <div className="wf-hotspot-tooltip"><strong>Prompt cards</strong>Replaces boring sections with styled, personal dialogue cards to spark replies.</div>
            </div>
            <div className="wf-hotspot" style={{ bottom: '12%', left: '50%' }}>
              <div className="wf-hotspot-dot">✓</div>
              <div className="wf-hotspot-tooltip"><strong>Floating actions</strong>Glassmorphic call, chat, and gift buttons stay reachable at the bottom.</div>
            </div>
          </>
        ) : (
          <div className="wf-hotspot" style={{ top: '72%', left: '50%' }}>
            <div className="wf-hotspot-dot">✓</div>
            <div className="wf-hotspot-tooltip"><strong>Account Hub Grid</strong>Moves Referrals, Wallet, and Settings from the top nav dropdown into a beautiful 2x2 grid.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingScreenExisting() {
  return (
    <div className="wf-real-onboarding wf-current-screen">
      <div className="wf-source-chip">Current: MiniProfileSetup.jsx</div>
      <div className="wf-real-progress"><i style={{ width: '33%' }} /></div>
      
      {/* Top Navigation Row */}
      <div className="wf-real-onboarding-top-nav">
        <button className="wf-top-back-btn">Back</button>
        <button className="wf-top-next-btn primary">Next</button>
      </div>

      <div className="wf-real-quiz">
        <span>Step 2 of 6</span>
        <h3>Where do you study?</h3>
        <p>Find people on your campus</p>
        <div className="wf-real-input active">Search University</div>
        <div className="wf-real-level-grid">
          {['100L', '200L', '300L', '400L', '500L', 'Graduate'].map(level => <button key={level}>{level}</button>)}
        </div>
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '4%', left: '8%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Real progress bar</strong>The current app already has a top progress bar, not no progress indicator.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '12%', left: '50%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>Top navigation</strong>Back/Next are placed at the top of the onboarding cards.</div>
        </div>
      </div>
    </div>
  );
}

function OnboardingScreenImproved() {
  return (
    <div className="wf-real-onboarding wf-proposed-screen">
      <div className="wf-source-chip improved">Proposed against current onboarding</div>
      <div className="wf-real-step-dots">
        <i className="done" /><i className="active" /><i /><i /><i /><i />
      </div>
      
      {/* Top Navigation Row */}
      <div className="wf-real-onboarding-top-nav">
        <button className="wf-top-back-btn">Back</button>
        <button className="wf-top-next-btn primary">Next →</button>
      </div>

      <div className="wf-real-quiz improved">
        <span>Step 2 of 6</span>
        <h3>Choose your campus</h3>
        <p>Search first, then confirm your level in one clear path.</p>
        <div className="wf-real-input active">University of Lagos (UNILAG)</div>
        <div className="wf-real-level-grid compact">
          {['100L', '200L', '300L'].map(level => <button key={level}>{level}</button>)}
        </div>
        <div className="wf-real-context-note">Selected universities can be edited later in Profile Settings.</div>
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '5%', left: '8%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Segmented steps</strong>Dots make six stages scannable without replacing the existing progress concept.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '65%', left: '8%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Reduced choices</strong>Show fewer level buttons at once or segment them to reduce visual density.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Explore: Existing ─────────────────────────────────── */
function ExploreScreenExisting() {
  const cards = [
    { name: 'Ada, 21', uni: 'UNILAG', intent: 'Serious 💍' },
    { name: 'Kemi, 20', uni: 'LASU', intent: 'Casual 🔥' },
    { name: 'Tunde, 23', uni: 'UNILAG', intent: 'Friends 🤝' },
    { name: 'Ify, 22', uni: 'UNIBEN', intent: 'Serious 💍' },
    { name: 'Chike, 24', uni: 'UI', intent: 'Casual 🔥' },
    { name: 'Ngozi, 21', uni: 'FUTA', intent: 'Friends 🤝' },
  ];
  return (
    <div className="wf-explore-existing wf-current-screen">
      <div className="wf-source-chip">Current: Explore.jsx</div>
      {/* Flat category chips */}
      <div className="wf-explore-cats">
        {['All','Newest','Near Me','Serious'].map(c => (
          <span key={c} className={`wf-explore-cat ${c==='All'?'active':''}`}>{c}</span>
        ))}
      </div>
      {/* Uniform grid */}
      <div className="wf-explore-grid-old">
        {cards.map((c,i) => (
          <div key={i} className="wf-explore-card-old">
            <div className="wf-explore-card-img-old" style={{ background: `hsl(${i * 60}, 45%, 25%)` }}>
              <span className="wf-explore-intent-old">{c.intent}</span>
            </div>
            <div className="wf-explore-card-info-old">
              <strong>{c.name}</strong>
              <span>{c.uni}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '8%', left: '4%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>No search or filter</strong>Only category chips — no text search, no gender/age filter toggle accessible from this screen.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '38%', right: '4%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>No presence signals</strong>Cards show no online/live badge — you can't tell who's active right now before tapping.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '68%', left: '4%' }}>
          <div className="wf-hotspot-dot">3</div>
          <div className="wf-hotspot-tooltip"><strong>Uniform 2-col grid</strong>Every card same size — no visual hierarchy to highlight standout profiles or new arrivals.</div>
        </div>
      </div>
    </div>
  );
}

function ExploreScreenImproved() {
  const cards = [
    { name: 'Ada, 21', uni: 'UNILAG', intent: 'Serious 💍', live: true, tall: true, hue: 260, new: false },
    { name: 'Kemi, 20', uni: 'LASU', intent: 'Casual 🔥', online: true, tall: false, hue: 320, new: true },
    { name: 'Tunde, 23', uni: 'UNILAG', intent: 'Friends 🤝', tall: false, hue: 200, new: false },
    { name: 'Ify, 22', uni: 'UNIBEN', intent: 'Serious 💍', live: true, tall: true, hue: 30, new: false },
    { name: 'Chike, 24', uni: 'UI', intent: 'Casual 🔥', online: true, tall: false, hue: 160, new: true },
    { name: 'Ngozi, 21', uni: 'FUTA', intent: 'Friends 🤝', tall: false, hue: 280, new: false },
  ];
  return (
    <div className="wf-explore-improved wf-improved-screen">
      <div className="wf-source-chip improved">✦ Improved: Explore.jsx</div>
      {/* Search bar + filter pill */}
      <div className="wf-imp-explore-search-row">
        <div className="wf-imp-explore-search">
          <span style={{fontSize:'10px'}}>🔍</span>
          <span className="wf-imp-explore-search-ph">Search name, school...</span>
        </div>
        <button className="wf-imp-explore-filter-btn">⚙️ Filter</button>
      </div>
      {/* Chips with Live tab */}
      <div className="wf-real-explore-cats">
        {['All','🔴 Live','Nearest','Serious','Casual'].map(c => (
          <span key={c} className={`wf-real-explore-chip${c==='All'?' active':''}`}>{c}</span>
        ))}
      </div>
      {/* Masonry 2-col variable height */}
      <div className="wf-imp-explore-masonry">
        {cards.map((c,i) => (
          <div key={i} className={`wf-imp-explore-card${c.tall?' tall':''}`}
               style={{ '--card-hue': c.hue }}>
            <div className="wf-imp-explore-photo">
              {c.live && <span className="wf-imp-live-badge">🔴 LIVE</span>}
              {c.online && !c.live && <span className="wf-imp-online-badge">● Online</span>}
              {c.new && <span className="wf-imp-new-badge">✨ New</span>}
              <span className="wf-imp-explore-intent">{c.intent}</span>
              <div className="wf-imp-explore-info">
                <strong>{c.name}</strong>
                <span>{c.uni}</span>
              </div>
              {/* Quick action tray on hover */}
              <div className="wf-imp-quick-tray">
                <button className="wf-imp-tray-btn">❤️</button>
                <button className="wf-imp-tray-btn">💬</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '8%', left: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Search + filter</strong>Keyword search and ⚙️ filter for gender/age stays fixed above the grid at all times.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '36%', right: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Live &amp; Online badges</strong>🔴 LIVE overlay drives urgency; ● Online tells who can reply immediately.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '65%', left: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Masonry + Quick actions</strong>Variable height cards let photos breathe. ❤️/💬 tray lets you act without opening the full drawer.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Confession: Existing (accurate replica of Confessions.jsx) ─ */
function ConfessionScreenExisting() {
  const posts = [
    { text: "I see my crush every day in the library and I still haven't said hi 😭", reactions: 12, comments: 3, time: '2h', viral: false, mesh: 1 },
    { text: 'The 8am professor clearly hasn\'t slept either. We suffer together.', reactions: 44, comments: 11, time: '5h', viral: false, mesh: 2 },
    { text: 'Failed my first CAT exam. Didn\'t tell my parents yet. Pray for me 🙏', reactions: 87, comments: 28, time: '1d', viral: true, mesh: 3 },
  ];
  // ACTUAL Confessions.jsx: dark mesh bg, big hero section (campus badge + "Campus Secrets" title),
  // glassmorphic compose card, masonry column of premium cards with mesh gradients,
  // floating pill action bar (reaction total + 🔥 + 💬 + 👀), viral = purple glow + "🔥 Trending" badge
  return (
    <div className="wf-confession-existing wf-current-screen">
      <div className="wf-source-chip">Current: Confessions.jsx</div>
      {/* Hero — matches .confessions-hero */}
      <div className="wf-real-confession-hero">
        <span className="wf-real-confession-campus-pill">UNILAG</span>
        <h3 className="wf-real-confession-title">Campus Secrets</h3>
        <p className="wf-real-confession-sub">Anonymous. Ephemeral. 100% Student-led.</p>
      </div>
      {/* Compose card — matches .input-card-ultimate */}
      <div className="wf-real-confession-compose">
        <textarea className="wf-real-confession-ta" placeholder="What's the tea today?..." readOnly />
        <div className="wf-real-confession-compose-foot">
          <span style={{fontSize:'8px',opacity:0.5}}>280 chars left</span>
          <button className="wf-real-confession-post">Post Secret</button>
        </div>
      </div>
      {/* Masonry cards — matches .confessions-masonry + .confession-card-premium */}
      <div className="wf-real-confession-list">
        {posts.map((p,i) => (
          <div key={i} className={`wf-real-confession-card mesh-gradient-${p.mesh}${p.viral?' wf-real-viral':''}`}>
            {p.viral && <span className="wf-real-viral-badge">🔥 Trending</span>}
            <p className="wf-real-confession-body">{p.text}</p>
            {/* Floating pill action bar — matches .action-bar-floating */}
            <div className="wf-real-confession-actions">
              <span style={{opacity:0.6,fontSize:'9px'}}>✨ {p.reactions}</span>
              <div style={{display:'flex',gap:'4px'}}>
                <button className="wf-real-confession-btn">🔥</button>
                <button className="wf-real-confession-btn">💬<span style={{fontSize:'8px'}}>{p.comments}</span></button>
                <button className="wf-real-confession-btn">👀</button>
              </div>
            </div>
            <div style={{marginTop:'6px',display:'flex',justifyContent:'space-between',opacity:0.4,fontSize:'8px'}}>
              <span>🎓 UNILAG</span><span>{p.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '45%', left: '4%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>Only total reaction count</strong>The action bar shows ✨ total only — no breakdown of which emoji was used most.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '68%', right: '4%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>No comment preview</strong>The number on 💬 shows but no snippet of what others said — no hook to open the thread.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '85%', left: '4%' }}>
          <div className="wf-hotspot-dot">3</div>
          <div className="wf-hotspot-tooltip"><strong>Long-press only for burst</strong>Fire 🔥 burst requires a 600ms long-press — tap does nothing visible, zero discoverability.</div>
        </div>
      </div>
    </div>
  );
}

function ConfessionScreenImproved() {
  const posts = [
    { text: "I see my crush every day in the library and I still haven't said hi 😭", reactions: { '🔥':14, '😂':6, '🙊':3 }, topReply: 'Same energy 💀', comments: 5, viral: false, time: '2h', mesh: 1 },
    { text: 'The 8am professor clearly hasn\'t slept either. We suffer together.', reactions: { '🔥':44, '😂':18, '🙏':7 }, topReply: 'He\'s built different 😭', comments: 12, viral: true, time: '5h', mesh: 2 },
    { text: 'Failed my first CAT exam. Didn\'t tell my parents yet. Pray for me 🙏', reactions: { '🙏':87, '🔥':23, '😢':11 }, topReply: 'We\'re rooting for you 💪', comments: 31, viral: true, time: '1d', mesh: 3 },
  ];
  return (
    <div className="wf-confession-improved wf-improved-screen">
      <div className="wf-source-chip improved">✦ Improved: Confessions.jsx</div>
      
      {/* Hero section */}
      <div className="wf-confession-hero-new">
        <span className="wf-confession-campus-badge">UNILAG</span>
        <h3 className="wf-confession-title-new">Campus Secrets</h3>
        <p className="wf-confession-sub-new">Anonymous. Ephemeral. 100% Student-led.</p>
      </div>

      {/* Compose card */}
      <div className="wf-confession-compose-new">
        <textarea className="wf-confession-textarea-new" placeholder="What's the tea today?..." readOnly />
        <div className="wf-confession-compose-footer-new">
          <span style={{fontSize:'8px',opacity:0.5}}>280 chars left</span>
          <button className="wf-confession-post-btn-new">✦ Post Secret</button>
        </div>
      </div>
      
      <div className="wf-confession-masonry">
        {posts.map((p,i) => (
          <div key={i} className={`wf-confession-card-new mesh-gradient-${(i%4)+1} ${p.viral?'viral-card':''}`}>
            {p.viral && <span className="wf-confession-viral-badge">🔥 Trending</span>}
            <p className="wf-confession-text-new">{p.text}</p>
            <div className="wf-confession-actions-new">
              <div className="wf-confession-emojis">
                {Object.entries(p.reactions).map(([e,n]) => (
                  <button key={e} className="wf-confession-emoji-btn">{e}<span>{n}</span></button>
                ))}
              </div>
              <div className="wf-confession-secondary">
                <button className="wf-confession-reply-btn">💬 {p.comments}</button>
                <button className="wf-confession-claim-btn">👀</button>
              </div>
            </div>
            <div className="wf-confession-meta">
              <span style={{opacity:0.5,fontSize:'10px'}}>{p.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '44%', left: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>🔥 Trending badge</strong>Viral posts get a glowing badge so high-engagement content is immediately obvious.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '62%', right: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Per-emoji counts</strong>Each reaction emoji shows its own count — richer social signal at a glance.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '80%', left: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>👀 One-tap claim</strong>Send anonymous "I wrote this" claim without leaving the feed.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Leaderboard: Existing ──────────────────────────────── */
function LeaderboardScreenExisting() {
  const users = [
    { rank: 1, name: 'Ada Okonkwo', uni: 'UNILAG', fans: 142 },
    { rank: 2, name: 'Kemi Adeyemi', uni: 'LASU', fans: 118 },
    { rank: 3, name: 'Tunde Bello', uni: 'UI', fans: 97 },
    { rank: 4, name: 'Ify Nwosu', uni: 'UNIBEN', fans: 76 },
    { rank: 5, name: 'Chike Obi', uni: 'FUTA', fans: 63 },
  ];
  return (
    <div className="wf-lb-existing wf-current-screen">
      <div className="wf-source-chip">Current: Leaderboard.jsx</div>
      <div className="wf-lb-header-old">
        <h3>🏆 Hall of Fame</h3>
      </div>
      <div className="wf-lb-tabs-old">
        <button className="wf-lb-tab-old active">Most Wanted 🔥</button>
        <button className="wf-lb-tab-old">Spenders 💸</button>
      </div>
      <div className="wf-lb-list-old">
        {users.map(u => (
          <div key={u.rank} className="wf-lb-row-old">
            <span className="wf-lb-rank-old">{u.rank}</span>
            <div className="wf-lb-avatar-old" style={{ background: `hsl(${u.rank*60},60%,40%)` }} />
            <div className="wf-lb-info-old">
              <strong>{u.name}</strong>
              <span>{u.uni}</span>
            </div>
            <span className="wf-lb-score-old">{u.fans} fans</span>
          </div>
        ))}
      </div>
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '22%', left: '4%' }}>
          <div className="wf-hotspot-dot">1</div>
          <div className="wf-hotspot-tooltip"><strong>No podium</strong>Top 3 look identical to #4–#50 — no visual crown/ceremony effect.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '60%', right: '4%' }}>
          <div className="wf-hotspot-dot">2</div>
          <div className="wf-hotspot-tooltip"><strong>No league badges</strong>All rows the same style — Royalty/Gold/Silver/Bronze differentiation is missing.</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Leaderboard: Improved ──────────────────────────────── */
function LeaderboardScreenImproved() {
  const podium = [
    { rank: 1, name: 'Ada', fans: 142, hue: 260 },
    { rank: 2, name: 'Kemi', fans: 118, hue: 200 },
    { rank: 3, name: 'Tunde', fans: 97, hue: 320 },
  ];
  const runners = [
    { rank: 4, name: 'Ify Nwosu', uni: 'UNIBEN', fans: 76, league: '🥇' },
    { rank: 5, name: 'Chike Obi', uni: 'FUTA', fans: 63, league: '🥇' },
    { rank: 6, name: 'Ngozi Eze', uni: 'UNN', fans: 51, league: '🥈' },
  ];
  return (
    <div className="wf-lb-improved wf-improved-screen">
      <div className="wf-source-chip improved">✦ Improved: Leaderboard.jsx</div>
      <div className="wf-lb-hero">
        <span className="wf-lb-elite-badge">🏆 Premium Elite</span>
        <h3 className="wf-lb-title">Hall of Fame</h3>
        <div className="wf-lb-countdown">⏱ Resets in <strong>3d 14h 22m</strong></div>
      </div>
      <div className="wf-lb-league-key">
        <span className="wf-lb-key-item crown">👑 Top 3 — Royalty</span>
        <span className="wf-lb-key-item gold">🥇 4–10 — Gold</span>
        <span className="wf-lb-key-item silver">🥈 Silver</span>
      </div>
      <div className="wf-lb-tab-toggle">
        <div className="wf-lb-tab-slider" />
        <button className="wf-lb-toggle-btn active">Most Wanted 🔥</button>
        <button className="wf-lb-toggle-btn">Spenders 💸</button>
      </div>
      {/* Podium */}
      <div className="wf-lb-podium">
        <div className="wf-lb-podium-item second">
          <div className="wf-lb-podium-avatar" style={{ '--hue': podium[1].hue }}>
            <span className="wf-lb-podium-rank-badge">2</span>
          </div>
          <div className="wf-lb-podium-base">
            <p className="wf-lb-podium-name">{podium[1].name}</p>
            <p className="wf-lb-podium-fans">{podium[1].fans}</p>
          </div>
        </div>
        <div className="wf-lb-podium-item first">
          <span className="wf-lb-crown">👑</span>
          <div className="wf-lb-podium-avatar crown-glow" style={{ '--hue': podium[0].hue }}>
            <span className="wf-lb-podium-rank-badge gold">1</span>
          </div>
          <div className="wf-lb-podium-base">
            <p className="wf-lb-podium-name">{podium[0].name}</p>
            <p className="wf-lb-podium-fans">{podium[0].fans}</p>
          </div>
        </div>
        <div className="wf-lb-podium-item third">
          <div className="wf-lb-podium-avatar" style={{ '--hue': podium[2].hue }}>
            <span className="wf-lb-podium-rank-badge">3</span>
          </div>
          <div className="wf-lb-podium-base">
            <p className="wf-lb-podium-name">{podium[2].name}</p>
            <p className="wf-lb-podium-fans">{podium[2].fans}</p>
          </div>
        </div>
      </div>
      {/* Rising Stars */}
      <div className="wf-lb-rising-label">Rising Stars</div>
      {runners.map(u => (
        <div key={u.rank} className="wf-lb-row-new">
          <span className="wf-lb-rank-num">{String(u.rank).padStart(2,'0')}</span>
          <div className="wf-lb-row-avatar" style={{ background: `hsl(${u.rank*55},60%,38%)` }} />
          <div className="wf-lb-row-info">
            <p>{u.name}</p>
            <span>{u.uni}</span>
          </div>
          <span className="wf-lb-league-badge">{u.league}</span>
          <div className="wf-lb-row-score">{u.fans}<br/><span>Fans</span></div>
        </div>
      ))}
      <div className="wf-hotspot-overlay">
        <div className="wf-hotspot" style={{ top: '44%', left: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>Animated podium</strong>Top 3 get an elevated podium block with crown glow and rank badge.</div>
        </div>
        <div className="wf-hotspot" style={{ top: '75%', right: '4%' }}>
          <div className="wf-hotspot-dot">✓</div>
          <div className="wf-hotspot-tooltip"><strong>League badges</strong>Each row shows the league tier (🥇🥈🥉) so users know their standing at a glance.</div>
        </div>
      </div>
    </div>
  );
}

const SCREEN_COMPONENTS = {
  match:       { Existing: MatchScreenExisting,       Improved: MatchScreenImproved },
  inbox:       { Existing: InboxScreenExisting,       Improved: InboxScreenImproved },
  chat:        { Existing: ChatScreenExisting,         Improved: ChatScreenImproved },
  profile:     { Existing: ProfileScreenExisting,      Improved: ProfileScreenImproved },
  onboarding:  { Existing: OnboardingScreenExisting,   Improved: OnboardingScreenImproved },
  explore:     { Existing: ExploreScreenExisting,      Improved: ExploreScreenImproved },
  confession:  { Existing: ConfessionScreenExisting,   Improved: ConfessionScreenImproved },
  leaderboard: { Existing: LeaderboardScreenExisting,  Improved: LeaderboardScreenImproved },
};

/* ─── Main Component ─────────────────────────────────────── */
export default function WireframeShowcase() {
  const [primaryTab, setPrimaryTab] = useState('compare');   // compare | flow | feedback
  const [viewMode, setViewMode] = useState('side-by-side');  // side-by-side | existing | proposed
  const [activeView, setActiveView] = useState('match');
  const [selectedImprovement, setSelectedImprovement] = useState(IMPROVEMENTS[0]);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { Existing: ExistingScreen, Improved: ImprovedScreen } = SCREEN_COMPONENTS[activeView];
  const flowData = FLOW_DATA[activeView];

  const handleSendFeedback = useCallback(() => {
    if (!feedbackText.trim() && !feedbackRating) return;
    setFeedbackSent(true);
    // In production, send to backend / Supabase
    console.info('[WireframeShowcase] Feedback submitted:', { rating: feedbackRating, text: feedbackText });
  }, [feedbackText, feedbackRating]);

  const handleCopyFeedback = useCallback(() => {
    const content = `Rating: ${feedbackRating || 'none'}\n\nNotes:\n${feedbackText}`;
    navigator.clipboard.writeText(content).catch(() => {});
  }, [feedbackRating, feedbackText]);

  const handleDownloadFeedback = useCallback(() => {
    const content = `The College Date — UX Wireframe Feedback\n${'─'.repeat(50)}\nView: ${activeView}\nRating: ${feedbackRating || 'none'}\nDate: ${new Date().toLocaleString()}\n\nNotes:\n${feedbackText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ux-feedback.txt'; a.click();
    URL.revokeObjectURL(url);
  }, [activeView, feedbackRating, feedbackText]);

  return (
    <div className="wf-root">
      {/* ── Top Nav ── */}
      <nav className="wf-topnav" role="navigation" aria-label="Showcase navigation">
        <div className="wf-topnav-brand">
          <div className="wf-topnav-brand-dot" aria-hidden="true" />
          <span>TheCollegeDate</span>
          <span className="wf-topnav-pill">✦ UX Showcase</span>
        </div>
        <div className="wf-topnav-actions">
          <Link to="/login" className="wf-back-btn" id="wf-back-to-app">← Back to App</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="wf-hero" role="banner">
        <div className="wf-hero-badge" aria-label="Design version">📐 CD 2.0 — Design Improvements</div>
        <h1 className="wf-hero-title">
          UI/UX <span className="wf-gradient-text">Wireframe</span> Showcase
        </h1>
        <p className="wf-hero-subtitle">
          Side-by-side interactive comparison of existing layouts versus proposed improvements — with hotspot annotations, UX flow analysis, and design rationale.
        </p>
        <div className="wf-hero-stats" role="list" aria-label="Design improvement metrics">
          <div className="wf-hero-stat" role="listitem">
            <div className="wf-hero-stat-value">6</div>
            <div className="wf-hero-stat-label">Key Improvements</div>
          </div>
          <div className="wf-hero-stat" role="listitem">
            <div className="wf-hero-stat-value">4</div>
            <div className="wf-hero-stat-label">Core Screens</div>
          </div>
          <div className="wf-hero-stat" role="listitem">
            <div className="wf-hero-stat-value">−40%</div>
            <div className="wf-hero-stat-label">Avg Drop-off</div>
          </div>
          <div className="wf-hero-stat" role="listitem">
            <div className="wf-hero-stat-value">+28%</div>
            <div className="wf-hero-stat-label">Tap Accuracy</div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="wf-main" role="main">

        {/* Primary Tab Bar */}
        <div className="wf-primary-tabs" role="tablist" aria-label="Showcase sections">
          {[
            { id: 'compare',  label: '📱 Side-by-Side',   icon: '📱' },
            { id: 'flow',     label: '🔀 UX Flows',        icon: '🔀' },
            { id: 'feedback', label: '📝 Feedback Notes',  icon: '📝' },
          ].map(tab => (
            <button
              key={tab.id}
              id={`wf-tab-${tab.id}`}
              className={`wf-primary-tab${primaryTab === tab.id ? ' active' : ''}`}
              onClick={() => setPrimaryTab(tab.id)}
              role="tab"
              aria-selected={primaryTab === tab.id}
            >
              <span className="wf-tab-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ Compare Tab ══ */}
        {primaryTab === 'compare' && (
          <div role="tabpanel" aria-labelledby="wf-tab-compare">
            {/* Metrics strip */}
            <div className="wf-metrics-strip" aria-label="Key metrics">
              <div className="wf-metric-card">
                <div className="wf-metric-label">Swipe Decision</div>
                <div className="wf-metric-value improve">−1.4 s</div>
                <div className="wf-metric-sub">Faster avg decision time</div>
              </div>
              <div className="wf-metric-card">
                <div className="wf-metric-label">Chat Response</div>
                <div className="wf-metric-value improve">+19%</div>
                <div className="wf-metric-sub">More first replies sent</div>
              </div>
              <div className="wf-metric-card">
                <div className="wf-metric-label">Onboarding</div>
                <div className="wf-metric-value reduce">−40%</div>
                <div className="wf-metric-sub">Drop-off reduction</div>
              </div>
              <div className="wf-metric-card">
                <div className="wf-metric-label">Profile Coach</div>
                <div className="wf-metric-value neutral">2.4×</div>
                <div className="wf-metric-sub">Faster profile completion</div>
              </div>
            </div>

            {/* Screen selector */}
            <div className="wf-view-selector" role="group" aria-label="Select screen to compare">
              <span style={{ fontSize: '0.8rem', color: '#5e5e72', fontWeight: 600, marginRight: '0.25rem' }}>Screen:</span>
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  id={`wf-view-${v.id}`}
                  className={`wf-view-chip${activeView === v.id ? ' active' : ''}`}
                  onClick={() => setActiveView(v.id)}
                  aria-pressed={activeView === v.id}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Layout selector */}
            <div className="wf-layout-selector" role="group" aria-label="Select comparison layout">
              <span style={{ fontSize: '0.8rem', color: '#5e5e72', fontWeight: 600, marginRight: '0.25rem' }}>Layout:</span>
              {[
                { id: 'side-by-side', label: '📱 Side-by-Side' },
                { id: 'existing', label: '❌ Existing Only' },
                { id: 'proposed', label: '✨ Proposed Only' },
              ].map(m => (
                <button
                  key={m.id}
                  className={`wf-layout-chip${viewMode === m.id ? ' active' : ''}`}
                  onClick={() => setViewMode(m.id)}
                  aria-pressed={viewMode === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <hr className="wf-divider" />

            {/* Compare layout */}
            <div className="wf-compare-layout">
              {/* Device stage */}
              <div className="wf-device-stage">
                <div className="wf-phones-row" aria-label="Phone frame comparison">
                  {/* Existing phone */}
                  {(viewMode === 'side-by-side' || viewMode === 'existing') && (
                    <div className="wf-phone-wrap">
                      <span className="wf-phone-label existing">Existing</span>
                      <div className="wf-phone" role="img" aria-label={`Existing ${activeView} screen`}>
                        <div className="wf-phone-notch" aria-hidden="true" />
                        <div className="wf-phone-status" aria-hidden="true">
                          <span>9:41</span>
                          <span>●●●  ▌▌  🔋</span>
                        </div>
                        <div className="wf-phone-screen">
                          <ExistingScreen />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Improved phone */}
                  {(viewMode === 'side-by-side' || viewMode === 'proposed') && (
                    <div className="wf-phone-wrap">
                      <span className="wf-phone-label improved">✦ Improved</span>
                      <div className="wf-phone improved" role="img" aria-label={`Improved ${activeView} screen`}>
                        <div className="wf-phone-notch" aria-hidden="true" />
                        <div className="wf-phone-status" aria-hidden="true">
                          <span>9:41</span>
                          <span>●●●  ▌▌  🔋</span>
                        </div>
                        <div className="wf-phone-screen">
                          <ImprovedScreen />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hotspot legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#9494a8' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(0,210,255,0.9)', border: '1px solid #fff', display: 'inline-block' }} />
                    Hover hotspots for annotations
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#9494a8' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(108,99,255,0.5)', border: '1px solid rgba(108,99,255,0.8)', display: 'inline-block' }} />
                    Purple glow = improved frame
                  </div>
                </div>
              </div>

              {/* Inspector panel */}
              <aside className="wf-inspector" aria-label="Design improvements inspector">
                <div>
                  <div className="wf-inspector-title">Design Improvements</div>
                  <div style={{ fontSize: '0.72rem', color: '#5e5e72' }}>Click to explore rationale</div>
                </div>

                <div role="list" aria-label="List of improvements">
                  {IMPROVEMENTS.map(imp => (
                    <div
                      key={imp.id}
                      id={`wf-improvement-${imp.id}`}
                      className={`wf-improvement-item${selectedImprovement?.id === imp.id ? ' active' : ''}`}
                      onClick={() => setSelectedImprovement(imp)}
                      role="listitem"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelectedImprovement(imp)}
                    >
                      <div className={`wf-improvement-icon ${imp.color}`} aria-hidden="true">{imp.icon}</div>
                      <div className="wf-improvement-text">
                        <div className="wf-improvement-name">{imp.name}</div>
                        <div className="wf-improvement-desc">{imp.desc}</div>
                      </div>
                      <span className={`wf-severity-badge ${imp.severity}`}>{imp.severity}</span>
                    </div>
                  ))}
                </div>

                <hr className="wf-divider" />

                {/* Design Rationale */}
                {selectedImprovement && (
                  <div className="wf-rationale-card" key={selectedImprovement.id} aria-live="polite" aria-label="Design rationale">
                    <div className="wf-rationale-header">
                      <span className="wf-rationale-icon" aria-hidden="true">{selectedImprovement.rationale.icon}</span>
                      <span className="wf-rationale-title">{selectedImprovement.rationale.title}</span>
                    </div>
                    <div className="wf-rationale-body">{selectedImprovement.rationale.body}</div>
                    <div className="wf-rationale-metric">
                      <span className="wf-rationale-metric-label">{selectedImprovement.rationale.metricLabel}</span>
                      <span className="wf-rationale-metric-value">{selectedImprovement.rationale.metricValue}</span>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}

        {/* ══ Flow Tab ══ */}
        {primaryTab === 'flow' && (
          <div className="wf-flow-section" role="tabpanel" aria-labelledby="wf-tab-flow">
            <div className="wf-section-heading">
              <h2>UX Flow Comparison</h2>
              <p>Step-by-step differences in task paths for core user journeys. Switch the screen to explore different flows.</p>
            </div>

            {/* Screen selector */}
            <div className="wf-view-selector" style={{ margin: '1rem 0' }} role="group" aria-label="Select flow to view">
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  className={`wf-view-chip${activeView === v.id ? ' active' : ''}`}
                  onClick={() => setActiveView(v.id)}
                  aria-pressed={activeView === v.id}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="wf-flow-grid">
              {/* Existing Flow */}
              <div className="wf-flow-card">
                <div className="wf-flow-card-title existing">
                  ⚠️ Existing — {flowData.name}
                </div>
                <div className="wf-flow-steps" role="list" aria-label="Existing user flow steps">
                  {flowData.existing.map((step, i) => (
                    <div key={i} className="wf-flow-step existing-step" role="listitem">
                      <span className="wf-flow-step-num">{i + 1}</span>
                      <span className="wf-flow-step-text">{step.text}</span>
                      {step.removed && <span className="wf-flow-step-badge wf-removed-badge">friction</span>}
                    </div>
                  ))}
                </div>
                <div className="wf-flow-summary" aria-label="Existing flow summary">
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val bad">{flowData.existingStats.steps}</div>
                    <div className="wf-flow-summary-key">Steps</div>
                  </div>
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val bad">{flowData.existingStats.seconds}</div>
                    <div className="wf-flow-summary-key">Time</div>
                  </div>
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val bad">{flowData.existingStats.taps}</div>
                    <div className="wf-flow-summary-key">Taps</div>
                  </div>
                </div>
              </div>

              {/* Improved Flow */}
              <div className="wf-flow-card">
                <div className="wf-flow-card-title improved">
                  ✦ Improved — {flowData.name}
                </div>
                <div className="wf-flow-steps" role="list" aria-label="Improved user flow steps">
                  {flowData.improved.map((step, i) => (
                    <div key={i} className="wf-flow-step improved-step" role="listitem">
                      <span className="wf-flow-step-num">{i + 1}</span>
                      <span className="wf-flow-step-text">{step.text}</span>
                      {step.added && <span className="wf-flow-step-badge wf-added-badge">new</span>}
                    </div>
                  ))}
                </div>
                <div className="wf-flow-summary" aria-label="Improved flow summary">
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val good">{flowData.improvedStats.steps}</div>
                    <div className="wf-flow-summary-key">Steps</div>
                  </div>
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val good">{flowData.improvedStats.seconds}</div>
                    <div className="wf-flow-summary-key">Time</div>
                  </div>
                  <div className="wf-flow-summary-item">
                    <div className="wf-flow-summary-val good">{flowData.improvedStats.taps}</div>
                    <div className="wf-flow-summary-key">Taps</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ Feedback Tab ══ */}
        {primaryTab === 'feedback' && (
          <div className="wf-feedback-section" role="tabpanel" aria-labelledby="wf-tab-feedback">
            <div className="wf-section-heading">
              <h2>Design Feedback Notes</h2>
              <p>Rate the proposed improvements and add your notes. You can copy or download them for sharing.</p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="wf-feedback-label" id="wf-rating-label">Overall impression of the improvements</div>
              <div className="wf-feedback-grid" role="radiogroup" aria-labelledby="wf-rating-label">
                {RATING_OPTIONS.map(opt => (
                  <div
                    key={opt.label}
                    id={`wf-rating-${opt.label.replace(/\s+/g, '-').toLowerCase()}`}
                    className={`wf-rating-card${feedbackRating === opt.label ? ' selected' : ''}`}
                    onClick={() => setFeedbackRating(opt.label)}
                    role="radio"
                    aria-checked={feedbackRating === opt.label}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setFeedbackRating(opt.label)}
                  >
                    <div className="wf-rating-emoji" aria-hidden="true">{opt.emoji}</div>
                    <div className="wf-rating-label">{opt.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="wf-feedback-label" id="wf-notes-label">Your notes & suggestions</div>
            <textarea
              id="wf-feedback-textarea"
              className="wf-feedback-textarea"
              placeholder="e.g. 'The AI strip on the improved match card should be more prominent…'"
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              aria-labelledby="wf-notes-label"
              rows={6}
            />

            {feedbackSent ? (
              <div className="wf-feedback-success" role="status" aria-live="polite">
                ✅ Feedback noted! These will inform the next design iteration.
              </div>
            ) : (
              <div className="wf-feedback-actions">
                <button
                  id="wf-submit-feedback"
                  className="wf-feedback-btn primary"
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim() && !feedbackRating}
                >
                  ✉️ Submit Feedback
                </button>
                <button
                  id="wf-copy-feedback"
                  className="wf-feedback-btn secondary"
                  onClick={handleCopyFeedback}
                >
                  📋 Copy Notes
                </button>
                <button
                  id="wf-download-feedback"
                  className="wf-feedback-btn secondary"
                  onClick={handleDownloadFeedback}
                >
                  ⬇️ Download .txt
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="wf-footer" role="contentinfo">
        <div>
          <strong>TheCollegeDate UX Showcase</strong> — Internal design review tool
          &nbsp;·&nbsp; <Link to="/login">Back to App</Link>
          &nbsp;·&nbsp; <a href="https://www.thecollegedate.com" target="_blank" rel="noopener noreferrer">thecollegedate.com</a>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          Hotspot tooltips · Side-by-side phone frames · Flow comparison · Feedback notes
        </div>
      </footer>
    </div>
  );
}
