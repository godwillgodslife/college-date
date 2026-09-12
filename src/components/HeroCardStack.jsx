import { useState, useEffect, useRef } from 'react';
import brandIcon from '../assets/landing-brand-icon.webp';
import profileAmaka from '../assets/landing-profile-amaka.webp';
import profileTunde from '../assets/landing-profile-tunde.webp';
import profileZainab from '../assets/landing-profile-zainab.webp';
import './HeroCardStack.css';

const STUDENTS = [
  {
    id: 'zainab',
    name: 'Zainab, 20',
    school: 'University of Ibadan',
    dept: 'Economics · 300L',
    location: 'Kenneth Dike Library side',
    interests: ['Fashion', 'Poetry', 'Soft life'],
    image: profileZainab,
  },
  {
    id: 'amaka',
    name: 'Amaka, 21',
    school: 'University of Lagos',
    dept: 'Mass Comm · 400L',
    location: 'New Hall & Faculty Walk',
    interests: ['Afrobeats', 'Campus gist', 'Study dates'],
    image: profileAmaka,
  },
  {
    id: 'tunde',
    name: 'Tunde, 23',
    school: 'Obafemi Awolowo University',
    dept: 'Architecture · 500L',
    location: 'Studio side · Awolowo Hall',
    interests: ['Football', 'Design', 'Live music'],
    image: profileTunde,
  },
];

export default function HeroCardStack() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Auto-cycle through students every 4.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STUDENTS.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const prevIndex = (activeIndex + STUDENTS.length - 1) % STUDENTS.length;
  const nextIndex = (activeIndex + 1) % STUDENTS.length;

  const activeStudent = STUDENTS[activeIndex];
  const leftStudent = STUDENTS[prevIndex];
  const rightStudent = STUDENTS[nextIndex];

  return (
    <div
      className="hero-card-stack"
      aria-label="Interactive student card experience"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Floating Metric Pill */}
      <div className="hero-stack-metric" aria-label="Campus reach">
        <div className="hero-stack-metric__icon">🎓</div>
        <div className="hero-stack-metric__copy">
          <strong>2.1M+</strong>
          <span>Students on Campus</span>
        </div>
      </div>

      {/* Organic Student Vibes Sticker */}
      <div className="hero-stack-polaroid">
        <span className="hero-stack-polaroid__tag font-hand">Real Campus Vibe</span>
        <span className="hero-stack-polaroid__note">Verified Students Only ✨</span>
      </div>

      {/* ── Left Background Card (Layered Behind) ── */}
      <div
        className="hero-layered-card hero-layered-card--left"
        onClick={() => setActiveIndex(prevIndex)}
        role="button"
        tabIndex={0}
        aria-label={`Switch to profile of ${leftStudent.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveIndex(prevIndex); }}
      >
        <div
          className="hero-layered-card__image"
          style={{ backgroundImage: `url(${leftStudent.image})` }}
        >
          <div className="hero-layered-card__scrim">
            <div className="hero-layered-card__info">
              <strong>{leftStudent.name}</strong>
              <span>{leftStudent.school}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Background Card (Layered Behind) ── */}
      <div
        className="hero-layered-card hero-layered-card--right"
        onClick={() => setActiveIndex(nextIndex)}
        role="button"
        tabIndex={0}
        aria-label={`Switch to profile of ${rightStudent.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveIndex(nextIndex); }}
      >
        <div
          className="hero-layered-card__image"
          style={{ backgroundImage: `url(${rightStudent.image})` }}
        >
          <div className="hero-layered-card__scrim">
            <div className="hero-layered-card__info">
              <strong>{rightStudent.name}</strong>
              <span>{rightStudent.school}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Central Photorealistic Smartphone ── */}
      <div className="hero-phone-shell" role="region" aria-label={`Current student profile: ${activeStudent.name}`}>
        {/* Phone Status Bar */}
        <div className="hero-phone-status">
          <span className="phone-clock">9:41</span>
          <div className="phone-island">
            <span className="island-lens"></span>
          </div>
          <div className="phone-indicators">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* In-App Top Bar */}
        <div className="hero-phone-topbar">
          <div className="phone-brand">
            <img src={brandIcon} alt="" width="20" height="20" />
            <span>TheCollegeDate</span>
          </div>
          <span className="phone-live-dot">● Live on Campus</span>
        </div>

        {/* Active Profile Screen */}
        <div className="hero-phone-screen">
          <div
            key={activeStudent.id}
            className="hero-phone-photo hero-fade-in"
            style={{ backgroundImage: `url(${activeStudent.image})` }}
          >
            {/* Scrim Overlay with Student Metadata */}
            <div className="hero-phone-copy">
              <div className="hero-phone-name-row">
                <h3>{activeStudent.name}</h3>
                <span className="hero-verified-badge" title="Verified Nigerian Student">✓</span>
              </div>
              <p className="hero-phone-school">{activeStudent.school} · {activeStudent.dept}</p>
              <small className="hero-phone-location">📍 {activeStudent.location}</small>

              <div className="hero-phone-interests">
                {activeStudent.interests.map((tag) => (
                  <span key={tag} className="hero-interest-pill">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interaction Buttons */}
        <div className="hero-phone-actions" aria-hidden="true">
          <button
            type="button"
            className="hero-action-btn hero-action-btn--pass"
            aria-label="Pass"
            onClick={() => setActiveIndex(nextIndex)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-action-btn hero-action-btn--like"
            aria-label="Like"
            onClick={() => setActiveIndex(nextIndex)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-action-btn hero-action-btn--star"
            aria-label="Super Swipe"
            onClick={() => setActiveIndex(nextIndex)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pagination / Direct Select Dots */}
      <div className="hero-stack-dots" aria-label="Student selector dots">
        {STUDENTS.map((student, idx) => (
          <button
            key={student.id}
            type="button"
            className={`hero-stack-dot ${idx === activeIndex ? 'is-active' : ''}`}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to ${student.name}`}
          />
        ))}
      </div>
    </div>
  );
}
