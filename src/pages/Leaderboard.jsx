import { useState, useEffect, useCallback } from 'react';
import { 
    getLeaderboards, 
    fetchCampusClashWeeklyStatus, 
    getSundayMidnightCountdown 
} from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from '../utils/profileData';
import { useLeaderboards } from '../hooks/useSWRData';
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
        next.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7)); // next Monday
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
    const src = getAvatarUrl(user) || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`;
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

// ── Weekly Countdown Widget ──────────────────────────────────
function WeeklyCountdownWidget() {
    const countdown = useWeeklyCountdown();
    return (
        <div className="weekly-countdown">
            <span className="countdown-label">⏱ Leaderboard resets in</span>
            <span className="countdown-value">{countdown}</span>
        </div>
    );
}

export default function Leaderboard() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('wanted');
    const [clashStatus, setClashStatus] = useState(null);
    const [sundayCountdown, setSundayCountdown] = useState(() => getSundayMidnightCountdown());

    useEffect(() => {
        let isMounted = true;
        fetchCampusClashWeeklyStatus(userProfile?.university).then(({ data }) => {
            if (isMounted && data) setClashStatus(data);
        });
        const timer = setInterval(() => {
            setSundayCountdown(getSundayMidnightCountdown());
        }, 60000);
        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [userProfile?.university]);

    // Use SWR for Hall of Fame data via custom hook
    const { data: lbData, error, isLoading } = useLeaderboards();

    const data = lbData || { mostWanted: [], bigSpenders: [], campuses: [] };
    const displayList = activeTab === 'wanted' ? data.mostWanted : data.bigSpenders;
    const campusList = data.campuses || [];

    const myIndex = displayList.findIndex(user => user.id === currentUser?.id || user.profile_id === currentUser?.id);
    const myRank = myIndex !== -1 ? myIndex + 1 : null;
    const myUserData = myIndex !== -1 ? displayList[myIndex] : null;

    // Detect user's campus standing for Clash of Campuses
    const myUniversity = String(userProfile?.university || currentUser?.university || '').toLowerCase();
    const myCampusStanding = campusList.find(c =>
        myUniversity && (
            c.name.toLowerCase().includes(myUniversity) ||
            c.shortName.toLowerCase().includes(myUniversity) ||
            myUniversity.includes(c.shortName.toLowerCase()) ||
            myUniversity.includes(c.id)
        )
    );

    // Only show loading spinner on initial load when there is NO data
    if (isLoading && !lbData) return <LoadingSpinner fullScreen text="Ranking University Elite..." />;

    const topThree = displayList.slice(0, 3);
    const runnersUp = displayList.slice(3);

    const topThreeCampuses = campusList.slice(0, 3);
    const runnersUpCampuses = campusList.slice(3);

    const sliderOffset = activeTab === 'wanted' ? '0%' : activeTab === 'spenders' ? '100%' : '200%';

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-ambient">
                <div className="leaderboard-blob-1" />
                <div className="leaderboard-blob-2" />
            </div>

            <div className="leaderboard-container">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="leaderboard-header">
                    <div className="elite-badge"><span>🏆 Campus Hall of Fame</span></div>
                    <h1 className="leaderboard-title">Leaderboard</h1>

                    {/* Weekly Reset Countdown */}
                    <WeeklyCountdownWidget />
                </motion.div>

                {/* League Key */}
                <div className="league-key">
                    <span className="league-key-item league-crown">👑 Top 3 — Royalty</span>
                    <span className="league-key-item league-gold">🥇 4–10 — Gold</span>
                    <span className="league-key-item league-silver">🥈 11–50 — Silver</span>
                    <span className="league-key-item league-bronze">🥉 51+ — Bronze</span>
                </div>

                <div className="tab-toggle-container">
                    <div className="tab-toggle-track three-tabs">
                        <div className="tab-toggle-slider three-tabs-slider" style={{ transform: `translateX(${sliderOffset})` }} />
                        <button onClick={() => setActiveTab('wanted')} className={`toggle-btn ${activeTab === 'wanted' ? 'active' : ''}`}>Most Wanted 🔥</button>
                        <button onClick={() => setActiveTab('spenders')} className={`toggle-btn ${activeTab === 'spenders' ? 'active' : ''}`}>Spenders 💸</button>
                        <button onClick={() => setActiveTab('campuses')} className={`toggle-btn ${activeTab === 'campuses' ? 'active' : ''}`}>Campuses 🏛️</button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'campuses' ? (
                        <motion.div key="campuses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                            {/* Weekly Clash of Campuses Announcement Banner */}
                            <div className="campus-clash-banner">
                                <div className="clash-banner-badge-row">
                                    <span className="clash-banner-badge">⚔️ Inter-University League</span>
                                    <span className="clash-countdown-pill">⏱️ Sunday Reset: {sundayCountdown.formatted}</span>
                                </div>
                                <div className="clash-banner-title">Clash of Campuses</div>
                                <p className="clash-banner-desc">
                                    The <strong>#1 University</strong> at Sunday midnight wins a <strong>Free Sunday Spotlight Boost</strong> for all registered students! Keep swiping and chatting to represent your campus.
                                </p>
                                {clashStatus?.is_boost_active && (
                                    <div className="clash-champion-active-pill">
                                        🚀 <strong>Active Champion ({clashStatus.winning_university}):</strong> 24h Spotlight Boost is live across feeds!
                                    </div>
                                )}
                                {clashStatus?.user_has_boost && (
                                    <div className="clash-user-boost-pill animate-pulse">
                                        👑 <strong>Your Campus Won!</strong> Your profile is boosted to the top of discovery feeds today.
                                    </div>
                                )}
                            </div>

                            {/* User's Campus Standing Highlight */}
                            {myCampusStanding && (
                                <div className="my-standing-highlight-card my-campus-card">
                                    <div className="my-standing-glow" />
                                    <div className="my-standing-rank">#{myCampusStanding.rank}</div>
                                    <div className="my-standing-avatar campus-avatar-box">
                                        <span className="campus-emblem-emoji">{myCampusStanding.icon}</span>
                                    </div>
                                    <div className="my-standing-info">
                                        <span className="my-standing-label">Your Campus Standing</span>
                                        <span className="my-standing-name">{myCampusStanding.name} ({myCampusStanding.shortName})</span>
                                        <span className="my-standing-league">🏛️ {myCampusStanding.studentsCount} Students • {myCampusStanding.activeMatches} Matches</span>
                                    </div>
                                    <div className="my-standing-score">
                                        <span className="my-score-val">{myCampusStanding.score.toLocaleString()}</span>
                                        <span className="my-score-lbl">Points</span>
                                    </div>
                                </div>
                            )}

                            {/* Campus Podium (Top 3) */}
                            <div className="podium-container campus-podium-container">
                                {topThreeCampuses[1] && (
                                    <motion.div className="podium-item podium-2nd" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.5, delay: 0.1 }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div className="campus-podium-crest-badge">
                                                <span className="crest-icon">{topThreeCampuses[1].icon}</span>
                                                <div className="rank-badge rank-badge-2">2</div>
                                            </div>
                                        </div>
                                        <div className="podium-base">
                                            <p className="podium-name">{topThreeCampuses[1].shortName}</p>
                                            <p className="podium-score">{topThreeCampuses[1].score.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}

                                {topThreeCampuses[0] && (
                                    <motion.div className="podium-item podium-1st" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.6 }}>
                                        <div style={{ marginBottom: '2rem' }}>
                                            <div className="campus-podium-crest-badge crown-glow rank-1">
                                                <span className="crown-icon">👑</span>
                                                <span className="crest-icon">{topThreeCampuses[0].icon}</span>
                                                <div className="rank-badge rank-badge-1">1</div>
                                            </div>
                                        </div>
                                        <div className="podium-base">
                                            <p className="podium-name">{topThreeCampuses[0].shortName}</p>
                                            <p className="podium-score">{topThreeCampuses[0].score.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}

                                {topThreeCampuses[2] && (
                                    <motion.div className="podium-item podium-3rd" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ duration: 0.5, delay: 0.2 }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div className="campus-podium-crest-badge">
                                                <span className="crest-icon">{topThreeCampuses[2].icon}</span>
                                                <div className="rank-badge rank-badge-3">3</div>
                                            </div>
                                        </div>
                                        <div className="podium-base">
                                            <p className="podium-name">{topThreeCampuses[2].shortName}</p>
                                            <p className="podium-score">{topThreeCampuses[2].score.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="list-section-header"><span>Campus Contenders</span></div>

                            <div className="leaderboard-list">
                                {runnersUpCampuses.map((campus, index) => {
                                    const rank = index + 4;
                                    const league = getLeague(rank);
                                    const isMyCampus = myCampusStanding?.id === campus.id;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.04 }}
                                            key={campus.id}
                                            className={`leaderboard-row ${isMyCampus ? 'my-row' : ''}`}
                                        >
                                            <div className="bg-rank">{rank.toString().padStart(2, '0')}</div>
                                            <div className="rank-number">{rank.toString().padStart(2, '0')}</div>
                                            <div className="campus-row-avatar">
                                                <span className="campus-row-icon">{campus.icon}</span>
                                            </div>
                                            <div className="row-user-info">
                                                <p className="row-name">
                                                    {campus.name}
                                                    {isMyCampus && <span className="me-label"> (Your Campus)</span>}
                                                </p>
                                                <div className="row-meta">
                                                    <div className="row-dot" />
                                                    <span className="row-subtext">{campus.studentsCount} Students • {campus.activeMatches} Matches</span>
                                                </div>
                                            </div>
                                            <span className={`league-badge ${league.cls}`} title={league.label}>
                                                {league.icon}
                                            </span>
                                            <div className="row-score-container">
                                                <div className="row-score">{campus.score.toLocaleString()}</div>
                                                <div className="row-score-label">Points</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                            {/* Highlight Card for Current User Standing */}
                            {myUserData && myRank && (
                                <div className="my-standing-highlight-card" onClick={() => navigate(`/profile/${myUserData.profile_id || myUserData.id}`)}>
                                    <div className="my-standing-glow" />
                                    <div className="my-standing-rank">#{myRank}</div>
                                    <div className="my-standing-avatar">
                                        <img src={getAvatarUrl(myUserData) || myUserData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(myUserData.full_name)}&background=random`} alt="" />
                                    </div>
                                    <div className="my-standing-info">
                                        <span className="my-standing-label">Your Current Standing</span>
                                        <span className="my-standing-name">{myUserData.full_name}</span>
                                        <span className="my-standing-league">{getLeague(myRank).icon} {getLeague(myRank).label} League</span>
                                    </div>
                                    <div className="my-standing-score">
                                        <span className="my-score-val">{activeTab === 'wanted' ? myUserData.premium_swipes_received : `₦${((myUserData.total_spent || 0) / 1000).toFixed(1)}k`}</span>
                                        <span className="my-score-lbl">{activeTab === 'wanted' ? 'Fans' : 'Spent'}</span>
                                    </div>
                                </div>
                            )}

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
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
