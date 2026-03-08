import { useState, useEffect, useCallback } from 'react';
import { getLeaderboards } from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Leaderboard.css';

// ── League Classification ─────────────────────────────────────
function getLeague(rank) {
    if (rank <= 3) return { label: 'Campus Royalty', icon: '👑', cls: 'league-crown' };
    if (rank <= 10) return { label: 'Gold', icon: '🥇', cls: 'league-gold' };
    if (rank <= 50) return { label: 'Silver', icon: '🥈', cls: 'league-silver' };
    return { label: 'Bronze', icon: '🥉', cls: 'league-bronze' };
}

// ── Weekly Reset Countdown ────────────────────────────────────
function useWeeklyCountdown() {
    const getNext = () => {
        const now = new Date();
        const next = new Date(now);
        next.setDate(now.getDate() + (8 - now.getDay()) % 7 || 7); // next Monday
        next.setHours(0, 0, 0, 0);
        return next;
    };

    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const tick = () => {
            const diff = getNext() - Date.now();
            if (diff <= 0) { setTimeLeft('Resetting now...'); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return timeLeft;
}

// ── Avatar with Crown Glow for Top 3 ─────────────────────────
const UserAvatar = ({ user, size = 'md', rank = 0 }) => {
    const navigate = useNavigate();
    const src = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`;
    const frameClass = rank === 1 ? 'frame-1' : rank === 2 ? 'frame-2' : rank === 3 ? 'frame-3' : 'frame-default';
    const sizeStyle = size === 'lg'
        ? { width: '100px', height: '100px' }
        : size === 'sm'
            ? { width: '48px', height: '48px' }
            : { width: '80px', height: '80px' };

    return (
        <div
            className={`avatar-wrapper-lb ${rank >= 1 && rank <= 3 ? 'crown-glow' : ''}`}
            onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}
            style={{ cursor: 'pointer', position: 'relative' }}
        >
            {rank >= 1 && rank <= 3 && (
                <span className="crown-icon">👑</span>
            )}
            <div className={`avatar-frame ${frameClass}`}>
                <div className="avatar-inner">
                    <img src={src} className="rounded-full object-cover" style={sizeStyle} alt={user.full_name} />
                </div>
            </div>
            {rank > 0 && rank <= 3 && (
                <div className={`rank-badge rank-badge-${rank}`}>{rank}</div>
            )}
        </div>
    );
};

import { useLeaderboards } from '../hooks/useSWRData';

export default function Leaderboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const countdown = useWeeklyCountdown();
    const [activeTab, setActiveTab] = useState('wanted');

    // Use SWR for Hall of Fame data via custom hook
    const { data: lbData, error, isLoading } = useLeaderboards();

    const data = lbData || { mostWanted: [], bigSpenders: [] };

    const displayList = activeTab === 'wanted' ? data.mostWanted : data.bigSpenders;
    const topThree = displayList.slice(0, 3);
    const runnersUp = displayList.slice(3);

    if (isLoading && !lbData) return <LoadingSpinner fullScreen text="Ranking University Elite..." />;

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-ambient">
                <div className="leaderboard-blob-1" />
                <div className="leaderboard-blob-2" />
            </div>

            <div className="leaderboard-container">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="leaderboard-header">
                    <div className="elite-badge"><span>🏆 Premium Elite</span></div>
                    <h1 className="leaderboard-title">Hall of Fame</h1>

                    {/* Weekly Reset Countdown */}
                    <div className="weekly-countdown">
                        <span className="countdown-label">⏱ Leaderboard resets in</span>
                        <span className="countdown-value">{countdown}</span>
                    </div>
                </motion.div>

                {/* League Key */}
                <div className="league-key">
                    <span className="league-key-item league-crown">👑 Top 3 — Royalty</span>
                    <span className="league-key-item league-gold">🥇 4–10 — Gold</span>
                    <span className="league-key-item league-silver">🥈 11–50 — Silver</span>
                    <span className="league-key-item league-bronze">🥉 51+ — Bronze</span>
                </div>

                <div className="tab-toggle-container">
                    <div className="tab-toggle-track">
                        <div className="tab-toggle-slider" style={{ transform: `translateX(${activeTab === 'wanted' ? '0' : '100%'})` }} />
                        <button onClick={() => setActiveTab('wanted')} className={`toggle-btn ${activeTab === 'wanted' ? 'active' : ''}`}>Most Wanted 🔥</button>
                        <button onClick={() => setActiveTab('spenders')} className={`toggle-btn ${activeTab === 'spenders' ? 'active' : ''}`}>Spenders 💸</button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                        {/* Podium */}
                        <div className="podium-container">
                            {topThree[1] && (
                                <motion.div className="podium-item podium-2nd" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.5, delay: 0.1 }}>
                                    <div style={{ marginBottom: '1.5rem' }}><UserAvatar user={topThree[1]} size="md" rank={2} /></div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[1].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">{activeTab === 'wanted' ? topThree[1].premium_swipes_received : `₦${((topThree[1].total_spent || 0) / 1000).toFixed(1)}k`}</p>
                                    </div>
                                </motion.div>
                            )}

                            {topThree[0] && (
                                <motion.div className="podium-item podium-1st" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.6 }}>
                                    <div style={{ marginBottom: '2rem' }}><UserAvatar user={topThree[0]} size="lg" rank={1} /></div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[0].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">{activeTab === 'wanted' ? topThree[0].premium_swipes_received : `₦${((topThree[0].total_spent || 0) / 1000).toFixed(1)}k`}</p>
                                    </div>
                                </motion.div>
                            )}

                            {topThree[2] && (
                                <motion.div className="podium-item podium-3rd" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.5, delay: 0.2 }}>
                                    <div style={{ marginBottom: '1.5rem' }}><UserAvatar user={topThree[2]} size="md" rank={3} /></div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[2].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">{activeTab === 'wanted' ? topThree[2].premium_swipes_received : `₦${((topThree[2].total_spent || 0) / 1000).toFixed(1)}k`}</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="list-section-header"><span>Rising Stars</span></div>

                        <div className="leaderboard-list">
                            {runnersUp.map((user, index) => {
                                const rank = index + 4;
                                const league = getLeague(rank);
                                const isMe = user.id === currentUser?.id || user.profile_id === currentUser?.id;
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.04 }}
                                        key={user.id}
                                        className={`leaderboard-row ${isMe ? 'my-row' : ''}`}
                                        onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}
                                    >
                                        <div className="bg-rank">{rank.toString().padStart(2, '0')}</div>
                                        <div className="rank-number">{rank.toString().padStart(2, '0')}</div>
                                        <UserAvatar user={user} size="sm" />
                                        <div className="row-user-info">
                                            <p className="row-name">
                                                {user.full_name}
                                                {isMe && <span className="me-label"> (You)</span>}
                                            </p>
                                            <div className="row-meta">
                                                <div className="row-dot" />
                                                <span className="row-subtext">{user.university || 'CD Elite'}</span>
                                            </div>
                                        </div>
                                        {/* League Badge */}
                                        <span className={`league-badge ${league.cls}`} title={league.label}>
                                            {league.icon}
                                        </span>
                                        <div className="row-score-container">
                                            <div className="row-score">{activeTab === 'wanted' ? user.premium_swipes_received : `₦${((user.total_spent || 0) / 1000).toFixed(1)}k`}</div>
                                            <div className="row-score-label">{activeTab === 'wanted' ? 'Fans' : 'Spent'}</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
