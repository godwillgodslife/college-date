import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Landing.css';

export default function Landing() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(true);
    }, []);

    return (
        <div className="landing-container">
            {/* Animated Background */}
            <div className="landing-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* Content */}
            <div className={`landing-content ${loaded ? 'fade-in-up' : ''}`}>
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
                    <Link to="/signup" className="btn btn-primary btn-large glow-effect">
                        Get Started
                    </Link>
                    <Link to="/login" className="btn btn-secondary btn-large">
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
