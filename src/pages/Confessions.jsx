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
        <div className="min-h-screen bg-[#0a0a0c] pb-28 text-white selection:bg-rose-500/30 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative px-4 pt-8 max-w-lg mx-auto z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                        className="text-5xl mb-3 inline-block filter drop-shadow-lg"
                    >
                        🤫
                    </motion.div>
                    <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent mb-2">
                        Campus Secrets
                    </h1>
                    <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
                        {userProfile?.university ? `Anonymous @ ${userProfile.university}` : 'The walls have ears...'}
                    </p>
                </motion.div>

                {/* Post Input */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 mb-10 border border-white/10 shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-rose-500 to-indigo-500 opacity-70" />

                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="w-full resize-none bg-black/20 rounded-2xl p-4 text-gray-200 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-rose-500/50 transition-all placeholder-gray-500 text-base leading-relaxed border border-white/5"
                            placeholder="Spill the tea... (It's anonymous)"
                            rows="3"
                            maxLength="280"
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                        />

                        <div className="flex justify-between items-center mt-4">
                            <span className={`text-xs font-bold tracking-wider ${newConfession.length > 250 ? 'text-rose-500' : 'text-gray-500'}`}>
                                {280 - newConfession.length} chars
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={!newConfession.trim() || posting}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${!newConfession.trim()
                                    ? 'bg-gray-700/50 cursor-not-allowed text-gray-400'
                                    : 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 shadow-rose-500/20'
                                    }`}
                            >
                                {posting ? 'Posting...' : 'Confess 🕊️'}
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
                        className="text-center py-20 text-gray-500"
                    >
                        <p className="font-medium text-lg">No secrets yet.</p>
                        <p className="text-xs mt-2 uppercase tracking-widest opacity-60">Be the first to break the silence</p>
                    </motion.div>
                ) : (
                    <motion.div layout className="space-y-4">
                        <AnimatePresence mode='popLayout'>
                            {confessions.map((post, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    key={post.id}
                                    className={`relative bg-gradient-to-br ${getCardStyle(index)} backdrop-blur-md p-6 rounded-2xl border hover:border-white/20 transition-colors shadow-lg group`}
                                >
                                    <div className="absolute top-4 left-[-4px] w-1 h-8 rounded-r-lg bg-white/20 group-hover:bg-rose-500/50 transition-colors" />
                                    <p className="text-gray-200 font-medium leading-relaxed text-[15px] drop-shadow-sm">
                                        "{post.content}"
                                    </p>
                                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            <span>🏫</span>
                                            <span className="truncate max-w-[150px]">{post.university}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold bg-black/30 px-2 py-1 rounded-lg border border-white/5">
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
