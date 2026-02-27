import { useState, useEffect } from 'react';
import { getLeaderboards } from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Leaderboard.css';

const UserAvatar = ({ user, size = "md", rank = 0 }) => {
    const navigate = useNavigate();
    const getAvatar = (u) => u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random`;

    const frameClass = rank === 1 ? 'frame-1' : rank === 2 ? 'frame-2' : rank === 3 ? 'frame-3' : 'frame-default';
    const sizeStyle = size === 'lg' ? { width: '100px', height: '100px' } : size === 'sm' ? { width: '48px', height: '48px' } : { width: '80px', height: '80px' };

    return (
        <div className="relative group cursor-pointer" onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}>
            <div className={`avatar-frame ${frameClass}`}>
                <div className="avatar-inner">
                    <img
                        src={getAvatar(user)}
                        className="rounded-full object-cover"
                        style={sizeStyle}
                        alt={user.full_name}
                    />
                </div>
            </div>

            {rank > 0 && rank <= 3 && (
                <div className={`
                    absolute left-1/2 -translate-x-1/2 z-20 shadow-xl border-2 border-[#060608]
                    ${rank === 1 ? '-bottom-4 bg-gradient-to-r from-yellow-300 to-yellow-600 text-black px-4 py-0.5 text-[13px] font-black' :
                        rank === 2 ? '-bottom-3 bg-gradient-to-r from-slate-200 to-slate-400 text-black w-8 h-8 flex items-center justify-center text-[12px] font-black' :
                            '-bottom-3 bg-gradient-to-r from-[#fcb677] to-[#b87333] text-black w-8 h-8 flex items-center justify-center text-[12px] font-black'}
                    rounded-full
                `}>
                    {rank}
                </div>
            )}
        </div>
    );
};

export default function Leaderboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('wanted');
    const [data, setData] = useState({ mostWanted: [], bigSpenders: [] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { mostWanted, bigSpenders } = await getLeaderboards();
            setData({ mostWanted: mostWanted || [], bigSpenders: bigSpenders || [] });
        } catch (error) {
            console.error("Leaderboard load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const displayList = activeTab === 'wanted' ? data.mostWanted : data.bigSpenders;
    const topThree = displayList.slice(0, 3);
    const runnersUp = displayList.slice(3);

    if (loading) return <LoadingSpinner fullScreen text="Ranking University Elite..." />;

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-ambient">
                <div className="leaderboard-blob-1" />
                <div className="leaderboard-blob-2" />
            </div>

            <div className="leaderboard-container">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="leaderboard-header"
                >
                    <div className="elite-badge">
                        <span>🏆 Premium Elite</span>
                    </div>
                    <h1 className="leaderboard-title">Hall of Fame</h1>
                </motion.div>

                <div className="tab-toggle-container">
                    <div className="tab-toggle-track">
                        <div
                            className="tab-toggle-slider"
                            style={{ transform: `translateX(${activeTab === 'wanted' ? '0' : '100%'})` }}
                        />
                        <button
                            onClick={() => setActiveTab('wanted')}
                            className={`toggle-btn ${activeTab === 'wanted' ? 'active' : ''}`}
                        >
                            Most Wanted 🔥
                        </button>
                        <button
                            onClick={() => setActiveTab('spenders')}
                            className={`toggle-btn ${activeTab === 'spenders' ? 'active' : ''}`}
                        >
                            Spenders 💸
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="podium-container">
                            {/* 2nd Place */}
                            {topThree[1] && (
                                <motion.div
                                    className="podium-item podium-2nd"
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <UserAvatar user={topThree[1]} size="md" rank={2} />
                                    </div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[1].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">
                                            {activeTab === 'wanted' ? topThree[1].premium_swipes_received : `₦${((topThree[1].total_spent || 0) / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* 1st Place */}
                            {topThree[0] && (
                                <motion.div
                                    className="podium-item podium-1st"
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div style={{ marginBottom: '2rem' }}>
                                        <UserAvatar user={topThree[0]} size="lg" rank={1} />
                                    </div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[0].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">
                                            {activeTab === 'wanted' ? topThree[0].premium_swipes_received : `₦${((topThree[0].total_spent || 0) / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* 3rd Place */}
                            {topThree[2] && (
                                <motion.div
                                    className="podium-item podium-3rd"
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <UserAvatar user={topThree[2]} size="md" rank={3} />
                                    </div>
                                    <div className="podium-base">
                                        <p className="podium-name">{topThree[2].full_name?.split(' ')[0]}</p>
                                        <p className="podium-score">
                                            {activeTab === 'wanted' ? topThree[2].premium_swipes_received : `₦${((topThree[2].total_spent || 0) / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="list-section-header">
                            <span>Rising Stars</span>
                        </div>

                        <div className="leaderboard-list">
                            {runnersUp.map((user, index) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={user.id}
                                    className="leaderboard-row"
                                    onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}
                                >
                                    <div className="bg-rank">
                                        {(index + 4).toString().padStart(2, '0')}
                                    </div>

                                    <div className="rank-number">
                                        {(index + 4).toString().padStart(2, '0')}
                                    </div>

                                    <UserAvatar user={user} size="sm" />

                                    <div className="row-user-info">
                                        <p className="row-name">{user.full_name}</p>
                                        <div className="row-meta">
                                            <div className="row-dot" />
                                            <span className="row-subtext">{user.university || 'CD Elite'}</span>
                                        </div>
                                    </div>

                                    <div className="row-score-container">
                                        <div className="row-score">
                                            {activeTab === 'wanted' ? user.premium_swipes_received : `₦${((user.total_spent || 0) / 1000).toFixed(1)}k`}
                                        </div>
                                        <div className="row-score-label">
                                            {activeTab === 'wanted' ? 'Fans' : 'Spent'}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
