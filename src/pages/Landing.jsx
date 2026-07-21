import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import brandIcon from '../assets/landing-brand-icon.webp';
import featureGraphic from '../assets/landing-product-poster.webp';
import profileImageOne from '../assets/landing-profile-amaka.webp';
import profileImageTwo from '../assets/landing-profile-tunde.webp';
import profileImageThree from '../assets/landing-profile-zainab.webp';
import { partnerWhatsAppUrl, founderLinkedInUrl } from '../config/contactLinks';
import './Landing.css';

const campusFeatures = [
    {
        icon: 'UNI',
        title: 'Campus first',
        text: 'Discover students around Nigerian university life, not a random crowd from everywhere.'
    },
    {
        icon: 'NEAR',
        title: 'Nearby energy',
        text: 'Meet people who understand lectures, hostels, faculty weeks, hangouts, and campus rhythm.'
    },
    {
        icon: 'SAFE',
        title: 'Trust layers',
        text: 'Profile signals, reporting tools, child-safety standards, and AI review help keep the space healthier.'
    },
    {
        icon: 'REAL',
        title: 'Real connection',
        text: 'Swipe, match, chat, share moments, send requests, and move from interest to conversation.'
    }
];

const productMoments = [
    'Smart discovery built around students',
    'Premium swipes, Super Swipes, boosts, and viewers',
    'Chat, calls, notifications, and campus moments',
    'AI profile review and safety support foundation'
];

