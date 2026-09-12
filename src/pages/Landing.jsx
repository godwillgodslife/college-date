import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import HeroCardStack from '../components/HeroCardStack';
import { useScrollReveal } from '../hooks/useScrollReveal';

// Authentic Student Photography Assets
import storyUnilagCouple from '../assets/story-unilag-couple.jpg';
import storyIfeanyiOau from '../assets/story-ifeanyi-oau.jpg';
import storyUiCouple from '../assets/story-ui-couple.jpg';
import campusStudentWalk from '../assets/campus-student-walk.jpg';

// Core App UI Section Screenshots & Mockups
import appCallScreen from '../assets/app-call-screen.png';
import appConfessions from '../assets/app-confessions.png';
import appChatTray from '../assets/app-chat-tray.png';
import appLocationModal from '../assets/app-location-modal.png';
import appServiceEscrow from '../assets/app-service-escrow.png';
import appExploreGrid from '../assets/app-explore-grid.png';

import './Landing.css';

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Create Your Profile',
    text: 'Register with your verified Nigerian university, department, and level. Vision AI scans your portrait to ensure 100% genuine student profiles.',
    image: campusStudentWalk,
    badgeText: '✓ Vision AI Verified',
    tag: 'Single Face Approved',
  },
  {
    step: '02',
    title: 'Discover Around Campus',
    text: 'Explore student profiles filtered by your campus, faculty, academic year, and shared vibes—from study dates to exam-crunch partners.',
    image: appExploreGrid,
    badgeText: '📍 UNILAG · OAU · UI',
    tag: 'Faculty & Hall Filters',
  },
  {
    step: '03',
    title: 'Match with Mutual Intent',
    text: "Swipe right or send a like with zero awkward pressure. When there's mutual interest, you're instantly matched. No unwanted spam.",
    image: null, // Interactive mutual badge preview
    badgeText: "🎉 It's a Campus Match!",
    tag: 'Mutual Interest Only',
  },
  {
    step: '04',
    title: 'Chat & Meet Safely',
    text: 'Start meaningful conversations with high-clarity voice notes, view-once photos, campus gifts (Cold Zobo, Suya), and safe meetup location pins.',
    image: appChatTray,
    badgeText: '💬 WhatsApp-Grade Chat',
    tag: 'Voice Notes & Escrow',
  },
];

const STUDENT_STORIES = [
  {
    id: 'unilag-chiamaka-david',
    names: 'Chiamaka & David',
    school: 'University of Lagos',
    shortSchool: 'UNILAG',
    dept: 'Mass Comm & Law',
    quote: '"Met during 300L exam crunch at UNILAG Main Library. We started with study dates along the lagoon walk and never looked back."',
    image: storyUnilagCouple,
    vibeTag: 'Study Dates → Real Love',
    campusSpot: 'Main Library & Lagoon Walk',
  },
  {
    id: 'oau-ifeanyi',
    names: 'Ifeanyi',
    school: 'Obafemi Awolowo University',
    shortSchool: 'OAU Ile-Ife',
    dept: 'Architecture · 500L',
    quote: '"Finally a campus dating app where every profile is a verified student from my university, not random bots or ghost accounts."',
    image: storyIfeanyiOau,
    vibeTag: 'Studio Vibe',
    campusSpot: 'Studio Side · Awolowo Hall',
  },
  {
    id: 'ui-zainab-fola',
    names: 'Zainab & Fola',
    school: 'University of Ibadan',
    shortSchool: 'UI Ibadan',
    dept: 'Economics & Sociology',
    quote: '"Matched during Faculty Week at UI. Love how safe, intentional, and genuinely student-centered the whole experience feels."',
    image: storyUiCouple,
    vibeTag: 'Faculty Week Match',
    campusSpot: 'Kenneth Dike Quad',
  },
];

const CAMPUS_FEATURES = [
  {
    icon: '🛡️',
    title: 'Safe & Verified',
    text: 'Real students, real profiles. Vision AI biometric scanning and strict student-only verification standards.',
  },
  {
    icon: '🏛️',
    title: 'Campus Focused',
    text: 'Exclusively for students. Meet people right inside your institution, faculty quads, and neighboring campuses.',
  },
  {
    icon: '🎯',
    title: 'Built for Campus Life',
    text: 'Made for your student rhythm: course-mate discovery, anonymous secrets, and semester vibes.',
  },
  {
    icon: '🤝',
    title: 'Real Connections',
    text: 'Beyond the screen: faculty study dates, campus event hangouts, and authentic relationships.',
  },
];

