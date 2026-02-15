import { Link } from 'react-router-dom';
import './FeatureCard.css';

export default function FeatureCard({ icon, title, description, to, comingSoon = false }) {
    const content = (
        <div className={`feature-card ${comingSoon ? 'coming-soon' : ''}`}>
            <div className="feature-card-icon">{icon}</div>
            <h3 className="feature-card-title">{title}</h3>
            <p className="feature-card-desc">{description}</p>
            {comingSoon && <span className="feature-card-badge">Coming Soon</span>}
            {!comingSoon && (
                <span className="feature-card-arrow">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            )}
        </div>
    );

    if (comingSoon || !to) {
        return content;
    }

    return <Link to={to} className="feature-card-link">{content}</Link>;
}
