import { trackLandingView, trackGuestDemoStart } from '../services/telemetryService';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import HeroCardStack from '../components/HeroCardStack';
import CampusGuestPreview from '../components/CampusGuestPreview';
import { useScrollReveal } from '../hooks/useScrollReveal';

import AndroidWelcomeBackground from '../components/AndroidWelcomeBackground';

// Keep the existing source assets, while Netlify serves responsive cached
// WebP/AVIF variants at runtime so no extra files enter the native bundle.
import appChatTraySource from '../assets/mobile-chat-tools.jpg';
import appLocationModalSource from '../assets/mobile-live-location-modal.jpg';
import appServiceEscrowSource from '../assets/app-service-escrow.png';
import appExploreControlsSource from '../assets/mobile-explore-controls.jpg';
import profilePhotoSource from '../assets/how-it-works-student-park.jpg';
import discoverPhotoSource from '../assets/how-it-works-student-study.jpg';
import matchPhotoSource from '../assets/how-it-works-campus-friends.jpg';
import chatPhotoSource from '../assets/how-it-works-students-together.jpg';
import campusConfessionsPhotoSource from '../assets/how-it-works-student-phone.jpg';
import productChatPhotoSource from '../assets/product-chat-campus-photo-alt.jpg';
import meetupPhotoSource from '../assets/how-it-works-meetup-students.jpg';

import './Landing.css';

const isNetlifyEnv =
  typeof window !== 'undefined' &&
  !import.meta.env?.DEV &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  window.location.hostname !== '[::1]' &&
  !window.location.hostname.startsWith('192.168.') &&
  !window.location.hostname.startsWith('10.') &&
  !window.location.hostname.endsWith('.local') &&
  !window.Capacitor?.isNativePlatform?.();

const optimizedImageUrl = (source, width, quality) => {
  if (!isNetlifyEnv) return source;
  return `/.netlify/images?url=${encodeURIComponent(source)}&w=${width}&q=${quality}`;
};

const responsiveImage = (source, width, height, quality = 84) => {
  if (!isNetlifyEnv) {
    return {
      src: source,
      width,
      height,
    };
  }
  const candidates = [480, 960, 1200].filter((candidate) => candidate <= width);
  const largestCandidate = candidates[candidates.length - 1] || width;

  return {
    src: optimizedImageUrl(source, largestCandidate, quality),
    srcSet: candidates
      .map((candidate) => `${optimizedImageUrl(source, candidate, quality)} ${candidate}w`)
      .join(', '),
    width,
    height,
  };
};

const HOW_STEP_IMAGE_SIZES = '(max-width: 768px) calc(100vw - 84px), (max-width: 1080px) calc(50vw - 76px), 260px';
const BENTO_PHOTO_SIZES = '(max-width: 768px) calc(100vw - 84px), (max-width: 1080px) 204px, 420px';

