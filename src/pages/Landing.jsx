import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import HeroCardStack from '../components/HeroCardStack';
import featureGraphic from '../assets/landing-product-poster.webp';
import './Landing.css';

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Create Profile',
    text: "Show who you are and what you're looking for with verified university and department credentials.",
  },
  {
    step: '02',
    title: 'Discover',
    text: 'Explore verified students near your campus, lecture halls, and faculty hangouts with intentional filters.',
  },
  {
    step: '03',
    title: 'Match',
    text: "When there's mutual interest, it's a match. Instant notification with zero awkward guessing.",
  },
  {
    step: '04',
    title: 'Chat',
    text: 'Start real conversations and build connections with voice notes, media, and smart AI campus icebreakers.',
  },
];

const CAMPUS_FEATURES = [
  {
    icon: '🛡️',
    title: 'Safe & Verified',
    text: 'Real students, real profiles. AI photo scanning and strict student-only verification standards.',
  },
  {
    icon: '🏛️',
    title: 'Campus Focused',
    text: 'Only students, only campuses. Meet people right inside your institution and neighboring schools.',
  },
  {
    icon: '🎯',
    title: 'Built for You',
    text: 'Made for school life: course-mate discovery, anonymous confessions, and semester vibes.',
  },
  {
    icon: '🤝',
    title: 'Real Connections',
    text: 'Beyond the screen: study dates, faculty hangouts, and genuine long-term relationships.',
  },
];

const PRODUCT_MOMENTS = [
  'Smart discovery built exclusively around student communities',
  'Flexible premium tiers: 1 Month, 3 Months, and Annual with daily rates',
  'Safe WhatsApp-grade messaging, voice notes, and campus gifts',
  'Vision AI photo moderation and strict 18+ student eligibility',
];

export default function Landing() {
  return (
    <main className="landing-page">
      {/* ── SHARED PUBLIC HEADER ── */}
      <PublicHeader themeVariant="transparent" />

      {/* ── HERO SECTION ── */}
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-hero__container">
          <div className="landing-hero-copy">
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
              campus life. Meet students around your school, match with intention, and start
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
          <div className="landing-hero-visual">
            <HeroCardStack />
          </div>
        </div>
      </section>

      {/* ── SECTION: HOW IT WORKS ── */}
      <section className="landing-section landing-how-section" id="how-it-works">
        <div className="landing-section__container">
          <div className="section-header-editorial">
            <div>
              <span className="editorial-eyebrow">— HOW IT WORKS</span>
              <h2>It's simple.</h2>
              <p>Four steps to meet real students who understand your campus world.</p>
            </div>
            <a href="/safety" className="editorial-link">
              <span>Learn more about safety</span>
              <span>→</span>
            </a>
          </div>

          <div className="how-it-works-grid">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <article className="how-step-card" key={item.step}>
                <span className="step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: STUDENT STORIES / SOCIAL PROOF ── */}
      <section className="landing-section landing-stories-section" id="stories">
        <div className="landing-section__container">
          <div className="stories-layout">
            <div className="stories-copy">
              <span className="editorial-eyebrow">— STUDENT STORIES</span>
              <h2>
                Real people.<br />
                <span className="landing-headline-accent">Real experiences.</span>
              </h2>
              <p>
                From first matches to lifelong study partners, The College Date is where
                authentic campus moments come alive. Discover students who understand your
                lecture timetables, hostel memories, and university culture.
              </p>
              <div className="stories-actions">
                <Link to="/signup" className="landing-primary-button">
                  <span>Start your story</span>
                  <span className="btn-arrow">→</span>
                </Link>
              </div>
            </div>

            <div className="stories-cards-grid">
              <article className="story-card story-card--featured">
                <div className="story-card__content">
                  <span className="story-quote font-hand">
                    "Met during 300L exam crunch at UNILAG Main Library. We started with study dates and never looked back."
                  </span>
                  <div className="story-meta">
                    <strong>Chiamaka & David</strong>
                    <span>UNILAG · Mass Comm & Engineering</span>
                  </div>
                </div>
              </article>

              <article className="story-card">
                <div className="story-card__content">
                  <span className="story-quote font-hand">
                    "Finally a campus dating app where profiles are verified students, not random bots or fake accounts."
                  </span>
                  <div className="story-meta">
                    <strong>Ifeanyi</strong>
                    <span>OAU · Architecture 500L</span>
                  </div>
                </div>
              </article>

              <article className="story-card">
                <div className="story-card__content">
                  <span className="story-quote font-hand">
                    "Matched during Faculty Week at UI. Love how safe and intentional the vibe feels."
                  </span>
                  <div className="story-meta">
                    <strong>Zainab & Fola</strong>
                    <span>University of Ibadan · Economics</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: WHY THE COLLEGE DATE? ── */}
      <section className="landing-section landing-why-section" id="why-college-date">
        <div className="landing-section__container">
          <div className="section-header-editorial text-center">
            <span className="editorial-eyebrow">— WHY THE COLLEGE DATE?</span>
            <h2>Built for campus. Made for connection.</h2>
            <p>More than just a dating app. It is your trusted campus social community.</p>
          </div>

          <div className="why-grid">
            {CAMPUS_FEATURES.map((feature) => (
              <article className="why-card" key={feature.title}>
                <span className="why-icon" role="img" aria-label={feature.title}>{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: PRODUCT PREVIEW POSTER ── */}
      <section className="landing-section landing-product-section">
        <div className="landing-section__container">
          <div className="product-layout">
            <div className="product-poster">
              <img
                src={featureGraphic}
                alt="The College Date campus social app interface preview"
                width="720"
                height="352"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="product-copy">
              <span className="editorial-eyebrow">— CAMPUS SOCIAL LAYER</span>
              <h2>More than a swipe. It is a connection.</h2>
              <p>
                From profile setup to match moments, The College Date provides a complete campus
                relationship layer: playful enough to feel exciting, structured enough to feel safe.
              </p>
              <ul className="product-list">
                {PRODUCT_MOMENTS.map((moment) => (
                  <li key={moment}>
                    <span className="product-list-check">✓</span>
                    <span>{moment}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="landing-primary-button">
                <span>Explore the platform</span>
                <span className="btn-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: DARK EDITORIAL CTA BANNER ── */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner__container">
          <div className="cta-copy">
            <span className="editorial-eyebrow editorial-eyebrow--light">— JOIN THE COMMUNITY</span>
            <h2>Ready to find your campus match?</h2>
            <p>Join thousands of students across Nigerian universities already building connections on The College Date.</p>
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
