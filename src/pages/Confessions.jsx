import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getConfessions, postConfession } from '../services/confessionService';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Confessions() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [confessions, setConfessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newConfession, setNewConfession] = useState('');

    useEffect(() => {
        loadConfessions();
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

    // Random gradients for cards
    const getCardGradient = (index) => {
        const gradients = [
            'from-purple-500/10 to-indigo-500/10 border-indigo-500/20',
            'from-pink-500/10 to-rose-500/10 border-pink-500/20',
            'from-blue-500/10 to-cyan-500/10 border-cyan-500/20',
            'from-amber-500/10 to-orange-500/10 border-orange-500/20',
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 px-4 pt-6 max-w-lg mx-auto">
            <div className="text-center mb-8">
                <span className="text-4xl mb-2 block">🤫</span>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                    Campus Secrets
                </h1>
                <p className="text-gray-500 text-sm font-medium">
                    {userProfile?.university ? `Anonymous @ ${userProfile.university}` : 'The walls have ears...'}
                </p>
            </div>

            {/* Post Input */}
            <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-5 mb-10 border border-purple-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

                <form onSubmit={handleSubmit}>
                    <textarea
                        className="w-full resize-none bg-gray-50 rounded-2xl p-4 text-gray-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all placeholder-gray-400 text-base leading-relaxed"
                        placeholder="What's a secret you've never told anyone?"
                        rows="3"
                        maxLength="280"
                        value={newConfession}
                        onChange={(e) => setNewConfession(e.target.value)}
                    ></textarea>

                    <div className="flex justify-between items-center mt-3">
                        <span className={`text-xs font-bold ${newConfession.length > 250 ? 'text-red-500' : 'text-gray-300'}`}>
                            {280 - newConfession.length}
                        </span>
                        <button
                            type="submit"
                            disabled={!newConfession.trim() || posting}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${!newConfession.trim()
                                    ? 'bg-gray-300'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30'
                                }`}
                        >
                            {posting ? 'Shushing...' : 'Confess 🕊️'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Feed */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : confessions.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <p className="font-medium">No secrets yet.</p>
                    <p className="text-xs mt-1">Be the first to spill the tea!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {confessions.map((post, index) => (
                        <div
                            key={post.id}
                            className={`bg-gradient-to-br ${getCardGradient(index)} bg-white backdrop-blur-sm p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow duration-300`}
                        >
                            <p className="text-gray-800 font-medium leading-relaxed text-[15px]">
                                "{post.content}"
                            </p>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100/50">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <span>🏫</span>
                                    <span>{post.university}</span>
                                </div>
                                <span className="text-xs text-gray-400 font-mono bg-white/50 px-2 py-1 rounded-full">
                                    {getTimeAgo(post.created_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
