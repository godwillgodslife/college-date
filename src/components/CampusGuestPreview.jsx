import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import profileAmaka from '../assets/landing-profile-amaka.webp';
import profileTunde from '../assets/landing-profile-tunde.webp';
import profileFaruq from '../assets/landing-profile-zainab.webp';
import studentStudy from '../assets/how-it-works-student-study.jpg';
import studentPark from '../assets/how-it-works-student-park.jpg';
import './CampusGuestPreview.css';

export const CURATED_STUDENTS = [
    {
        id: 'amaka',
        name: 'Amaka, 21',
        school: 'University of Lagos',
        shortSchool: 'UNILAG',
        dept: 'Mass Communication · 400L',
        vibe: 'New Hall & Faculty Walk',
        image: profileAmaka,
        bio: 'Final year mass comm student. If you know the best suya and plantain spot near campus, we are already friends.',
        interests: ['Afrobeats', 'Campus gist', 'Study dates'],
        icebreakers: [
            "Hey Amaka! Best suya spot around Akoka campus? 🍕",
            "Final year crunch! How is your project writing going? 🎓",
            "New Hall or Lagoon Front for evening hangouts? 🌊"
        ],
        mockReply: "Haha University Gate suya after 7 PM! Hands down the best on campus 🔥"
    },
    {
        id: 'tunde',
        name: 'Tunde, 23',
        school: 'Obafemi Awolowo University',
        shortSchool: 'OAU',
        dept: 'Architecture · 500L',
        vibe: 'Studio side · Awolowo Hall',
        image: profileTunde,
        bio: 'Architecture student surviving studio crunches. Let us talk design, good Afrobeats, and campus adventures.',
        interests: ['Football', 'Design', 'Live music'],
        icebreakers: [
            "Studio all-nighter or early morning lecture survivor? 🦉",
            "What's your favourite building on the OAU campus? 🏛️",
            "Sub-crunch study date or live music this weekend? 🎸"
        ],
        mockReply: "Definitely Oduduwa Hall! Architecture students don't sleep anyway 😂"
    },
    {
        id: 'faruq',
        name: 'Faruq, 22',
        school: 'University of Ibadan',
        shortSchool: 'UI',
        dept: 'Economics · 300L',
        vibe: 'Kenneth Dike Library side',
        image: profileFaruq,
        bio: 'Economics major surviving micro crunches. Always down for good food at Tedder Hall and Sunday football.',
        interests: ['Football', 'Economics', 'Street food'],
        icebreakers: [
            "Hey Faruq! What's your favourite quiet study spot in UI? 🏫",
            "Fellow economics student! How are lectures treating you? 📚",
            "Library crunch or hostel chilling today? 😂"
        ],
        mockReply: "Definitely Kenneth Dike upper floor! Nobody disturbs you there haha 😂"
    },
    {
        id: 'kemi',
        name: 'Kemi, 22',
        school: 'University of Nigeria, Nsukka',
        shortSchool: 'UNN',
        dept: 'Pharmacy · 400L',
        vibe: 'Franco Hostel & SUB Quad',
        image: studentStudy,
        bio: 'Pharm student balancing labs with good conversation. Looking for genuine campus friends and mutual vibe.',
        interests: ['Podcasts', 'Med-Tech', 'Coffee walks'],
        icebreakers: [
            "How do you survive UNN lab reports without losing sleep? ☕",
            "Franco or Mary Slessor walk this evening? 🌿",
            "What podcast are you currently listening to? 🎧"
        ],
        mockReply: "Lots of coffee and crying haha! But Franco quad is always vibes ✨"
    },
    {
        id: 'fola',
        name: 'Fola, 21',
        school: 'Covenant University',
        shortSchool: 'Covenant',
        dept: 'Computer Science · 300L',
        vibe: 'Cafeteria 2 & Tech Lab',
        image: studentPark,
        bio: 'Software enthusiast building apps and playing basketball. Need a genuine study partner who does not dry text.',
        interests: ['Coding', 'Basketball', 'Gaming'],
        icebreakers: [
            "Caf 2 or Caf 1 for lunch today? 🥪",
            "What tech stack are you building with lately? 💻",
            "Always down for basketball or study sessions! 🏀"
        ],
        mockReply: "Caf 2 puff-puff is legendary! Let's do a coding session this weekend 💻"
    }
];

