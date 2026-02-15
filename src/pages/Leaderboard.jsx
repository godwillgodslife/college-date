import { useState, useEffect } from 'react';
import { getLeaderboards } from '../services/leaderboardService';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

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
        const { mostWanted, bigSpenders } = await getLeaderboards();
        setData({ mostWanted, bigSpenders });
        setLoading(false);
    };

    const displayList = activeTab === 'wanted' ? data.mostWanted : data.bigSpenders;
    const topThree = displayList.slice(0, 3);
    const runnersUp = displayList.slice(3);

    const getAvatar = (user) => user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`;

    if (loading) return <LoadingSpinner fullScreen text="Loading Rankings..." />;

    return (
        <div className="min-h-screen bg-gray-900 pb-24 text-white overflow-x-hidden">
            {/* Header Background */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-purple-900/50 to-gray-900 pointer-events-none" />

            <div className="relative px-4 pt-6">
                {/* Title */}
                <div className="text-center mb-6 animate-fade-in-down">
                    <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                        LEADERBOARD
                    </h1>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Weekly Rankings</p>
                </div>

                {/* Toggle Switch */}
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-800/80 p-1.5 rounded-full backdrop-blur-md border border-white/10 flex shadow-xl">
                        <button
                            onClick={() => setActiveTab('wanted')}
                            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'wanted'
                                ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-500/40 transform scale-105'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Most Wanted 💃
                        </button>
                        <button
                            onClick={() => setActiveTab('spenders')}
                            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'spenders'
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/40 transform scale-105'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Big Spenders 💸
                        </button>
                    </div>
                </div>

                {/* PODIUM SECTION (Top 3) */}
                {topThree.length > 0 && (
                    <div className="flex justify-center items-end gap-2 mb-10 h-48 sm:h-56">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="flex flex-col items-center animate-fade-in-up delay-100 z-10">
                                <div className="relative mb-2">
                                    <img
                                        src={getAvatar(topThree[1])}
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-gray-400 shadow-xl object-cover"
                                    />
                                    <div className="absolute -bottom-2 -left-2 bg-gray-400 text-black font-bold text-xs px-2 py-0.5 rounded-full border border-white">#2</div>
                                </div>
                                <div className="bg-gray-800/50 backdrop-blur border border-gray-600/50 w-20 sm:w-24 h-24 sm:h-28 rounded-t-lg flex flex-col justify-end pb-2 text-center shadow-lg">
                                    <p className="text-xs font-bold truncate px-1 text-gray-300">{topThree[1].full_name.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">
                                        {activeTab === 'wanted' ? topThree[1].premium_swipes_received : `₦${(topThree[1].total_spent / 1000).toFixed(1)}k`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="flex flex-col items-center animate-fade-in-up z-20 -mx-1">
                                <div className="relative mb-2">
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl animate-bounce">👑</div>
                                    <img
                                        src={getAvatar(topThree[0])}
                                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-yellow-400 shadow-2xl shadow-yellow-500/20 object-cover"
                                    />
                                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black font-black text-sm px-3 py-0.5 rounded-full border-2 border-white shadow-sm">#1</div>
                                </div>
                                <div className="bg-gradient-to-b from-yellow-500/20 to-gray-800/80 backdrop-blur border-t border-l border-r border-yellow-500/50 w-24 sm:w-28 h-32 sm:h-40 rounded-t-xl flex flex-col justify-end pb-4 text-center shadow-yellow-900/50 shadow-2xl">
                                    <p className="text-sm font-bold truncate px-1 text-yellow-100">{topThree[0].full_name.split(' ')[0]}</p>
                                    <p className="text-xs text-yellow-500 font-black font-mono">
                                        {activeTab === 'wanted' ? topThree[0].premium_swipes_received : `₦${(topThree[0].total_spent / 1000).toFixed(1)}k`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="flex flex-col items-center animate-fade-in-up delay-200 z-10">
                                <div className="relative mb-2">
                                    <img
                                        src={getAvatar(topThree[2])}
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-700 shadow-xl object-cover"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-amber-700 text-white font-bold text-xs px-2 py-0.5 rounded-full border border-white">#3</div>
                                </div>
                                <div className="bg-gray-800/50 backdrop-blur border border-amber-800/50 w-20 sm:w-24 h-20 sm:h-24 rounded-t-lg flex flex-col justify-end pb-2 text-center shadow-lg">
                                    <p className="text-xs font-bold truncate px-1 text-gray-300">{topThree[2].full_name.split(' ')[0]}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">
                                        {activeTab === 'wanted' ? topThree[2].premium_swipes_received : `₦${(topThree[2].total_spent / 1000).toFixed(1)}k`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Runners Up List */}
                <div className="space-y-3 pb-8">
                    {runnersUp.map((user, index) => (
                        <div
                            key={user.id}
                            className="bg-gray-800/40 backdrop-blur-md rounded-xl p-3 flex items-center border border-white/5 hover:bg-gray-800/60 transition-colors"
                        >
                            <div className="w-8 text-center font-bold text-gray-500 text-sm">#{index + 4}</div>
                            <img
                                src={getAvatar(user)}
                                className="w-10 h-10 rounded-full object-cover ml-2 mr-3 bg-gray-700"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">{user.full_name}</p>
                                <p className="text-gray-500 text-xs truncate">{user.university}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-bold text-sm">
                                    {activeTab === 'wanted' ? user.premium_swipes_received : `₦${(user.total_spent / 1000).toFixed(1)}k`}
                                </div>
                            </div>
                        </div>
                    ))}

                    {displayList.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            <p>No activity yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
