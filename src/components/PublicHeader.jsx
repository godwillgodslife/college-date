import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import brandIcon from '../assets/landing-brand-icon.webp';
import './PublicHeader.css';

/**
 * PublicHeader - Shared editorial navigation bar for public pages.
 * @param {Object} props
 * @param {'transparent' | 'light' | 'dark'} [props.themeVariant='transparent'] Contextual styling
 */
export default function PublicHeader({ themeVariant = 'transparent' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const headerClass = [
    'public-header',
    `public-header--${themeVariant}`,
    scrolled ? 'public-header--scrolled' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <header className={headerClass} role="banner">
        <div className="public-header__container">
          <Link to="/" className="public-header__brand" aria-label="The College Date Home">
            <img src={brandIcon} alt="" width="36" height="36" className="public-header__logo" />
            <span className="public-header__title">
              The<span className="accent-word">College</span>Date
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="public-header__nav" aria-label="Primary Navigation">
            <a href={location.pathname === '/' ? '#how-it-works' : '/how-it-works'} className="public-header__link">How it works</a>
            <a href="/safety" className="public-header__link">Safety</a>
            <a href="/premium" className="public-header__link">Premium</a>
            <a href="/support" className="public-header__link">Partner</a>
          </nav>

          {/* Right CTAs */}
          <div className="public-header__actions">
            <Link to="/login" className="public-header__login">Log in</Link>
            <Link to="/signup" className="public-header__cta">Join now</Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className={`public-header__hamburger ${mobileMenuOpen ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="public-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`public-mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="public-mobile-drawer__top">
          <Link to="/" className="public-header__brand" onClick={() => setMobileMenuOpen(false)}>
            <img src={brandIcon} alt="" width="32" height="32" />
            <span className="public-header__title">
              The<span className="accent-word">College</span>Date
            </span>
          </Link>
          <button
            type="button"
            className="public-mobile-drawer__close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="public-mobile-drawer__nav" aria-label="Mobile Navigation">
          <a href={location.pathname === '/' ? '#how-it-works' : '/how-it-works'} onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="/safety" onClick={() => setMobileMenuOpen(false)}>Safety</a>
          <a href="/premium" onClick={() => setMobileMenuOpen(false)}>Premium</a>
          <a href="/support" onClick={() => setMobileMenuOpen(false)}>Partner</a>
          <a href="/about" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="/blog" onClick={() => setMobileMenuOpen(false)}>Dating Guides</a>
          <a href="/download" onClick={() => setMobileMenuOpen(false)}>Get the App</a>
        </nav>

        <div className="public-mobile-drawer__actions">
          <Link to="/signup" className="public-mobile-drawer__cta" onClick={() => setMobileMenuOpen(false)}>
            Join now — It's Free
          </Link>
          <Link to="/login" className="public-mobile-drawer__login" onClick={() => setMobileMenuOpen(false)}>
            I already have an account
          </Link>
        </div>
      </div>
    </>
  );
}
