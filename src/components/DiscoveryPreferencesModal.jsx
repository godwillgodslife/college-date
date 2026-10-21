import React, { useState, useMemo, useEffect } from 'react';
import { UNIVERSITIES_BY_COUNTRY } from '../constants/universities';
import { triggerLightHaptic, triggerSuccessHaptic } from '../services/haptics';
import './DiscoveryPreferencesModal.css';

const NIGERIAN_UNIVERSITIES = UNIVERSITIES_BY_COUNTRY.NG || [];

export default function DiscoveryPreferencesModal({
    isOpen,
    onClose,
    filters = {},
    onApplyFilters,
    userProfile = null,
    isPremium = false,
    onOpenPaywall = null
}) {
    // Recommendation feedback state
    const [recFeedback, setRecFeedback] = useState(() => {
        try {
            return localStorage.getItem('tcd_discovery_rec_feedback') || null;
        } catch {
            return null;
        }
    });

    // Local filter state initialized from incoming filters
    const [localGender, setLocalGender] = useState(() => filters.gender || 'All');
    const [localUniversity, setLocalUniversity] = useState(() => filters.university || userProfile?.university || 'All');
    const [distanceKm, setDistanceKm] = useState(() => filters.distanceKm || 25);
    const [fallbackNearby, setFallbackNearby] = useState(() => filters.fallbackNearby !== false);
    const [minAge, setMinAge] = useState(() => (Array.isArray(filters.ageRange) ? filters.ageRange[0] : 18) || 18);
    const [maxAge, setMaxAge] = useState(() => (Array.isArray(filters.ageRange) ? filters.ageRange[1] : 32) || 32);
    const [fallbackAge, setFallbackAge] = useState(() => filters.fallbackAge !== false);
    
    // Premium filters
    const [minPhotos, setMinPhotos] = useState(() => filters.minPhotos || 1);
    const [hasBio, setHasBio] = useState(() => Boolean(filters.hasBio));
    const [faculty, setFaculty] = useState(() => filters.faculty || 'All');
    const [attractionGoal, setAttractionGoal] = useState(() => filters.attractionGoal || 'All');
    const [zodiac, setZodiac] = useState(() => filters.zodiac || 'All');

    // Campus search state
    const [showCampusSearch, setShowCampusSearch] = useState(false);
    const [campusQuery, setCampusQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalGender(filters.gender || 'All');
            setLocalUniversity(filters.university || userProfile?.university || 'All');
            setDistanceKm(filters.distanceKm || 25);
            setFallbackNearby(filters.fallbackNearby !== false);
            setMinAge((Array.isArray(filters.ageRange) ? filters.ageRange[0] : 18) || 18);
            setMaxAge((Array.isArray(filters.ageRange) ? filters.ageRange[1] : 32) || 32);
            setFallbackAge(filters.fallbackAge !== false);
            setMinPhotos(filters.minPhotos || 1);
            setHasBio(Boolean(filters.hasBio));
            setFaculty(filters.faculty || 'All');
            setAttractionGoal(filters.attractionGoal || 'All');
            setZodiac(filters.zodiac || 'All');
        }
    }, [isOpen, filters, userProfile]);

    const filteredCampuses = useMemo(() => {
        if (!campusQuery.trim()) return ['All Campuses', ...NIGERIAN_UNIVERSITIES.slice(0, 12)];
        const q = campusQuery.toLowerCase();
        const matches = NIGERIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(q));
        return ['All Campuses', ...matches.slice(0, 15)];
    }, [campusQuery]);

    if (!isOpen) return null;

    const handleFeedback = (sentiment) => {
        triggerLightHaptic();
        setRecFeedback(sentiment);
        try {
            localStorage.setItem('tcd_discovery_rec_feedback', sentiment);
        } catch {
            // ignore localStorage quota issues
        }
    };

    const handleApply = () => {
        triggerSuccessHaptic();
        const updated = {
            ...filters,
            gender: localGender,
            university: localUniversity === 'All Campuses' ? 'All' : localUniversity,
            ageRange: [Number(minAge), Number(maxAge)],
            distanceKm,
            fallbackNearby,
            fallbackAge,
            minPhotos,
            hasBio,
            faculty,
            attractionGoal,
            zodiac
        };
        onApplyFilters?.(updated);
        onClose?.();
    };

    return (
        <div className="discovery-pref-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Discovery Preferences">
            <div className="discovery-pref-sheet" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="pref-header">
                    <div className="pref-drag-handle" />
                    <h2 className="pref-header-title">Discovery Preferences</h2>
                    <button type="button" className="pref-btn-done" onClick={handleApply}>
                        Done
                    </button>
                </div>

                {/* Body Content */}
                <div className="pref-body">
                    {/* Recommendation Quality Feedback */}
                    <div className="pref-feedback-card">
                        <h3 className="pref-feedback-title">How are your recommendations lately?</h3>
                        <p className="pref-feedback-subtitle">Your feedback helps improve your campus discovery feed.</p>
                        
                        <div className="pref-feedback-actions">
                            <button
                                type="button"
                                className={`pref-feedback-btn ${recFeedback === 'not_good' ? 'active-bad' : ''}`}
                                onClick={() => handleFeedback('not_good')}
                            >
                                ✕ Not good
                            </button>
                            <button
                                type="button"
                                className={`pref-feedback-btn ${recFeedback === 'good' ? 'active-good' : ''}`}
                                onClick={() => handleFeedback('good')}
                            >
                                ✓ Good
                            </button>
                        </div>
                        {recFeedback && (
                            <div className="pref-feedback-thanks">
                                {recFeedback === 'good' ? '🎉 Thanks! We’ll keep highlighting your top vibe matches.' : '✨ Got it! Tuning your feed for better student matches.'}
                            </div>
                        )}
                    </div>

                    {/* Section: Discovery */}
                    <div>
                        <div className="pref-section-title">Discovery</div>
                        <div className="pref-card-group">
                            {/* Campus Location Row */}
                            <div 
                                className="pref-row pref-location-clickable" 
                                onClick={() => setShowCampusSearch(prev => !prev)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="pref-row-header">
                                    <span className="pref-row-label">Campus Location</span>
                                    <span className="pref-row-value">
                                        {localUniversity === 'All' ? 'All Campuses' : localUniversity.split('(')[1]?.replace(')', '') || localUniversity}
                                        <span className="pref-chevron">{showCampusSearch ? '▴' : '›'}</span>
                                    </span>
                                </div>
                                <p className="pref-row-subtext">Change campus to discover students anywhere across Nigeria.</p>

                                {showCampusSearch && (
                                    <div className="pref-campus-selector-box" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            className="pref-campus-search-input"
                                            placeholder="Search Nigerian universities (e.g. UNILAG, UI, OAU)..."
                                            value={campusQuery}
                                            onChange={e => setCampusQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="pref-campus-list">
                                            {filteredCampuses.map(u => (
                                                <button
                                                    key={u}
                                                    type="button"
                                                    className={`pref-campus-option ${localUniversity === u ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        triggerLightHaptic();
                                                        setLocalUniversity(u);
                                                        setShowCampusSearch(false);
                                                    }}
                                                >
                                                    {u === 'All Campuses' ? '🌍 All Nigerian Campuses' : `🎓 ${u}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Maximum Distance Slider */}
                            <div className="pref-row">
                                <div className="pref-row-header">
                                    <span className="pref-row-label">Maximum Distance</span>
                                    <span className="pref-row-value">{distanceKm} km</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    step="5"
                                    value={distanceKm}
                                    onChange={e => setDistanceKm(Number(e.target.value))}
                                    className="pref-slider"
                                    aria-label="Maximum Distance in Kilometers"
                                />
                                <div className="pref-switch-row">
                                    <span className="pref-switch-label">
                                        Show people further away if I run out of profiles to see.
                                    </span>
                                    <label className="pref-switch">
                                        <input
                                            type="checkbox"
                                            checked={fallbackNearby}
                                            onChange={e => setFallbackNearby(e.target.checked)}
                                        />
                                        <span className="pref-slider-round" />
                                    </label>
                                </div>
                            </div>

                            {/* Show Me Row (Gender) */}
                            <div className="pref-row">
                                <div className="pref-row-header">
                                    <span className="pref-row-label">Show Me</span>
                                </div>
                                <div className="pref-segmented">
                                    <button
                                        type="button"
                                        className={`pref-segment-btn ${localGender === 'Female' ? 'active' : ''}`}
                                        onClick={() => { triggerLightHaptic(); setLocalGender('Female'); }}
                                    >
                                        👩 Women
                                    </button>
                                    <button
                                        type="button"
                                        className={`pref-segment-btn ${localGender === 'Male' ? 'active' : ''}`}
                                        onClick={() => { triggerLightHaptic(); setLocalGender('Male'); }}
                                    >
                                        👨 Men
                                    </button>
                                    <button
                                        type="button"
                                        className={`pref-segment-btn ${localGender === 'All' ? 'active' : ''}`}
                                        onClick={() => { triggerLightHaptic(); setLocalGender('All'); }}
                                    >
                                        ✨ Everyone
                                    </button>
                                </div>
                            </div>

                            {/* Age Range Row */}
                            <div className="pref-row">
                                <div className="pref-row-header">
                                    <span className="pref-row-label">Age Range</span>
                                    <span className="pref-row-value">{minAge} - {maxAge}</span>
                                </div>
                                <div className="pref-range-inputs">
                                    <input
                                        type="range"
                                        min="18"
                                        max="40"
                                        value={maxAge}
                                        onChange={e => setMaxAge(Math.max(minAge, Number(e.target.value)))}
                                        className="pref-slider pref-range-slider"
                                        aria-label="Maximum Age"
                                    />
                                </div>
                                <div className="pref-switch-row">
                                    <span className="pref-switch-label">
                                        Show people slightly out of my preferred range if I run out of profiles.
                                    </span>
                                    <label className="pref-switch">
                                        <input
                                            type="checkbox"
                                            checked={fallbackAge}
                                            onChange={e => setFallbackAge(e.target.checked)}
                                        />
                                        <span className="pref-slider-round" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Premium Discovery (GOLD) */}
                    <div>
                        <div className="pref-section-title pref-premium-header">
                            <span>Premium Discovery</span>
                            <span className="pref-gold-badge">👑 Gold</span>
                        </div>
                        <p className="pref-row-subtext" style={{ padding: '0 0.2rem 0.6rem' }}>
                            Preferences show you people who match your vibe, but won't limit who you see — you'll still be able to match with people outside your selections.
                        </p>

                        <div className="pref-card-group">
                            {/* Minimum Number of Photos */}
                            <div className="pref-row">
                                <div className="pref-row-header">
                                    <span className="pref-row-label">Minimum Number of Photos</span>
                                    <span className="pref-row-value">{minPhotos} {minPhotos === 1 ? 'photo' : 'photos'}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="6"
                                    step="1"
                                    value={minPhotos}
                                    onChange={e => setMinPhotos(Number(e.target.value))}
                                    className="pref-slider"
                                    aria-label="Minimum Number of Photos"
                                />
                            </div>

                            {/* Has a Bio */}
                            <div className="pref-row">
                                <div className="pref-switch-row" style={{ paddingTop: 0 }}>
                                    <span className="pref-row-label">Has a Bio</span>
                                    <label className="pref-switch">
                                        <input
                                            type="checkbox"
                                            checked={hasBio}
                                            onChange={e => setHasBio(e.target.checked)}
                                        />
                                        <span className="pref-slider-round" />
                                    </label>
                                </div>
                            </div>

                            {/* Faculty / Department Filter */}
                            <div className="pref-row">
                                <span className="pref-row-label">Faculty / Discipline</span>
                                <select 
                                    className="pref-select" 
                                    value={faculty} 
                                    onChange={e => setFaculty(e.target.value)}
                                >
                                    <option value="All">All Faculties</option>
                                    <option value="Law">Faculty of Law ⚖️</option>
                                    <option value="Medicine">Medicine & Nursing 🩺</option>
                                    <option value="Engineering">Engineering & Tech 💻</option>
                                    <option value="Management">Business & Management 📊</option>
                                    <option value="Sciences">Science & Mathematics 🔬</option>
                                    <option value="Arts">Arts & Humanities 🎭</option>
                                    <option value="Social Sciences">Social Sciences 🌍</option>
                                </select>
                            </div>

                            {/* Relationship Goal */}
                            <div className="pref-row">
                                <span className="pref-row-label">Looking For</span>
                                <select 
                                    className="pref-select" 
                                    value={attractionGoal} 
                                    onChange={e => setAttractionGoal(e.target.value)}
                                >
                                    <option value="All">Any Vibe</option>
                                    <option value="Study Buddy">Study Buddy & Dating 📚</option>
                                    <option value="Serious Relationship">Serious Relationship 💍</option>
                                    <option value="Casual Vibes">Casual Vibes 🎉</option>
                                    <option value="Campus Friends">Campus Friends 🤝</option>
                                </select>
                            </div>

                            {/* Zodiac */}
                            <div className="pref-row">
                                <span className="pref-row-label">Zodiac Sign</span>
                                <select 
                                    className="pref-select" 
                                    value={zodiac} 
                                    onChange={e => setZodiac(e.target.value)}
                                >
                                    <option value="All">Any Zodiac</option>
                                    <option value="Aries">Aries ♈</option>
                                    <option value="Taurus">Taurus ♉</option>
                                    <option value="Gemini">Gemini ♊</option>
                                    <option value="Cancer">Cancer ♋</option>
                                    <option value="Leo">Leo ♌</option>
                                    <option value="Virgo">Virgo ♍</option>
                                    <option value="Libra">Libra ♎</option>
                                    <option value="Scorpio">Scorpio ♏</option>
                                    <option value="Sagittarius">Sagittarius ♐</option>
                                    <option value="Capricorn">Capricorn ♑</option>
                                    <option value="Aquarius">Aquarius ♒</option>
                                    <option value="Pisces">Pisces ♓</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