export const CAMPUS_FILTERS = ['All', 'UNILAG', 'UI', 'OAU', 'UNN', 'Covenant'];

const SAMPLE_CONFESSIONS = [
    {
        id: 'c1',
        text: 'To the guy in 400L Law who shared his lecture notes at Main Library... you look like an angel in glasses 🙈',
        campus: 'UNILAG',
        time: '2h ago',
        reactions: { '❤️': 48, '🔥': 23, '😂': 12 }
    },
    {
        id: 'c2',
        text: 'Lecturer said attendance is 30% of grade and locked the door at 8:01 AM sharp. Lagos traffic had other plans 😭',
        campus: 'UNILAG',
        time: '4h ago',
        reactions: { '😂': 84, '🙈': 31, '❤️': 15 }
    },
    {
        id: 'c3',
        text: 'Someone left hot suya and malt at my Tedder Hall door with no name. If this is a crush, please reveal yourself! 🍲',
        campus: 'UI',
        time: '6h ago',
        reactions: { '🔥': 62, '❤️': 51, '🙊': 19 }
    }
];

export default function CampusGuestPreview({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('match'); // 'match' | 'confessions' | 'chat'
    const [selectedCampus, setSelectedCampus] = useState('All');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [demoMatch, setDemoMatch] = useState(null);
    const [selectedIcebreaker, setSelectedIcebreaker] = useState('');
    const [sentMessages, setSentMessages] = useState([]);
    const [confessionReactions, setConfessionReactions] = useState({});
    const chatEndRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [sentMessages, activeTab]);

    if (!isOpen) return null;

    const filteredStudents = selectedCampus === 'All'
        ? CURATED_STUDENTS
        : CURATED_STUDENTS.filter(s => s.shortSchool === selectedCampus);

    const activeStudent = (filteredStudents.length > 0
        ? filteredStudents[currentIndex % filteredStudents.length]
        : null) || CURATED_STUDENTS[0];

    const handleNext = () => {
        setDemoMatch(null);
        setSelectedIcebreaker('');
        if (filteredStudents.length > 0) {
            setCurrentIndex(prev => (prev + 1) % filteredStudents.length);
        }
    };

    const handleLike = () => {
        setSelectedIcebreaker('');
        setDemoMatch(activeStudent);
    };

    const handleSendIcebreaker = (promptText) => {
        setSelectedIcebreaker(promptText);
        setSentMessages(prev => [
            ...prev,
            { sender: 'me', text: promptText, time: 'Just now' }
        ]);

        // Auto simulated reply from student after 650ms
        setTimeout(() => {
            setSentMessages(prev => [
                ...prev,
                { sender: 'them', text: activeStudent.mockReply || "Hey! Great to connect with you on campus 😊", time: 'Just now' }
            ]);
        }, 650);
    };

    const handleReactConfession = (confessionId, emoji) => {
        const key = `${confessionId}_${emoji}`;
        setConfessionReactions(prev => ({
            ...prev,
            [key]: (prev[key] || 0) + 1
        }));
    };

    return (
        <div className="guest-preview-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Campus Guest Tour">
            <div className="guest-preview-modal" onClick={e => e.stopPropagation()}>
                {/* ── Top Bar ── */}
                <div className="guest-preview-header">
                    <div className="guest-preview-badge-row">
                        <span className="guest-preview-badge">✨ Campus Tour Demo</span>
                    </div>
                    <button type="button" className="guest-preview-close" onClick={onClose} aria-label="Close demo">
                        ✕
                    </button>
                </div>

                {/* ── 3 Pillar Tour Segment Tabs ── */}
                <div className="guest-tour-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'match'}
                        className={`guest-tab-btn ${activeTab === 'match' ? 'active' : ''}`}
                        onClick={() => setActiveTab('match')}
                    >
                        <span>🃏 Swipe Profiles</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'confessions'}
                        className={`guest-tab-btn ${activeTab === 'confessions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('confessions')}
                    >
                        <span>🤫 Campus Secrets</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'chat'}
                        className={`guest-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <span>💬 1-Tap Icebreakers</span>
                    </button>
                </div>

                {/* ── Tab 1: Swipe Profiles ── */}
                {activeTab === 'match' && (
                    <div className="guest-tab-content guest-tab-match">
                        {/* Campus Filter Pills */}
                        <div className="guest-preview-campuses">
                            {CAMPUS_FILTERS.map(campus => (
                                <button
                                    key={campus}
                                    type="button"
                                    className={`guest-campus-pill ${selectedCampus === campus ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCampus(campus);
                                        setCurrentIndex(0);
                                        setDemoMatch(null);
                                        setSelectedIcebreaker('');
                                    }}
                                >
                                    {campus}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Body */}
                        <div className="guest-preview-body">
                            {/* Match Celebration Overlay */}
                            {demoMatch && (
                                <div className="guest-match-banner">
                                    <div className="match-burst-emoji">🎉</div>
                                    <h4 className="guest-match-title">It's a Demo Match with {demoMatch.name.split(',')[0]}!</h4>
                                    <p className="guest-match-sub">
                                        You both liked each other! In the live app, you're instantly connected to chat with voice notes and common ground tags.
                                    </p>
                                    <div className="guest-match-actions">
                                        <button
                                            type="button"
                                            className="btn-guest-action primary"
                                            onClick={() => {
                                                setActiveTab('chat');
                                                setDemoMatch(null);
                                            }}
                                        >
                                            💬 Test 1-Tap Icebreakers →
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-guest-action secondary"
                                            onClick={handleNext}
                                        >
                                            Next Student →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Hero Student Discovery Card */}
                            <div className="guest-student-card">
                                <div className="guest-card-image-wrap">
                                    <img
                                        src={activeStudent.image}
                                        alt={activeStudent.name}
                                        className="guest-card-image"
                                    />
                                    <div className="guest-card-gradient" />
                                    
                                    <div className="guest-card-badge">
                                        <span>✓</span>
                                        <span>Verified Student</span>
                                    </div>
                                    <div className="guest-card-campus-badge">
                                        🏛️ {activeStudent.shortSchool}
                                    </div>

                                    {/* Text Content Overlay directly over image */}
                                    <div className="guest-card-overlay-content">
                                        <div className="guest-card-header">
                                            <div className="guest-card-name">
                                                {activeStudent.name}
                                                <span className="verified-icon" title="Photo Verified">✓</span>
                                            </div>
                                        </div>

                                        <div className="guest-card-dept">
                                            📚 {activeStudent.dept} • 📍 {activeStudent.vibe}
                                        </div>

                                        <p className="guest-card-bio">
                                            "{activeStudent.bio}"
                                        </p>

                                        <div className="guest-card-tags">
                                            {activeStudent.interests.map((tag, idx) => (
                                                <span key={idx} className="guest-card-tag">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Circular Action Button Rail */}
                            <div className="guest-action-rail">
                                <button
                                    type="button"
                                    className="guest-action-btn btn-pass"
                                    onClick={handleNext}
                                    title="Pass"
                                    aria-label="Pass"
                                >
                                    ✕
                                </button>
                                <button
                                    type="button"
                                    className="guest-action-btn btn-super"
                                    onClick={handleLike}
                                    title="Super Swipe"
                                    aria-label="Super Swipe"
                                >
                                    ⭐
                                </button>
                                <button
                                    type="button"
                                    className="guest-action-btn btn-like"
                                    onClick={handleLike}
                                    title="Like"
                                    aria-label="Like"
                                >
                                    ❤️
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab 2: Campus Secrets (Confessions) ── */}
                {activeTab === 'confessions' && (
                    <div className="guest-tab-content guest-tab-confessions">
                        <div className="confessions-demo-header">
                            <span className="confessions-demo-pill">🔒 100% Anonymous & Ephemeral</span>
                            <p className="confessions-demo-desc">
                                Read honest, unfiltered campus gist and confessions from your school.
                            </p>
                        </div>

                        <div className="guest-confessions-feed">
                            {SAMPLE_CONFESSIONS.map((confession) => (
                                <div key={confession.id} className="guest-confession-card">
                                    <div className="confession-top-meta">
                                        <span className="confession-campus-tag">🏛️ {confession.campus}</span>
                                        <span className="confession-time-tag">{confession.time}</span>
                                    </div>
                                    <p className="confession-text">"{confession.text}"</p>
                                    <div className="confession-reactions-strip">
                                        {Object.entries(confession.reactions).map(([emoji, baseCount]) => {
                                            const key = `${confession.id}_${emoji}`;
                                            const total = baseCount + (confessionReactions[key] || 0);
                                            const isReacted = Boolean(confessionReactions[key]);
                                            return (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    className={`guest-reaction-chip ${isReacted ? 'reacted' : ''}`}
                                                    onClick={() => handleReactConfession(confession.id, emoji)}
                                                >
                                                    <span>{emoji}</span>
                                                    <span>{total}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tab 3: 1-Tap Icebreakers & Chat ── */}
                {activeTab === 'chat' && (
                    <div className="guest-tab-content guest-tab-chat">
                        <div className="guest-chat-room">
                            {/* Opponent Profile Bar */}
                            <div className="guest-chat-user-bar">
                                <img src={activeStudent.image} alt={activeStudent.name} className="guest-chat-avatar" />
                                <div className="guest-chat-user-meta">
                                    <div className="guest-chat-name">
                                        {activeStudent.name} <span className="verified-icon">✓</span>
                                    </div>
                                    <div className="guest-chat-school">
                                        {activeStudent.shortSchool} • {activeStudent.dept}
                                    </div>
                                </div>
                            </div>

                            {/* Common Ground Header */}
                            <div className="guest-common-ground-strip">
                                <span className="common-ground-badge">🏛️ Both at {activeStudent.school}</span>
                                <span className="common-ground-badge">✨ Shared Vibes: {activeStudent.interests[0]}</span>
                            </div>

                            {/* Message Bubble Thread */}
                            <div className="guest-chat-messages">
                                <div className="chat-bubble received">
                                    <p>Hey! Saw your profile on the campus feed. How are lectures treating you this semester? 😊</p>
                                    <span className="bubble-time">10:42 AM</span>
                                </div>

                                {sentMessages.map((msg, idx) => (
                                    <div key={idx} className={`chat-bubble ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                                        <p>{msg.text}</p>
                                        <span className="bubble-time">{msg.time}</span>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* 1-Tap Icebreaker Suggestion Strip */}
                            <div className="guest-icebreaker-demo">
                                <span className="guest-icebreaker-label">⚡ 1-Tap Campus Icebreakers (Tap to send):</span>
                                <div className="guest-icebreaker-chips-wrap">
                                    {activeStudent.icebreakers.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={`guest-icebreaker-chip ${selectedIcebreaker === prompt ? 'selected' : ''}`}
                                            onClick={() => handleSendIcebreaker(prompt)}
                                        >
                                            <span className="chip-prompt-text">{prompt}</span>
                                            <span className="chip-prompt-action">🚀</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Persistent Footer Conversion Bar ── */}
                <div className="guest-preview-footer">
                    <Link to="/signup" className="btn-guest-signup" onClick={onClose}>
                        <span>Join Your Campus on College Date</span>
                        <span>→</span>
                    </Link>
                    <div className="guest-preview-login-row">
                        <span>Already registered?</span>
                        <Link to="/login" className="guest-login-link" onClick={onClose}>
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
