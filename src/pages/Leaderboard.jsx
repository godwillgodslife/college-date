import { useState, useEffect } from 'react';
import { getLeaderboards } from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const UserAvatar = ({ user, size = "md", rank = 0, activeTab }) => {
    const navigate = useNavigate();
    const getAvatar = (u) => u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random`;

    const sizes = {
        sm: "w-12 h-12 rounded-full",
        md: "w-24 h-24 rounded-full",
        lg: "w-20 h-20 sm:w-28 sm:h-28 rounded-full"
    };

    const frameStyles = {
        1: "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.5)] bg-gradient-to-br from-yellow-100 via-yellow-500 to-yellow-800 ring-4 ring-yellow-500/30",
        2: "border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.4)] bg-gradient-to-br from-white via-slate-400 to-slate-700 ring-4 ring-slate-400/30",
        3: "border-[#b87333] shadow-[0_0_20px_rgba(184,115,51,0.4)] bg-gradient-to-br from-[#fcb677] via-[#b87333] to-[#5c3a1a] ring-4 ring-[#b87333]/30",
        default: "border-white/10 bg-white/5"
    };

    const currentFrame = frameStyles[rank] || frameStyles.default;
    const isTop3 = rank >= 1 && rank <= 3;

    return (
        <div className="relative group cursor-pointer" onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}>
            <div className={`
                ${isTop3 ? 'p-1.5' : 'p-1'} 
                rounded-full 
                ${currentFrame} 
                transition-transform duration-500 group-hover:scale-105
            `}>
                <div className={`bg-[#060608] p-0.5 rounded-full overflow-hidden`}>
                    <img
                        src={getAvatar(user)}
                        className={`
                            ${sizes[size]} 
                            object-cover 
                            transition-all duration-500
                        `}
                        alt={user.full_name}
                    />
                </div>
            </div>

            {rank > 0 && (
                <div className={`
                    absolute left-1/2 -translate-x-1/2 z-20 shadow-xl border-2 border-[#060608]
                    ${rank === 1 ? '-bottom-4 bg-gradient-to-r from-yellow-300 to-yellow-600 text-black px-4 py-0.5 text-[13px] font-black' :
                        rank === 2 ? '-bottom-3 bg-gradient-to-r from-slate-200 to-slate-400 text-black w-8 h-8 flex items-center justify-center text-[12px] font-black' :
                            rank === 3 ? '-bottom-3 bg-gradient-to-r from-[#fcb677] to-[#b87333] text-black w-8 h-8 flex items-center justify-center text-[12px] font-black' :
                                'hidden'}
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
        <div className="min-h-screen bg-[#060608] pb-28 text-white selection:bg-rose-500/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#fbbf24]/10 blur-[140px] rounded-full" />
                <div className="absolute top-[30%] right-[-20%] w-[40%] h-[40%] bg-[#6d28d9]/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative px-4 pt-10 max-w-2xl mx-auto z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-block px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4 backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500 flex items-center gap-2">
                            <span>🏆</span> Premium Elite
                        </span>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-600 bg-clip-text text-transparent uppercase drop-shadow-lg">
                        Hall of Fame
                    </h1>
                </motion.div>

                {/* iOS Style Frosted Toggle Segment */}
                <div className="flex justify-center mb-16">
                    <div className="relative bg-[#1a1a1e]/80 backdrop-blur-xl p-1.5 rounded-full border border-white/10 flex w-full max-w-[340px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activeTab === 'wanted' ? 'left-1.5' : 'left-[calc(50%+4px)]'} shadow-md`}
                        />
                        <button
                            onClick={() => setActiveTab('wanted')}
                            className={`relative flex-1 py-3 text-[13px] font-bold tracking-wide z-10 transition-colors duration-300 rounded-full ${activeTab === 'wanted' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Most Wanted 🔥
                        </button>
                        <button
                            onClick={() => setActiveTab('spenders')}
                            className={`relative flex-1 py-3 text-[13px] font-bold tracking-wide z-10 transition-colors duration-300 rounded-full ${activeTab === 'spenders' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
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
                        {/* The Podium */}
                        <div className="relative flex justify-center items-end h-[340px] mb-16 px-2">
                            {/* 2nd Place */}
                            {topThree[1] && (
                                <motion.div
                                    className="flex flex-col items-center w-1/3 group z-10"
                                    initial={{ height: 0 }}
                                    animate={{ height: '100%' }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    <div className="relative mb-6">
                                        <div className="absolute inset-[-15px] bg-slate-400/20 blur-2xl rounded-full" />
                                        <UserAvatar user={topThree[1]} size="lg" rank={2} activeTab={activeTab} />
                                    </div>
                                    <div className="w-[90%] bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700/80 backdrop-blur-md border border-slate-600/50 border-b-0 h-32 rounded-t-2xl flex flex-col items-center justify-center p-3 shadow-[0_-10px_30px_rgba(148,163,184,0.15)] relative overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent opacity-50" />
                                        <p className="text-[11px] font-bold text-slate-300 truncate w-full text-center uppercase tracking-wider">{topThree[1].full_name.split(' ')[0]}</p>
                                        <p className="text-lg font-black text-white mt-1 drop-shadow-md">
                                            {activeTab === 'wanted' ? topThree[1].premium_swipes_received : `₦${(topThree[1].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* 1st Place */}
                            {topThree[0] && (
                                <motion.div
                                    className="flex flex-col items-center w-[40%] group z-20"
                                    initial={{ height: 0 }}
                                    animate={{ height: '100%' }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="relative mb-8">
                                        <motion.div
                                            animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }}
                                            transition={{ repeat: Infinity, duration: 3 }}
                                            className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] z-30"
                                        >
                                            👑
                                        </motion.div>
                                        <div className="absolute inset-[-20px] bg-yellow-500/30 blur-3xl rounded-full" />
                                        <UserAvatar user={topThree[0]} size="lg" rank={1} activeTab={activeTab} />
                                    </div>
                                    <div className="w-full bg-gradient-to-t from-yellow-900 via-yellow-800/80 to-yellow-600/60 backdrop-blur-xl border border-yellow-500/50 border-b-0 h-44 rounded-t-3xl flex flex-col items-center justify-center p-3 shadow-[0_-15px_40px_rgba(250,204,21,0.2)] relative overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
                                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                                        <p className="text-[13px] font-black text-yellow-200 truncate w-full text-center uppercase tracking-widest">{topThree[0].full_name.split(' ')[0]}</p>
                                        <p className="text-2xl font-black text-white mt-2 drop-shadow-lg">
                                            {activeTab === 'wanted' ? topThree[0].premium_swipes_received : `₦${(topThree[0].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* 3rd Place */}
                            {topThree[2] && (
                                <motion.div
                                    className="flex flex-col items-center w-1/3 group z-10"
                                    initial={{ height: 0 }}
                                    animate={{ height: '100%' }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <div className="relative mb-6">
                                        <div className="absolute inset-[-15px] bg-[#b87333]/20 blur-2xl rounded-full" />
                                        <UserAvatar user={topThree[2]} size="lg" rank={3} activeTab={activeTab} />
                                    </div>
                                    <div className="w-[85%] bg-gradient-to-t from-[#362210] via-[#5c3a1a] to-[#8a5626]/80 backdrop-blur-md border border-[#b87333]/50 border-b-0 h-24 rounded-t-2xl flex flex-col items-center justify-center p-3 shadow-[0_-10px_30px_rgba(184,115,51,0.15)] relative overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#fcb677] to-transparent opacity-50" />
                                        <p className="text-[10px] font-bold text-[#fcb677] truncate w-full text-center uppercase tracking-wider">{topThree[2].full_name.split(' ')[0]}</p>
                                        <p className="text-base font-black text-white mt-1 drop-shadow-md">
                                            {activeTab === 'wanted' ? topThree[2].premium_swipes_received : `₦${(topThree[2].total_spent / 1000).toFixed(1)}k`}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Rising Stars List */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black tracking-[0.4em] text-gray-500 uppercase mb-6 ml-2 text-center w-full relative">
                                <span className="bg-[#060608] px-4 relative z-10">Rising Stars</span>
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 z-0" />
                            </h3>

                            {runnersUp.map((user, index) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={user.id}
                                    className="group relative bg-[#121216]/80 backdrop-blur-md p-4 flex items-center rounded-2xl border border-white/[0.04] hover:border-white/[0.15] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer overflow-hidden"
                                    onClick={() => navigate(`/profile/${user.profile_id || user.id}`)}
                                >
                                    {/* Giant background rank number */}
                                    <div className="absolute -right-4 -top-8 text-[100px] font-black text-white/[0.02] group-hover:text-white/[0.04] transition-colors pointer-events-none select-none italic">
                                        {(index + 4).toString().padStart(2, '0')}
                                    </div>

                                    {/* Hover sheen effect */}
                                    <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-30deg] group-hover:animate-[shimmer_1s_forwards]" />

                                    <div className="w-10 text-[15px] font-black text-gray-600 group-hover:text-white transition-colors z-10">
                                        {(index + 4).toString().padStart(2, '0')}
                                    </div>

                                    <div className="z-10 relative">
                                        <UserAvatar user={user} size="sm" activeTab={activeTab} />
                                    </div>

                                    <div className="flex-1 ml-5 min-w-0 z-10">
                                        <p className="text-[15px] font-bold text-gray-200 group-hover:text-white transition-colors truncate">{user.full_name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{user.university || 'CD Elite'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right pl-4 z-10">
                                        <div className="text-[16px] font-black text-white group-hover:text-yellow-400 transition-colors drop-shadow-sm">
                                            {activeTab === 'wanted' ? user.premium_swipes_received : `₦${(user.total_spent / 1000).toFixed(1)}k`}
                                        </div>
                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
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
