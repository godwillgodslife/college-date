import { Link } from 'react-router-dom';
import brandIcon from '../assets/landing-brand-icon.webp';
import { partnerWhatsAppUrl, founderLinkedInUrl } from '../config/contactLinks';
import './PublicFooter.css';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer" role="contentinfo">
      <div className="public-footer__container">
        {/* Brand & Identity Column */}
        <div className="public-footer__brand-col">
          <Link to="/" className="public-footer__brand" aria-label="The College Date Home">
            <img src={brandIcon} alt="" width="36" height="36" className="public-footer__logo" />
            <span className="public-footer__title">
              The<span className="accent-word">College</span>Date
            </span>
          </Link>
          <p className="public-footer__tagline">
            Real connections. Real you. Built for the culture, rhythm, and confidence of Nigerian campus life.
          </p>
          <div className="public-footer__badges">
            <span className="footer-pill">🎓 Student Verified</span>
            <span className="footer-pill">🔒 18+ Only</span>
            <span className="footer-pill">🇳🇬 Nigerian Campuses</span>
          </div>
          <p className="public-footer__copyright">
            © {currentYear} The College Date. All rights reserved.
          </p>
        </div>

        {/* Link Columns */}
        <div className="public-footer__links-grid">
          {/* Col 1: Explore & Dating */}
          <div className="public-footer__col">
            <h4 className="public-footer__heading">Campus Social</h4>
            <ul className="public-footer__list">
              <li><Link to="/how-it-works">How It Works</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/campus-dating">Campus Dating</Link></li>
              <li><Link to="/student-dating">Student Dating</Link></li>
              <li><Link to="/nigeria-dating-app">Nigeria Dating</Link></li>
              <li><Link to="/university-dating-nigeria">University Dating</Link></li>
              <li><Link to="/blog">Dating Guides & Advice</Link></li>
            </ul>
          </div>

          {/* Col 2: Trust & Safety */}
          <div className="public-footer__col">
            <h4 className="public-footer__heading">Safety & Standards</h4>
            <ul className="public-footer__list">
              <li><Link to="/safety">Safety Center</Link></li>
              <li><Link to="/campus-dating-safety">Campus Meeting Safety</Link></li>
              <li><Link to="/child-safety-standards">Child Safety Standards</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/delete-account">Account Deletion</Link></li>
            </ul>
          </div>

          {/* Col 3: Platform & Partners */}
          <div className="public-footer__col">
            <h4 className="public-footer__heading">Connect & Partner</h4>
            <ul className="public-footer__list">
              <li><Link to="/premium">Get Premium</Link></li>
              <li><Link to="/download">Download Android App</Link></li>
              <li><Link to="/support">Become a Partner</Link></li>
              <li>
                <a href={partnerWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                  Official WhatsApp
                </a>
              </li>
              <li>
                <a href={founderLinkedInUrl} target="_blank" rel="noopener noreferrer">
                  Founder LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="https://www.instagram.com/thecollegedate?igsh=MXhxZHZiMzZtOGp6dw%3D%3D&utm_source=qr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
