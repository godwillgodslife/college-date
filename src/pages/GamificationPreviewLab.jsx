import React, { useState } from 'react';
import Leaderboard from './Leaderboard';
import ChatMiniGameCard from '../components/ChatMiniGameCard';
import ChatMiniGameModal from '../components/ChatMiniGameModal';
import EndorseVibeModal from '../components/EndorseVibeModal';
import CampusPrimetimeBanner from '../components/CampusPrimetimeBanner';
import CampusMysteryMatchModal from '../components/CampusMysteryMatchModal';
import CampusQuestsCard from '../components/CampusQuestsCard';
import ScoreStreakModal from '../components/ScoreStreakModal';
import MatchCelebration from '../components/MatchCelebration';
import { CAMPUS_VIBE_BADGES, getUserVibeEndorsements } from '../utils/profileData';
import { WOULD_YOU_RATHER_PRESETS } from '../utils/miniGames';
import './Leaderboard.css';
import './Profile.css';

export default function GamificationPreviewLab() {
    const [theme, setTheme] = useState('dark');
    const [activeSection, setActiveSection] = useState('all'); // 'all' | 'clash' | 'games' | 'endorsements' | 'primetime'
    const [showGameModal, setShowGameModal] = useState(false);
    const [showEndorseModal, setShowEndorseModal] = useState(false);
    const [showMysteryModal, setShowMysteryModal] = useState(false);
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [showMatchCelebration, setShowMatchCelebration] = useState(false);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        if (next === 'light') {
            document.documentElement.classList.add('theme-light');
            document.body.classList.add('light-theme');
        } else {
            document.documentElement.classList.remove('theme-light');
            document.body.classList.remove('light-theme');
        }
    };

    const mockWyrMessage = {
        id: 'mock-wyr-msg-1',
        sender_id: 'peer-user-1',
        type: 'mini_game',
        metadata: {
            game_type: 'would_you_rather',
            title: WOULD_YOU_RATHER_PRESETS[0].title,
            option_a: WOULD_YOU_RATHER_PRESETS[0].optionA,
            option_b: WOULD_YOU_RATHER_PRESETS[0].optionB
        }
    };

    const mockTruthLieMessage = {
        id: 'mock-truth-lie-msg-2',
        sender_id: 'peer-user-2',
        type: 'mini_game',
        metadata: {
            game_type: 'two_truths_lie',
            statements: [
                'I skipped an 8 AM test and still got an A',
                "I've had a crush on someone in my faculty",
                'I can cook 5-star party jollof rice'
            ],
            lie_index: 0
        }
    };

    const mockPeerUser = {
        id: 'student-amaka-uuid',
        full_name: 'Amaka Johnson',
        university: 'University of Lagos (UNILAG)',
        department: 'Economics',
        level: '300L'
    };

    const sampleEndorsements = getUserVibeEndorsements(mockPeerUser.id);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary, #0c0a17)',
            color: 'var(--text-primary, #f8fafc)',
            padding: '1.5rem 1rem 6rem 1rem',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Top Lab Header */}
            <header style={{
                maxWidth: '720px',
                margin: '0 auto 2rem auto',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#a78bfa',
                        display: 'block',
                        marginBottom: '4px'
                    }}>
                        Collegiate Gamification Phase 2
                    </span>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>
                        Live Verification Lab
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={{
                            background: theme === 'dark' ? '#ffffff' : '#181822',
                            color: theme === 'dark' ? '#0f172a' : '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: '750',
                            cursor: 'pointer'
                        }}
                    >
                        {theme === 'dark' ? '☀️ Switch to Light Theme' : '🌙 Switch to Dark Theme'}
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {/* 0. Phase 1 Collegiate Habit Loops & Cross-Page Cohesion */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '18px' }}>🎯</span>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                                Phase 1: Campus Daily Quests, Streak Perks & Match Icebreakers
                            </h2>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowStreakModal(true)}
                                style={{
                                    background: 'rgba(234, 179, 8, 0.2)',
                                    border: '1px solid #eab308',
                                    color: '#facc15',
                                    borderRadius: '8px',
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                🔥 Score Streak Perks Modal
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowMatchCelebration(true)}
                                style={{
                                    background: 'rgba(236, 72, 153, 0.2)',
                                    border: '1px solid #ec4899',
                                    color: '#f472b6',
                                    borderRadius: '8px',
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                🎉 Match Icebreakers
                            </button>
                        </div>
                    </div>

                    <CampusQuestsCard userId="my-user-uuid" />
                </section>

                {/* 1. Primetime Rush Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '18px' }}>⚡</span>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                            Feature 1: Campus Primetime Hour & Live Surge
                        </h2>
                    </div>
                    <CampusPrimetimeBanner onBannerClick={(st) => alert(`Primetime status: ${st.headline} (${st.countdown})`)} />
                </section>

                {/* 2. In-Chat Interactive Mini-Games Section */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '18px' }}>🎮</span>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                                Feature 2: In-Chat Interactive Mini-Games ("Break the Ice")
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowGameModal(true)}
                            style={{
                                background: 'rgba(99, 91, 255, 0.2)',
                                border: '1px solid #635bff',
                                color: '#a5b4fc',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            + Open Game Launcher Modal
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                                Scenario A: "Campus Would You Rather"
                            </div>
                            <ChatMiniGameCard
                                message={mockWyrMessage}
                                currentUserId="my-user-uuid"
                                partnerName="Amaka"
                                isSender={false}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                                Scenario B: "2 Truths & a Lie" (Interactive Guessing)
                            </div>
                            <ChatMiniGameCard
                                message={mockTruthLieMessage}
                                currentUserId="my-user-uuid"
                                partnerName="Tunde"
                                isSender={false}
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Peer Campus Endorsement Badges */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '18px' }}>✨</span>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                                Feature 3: Peer Campus Endorsement Badges ("Vibe Badges")
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowEndorseModal(true)}
                            style={{
                                background: 'rgba(99, 91, 255, 0.2)',
                                border: '1px solid #635bff',
                                color: '#a5b4fc',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            + Endorse Amaka's Vibe
                        </button>
                    </div>

                    <div className="campus-vibe-endorsements-section">
                        <div className="vibe-endorsements-header">
                            <div className="vibe-header-title">
                                <span className="vibe-header-icon">✨</span>
                                <h4>Amaka's Campus Vibe Badges</h4>
                            </div>
                            <button
                                type="button"
                                className="btn-endorse-vibe-cta"
                                onClick={() => setShowEndorseModal(true)}
                            >
                                + Endorse
                            </button>
                        </div>
                        <div className="vibe-endorsements-pills-wrap">
                            {CAMPUS_VIBE_BADGES.slice(0, 5).map((badge, idx) => (
                                <span
                                    key={badge.id}
                                    className={`vibe-badge-pill ${idx === 0 ? 'endorsed-by-me' : ''}`}
                                    title={badge.desc}
                                >
                                    <span className="badge-pill-emoji">{badge.icon}</span>
                                    <span className="badge-pill-label">{badge.label}</span>
                                    <span className="badge-pill-count">×{idx === 0 ? 5 : 3}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. Clash of Campuses Leaderboard */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '18px' }}>🏛️</span>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                            Feature 4: "Clash of Campuses" (Inter-University Weekly Rivalry)
                        </h2>
                    </div>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        overflow: 'hidden'
                    }}>
                        <Leaderboard />
                    </div>
                </section>

                {/* 5. Campus Primetime Mystery Match (Speed Date) */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '18px' }}>🎭</span>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                                Feature 5: Primetime Mystery Match (Blind Date Speed Hour)
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowMysteryModal(true)}
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '750',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                            }}
                        >
                            🎭 Launch Speed Date Modal
                        </button>
                    </div>

                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                        During Campus Primetime (8:00 – 10:00 PM WAT), students enter blind-date speed matches with heavily blurred avatars. Exchanging messages triggers a 3-stage progressive unblur: 0 msgs (masked) → 1 msg (33% unblur) → 2 msgs (66% unblur) → 3 msgs (🎉 Full Identity Reveal + Permanent Match +25 XP)!
                    </p>
                </section>
            </main>

            {/* Modals */}
            {showGameModal && (
                <ChatMiniGameModal
                    isOpen={showGameModal}
                    onClose={() => setShowGameModal(false)}
                    onSendGame={(game) => alert(`Game sent to chat: ${game.content}`)}
                    partnerName="Amaka"
                />
            )}

            {showEndorseModal && (
                <EndorseVibeModal
                    isOpen={showEndorseModal}
                    onClose={() => setShowEndorseModal(false)}
                    targetUser={mockPeerUser}
                    currentUserId="my-user-uuid"
                    onEndorsed={(badge) => alert(`Endorsed Amaka as ${badge.label}!`)}
                />
            )}

            {showMysteryModal && (
                <CampusMysteryMatchModal
                    isOpen={showMysteryModal}
                    onClose={() => setShowMysteryModal(false)}
                    currentUserId="my-user-uuid"
                    currentUserProfile={{ gender: 'male', university: 'UNILAG' }}
                    onNavigateToChat={(id) => alert(`Navigating to permanent chat with partner ID: ${id}`)}
                />
            )}

            {showStreakModal && (
                <ScoreStreakModal
                    isOpen={showStreakModal}
                    onClose={() => setShowStreakModal(false)}
                    streak={14}
                    longestStreak={21}
                    activeToday={true}
                    nextMilestone={30}
                    progressToMilestone={46}
                    onStartActivity={() => setShowStreakModal(false)}
                />
            )}

            {showMatchCelebration && (
                <MatchCelebration
                    isOpen={showMatchCelebration}
                    onClose={() => setShowMatchCelebration(false)}
                    userProfile={{
                        full_name: 'David Adeleke',
                        university: 'University of Lagos (UNILAG)',
                        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80'
                    }}
                    matchedProfile={{
                        full_name: 'Chioma Adeyemi',
                        university: 'University of Lagos (UNILAG)',
                        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
                    }}
                    onMessage={(text) => alert(`Message sent to chat: "${text}"`)}
                />
            )}
        </div>
    );
}
