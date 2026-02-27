import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { getConfessions, postConfession, toggleLikeConfession } from '../services/confessionService';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import './Confessions.css';

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
    }, [userProfile?.university]); // Re-load if university changes

    const loadConfessions = async () => {
        if (!userProfile?.university) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await getConfessions(userProfile.university);
            setConfessions(data || []);
        } catch (err) {
            console.error('Error loading confessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (confessionId) => {
        // Optimistic update
        setConfessions(prev => prev.map(c =>
            c.id === confessionId ? { ...c, likes: (c.likes || 0) + 1, hasLiked: true } : c
        ));

        const { error } = await toggleLikeConfession(confessionId, currentUser.id);
        if (error) {
            // Revert on error
            loadConfessions();
        }
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

    const getCardGlow = (index) => {
        const glows = [
            'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
            'linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(236, 72, 153, 0.1))',
            'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(249, 115, 22, 0.1))',
            'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))',
        ];
        return glows[index % glows.length];
    };

    return (
        <div className="confessions-page">
            <div className="confessions-ambient">
                <div className="blob-1" />
                <div className="blob-2" />
            </div>

            <div className="confessions-container">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="confessions-header"
                >
                    <div className="campus-tag">
                        <span>
                            {userProfile?.university ? `📍 ${userProfile.university}` : '📍 Campus Hub'}
                        </span>
                    </div>
                    <h1 className="confessions-title">Anonymous</h1>
                    <p className="confessions-subtitle">
                        Spill your secrets. Nobody will know. 🤫
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="confessions-input-card"
                >
                    <div className="input-glow-line" />

                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="confessions-textarea"
                            placeholder="What's on your mind?..."
                            rows="3"
                            maxLength="280"
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                        />

                        <div className="input-footer">
                            <span className={`char-counter ${newConfession.length > 250 ? 'warning' : ''}`}>
                                {280 - newConfession.length} characters left
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!newConfession.trim() || posting}
                                className="btn-confess"
                            >
                                {posting ? 'Sending...' : 'Confess'}
                            </motion.button>
                        </div>
                    </form>
                </motion.div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                        <LoadingSpinner />
                    </div>
                ) : confessions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="empty-feed"
                    >
                        <p className="empty-title">It's quiet in here...</p>
                        <p className="empty-subtitle">Be the first to break the silence</p>
                    </motion.div>
                ) : (
                    <div className="confessions-feed">
                        <AnimatePresence mode='popLayout'>
                            {confessions.map((post, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: index * 0.05 }}
                                    key={post.id}
                                    className="confession-card"
                                >
                                    <div
                                        className="card-ambient-glow"
                                        style={{ background: getCardGlow(index) }}
                                    />

                                    <p className="confession-text">
                                        {post.content}
                                    </p>

                                    <div className="confession-footer">
                                        <div className="uni-info">
                                            <div className="uni-icon">
                                                <span>🎓</span>
                                            </div>
                                            <span className="uni-name">
                                                {post.university}
                                            </span>
                                        </div>
                                        <div className="action-row">
                                            <button
                                                className={`btn-react ${post.hasLiked ? 'active' : ''}`}
                                                onClick={() => handleLike(post.id)}
                                                disabled={post.hasLiked}
                                            >
                                                <span className="react-icon">{post.hasLiked ? '❤️' : '🤍'}</span>
                                                <span className="react-count">{post.likes || 0}</span>
                                            </button>
                                            <span className="post-time">
                                                {getTimeAgo(post.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
