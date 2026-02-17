import { useState, useEffect } from 'react';
import { getLeaderboards } from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const UserAvatar = ({ user, size = "md", rank = 0, activeTab }) => {
    const navigate = useNavigate();
    const getAvatar = (u) => u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random`;

    // Uniform size for Top 3 (Hall of Fame) to be exactly the same
    const sizes = {
        sm: "w-12 h-12 rounded-xl", // List view
        md: "w-24 h-24 rounded-full", // Not used for top 3 anymore
        lg: "w-20 h-20 sm:w-28 sm:h-28 rounded-full"  // Responsive: 80px mobile, 112px desktop
    };

    const frameStyles = {
        1: "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-800 ring-4 ring-yellow-500/20",
        2: "border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.4)] bg-gradient-to-br from-white via-slate-400 to-slate-700 ring-4 ring-slate-400/20",
        3: "border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.4)] bg-gradient-to-br from-amber-400 via-amber-700 to-amber-950 ring-4 ring-amber-700/20",
        default: "border-white/10 bg-white/5"
    };

    const currentFrame = frameStyles[rank] || frameStyles.default;
    const isTop3 = rank >= 1 && rank <= 3;

    return (
        <div className="relative group cursor-pointer" onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}>
            {/* Outer Frame Wrapper */}
            <div className={`
                ${isTop3 ? 'p-1.5' : 'p-1'} 
                ${size === 'sm' ? 'rounded-2xl' : 'rounded-full'} 
                ${currentFrame} 
                transition-transform duration-500 group-hover:scale-105
            `}>
                <div className={`bg-[#0a0a0c] p-0.5 ${size === 'sm' ? 'rounded-[13px]' : 'rounded-full'} overflow-hidden`}>
                    <img
                        src={getAvatar(user)}
                        className={`
                            ${sizes[size]} 
                            object-cover 
                            ${size === 'sm' ? 'grayscale group-hover:grayscale-0' : ''} 
                            transition-all duration-500
                        `}
                        alt={user.full_name}
                    />
                </div>
            </div>

            {rank > 0 && (
                <div className={`
                    absolute left-1/2 -translate-x-1/2 z-20 shadow-lg border-2 border-[#0a0a0c]
                    ${rank === 1 ? '-bottom-4 bg-yellow-500 text-black px-3 py-0.5 text-xs font-black' :
                        rank === 2 ? '-bottom-3 bg-slate-300 text-black w-7 h-7 flex items-center justify-center text-[10px] font-black' :
                            rank === 3 ? '-bottom-3 bg-amber-700 text-white w-7 h-7 flex items-center justify-center text-[10px] font-black' :
                                'hidden'} // Hide rank badge for list items
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
    const [activeTab, setActiveTab] = useState('wanted'); // 'wanted' or 'spenders'
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
        <div className="min-h-screen bg-[#0a0a0c] pb-28 text-white selection:bg-rose-500/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative px-4 pt-8 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">The Hall of Fame</span>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent italic leading-tight uppercase">
                        CD Elite
                    </h1>
                </motion.div>

                <div className="flex justify-center mb-12">
                    <div className="relative bg-[#1a1a1e] p-1 rounded-2xl border border-white/5 flex w-full max-w-[320px] shadow-2xl">
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activeTab === 'wanted' ? 'left-1' : 'left-[calc(50%+2px)]'} shadow-lg shadow-rose-500/20`}
                        />
                        <button
                            onClick={() => setActiveTab('wanted')}
                            className={`relative flex-1 py-3 text-xs font-black uppercase tracking-widest z-10 transition-colors duration-300 ${activeTab === 'wanted' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Most Wanted 💃
                        </button>
                        <button
                            onClick={() => setActiveTab('spenders')}
                            className={`relative flex-1 py-3 text-xs font-black uppercase tracking-widest z-10 transition-colors duration-300 ${activeTab === 'spenders' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Spenders 💸
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <div className="relative flex justify-center items-end h-[320px] mb-12 px-2">
                            {/* 2nd Place */}
                            {topThree[1] && (
                                <div className="flex flex-col items-center w-1/3 group">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-[-15px] bg-gray-400/5 blur-3xl rounded-full" />
                                        <UserAvatar user={topThree[1]} size="lg" rank={2} activeTab={activeTab} />
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-gray-800/10 to-gray-400/20 backdrop-blur-sm border-t border-gray-400/30 h-28 rounded-t-2xl flex flex-col items-center justify-center p-2">
                                        <p className="text-[10px] font-bold text-gray-300 truncate w-full text-center uppercase tracking-tight">{topThree[1].full_name.split(' ')[0]}</p>
                                        <p className="text-sm font-black text-white mt-1">
                                            {activeTab === 'wanted' ? topThree[1].premium_swipes_received : `₦${(topThree[1].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 1st Place */}
                            {topThree[0] && (
                                <div className="flex flex-col items-center w-1/3 z-10 group">
                                    <div className="relative mb-8">
                                        <motion.div
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ repeat: Infinity, duration: 4 }}
                                            className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl drop-shadow-lg z-30"
                                        >
                                            👑
                                        </motion.div>
                                        <div className="absolute inset-[-20px] bg-yellow-500/10 blur-3xl opacity-50 rounded-full" />
                                        <UserAvatar user={topThree[0]} size="lg" rank={1} activeTab={activeTab} />
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-yellow-500/10 to-yellow-500/30 backdrop-blur-md border-t border-yellow-500/50 h-36 rounded-t-3xl flex flex-col items-center justify-center p-2 shadow-2xl">
                                        <p className="text-xs font-black text-yellow-100 truncate w-full text-center uppercase tracking-wider">{topThree[0].full_name.split(' ')[0]}</p>
                                        <p className="text-xl font-black text-white mt-1 drop-shadow-sm">
                                            {activeTab === 'wanted' ? topThree[0].premium_swipes_received : `₦${(topThree[0].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 3rd Place */}
                            {topThree[2] && (
                                <div className="flex flex-col items-center w-1/3 group">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-[-15px] bg-amber-700/5 blur-3xl rounded-full" />
                                        <UserAvatar user={topThree[2]} size="lg" rank={3} activeTab={activeTab} />
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-amber-700/10 to-amber-700/20 backdrop-blur-sm border-t border-amber-700/30 h-24 rounded-t-2xl flex flex-col items-center justify-center p-2">
                                        <p className="text-[10px] font-bold text-gray-300 truncate w-full text-center uppercase tracking-tight">{topThree[2].full_name.split(' ')[0]}</p>
                                        <p className="text-sm font-black text-white mt-1">
                                            {activeTab === 'wanted' ? topThree[2].premium_swipes_received : `₦${(topThree[2].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-4 ml-2">Rising Stars</h3>
                            {runnersUp.map((user, index) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={user.id}
                                    className="group relative bg-[#16161a] hover:bg-[#1e1e24] p-3 flex items-center rounded-2xl border border-white/5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                                    onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}
                                >
                                    <div className="w-10 text-xs font-black text-gray-600 group-hover:text-rose-500 transition-colors">
                                        {(index + 4).toString().padStart(2, '0')}
                                    </div>

                                    <UserAvatar user={user} size="sm" activeTab={activeTab} />

                                    <div className="flex-1 ml-4 min-w-0">
                                        <p className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate uppercase tracking-tight">{user.full_name}</p>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">{user.university || 'CD Elite'}</p>
                                    </div>
                                    <div className="text-right pl-4">
                                        <div className="text-sm font-black text-white group-hover:text-rose-500 transition-colors">
                                            {activeTab === 'wanted' ? user.premium_swipes_received : `₦${(user.total_spent / 1000).toFixed(1)}k`}
                                        </div>
                                        <div className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">
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