const appChatTray = responsiveImage(appChatTraySource, 1004, 611, 92);
const appLocationModal = responsiveImage(appLocationModalSource, 1002, 905, 92);
const appServiceEscrow = responsiveImage(appServiceEscrowSource, 1081, 2341, 94);
const appExploreControls = responsiveImage(appExploreControlsSource, 1010, 265, 92);
const profilePhoto = responsiveImage(profilePhotoSource, 1200, 800);
const discoverPhoto = responsiveImage(discoverPhotoSource, 1200, 1800);
const matchPhoto = responsiveImage(matchPhotoSource, 1200, 800);
const chatPhoto = responsiveImage(chatPhotoSource, 1200, 1800);
const campusConfessionsPhoto = responsiveImage(campusConfessionsPhotoSource, 1200, 800);
const productChatPhoto = responsiveImage(productChatPhotoSource, 1200, 800);
const meetupPhoto = responsiveImage(meetupPhotoSource, 1600, 1049);

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Create Your Profile',
    text: 'Add your university, faculty, level, and profile photo. Complete face verification before you start meeting people.',
    visual: 'profile',
    tag: 'Your campus, up front',
    photo: profilePhoto,
    photoAlt: 'Student checking a phone outdoors with books in hand',
  },
  {
    step: '02',
    title: 'Discover Around Campus',
    text: 'Explore student profiles filtered by your campus, faculty, academic year, and shared vibes—from study dates to exam-crunch partners.',
    visual: 'discover',
    tag: 'Faculty & Hall Filters',
    photo: discoverPhoto,
    photoAlt: 'Student sitting at a classroom table with papers and a phone',
    screenCapture: appExploreControls,
    screenLabel: 'Android app search and campus filters',
  },
  {
    step: '03',
    title: 'Match with Mutual Intent',
    text: "Swipe right or send a like with zero awkward pressure. When there's mutual interest, you're instantly matched. No unwanted spam.",
    visual: 'match',
    tag: 'Mutual Interest Only',
    photo: matchPhoto,
    photoAlt: 'Two students sharing a study session outdoors on campus',
  },
  {
    step: '04',
    title: 'Chat & Meet Safely',
    text: 'Start a conversation with voice notes, view-once photos, campus gifts, and optional meetup safety tools in one place.',
    visual: 'chat',
    tag: 'Voice Notes & Escrow',
    photo: chatPhoto,
    photoAlt: 'Students sharing a conversation around a laptop outdoors',
    screenCapture: appLocationModal,
    screenLabel: 'Android app live location sharing controls',
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
  const isNative = (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                   (import.meta.env.DEV && new URLSearchParams(window.location.search).has('native-preview'));
  const [guestPreviewOpen, setGuestPreviewOpen] = useState(false);

  // Restore landing page title on mount
  useEffect(() => {
    document.title = 'The College Date — Real connections. Real you. | Campus Dating for Students';
    trackLandingView();
  }, []);

  // Initialize scroll-triggered reveals
  useScrollReveal();

  if (isNative) {
    return (
      <div className="landing-container">
        {/* Animated Campus Video Background (Android Only) */}
        <AndroidWelcomeBackground />

        {/* Content */}
        <div className="landing-content fade-in-up">
          <div className="hero-section">
            <h1 className="hero-title">
              Find your <span className="highlight">campus crush</span>.
            </h1>
            <p className="hero-subtitle">
              Swipe. Match. Connect.
            </p>
            <div className="hero-tags">
              <span>🚀 Exclusive to Students</span>
              <span>🔒 Verified</span>
              <span>🔥 100% Anonymous Confessions</span>
            </div>
          </div>

          <div className="action-section">
            <Link to="/signup" className="btn-large btn-primary glow-effect">
              Get Started
            </Link>
            <Link to="/login" className="btn-large btn-secondary">
              I already have an account
            </Link>
            <button
              type="button"
              className="btn-large btn-demo"
              onClick={() => { trackGuestDemoStart(); setGuestPreviewOpen(true); }}
            >
              ✨ Tour Campus Demo
            </button>
          </div>

          <div className="footer-note">
            <p>Designed for Africa's Universities</p>
          </div>
        </div>

        <CampusGuestPreview
          isOpen={guestPreviewOpen}
          onClose={() => setGuestPreviewOpen(false)}
        />
      </div>
    );
  }

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
              <button
                type="button"
                className="landing-demo-button"
                onClick={() => { trackGuestDemoStart(); setGuestPreviewOpen(true); }}
              >
                ✨ Tour Campus Demo
              </button>
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

                <a
                  href="https://www.tiktok.com/@thecollegedate1?_r=1&_t=ZN-9AAGLzQHv1y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-badge-premium tiktok-badge"
                  aria-label="Follow us on TikTok"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.07V2h-3.3v13.67a2.9 2.9 0 0 1-2.9 2.9 2.9 2.9 0 1 1 2.9-2.9c0-.16-.01-.32-.04-.47V11.8a6.3 6.3 0 1 0 3.34 5.57V9.1a8.08 8.08 0 0 0 4.73 1.52V7.33a4.85 4.85 0 0 1-.96-.64Z" />
                  </svg>
                  <span className="badge-text">
                    <small>FOLLOW US ON</small>
                    <span>TikTok</span>
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

      {/* ── SECTION: HOW IT WORKS ── */}
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

                <figure className={`how-step-visual how-step-visual--${item.visual}`}>
                  <img
                    className="how-step-photo"
                    {...item.photo}
                    alt={item.photoAlt}
                    sizes={HOW_STEP_IMAGE_SIZES}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'low' : 'auto'}
                    decoding="async"
                  />
                  {item.screenCapture && (
                    <div
                      className={`how-step-capture how-step-capture--${item.visual}`}
                      role="img"
                      aria-label={`Actual Android app screen: ${item.screenLabel}`}
                    >
                      <img
                        {...item.screenCapture}
                        alt=""
                        sizes={item.visual === 'discover' ? '330px' : '148px'}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </figure>

                <h3 className="how-step-title">{item.title}</h3>
                <p className="how-step-text">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: CAMPUS RELATIONSHIP LAYER (ACTUAL APP SCREENS) ── */}
      <section className="landing-section landing-bento-section" id="campus-features" data-reveal>
        <div className="landing-section__container">
          <div className="section-header-editorial text-center" data-reveal>
            <span className="editorial-eyebrow">— THE PRODUCT, IN REAL SCREENS</span>
            <h2>More than a match screen.</h2>
            <p>Explore the tools behind campus conversations, community, and safer meetups.</p>
          </div>

          <div className="bento-grid">
            {/* Bento Card 1: Audio & Video Calling (Prominent Featured Card) */}
            <div className="bento-card bento-card--featured" data-reveal>
              <div className="bento-card__badge">
                <span className="live-dot-pulse"></span>
                  <span>Private campus chat</span>
              </div>
              <div className="bento-card__copy">
                <h3>Keep the conversation in College Date</h3>
                <p>
                  Send messages, voice notes, view-once photos, and campus gifts. Start a voice or video call without moving the conversation to another app.
                </p>
                <div className="bento-card__tags">
                  <span className="bento-tag">Private conversations</span>
                  <span className="bento-tag">Voice & video calls</span>
                  <span className="bento-tag">Campus gifts</span>
                </div>
              </div>
              <div className="bento-card__image-container bento-card__image-container--chat-story">
                <img
                  {...productChatPhoto}
                  alt="Two students walking together outside a university building"
                  className="bento-img bento-img--story-photo"
                  loading="lazy"
                  decoding="async"
                  sizes={BENTO_PHOTO_SIZES}
                />
                <div
                  className="bento-app-capture"
                  role="img"
                  aria-label="Actual Android app screenshot showing chat attachments and campus tools"
                >
                  <img {...appChatTray} alt="" sizes="220px" loading="lazy" decoding="async" />
                </div>
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
                  {...campusConfessionsPhoto}
                  alt="Young man checking a phone outdoors beside a building"
                  className="bento-img bento-img--photo"
                  loading="lazy"
                  decoding="async"
                  sizes={BENTO_PHOTO_SIZES}
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
              <div className="bento-card__image-container bento-card__image-container--meetup-story">
                <img
                  {...meetupPhoto}
                  alt="A Black student talking with a classmate outside a campus building"
                  className="bento-img bento-img--story-photo bento-img--meetup-photo"
                  loading="lazy"
                  decoding="async"
                  sizes={BENTO_PHOTO_SIZES}
                />
                <div
                  className="bento-app-capture bento-app-capture--location"
                  role="img"
                  aria-label="Actual Android app screenshot showing live location sharing options"
                >
                  <img {...appLocationModal} alt="" sizes="286px" loading="lazy" decoding="async" />
                </div>
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
                  {...appServiceEscrow}
                  alt="College Date campus service escrow setup screen"
                  className="bento-img"
                  loading="lazy"
                  decoding="async"
                  sizes="180px"
                />
              </div>
            </div>
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

      {/* ── SECTION: COMMUNITY CTA BANNER ── */}
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

      <CampusGuestPreview
        isOpen={guestPreviewOpen}
        onClose={() => setGuestPreviewOpen(false)}
      />
    </main>
  );
}
