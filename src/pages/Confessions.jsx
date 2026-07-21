import useSWR, { mutate } from 'swr';
import { useState, useRef, memo, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { postConfession, addEmojiReaction, claimConfession } from '../services/confessionService';
import { useConfessions } from '../hooks/useSWRData';
import { motion, AnimatePresence } from 'framer-motion';
import ConfessionDrawer from '../components/ConfessionDrawer';
import { recordFeedImpressions } from '../services/feedImpressionService';
import './Confessions.css';

function EmojiBurst({ emoji, x, y, onComplete }) {
    return (
        <motion.div
            initial={{ opacity: 1, scale: 0.5, x: x - 15, y: y - 15 }}
            animate={{ opacity: 0, scale: 2.5, y: y - 120, x: x + (Math.random() * 40 - 20) }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                fontSize: '2.5rem',
                pointerEvents: 'none',
                zIndex: 9999,
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))'
            }}
        >
            {emoji}
        </motion.div>
    );
}

const getTimeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
};

const ConfessionCard = memo(function ConfessionCard({ post, index, onReact, onClaim, onOpenThread }) {
    const meshClass = `mesh-gradient-${(index % 4) + 1}`;
    const [bursts, setBursts] = useState([]);
    const longPressTimer = useRef(null);

    const handleStart = useCallback((e) => {
        const touch = e.touches ? e.touches[0] : e;
        const x = touch.clientX;
        const y = touch.clientY;

        longPressTimer.current = setTimeout(() => {
            const newBursts = Array.from({ length: 6 }).map((_, i) => ({
                id: Math.random(),
                x,
                y,
                emoji: '🔥'
            }));
            setBursts(prev => [...prev, ...newBursts]);
            onReact(post.id, '🔥');

            if (window.navigator.vibrate) window.navigator.vibrate(50);
        }, 600);
    }, [onReact, post.id]);

    const handleEnd = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const timeAgo = useMemo(() => getTimeAgo(post.created_at), [post.created_at]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className={`confession-card-premium ${meshClass} ${post.isViral ? 'viral-hot' : ''}`}
            onClick={() => onOpenThread(post)}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
        >
            <AnimatePresence>
                {bursts.map(b => (
                    <EmojiBurst
                        key={b.id}
                        emoji={b.emoji}
                        x={b.x}
                        y={b.y}
                        onComplete={() => setBursts(prev => prev.filter(item => item.id !== b.id))}
                    />
                ))}
            </AnimatePresence>
            <div className="long-press-indicator" />

            {post.isViral && (
                <div className="badge-viral">🔥 Trending</div>
            )}

            <p className="confession-body">{post.content}</p>

            <div className="action-bar-floating" onClick={(e) => e.stopPropagation()}>
                <div className="reactions-grid-breakdown">
                    {['🔥', '😂', '🙊', '🙏', '😢'].map((emoji) => {
                        const count = post.reactionCounts?.[emoji] || 0;
                        const userReacted = post.userReactions?.includes(emoji);
                        return (
                            <button
                                key={emoji}
                                className={`btn-social-emoji-breakdown ${userReacted ? 'active' : ''}`}
                                onClick={() => onReact(post.id, emoji)}
                            >
                                <span>{emoji}</span>
                                {count > 0 && <span className="emoji-count">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="social-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn-social"
                        onClick={() => onOpenThread(post)}
                        aria-label="View comments"
                    >
                        <span>💬</span>
                        <span style={{ fontSize: '10px' }}>{post.commentCount || 0}</span>
                    </button>
                    <button
                        className={`btn-social ${post.hasClaimed ? 'active' : ''}`}
                        onClick={() => onClaim(post.id)}
                        disabled={post.hasClaimed}
                        aria-label="Claim secret ownership"
                    >
                        <span>{post.hasClaimed ? '✓' : '👀'}</span>
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5, fontSize: '10px' }}>
                <span>🎓 {post.university}</span>
                <span>{timeAgo}</span>
            </div>
        </motion.div>
    );
});

const CONFESSION_CATEGORIES = [
    'General 🙊', 'Crush 💘', 'Lecturers 👨‍🏫', 'Exams 📚', 'Cafeteria 🍔', 'Gist 💬'
];

export default function Confessions() {
    const { currentUser, userProfile } = useAuth();
    const { addToast } = useToast();

    const [posting, setPosting] = useState(false);
    const [newConfession, setNewConfession] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('General 🙊');
    const [selectedPost, setSelectedPost] = useState(null);

    // SWR for confessions using custom hook - trim university to avoid casing/space mismatches
    const { data: confessions = [], isLoading, mutate: mutateConfessions } = useConfessions(
        userProfile?.university?.trim(),
        currentUser?.id
    );

    const [visibleCount, setVisibleCount] = useState(15);

    // Reset visibleCount if confessions list length changes
    useEffect(() => {
        setVisibleCount(15);
    }, [confessions.length]);

    const visibleConfessions = useMemo(() => confessions.slice(0, visibleCount), [confessions, visibleCount]);
    const visibleConfessionImpressionIds = visibleConfessions.map(post => post.id).join(',');

    useEffect(() => {
        if (!currentUser?.id || !visibleConfessionImpressionIds) return;
        recordFeedImpressions('confession', visibleConfessionImpressionIds.split(','), 'confessions', { limit: 20 });
    }, [currentUser?.id, visibleConfessionImpressionIds]);

    // Sentinel intersection observer for infinite scroll
    const sentinelRef = useRef(null);
    useEffect(() => {
        if (!sentinelRef.current || confessions.length <= visibleCount) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => Math.min(confessions.length, prev + 15));
            }
        }, { rootMargin: '250px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [confessions.length, visibleCount]);

    const handleReact = useCallback(async (confessionId, emoji) => {
        if (!currentUser) return;

        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => {
                if (c.id !== confessionId) return c;
                const alreadyReacted = c.userReactions?.includes(emoji);
                const delta = alreadyReacted ? -1 : 1;
                return {
                    ...c,
                    reactionCounts: {
                        ...c.reactionCounts,
                        [emoji]: Math.max(0, (c.reactionCounts?.[emoji] || 0) + delta)
                    },
                    totalReactions: Math.max(0, c.totalReactions + delta),
                    userReactions: alreadyReacted
                        ? c.userReactions.filter(e => e !== emoji)
                        : [...(c.userReactions || []), emoji]
                };
            })
        }, false);

        const { error } = await addEmojiReaction(confessionId, currentUser.id, emoji);
        if (error) {
            mutateConfessions();
            addToast('Reaction failed', 'error');
        }
    }, [currentUser, mutateConfessions, addToast]);

    const handleClaim = useCallback(async (confessionId) => {
        if (!currentUser) return;

        mutateConfessions((current) => {
            if (!current) return current;
            return current.map(c => c.id === confessionId ? { ...c, hasClaimed: true } : c);
        }, false);

        const { error, alreadyClaimed } = await claimConfession(confessionId, currentUser.id);
        if (error) {
            mutateConfessions();
            addToast('Could not send claim', 'error');
        } else if (!alreadyClaimed) {
            addToast('Anonymous claim sent to the poster 👀', 'success');
        }
    }, [currentUser, mutateConfessions, addToast]);

    const handleOpenThread = useCallback((post) => {
        setSelectedPost(post);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newConfession.trim()) return;
        setPosting(true);
        try {
            const uni = userProfile?.university?.trim() || 'Unknown University';
            const finalContent = selectedCategory !== 'General 🙊' ? `[${selectedCategory}] ${newConfession}` : newConfession;
            const { data: newPost, error } = await postConfession(finalContent, uni, currentUser.id);
            if (error) throw new Error(error);

            // Optimistically prepend the new confession to the local SWR cache
            mutateConfessions((current = []) => {
                const optimisticPost = {
                    ...(newPost || {}),
                    id: newPost?.id || `optimistic-${Date.now()}`,
                    content: finalContent,
                    university: uni,
                    created_at: new Date().toISOString(),
                    reactionCounts: { '🔥': 0, '😂': 0, '🙊': 0, '🙏': 0, '😢': 0 },
                    userReactions: [],
                    hasClaimed: false,
                    totalReactions: 0,
                    commentCount: 0,
                    isViral: false,
                };
                return [optimisticPost, ...current];
            }, false); // false = no re-fetch

            setNewConfession('');
            addToast('Secret posted! 🤫', 'success');
        } catch (err) {
            addToast('Failed to post secret', 'error');
            mutateConfessions(); // on error, re-fetch to get clean state
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="confessions-premium-wrapper">
            <div className="mesh-bg" />

            <div className="confessions-container">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="confessions-hero"
                >
                    <div className="badge-campus">
                        <span>{userProfile?.university || 'Campus Hub'}</span>
                    </div>
                    <h1 className="hero-title">Campus Secrets</h1>
                    <p className="hero-subtitle">Anonymous. Ephemeral. 100% Student-led.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="input-card-ultimate glass-morph"
                >
                    <form onSubmit={handleSubmit}>
                        <div className="confession-category-selector">
                            {CONFESSION_CATEGORIES.map((cat) => (
                                <button
                                    type="button"
                                    key={cat}
                                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="ultimate-textarea"
                            placeholder="What's the tea today?..."
                            value={newConfession}
                            onChange={(e) => setNewConfession(e.target.value)}
                            maxLength={280}
                        />
                        <div className="ultimate-footer">
                            <div className="char-info">
                                <span className="char-count-text">{280 - newConfession.length} characters left</span>
                            </div>
                            <button type="submit" disabled={posting || !newConfession.trim()} className="btn-ultra-premium">
                                {posting ? 'Posting...' : 'Post Secret'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {isLoading && !confessions.length ? (
                    <div className="confessions-masonry">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton-card" style={{ marginBottom: '1.25rem' }} />
                        ))}
                    </div>
                ) : confessions.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ fontSize: '3rem' }}>🙊</span>
                        <h3>No secrets yet...</h3>
                        <p>Be the first to speak up!</p>
                    </div>
                ) : (
                    <>
                        <div className="confessions-masonry">
                            {visibleConfessions.map((post, idx) => (
                                <ConfessionCard
                                    key={post.id}
                                    post={post}
                                    index={idx}
                                    onReact={handleReact}
                                    onClaim={handleClaim}
                                    onOpenThread={handleOpenThread}
                                />
                            ))}
                        </div>
                        {confessions.length > visibleCount && (
                            <div ref={sentinelRef} className="incremental-scroll-sentinel" style={{ height: '20px', margin: '10px 0' }} />
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {selectedPost && (
                    <ConfessionDrawer
                        post={selectedPost}
                        onClose={() => setSelectedPost(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