export default function Landing() {
    const [loadSecondaryProfileImages, setLoadSecondaryProfileImages] = useState(false);
    const isNative = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                     (import.meta.env.DEV && new URLSearchParams(window.location.search).has('native-preview'));

    useEffect(() => {
        if (isNative) return undefined;

        const loadImages = () => setLoadSecondaryProfileImages(true);

        if (typeof window.requestIdleCallback === 'function') {
            const idleId = window.requestIdleCallback(loadImages, { timeout: 2500 });
            return () => window.cancelIdleCallback?.(idleId);
        }

        const timeoutId = window.setTimeout(loadImages, 2200);
        return () => window.clearTimeout(timeoutId);
    }, [isNative]);

    if (isNative) {
        return (
            <div className="landing-container">
                {/* Animated Background */}
                <div className="landing-bg">
                    <div className="orb orb-1"></div>
                    <div className="orb orb-2"></div>
                    <div className="orb orb-3"></div>
                </div>

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
                    </div>

                    <div className="footer-note">
                        <p>Designed for Nigerian Universities 🇳🇬</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="landing-page">
            <header className="landing-nav">
                <a href="/" className="landing-brand">
                    <img src={brandIcon} alt="" width="40" height="40" />
                    <span>The<span>College</span>Date</span>
                </a>

                <nav className="landing-nav-links" aria-label="Main navigation">
                    <a href="#how-it-works">How it works</a>
                    <a href="#safety">Safety</a>
                    <a href="#premium">Premium</a>
                    <a href="/support">Partner</a>
                </nav>

                <div className="landing-nav-actions">
                    <Link to="/login" className="landing-login-link">Log in</Link>
                    <Link to="/signup" className="landing-nav-cta">Join now</Link>
                </div>
            </header>

            <section className="landing-hero" aria-labelledby="landing-hero-title">
                <div className="landing-hero-copy">
                    <h1 id="landing-hero-title">
                        Real connections. <span>Real you.</span>
                    </h1>
                    <p>
                        The College Date is built for the confidence, culture, and everyday rhythm of
                        campus life: meet students around your school, match with intention, and start
                        conversations that feel real.
                    </p>

                    <div className="landing-hero-actions">
                        <Link to="/signup" className="landing-primary-button">Create your profile</Link>
                        <Link to="/login" className="landing-secondary-button">I already have an account</Link>
                    </div>

                    <div className="landing-store-row" aria-label="App availability and social">
                        <div className="store-badge-group">
                            <a 
                                href="https://play.google.com/store/apps/details?id=com.collegedate.app" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="store-badge-premium play-store-badge"
                            >
                                <svg viewBox="0 0 512 512" width="20" height="20">
                                    <path fill="#00e5ff" d="M10 28.5L256 274.5 328.7 201.8 28.5 10z"/>
                                    <path fill="#ff3d00" d="M10 483.5L28.5 482 328.7 310.2 256 237.5z"/>
                                    <path fill="#ffea00" d="M10 28.5v455l246-246z"/>
                                    <path fill="#4caf50" d="M256 237.5l72.7-72.7 77.8 44.9c22.5 13 22.5 43.1 0 56.1l-77.8 44.9z"/>
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
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
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

                <div className="landing-hero-visual" aria-label="The College Date app preview">
                    <div className="neon-heart neon-heart-one"></div>
                    <div className="neon-heart neon-heart-two"></div>
                    <div className="phone-shell">
                        <div className="phone-status">9:41</div>
                        <div className="phone-topbar">
                            <img src={brandIcon} alt="" width="25" height="25" />
                            <span>TheCollegeDate</span>
                        </div>
                        <div className="profile-preview">
                            <div
                                className="profile-slide profile-slide-one"
                                style={{ backgroundImage: `url(${profileImageOne})` }}
                            >
                                <div className="profile-copy">
                                    <strong>Amaka, 21</strong>
                                    <span>University of Lagos</span>
                                    <small>Faculty hangout nearby</small>
                                </div>
                                <div className="interest-row">
                                    <span>Afrobeats</span>
                                    <span>Campus gist</span>
                                    <span>Study dates</span>
                                </div>
                            </div>
                            <div
                                className="profile-slide profile-slide-two"
                                style={loadSecondaryProfileImages ? { backgroundImage: `url(${profileImageTwo})` } : undefined}
                            >
                                <div className="profile-copy">
                                    <strong>Tunde, 23</strong>
                                    <span>Obafemi Awolowo University</span>
                                    <small>Architecture studio</small>
                                </div>
                                <div className="interest-row">
                                    <span>Football</span>
                                    <span>Design</span>
                                    <span>Live music</span>
                                </div>
                            </div>
                            <div
                                className="profile-slide profile-slide-three"
                                style={loadSecondaryProfileImages ? { backgroundImage: `url(${profileImageThree})` } : undefined}
                            >
                                <div className="profile-copy">
                                    <strong>Zainab, 20</strong>
                                    <span>University of Ibadan</span>
                                    <small>Library side</small>
                                </div>
                                <div className="interest-row">
                                    <span>Fashion</span>
                                    <span>Poetry</span>
                                    <span>Soft life</span>
                                </div>
                            </div>
                        </div>
                        <div className="landing-match-actions">
                            <button type="button" aria-label="Pass">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                            <button type="button" aria-label="Like">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                            </button>
                            <button type="button" aria-label="Super Swipe">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-proof-band" aria-label="The College Date product focus">
                <p>Made for campus.</p>
                <p>Made for students.</p>
                <p>Made for real conversations.</p>
            </section>

            <section className="landing-section landing-campus-section" id="how-it-works">
                <div className="section-copy">
                    <h2>Your campus. Your people. Your story.</h2>
                <p>
                    The College Date brings discovery, matching, chat, moments, premium visibility,
                    and safety tools into one student-focused experience shaped for African campus culture.
                </p>
                </div>

                <div className="feature-grid">
                    {campusFeatures.map((feature) => (
                        <article className="feature-card" key={feature.title}>
                            <span>{feature.icon}</span>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="landing-section landing-product-section">
                <div className="product-poster">
                    <img
                        src={featureGraphic}
                        alt="The College Date promotional graphic"
                        width="720"
                        height="352"
                        loading="lazy"
                        decoding="async"
                    />
                </div>
                <div className="section-copy">
                    <h2>More than a swipe. It is a connection.</h2>
                    <p>
                        From profile setup to match moments, the app is becoming a complete campus
                        relationship layer: playful enough to feel exciting, structured enough to feel safe.
                    </p>
                    <ul className="product-list">
                        {productMoments.map((moment) => (
                            <li key={moment}>{moment}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="landing-section landing-safety-section" id="safety">
                <div className="section-copy">
                    <h2>Safety you can build on.</h2>
                    <p>
                        A dating app has to earn trust. The College Date is being shaped with reporting,
                        moderation, AI-supported review, child-safety standards, and clearer profile signals.
                    </p>
                </div>
                <div className="safety-rail">
                    <a href="/safety">Safety center</a>
                    <a href="/child-safety-standards">Child safety standards</a>
                    <a href="/campus-dating-safety">Campus dating safety</a>
                </div>
            </section>

            <section className="landing-section landing-premium-section" id="premium">
                <div className="premium-panel">
                    <h2>Premium for people who want more momentum.</h2>
                    <p>
                        Premium unlocks stronger discovery, better visibility, and richer ways to stand out
                        when a connection matters.
                    </p>
                    <div className="premium-points">
                        <span>Unlimited premium discovery</span>
                        <span>Profile viewers</span>
                        <span>Super Swipes</span>
                        <span>Boosts</span>
                    </div>
                    <Link to="/signup" className="landing-primary-button">Start on The College Date</Link>
                </div>
            </section>

            <footer className="landing-footer">
                <div>
                    <a href="/" className="landing-brand landing-brand--footer">
                        <img src={brandIcon} alt="" width="32" height="32" />
                        <span>The<span>College</span>Date</span>
                    </a>
                    <p>Real connections. Real you.</p>
                </div>

                <div className="landing-footer-links" aria-label="The College Date information links">
                    <a href="/about">About</a>
                    <a href="/campus-dating">Campus Dating</a>
                    <a href="/student-dating">Student Dating</a>
                    <a href="/nigeria-dating-app">Nigeria Dating</a>
                    <a href="/university-dating-nigeria">University Dating</a>
                    <a href="/college-dating-app">College App</a>
                    <a href="/dating-app-for-students">For Students</a>
                    <a href="/blog">Dating Guides</a>
                    <a href="/support">Support</a>
                    <a href="https://www.instagram.com/thecollegedate?igsh=MXhxZHZiMzZtOGp6dw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram</a>
                    <a href={founderLinkedInUrl} target="_blank" rel="noopener noreferrer">Founder LinkedIn</a>
                    <a href={partnerWhatsAppUrl} target="_blank" rel="noopener noreferrer">Become a Partner</a>
                </div>
            </footer>
        </main>
    );
}
