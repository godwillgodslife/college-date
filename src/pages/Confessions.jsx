import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getConfessions, postConfession } from '../services/confessionService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Confessions() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [confessions, setConfessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newConfession, setNewConfession] = useState('');

    useEffect(() => {
        loadConfessions();
        const interval = setInterval(loadConfessions, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const loadConfessions = async () => {
        const uni = userProfile?.university;
        const { data } = await getConfessions(uni);
        setConfessions(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newConfession.trim()) return;

        setPosting(true);
        try {
            const uni = userProfile?.university || 'Unknown University';
            const { error } = await postConfession(newConfession, uni, currentUser.id);
            if (error) throw new Error(error);

            setNewConfession('');
            addToast('Secret posted! 🤫', 'success');
            loadConfessions();
        } catch (err) {
            addToast('Failed to post secret', 'error');
        } finally {
            setPosting(false);
        }
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const getCardStyle = (index) => {
        const gradients = [
            'from-purple-500/10 to-indigo-500/10 border-indigo-500/30',
            'from-rose-500/10 to-pink-500/10 border-pink-500/30',
            'from-amber-500/10 to-orange-500/10 border-orange-500/30',
            'from-blue-500/10 to-cyan-500/10 border-cyan-500/30',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="min-h-screen bg-[#060608] pb-28 text-white selection:bg-rose-500/30 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#4c1d95]/20 blur-[140px] rounded-full" />
                <div className="absolute top-[40%] right-[-20%] w-[50%] h-[50%] bg-[#be123c]/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative px-4 pt-10 max-w-lg mx-auto z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-5 backdrop-blur-md">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300">
                            {userProfile?.university ? `📍 ${userProfile.university}` : '📍 Campus Hub'}
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-100 to-gray-500 bg-clip-text text-transparent mb-3 drop-shadow-sm">
                        Anonymous
                    </h1>
                    <p className="text-gray-400 text-sm font-medium">
                        Spill your secrets. Nobody will know. 🤫
                    </p>
                </motion.div>

                {/* Post Input */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#121216]/80 backdrop-blur-2xl rounded-[2rem] p-5 mb-12 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all duration-500 hover:border-white/[0.15]"
                >
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500/50 via-rose-500/50 to-indigo-500/50" />

                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="w-full resize-none bg-transparent rounded-xl p-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-0 transition-all text-[17px] leading-relaxed font-medium placeholder:font-normal"
                            placeholder="What's on your mind?..."
                            rows="3"
                            maxLength="280"
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                        />

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.04]">
                            <span className={`text-[11px] font-bold tracking-wider ${newConfession.length > 250 ? 'text-rose-500' : 'text-gray-600'}`}>
                                {280 - newConfession.length}
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!newConfession.trim() || posting}
                                className={`px-6 py-2.5 rounded-full text-[13px] font-bold text-white transition-all shadow-lg ${!newConfession.trim()
                                    ? 'bg-white/5 border border-white/10 cursor-not-allowed text-gray-500 shadow-none'
                                    : 'bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                    }`}
                            >
                                {posting ? 'Sending...' : 'Confess'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>

                {/* Feed */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : confessions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 bg-white/[0.02] border border-white/[0.05] rounded-[2rem]"
                    >
                        <p className="font-medium text-lg text-gray-300">It's quiet in here...</p>
                        <p className="text-[11px] mt-2 uppercase tracking-widest text-gray-600">Be the first to break the silence</p>
                    </motion.div>
                ) : (
                    <motion.div layout className="space-y-5">
                        <AnimatePresence mode='popLayout'>
                            {confessions.map((post, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: index * 0.05 }}
                                    key={post.id}
                                    className={`relative bg-[#101014]/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/[0.06] hover:border-white/[0.12] transition-colors shadow-xl group overflow-hidden`}
                                >
                                    {/* Subtle Ambient Glow behind card */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${getCardStyle(index)} opacity-30 pointer-events-none transition-opacity group-hover:opacity-50`} />

                                    <p className="relative z-10 text-gray-100 font-medium leading-relaxed text-[16px]">
                                        {post.content}
                                    </p>

                                    <div className="relative z-10 flex justify-between items-center mt-6 pt-4 border-t border-white/[0.05]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shadow-inner">
                                                <span className="text-[9px]">🎓</span>
                                            </div>
                                            <span className="text-[11px] font-bold text-gray-400 capitalize truncate max-w-[140px]">
                                                {post.university}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.05]">
                                            {getTimeAgo(post.created_at)}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