export default function Landing() {
  // Initialize scroll-triggered reveals
  useScrollReveal();

  return (
    <main className="landing-page">
      {/* ── SHARED PUBLIC HEADER ── */}
      <PublicHeader themeVariant="transparent" />

      {/* ── HERO SECTION ── */}
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-hero__container">
          <div className="landing-hero-copy" data-reveal>
            <div className="editorial-eyebrow">
              <span className="eyebrow-dot"></span>
              CAMPUS DATING & SOCIAL
            </div>

            <h1 id="landing-hero-title">
              Real connections.<br />
              <span className="landing-headline-accent">Real you.</span>
            </h1>

            <p className="landing-hero-description">
              The College Date is built for the confidence, culture, and everyday rhythm of
              campus life. Meet verified students around your school, match with intention, and start
              conversations that feel real.
            </p>

            <div className="landing-hero-actions">
              <Link to="/signup" className="landing-primary-button">
                <span>Create your profile</span>
                <span className="btn-arrow">→</span>
              </Link>
              <Link to="/login" className="landing-secondary-button">
                Already have an account
              </Link>
            </div>

            {/* Campus Trust Features Strip */}
            <div className="landing-trust-strip" aria-label="Key campus trust features">
              <div className="trust-item">
                <span className="trust-icon">🛡️</span>
                <span>Verified Students</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">👥</span>
                <span>Campus Matching</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">💬</span>
                <span>Real-time Chat</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <span>Anonymous Confessions</span>
              </div>
            </div>

            {/* Store & Social Row */}
            <div className="landing-store-row" aria-label="App availability and social">
              <div className="store-badge-group">
                <a
                  href="https://play.google.com/store/apps/details?id=com.collegedate.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-badge-premium play-store-badge"
                  aria-label="Download on Google Play"
                >
                  <svg viewBox="0 0 512 512" width="18" height="18" aria-hidden="true">
                    <path fill="#00e5ff" d="M10 28.5L256 274.5 328.7 201.8 28.5 10z" />
                    <path fill="#ff3d00" d="M10 483.5L28.5 482 328.7 310.2 256 237.5z" />
                    <path fill="#ffea00" d="M10 28.5v455l246-246z" />
                    <path fill="#4caf50" d="M256 237.5l72.7-72.7 77.8 44.9c22.5 13 22.5 43.1 0 56.1l-77.8 44.9z" />
                  </svg>
                  <span className="badge-text">
                    <small>GET IT ON</small>
                    <span>Google Play</span>
                  </span>
                </a>

                <a
                  href="https://www.instagram.com/thecollegedate?igsh=MXhxZHZiMzZtOGp6dw%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-badge-premium instagram-badge"
                  aria-label="Follow us on Instagram"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                  <span className="badge-text">
                    <small>FOLLOW US ON</small>
                    <span>Instagram</span>
                  </span>
                </a>
              </div>
              <div className="store-info-ios">
                <span className="ios-coming-soon">Coming soon to iOS</span>
              </div>
            </div>
          </div>

          {/* ── SIGNATURE HERO PRODUCT ANIMATION (CARD STACK) ── */}
          <div className="landing-hero-visual" data-reveal>
            <HeroCardStack />
          </div>
        </div>
      </section>

      {/* ── SECTION: HOW IT WORKS (WITH VISUAL STEP PREVIEWS) ── */}
      <section className="landing-section landing-how-section" id="how-it-works" data-reveal>
        <div className="landing-section__container">
          <div className="section-header-editorial" data-reveal>
            <div>
              <span className="editorial-eyebrow">— HOW IT WORKS</span>
              <h2>It's simple.</h2>
              <p>Four intentional steps to meet verified students who share your campus world.</p>
            </div>
            <a href="/safety" className="editorial-link">
              <span>Learn more about safety</span>
              <span>→</span>
            </a>
          </div>

          <div className="how-it-works-grid">
            {HOW_IT_WORKS_STEPS.map((item, index) => (
              <article className={`how-step-card stagger-${index + 1}`} key={item.step} data-reveal>
                <div className="how-step-card__header">
                  <span className="step-number">{item.step}</span>
                  <span className="how-step-tag">{item.tag}</span>
                </div>

                {/* Visual Step Illustration / UI Snippet */}
                <div className="how-step-visual">
                  {item.step === '01' && (
                    <div className="how-preview-step1">
                      <img src={campusStudentWalk} alt="Student profile photo verification" className="how-step-thumb" />
                      <div className="how-step-chip">
                        <span className="chip-tick">✓</span>
                        <span>Vision AI: Single Face Verified</span>
                      </div>
                    </div>
                  )}

                  {item.step === '02' && (
                    <div className="how-preview-step2">
                      <img src={appExploreGrid} alt="Campus student discovery grid" className="how-step-thumb-wide" />
                      <div className="how-step-pills">
                        <span>🏛️ UNILAG</span>
                        <span>📚 400L</span>
                        <span>🎨 Arts</span>
                      </div>
                    </div>
                  )}

                  {item.step === '03' && (
                    <div className="how-preview-step3">
                      <div className="how-match-dialog">
                        <span className="match-sparkle">✨</span>
                        <strong>It's a Campus Match!</strong>
                        <p>You and Amaka liked each other</p>
                        <div className="match-avatars-row">
                          <span className="mini-avatar avatar-1">🎓</span>
                          <span className="match-heart">❤️</span>
                          <span className="mini-avatar avatar-2">👩🏾</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {item.step === '04' && (
                    <div className="how-preview-step4">
                      <div className="how-chat-bubble">
                        <div className="chat-audio-wave">
                          <span className="audio-play-btn">▶</span>
                          <div className="audio-wave-sim">
                            <span className="audio-wave-bar"></span>
                            <span className="audio-wave-bar"></span>
                            <span className="audio-wave-bar"></span>
                            <span className="audio-wave-bar"></span>
                            <span className="audio-wave-bar"></span>
                          </div>
                          <span className="audio-time">0:24</span>
                        </div>
                        <div className="chat-micro-pills">
                          <span className="chat-reaction-pill">❤️ 1</span>
                          <span className="chat-gift-pill">🎁 Cold Zobo</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="how-step-title">{item.title}</h3>
                <p className="how-step-text">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: CAMPUS RELATIONSHIP LAYER (BENTO GRID WITH REAL APP IMAGERY) ── */}
      <section className="landing-section landing-bento-section" id="campus-features" data-reveal>
        <div className="landing-section__container">
          <div className="section-header-editorial text-center" data-reveal>
            <span className="editorial-eyebrow">— CAMPUS RELATIONSHIP LAYER</span>
            <h2>Experience every dimension of student connection.</h2>
            <p>From crystal-clear voice notes to anonymous confessions and safe daylight library meetups.</p>
          </div>

          <div className="bento-grid">
            {/* Bento Card 1: Audio & Video Calling (Prominent Featured Card) */}
            <div className="bento-card bento-card--featured" data-reveal>
              <div className="bento-card__badge">
                <span className="live-dot-pulse"></span>
                <span>Agora RTC · Voice & Video</span>
              </div>
              <div className="bento-card__copy">
                <h3>Crystal-Clear Campus Audio & Video Calls</h3>
                <p>
                  Talk for hours with your match without ever sharing your private WhatsApp or phone number.
                  High-fidelity, encrypted voice and video rooms built with low latency for Nigerian network conditions.
                </p>
                <div className="bento-card__tags">
                  <span className="bento-tag">🔒 Zero Phone Numbers Exchanged</span>
                  <span className="bento-tag">🎙️ Active Pulsating Voice Waves</span>
                  <span className="bento-tag">⚡ Immediate Teardown on Decline</span>
                </div>
              </div>
              <div className="bento-card__image-container">
                <img
                  src={appCallScreen}
                  alt="Crystal-clear Agora voice call room interface"
                  className="bento-img"
                  loading="eager"
                />
              </div>
            </div>

            {/* Bento Card 2: Anonymous Campus Confessions */}
            <div className="bento-card bento-card--confessions" data-reveal>
              <div className="bento-card__badge">
                <span>🎭 Campus Secrets</span>
              </div>
              <div className="bento-card__copy">
                <h3>Anonymous Campus Confessions</h3>
                <p>
                  Unfiltered gist, secret crushes, and campus culture. Post anonymously, react with 🔥,
                  and join the real conversations happening across student hostels.
                </p>
                <div className="bento-card__tags">
                  <span className="bento-tag">🔥 Trending Gist</span>
                  <span className="bento-tag">💬 Threaded Comments</span>
                  <span className="bento-tag">🛡️ AI Content Moderation</span>
                </div>
              </div>
              <div className="bento-card__image-container">
                <img
                  src={appConfessions}
                  alt="Anonymous campus confessions feed with fire reactions"
                  className="bento-img"
                  loading="eager"
                />
              </div>
            </div>

            {/* Bento Card 3: Safe Campus Meetups (Live GPS Sharing) */}
            <div className="bento-card bento-card--location" data-reveal>
              <div className="bento-card__badge">
                <span>📍 Safe Meetup Protocol</span>
              </div>
              <div className="bento-card__copy">
                <h3>Live Campus Meetup Pins</h3>
                <p>
                  Meeting your match at the faculty cafeteria or central library? Share an auto-expiring 15m, 30m,
                  or 1-hour live GPS pin right inside chat so you can spot each other instantly in broad daylight.
                </p>
                <div className="bento-card__tags">
                  <span className="bento-tag">⌛ Auto-Expiring Pins</span>
                  <span className="bento-tag">🏛️ Public Campus Locations</span>
                </div>
              </div>
              <div className="bento-card__image-container">
                <img
                  src={appLocationModal}
                  alt="Safe campus meetup live location pin sharing"
                  className="bento-img"
                  loading="eager"
                />
              </div>
            </div>

            {/* Bento Card 4: Course-Mate Escrow & Virtual Gifting */}
            <div className="bento-card bento-card--escrow" data-reveal>
              <div className="bento-card__badge">
                <span>🤝 Service Escrow & Gifting</span>
              </div>
              <div className="bento-card__copy">
                <h3>Course-Mate Escrow & Campus Gifts</h3>
                <p>
                  Need project help, exam tutoring, or campus graphic design? Lock funds in student wallet
                  escrow until the deliverable is completed. Or break the ice with playful gifts like Cold Zobo and Suya.
                </p>
                <div className="bento-card__tags">
                  <span className="bento-tag">💳 Student Wallet Escrow</span>
                  <span className="bento-tag">🎁 Cold Zobo & Suya Treats</span>
                  <span className="bento-tag">✨ ₦500 Paid Chat Vibe</span>
                </div>
              </div>
              <div className="bento-card__image-container">
                <img
                  src={appServiceEscrow}
                  alt="Campus service deal with wallet escrow protection"
                  className="bento-img"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: STUDENT STORIES (WITH REAL NIGERIAN STUDENT PHOTOGRAPHY) ── */}
      <section className="landing-section landing-stories-section" id="stories" data-reveal>
        <div className="landing-section__container">
          <div className="section-header-editorial text-center" data-reveal>
            <span className="editorial-eyebrow">— STUDENT STORIES</span>
            <h2>Real people. Real Nigerian campus love.</h2>
            <p>From late-night study crunches at UNILAG Library to OAU studio dates, meet students who found genuine connection.</p>
          </div>

          <div className="stories-editorial-grid">
            {STUDENT_STORIES.map((story, index) => (
              <article className={`story-editorial-card stagger-${index + 1}`} key={story.id} data-reveal>
                <div className="story-editorial-card__image-wrap">
                  <img
                    src={story.image}
                    alt={`${story.names} from ${story.school}`}
                    className="story-portrait-img"
                    loading="eager"
                  />
                  <div className="story-card-overlay-pills">
                    <span className="story-campus-pill">{story.shortSchool}</span>
                    <span className="story-vibe-tag font-hand">{story.vibeTag}</span>
                  </div>
                </div>

                <div className="story-editorial-card__body">
                  <p className="story-editorial-quote font-hand">{story.quote}</p>
                  <div className="story-editorial-footer">
                    <div className="story-student-details">
                      <div className="story-name-verified-row">
                        <strong className="story-student-names">{story.names}</strong>
                        <span className="card-verified-tick" title="Verified Nigerian Student">✓</span>
                      </div>
                      <span className="story-student-dept">{story.school} · {story.dept}</span>
                      <small className="story-student-spot">📍 {story.campusSpot}</small>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="stories-cta-center text-center" data-reveal>
            <Link to="/signup" className="landing-primary-button">
              <span>Start your campus story</span>
              <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION: WHY THE COLLEGE DATE? ── */}
      <section className="landing-section landing-why-section" id="why-college-date" data-reveal>
        <div className="landing-section__container">
          <div className="section-header-editorial text-center" data-reveal>
            <span className="editorial-eyebrow">— WHY THE COLLEGE DATE?</span>
            <h2>Built for campus. Made for connection.</h2>
            <p>More than just a dating app. It is your trusted university community.</p>
          </div>

          <div className="why-grid">
            {CAMPUS_FEATURES.map((feature, index) => (
              <article className={`why-card stagger-${index + 1}`} key={feature.title} data-reveal>
                <span className="why-icon" role="img" aria-label={feature.title}>{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: DARK EDITORIAL CTA BANNER ── */}
      <section className="landing-cta-banner" data-reveal>
        <div className="landing-cta-banner__container">
          <div className="cta-copy">
            <span className="editorial-eyebrow editorial-eyebrow--light">— JOIN THE COMMUNITY</span>
            <h2>Ready to find your campus match?</h2>
            <p>Join thousands of students across UNILAG, OAU, UI, UNIBEN, and top Nigerian universities already building connections on The College Date.</p>
          </div>
          <div className="cta-actions">
            <Link to="/signup" className="landing-primary-button landing-primary-button--light">
              <span>Join now</span>
              <span className="btn-arrow">→</span>
            </Link>
            <Link to="/login" className="landing-secondary-button landing-secondary-button--light">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── SHARED PUBLIC FOOTER ── */}
      <PublicFooter />
    </main>
  );
}
