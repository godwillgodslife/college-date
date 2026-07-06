import { Link } from 'react-router-dom';
import brandIcon from '../../assets/icon.png';
// feature-graphic-1024x500.png was never created; fallback to og-image.png
const featureGraphic = '/og-image.png';
import { partnerWhatsAppUrl } from '../config/contactLinks';
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
    return (
        <main className="landing-page">
            <header className="landing-nav">
                <a href="/" className="landing-brand" aria-label="The College Date home">
                    <img src={brandIcon} alt="" />
                    <span>The<span>College</span>Date</span>
                </a>

                <nav className="landing-nav-links" aria-label="Main navigation">
                    <a href="#how-it-works">How it works</a>
                    <a href="#safety">Safety</a>
                    <a href="#premium">Premium</a>
                    <a href="/support.html">Partner</a>
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

                    <div className="landing-store-row" aria-label="App availability">
                        <div className="play-badge" aria-label="Get it on Google Play">
                            <span className="play-triangle"></span>
                            <span><small>GET IT ON</small>Google Play</span>
                        </div>
                        <span>Coming soon to iOS</span>
                    </div>
                </div>

                <div className="landing-hero-visual" aria-label="The College Date app preview">
                    <div className="neon-heart neon-heart-one"></div>
                    <div className="neon-heart neon-heart-two"></div>
                    <div className="phone-shell">
                        <div className="phone-status">9:41</div>
                        <div className="phone-topbar">
                            <img src={brandIcon} alt="" />
                            <span>TheCollegeDate</span>
                        </div>
                        <div className="profile-preview">
                            <div className="profile-slide profile-slide-one">
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
                            <div className="profile-slide profile-slide-two">
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
                            <div className="profile-slide profile-slide-three">
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
                        <div className="match-actions">
                            <button type="button" aria-label="Pass">X</button>
                            <button type="button" aria-label="Like">Like</button>
                            <button type="button" aria-label="Super Swipe">Star</button>
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
                    <img src={featureGraphic} alt="The College Date promotional graphic" />
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
                    <a href="/safety.html">Safety center</a>
                    <a href="/child-safety-standards.html">Child safety standards</a>
                    <a href="/campus-dating-safety.html">Campus dating safety</a>
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
                        <img src={brandIcon} alt="" />
                        <span>The<span>College</span>Date</span>
                    </a>
                    <p>Real connections. Real you.</p>
                </div>

                <div className="landing-footer-links" aria-label="The College Date information links">
                    <a href="/about.html">About</a>
                    <a href="/campus-dating.html">Campus Dating</a>
                    <a href="/student-dating.html">Student Dating</a>
                    <a href="/nigeria-dating-app.html">Nigeria Dating</a>
                    <a href="/university-dating-nigeria.html">University Dating</a>
                    <a href="/college-dating-app.html">College App</a>
                    <a href="/dating-app-for-students.html">For Students</a>
                    <a href="/blog.html">Dating Guides</a>
                    <a href="/support.html">Support</a>
                    <a href={partnerWhatsAppUrl} target="_blank" rel="noopener noreferrer">Become a Partner</a>
                </div>
            </footer>
        </main>
    );
}
